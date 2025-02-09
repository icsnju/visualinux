from visualinux.dsl.parser.utils import *
from visualinux.dsl.parser.converter  import Converter
from visualinux.dsl.parser.translator import Translator

from visualinux.dsl.model import *

from pathlib import Path

class Parser:
    '''Usage: Parser(grammar).parse(program).
    - The Lark library serves as the lexical + syntax analyzer.
      It generates a syntax tree (i.e. lark.ParseTree) from the DSL source code.
    - The Converter() converts the raw lark.ParseTree into a OO-style class representation, i.e. list[Assignment | Plot].
    - The Translator() serves as the semantic analyzer.
      It analyzes the instruction list and generates static representations for all to-be-plotted shapes.
    - The Interpreter() is used during each Engine.sync() to evaluate expressions.
      It generates shape representations with runtime data, and finally converts them to json format.
    '''

    def __init__(self, grammar: Path):
        self.__parser = Lark(grammar.read_text(), start='viewcl', strict=True)
        self.__imported: set[Path] = set()

    def parse(self, code: str) -> DiagramSet:
        try:
            parsetree = ParseTree('viewcl', self.__parse(code, VIEWCL_SRC_DIR))
        finally:
            self.__imported.clear()
        insts, typemap_for_llm = Converter().convert(parsetree)
        model = Translator().translate(insts)
        model.typemap_for_llm = typemap_for_llm
        return model

    def __parse(self, code: str, rootdir: Path) -> list[Token | Tree[Token]]:
        '''The inner parse procedure that handles imports first.
        '''
        try:
            parsetree = self.__parser.parse(code)
            # self.__view_rename(parsetree, src_file.relative_to(rootdir))
        except Exception as e:
            raise fuck_exc(e.__class__, str(e))

        insts: list[Token | Tree[Token]] = []
        for inst in scan_children_as_tree(parsetree):
            if inst.data == 'import':
                import_relpath = serialize(inst.children[0]).replace('.', '/')
                import_path = rootdir / f'{import_relpath}.vcl'
                if not import_path.is_file():
                    raise fuck_exc(FileNotFoundError, f'ViewCL import error: failed to find {import_path}.vcl')
                if import_path in self.__imported:
                    continue
                self.__imported.add(import_path)
                insts += self.__parse(import_path.read_text(), rootdir)
            elif inst.data == 'instruction':
                insts.append(inst)
            else:
                raise fuck_exc(AssertionError, f'ViewCL program must be the form of (import | inst)*, but {inst.data = } found.')

        return insts

    def __view_rename(self, parsetree: ParseTree, relpath: Path):
        if vl_debug_on(): printd(f'view_rename {relpath}')
        for node in scan_children_as_tree(parsetree):
            if node.data != 'instruction':
                continue
            inst = child_as_tree(node, 0)
            if inst.data == 'viewdef':
                token = child_as_tree(inst, 0).children[0]
                assert isinstance(token, Token)
                token.value = str(relpath.with_suffix('')).replace('/', '.') + '.' + token.value
                if vl_debug_on(): printd(f'  view_rename => {token.value!s}')
