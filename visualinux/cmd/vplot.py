from visualinux import *
from visualinux.viewcl.parser.units import *
from visualinux.viewcl.parser.utils import *
from visualinux.runtime.kvalue import KValue
from visualinux.core import core
from visualinux.cmd.askllm import askllm

import argparse
import re
from lark import Lark, ParseTree, Token, Tree

VPLOT_GRAMMAR_PATH = VL_DIR / 'visualinux' / 'grammar' / 'vcmd-plot.lark'
VPLOT_PROMPT = (PROMPT_DIR / 'vplot.md').read_text()
VPLOT_FIND_PROMPT      = (PROMPT_DIR / 'vplot-find.md').read_text()
VPLOT_CONTAINER_PROMPT = (PROMPT_DIR / 'vplot-container.md').read_text()

class VPlot(gdb.Command):

    def __init__(self):
        super(VPlot, self).__init__("vplot", gdb.COMMAND_USER)

    def invoke(self, arg: str, from_tty: bool) -> None:
        VPlotHandler.invoke(arg)

class VPlotHandler:

    @dataclass
    class Entry1:
        symbol: str
        fields: list[str]
        def __str__(self): return f'{self.symbol} {{ {", ".join(self.fields)} }}'
    @dataclass
    class Entry2:
        shape:  str
        symbol: str
        def __str__(self): return f'{self.shape}({self.symbol})'
    Entry = Entry1 | Entry2

    parser = Lark(VPLOT_GRAMMAR_PATH.read_text(), strict=True)

    @classmethod
    def invoke(cls, arg: str):
        parser = argparse.ArgumentParser(description="vplot command line interface (example: vplot $foo tsk { pid, comm })")
        parser.add_argument('-o', '--output', type=str, help='optional: specify the view name (only used for plotting entries without -f)')
        parser.add_argument('-l', '--list', type=str, help='list all fields of a given symbol')
        parser.add_argument('-f', '--file', type=str, help='file to process')
        parser.add_argument('-c', '--chat', action='store_true', help='chat with LLM')
        parser.add_argument('convar',  nargs='?', help='optional: specify a convenient variable to store the snapshot (must start with $)')
        parser.add_argument('entries', nargs='*', help='plot simple entries quickly')
        parser.add_argument('--export', action='store_true', help='export plots to json files in local')
        parser.add_argument('--debug',  action='store_true', help='show debug info while processing request')
        parser.add_argument('--perf',   action='store_true', help='show profiling results while processing request')

        args = parser.parse_args(re.split(r'\s+', arg))

        if args.convar is not None and not args.convar.startswith('$'):
            args.entries = [args.convar] + args.entries
            args.convar = None

        set_vl_debug(args.debug)
        set_vl_perf(args.perf)

        mutual = (args.output is not None or len(args.entries) > 0) + \
            (args.list is not None) + \
            (args.file is not None) + \
            (args.chat is True)
        if mutual > 1:
            parser.error("Argument -o/-l/-f/-c is mutually exclusive with each other")

        if args.list:
            cls.handle_list(args.list)
        elif args.file:
            cls.handle_file(args.file, args.export)
        elif args.chat:
            cls.invoke_chat(' '.join(args.entries))
        elif len(args.entries) > 0:
            print(f'{args.entries = !s}, {len(args.entries) = !s}')
            if not cls.handle_plot(args.output or '__ANON__', ' '.join(args.entries)):
                parser.print_help()
        else:
            parser.print_help()

    @classmethod
    def invoke_chat(cls, message: str, if_export: bool = False):
        print(f'+ vplot --chat {message = }')
        type, args = askllm(VPLOT_PROMPT, message).split(' ', maxsplit=1)
        # direct plot
        if type == 'A':
            print(f'    + llm judged: direct plot, {args = }')
            VPlotHandler.invoke(args)
        # find the most appropriate predefined shape of a symbol
        elif type == 'B':
            print(f'    + llm judged: find a predefined shape, {args = }')
            model = core.parse_file(VIEWCL_SRC_DIR / 'stdlib.vcl')
            symbol = args
            gval = KValue.gdb_eval(symbol)
            if vl_debug_on(): printd(f'B {model.typemap_for_llm = !s}')
            descs = model.typemap_for_llm[gval.gtype.tag]
            prompt = VPLOT_FIND_PROMPT.replace('!!!TYPEMAP!!!', '\n'.join([desc.to_prompt() for desc in descs]))
            shapename, viewname = re.split(r',\s*', askllm(prompt, message), maxsplit=1)
            init_vql = f'UPDATE {gval.json_data_key} WITH view: {viewname}\n'
            VPlotHandler.handle_plot('__anon__ ', f'{shapename}({symbol})', init_vql, if_export)
        # try to reconstruct the type info of a container
        elif type == 'C':
            print(f'[VPLOT CHAT] feature CONTAINER not implemented yet')
        else:
            print(f'[VPLOT CHAT ERROR] LLM does not return A/B/C. You have to fine-tune the prompt to match the rule.')

    @classmethod
    def handle_plot(cls, viewname: str, entries_text: str, init_vql: str = '', if_export: bool = False) -> bool:
        print(f'+ vplot {viewname = } {entries_text = }')
        parsetree = cls.parser.parse(entries_text)
        entries: list[VPlotHandler.Entry] = []
        for entry in cls.scan_arguments(child_as_tree(parsetree, 0)):
            entries.append(entry)
        try:
            code = cls.synthesize_viewcl(viewname, entries, init_vql)
        except:
            return False
        print(f'  > ViewCL code:\n{code}')
        core.sync(code, if_export)
        return True

    @classmethod
    def handle_list(cls, symbol: str):
        print(f'+ vplot --list {symbol = }')
        gtype = KValue.gdb_eval(symbol).gtype
        gdb_type = gtype.target().inner if gtype.is_pointer() else gtype.inner
        fields =[f'  {gdb_field.type!s} {gdb_field.name}' for gdb_field in gdb_type.fields()]
        print('\n'.join(fields))

    @classmethod
    def handle_file(cls, filename: str, if_export: bool = False):
        src_path = VIEWCL_SRC_DIR / filename
        print(f'+ vplot --file {filename}')
        core.sync_file(src_path, if_export)

    @classmethod
    def synthesize_viewcl(cls, diagname: str, entries: list[Entry], init_vql: str = '') -> str:
        print(f'  + synthesize_viewcl {diagname = } {entries = }')
        shape_decl_list: list[str] = []
        plot_list: list[str] = []
        index = 0
        for entry in entries:
            if isinstance(entry, cls.Entry1):
                shape_name = f'__Shape_Anon_{index}'
                gval = KValue.gdb_eval(entry.symbol)
                fields = ', '.join(entry.fields)
                shape_decl = f'define {shape_name} as Box<{gval.gtype.tag}> [ Text {fields} ]'
                shape_decl_list.append(shape_decl)
                plot_inst = f'    plot {shape_name}(${{{entry.symbol}}})'
                plot_list.append(plot_inst)
                index += 1
            else:
                plot_inst = f'    plot {entry.shape}(${{{entry.symbol}}})'
                plot_list.append(plot_inst)
        code_diagdef = f'diag {diagname} {{\n' + '\n'.join(plot_list) + f'\n}}'
        if init_vql:
            code_diagdef += f' with {{\n' + init_vql + f'}}'
        code = 'import stdlib\n' + '\n'.join(shape_decl_list) + '\n' + code_diagdef + '\n'
        return code

    @classmethod
    def scan_arguments(cls, parsetree: ParseTree, skip: int = 0) -> Generator[Entry, None, None]:
        for node in scan_children_as_tree(parsetree, skip):
            if len(node.children) == 1 or str(child_as_token(node, 1)) == '{':
                yield cls.parse_entry_1(node)
            else:
                yield cls.parse_entry_2(node)

    @classmethod
    def parse_entry_1(cls, node: Tree[Token]) -> Entry1:
        node_symbol = child_as_tree(node, 0)
        symbol = serialize(node_symbol)
        fields: list[str] = []
        if len(node.children) > 1:
            node_fields = child_as_tree(node, 2)
            for node_field in node_fields.children:
                field = serialize(node_field)
                fields.append(field)
        return cls.Entry1(symbol, fields)

    @classmethod
    def parse_entry_2(cls, node: Tree[Token]) -> Entry2:
        node_shape  = child_as_tree(node, 0)
        node_symbol = child_as_tree(node, 2)
        shape  = serialize(node_shape)
        symbol = serialize(node_symbol)
        return cls.Entry2(shape, symbol)
