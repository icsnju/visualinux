from visualinux.term import *
from visualinux.dsl.parser.utils import *
from visualinux.dsl.parser.viewql_units import *
from visualinux.dsl.model.decorators import *

# ======================================================================
# View classes to eliminate common fields/methods.
# Note that such classes should not be used in type annotations since its subclasses have quite different semantics.
# ======================================================================

class ShapeDecl(metaclass=ABCMeta):

    def __init__(self, name: str, term: Term | None) -> None:
        self.name  = name
        self.term  = term

    def __str__(self) -> str:
        return self.format_string()

    @abstractmethod
    def format_string(self, depth: int = 0) -> str:
        pass

    def format_string_head(self) -> str:
        name = self.name
        term = f'<{self.term}>' if self.term else ''
        return name + term

class ShapeDef(metaclass=ABCMeta):
    
    def __init__(self, root: Term | None, label: str, decl: ShapeDecl) -> None:
        self.root  = root
        self.label = label
        self.decl  = decl

    def __str__(self) -> str:
        return self.format_string()

    @abstractmethod
    def format_string(self, depth: int = 0) -> str:
        pass

    def format_string_head(self) -> str:
        hd = f'({self.label}: {self.root})' if self.label else f'({self.root})'
        return self.decl.format_string_head() + hd

    @property
    def name(self): return self.decl.name
    @property
    def term(self): return self.decl.term

# ======================================================================
# primitive shape definition
# ======================================================================

class TextDecl(ShapeDecl):

    def __init__(self, typo: TextFormat) -> None:
        super().__init__('Text', None)
        self.typo = typo

    def format_string(self, depth: int = 0) -> str:
        return padding(depth) + self.format_string_head()

    def format_string_head(self) -> str:
        return f'{self.name}<{self.typo}>'

class TextDef(ShapeDef):

    def __init__(self, root: Term, label: str, typo: TextFormat) -> None:
        super().__init__(root, label, TextDecl(typo))
        self.decl: TextDecl

    def format_string(self, depth: int = 0) -> str:
        return padding(depth) + self.format_string_head()

    @property
    def typo(self): return self.decl.typo

class LinkDecl(ShapeDecl):

    def __init__(self) -> None:
        super().__init__('Link', None)

    def format_string(self, depth: int = 0) -> str:
        return padding(depth) + self.format_string_head()

class LinkDef(ShapeDef):

    def __init__(self, target: TermAsShape | None, label: str, link_type: LinkType) -> None:
        root = target
        super().__init__(root, label, LinkDecl())
        self.link_type = link_type
        self.decl: LinkDecl

    def format_string(self, depth: int = 0) -> str:
        return self.decl.format_string(depth) + f' {self.label} {self.link_type} {self.root}'

    @property
    def target(self): return self.root

class InnerShapeDecl(ShapeDecl):

    def __init__(self) -> None:
        super().__init__('BoxInner', None)

    def format_string(self, depth: int = 0) -> str:
        return padding(depth) + self.format_string_head()

class InnerShapeDef(ShapeDef):

    def __init__(self, root: Term, label: str) -> None:
        super().__init__(root, label, InnerShapeDecl())

    def format_string(self, depth: int = 0) -> str:
        return self.decl.format_string(depth) + f' {self.label}: {self.root}'

# ======================================================================
# box definition, view and where block
# ======================================================================

@dataclass
class ViewDef:

    name: str
    parent: str | None
    insts: list['ViewInst']
    annotation: str

    def __str__(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:

        lines: list[str] = []

        if self.annotation:
            lines.append(padding(depth) + f'# {self.annotation} #')

        if self.parent:
            head = f':{self.parent} => :{self.name}'
        else:
            head = f':{self.name}'
        lines.append(padding(depth) + f'{head} [')

        if self.insts:
            for inst in self.insts:
                lines.append(inst.format_string(depth + 1))
            lines.append(padding(depth) + ']')
        else:
            lines[-1] += ']'

        return '\n'.join(lines)

@dataclass
class ViewOpt:
    
    name_temp: str

    def __str__(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:
        return padding(depth)

@dataclass
class WhereBlock:

    inst_seq: list['Assignment']

    def __str__(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:
        lines: list[str] = []
        lines.append(padding(depth) + ' where {')
        for inst in self.inst_seq:
            lines.append(inst.format_string(depth + 1))
        lines.append(padding(depth) + '}')
        return '\n'.join(lines)

class BoxDecl(ShapeDecl):

    def __init__(self, name: str, term: Term | None,
                 body: list[ViewDef], where: WhereBlock | None, recursion: bool = False) -> None:
        super().__init__(name, term)
        self.body      = body
        self.where     = where
        self.recursion = recursion

    @classmethod
    def copy_change(cls, typedef: 'BoxDecl', *, term: Term | None, recursion: bool) -> 'BoxDecl':
        # shadow copy is ok since our dsl doesn't allow type modification or redefinition
        if term is None: term = typedef.term
        return BoxDecl(typedef.name, term, typedef.body, typedef.where, recursion)

    @classmethod
    def creat_in_typedef(cls, name: str, term: Term | None, body: list[ViewDef]) -> 'BoxDecl':
        return BoxDecl(name, term, body=body, where=None, recursion=False)

    def format_string(self, depth: int = 0) -> str:
        lines = [padding(depth) + self.format_string_head()]
        if len(self.body) == 1:
            lines[-1] += self.body[0].format_string(depth).removeprefix(padding(depth) + ':default')
        elif self.body:
            lines[-1] += ' {'
            for view in self.body:
                lines.append(view.format_string(depth + 1))
            lines.append(padding(depth) + '}')
        if self.where:
            lines[-1] += self.where.format_string(depth).removeprefix(padding(depth))
        return '\n'.join(lines)

    def format_string_head(self) -> str:
        name = self.name
        term = f'<{self.term}>' if self.term else ''
        rc = ':Recursion' if self.recursion else ''
        return name + term + rc

class BoxDef(ShapeDef):

    def __init__(self, root: Term | None, label: str, decl: BoxDecl) -> None:
        super().__init__(root, label, decl)
        self.decl: BoxDecl

    @classmethod
    def creat_in_place(cls, root: Term | None, term: Term | None, label: str,
                       body: list[ViewDef], where: WhereBlock | None) -> 'BoxDef':
        decl = BoxDecl('Box', term, body, where, False)
        return BoxDef(root, label, decl)

    @classmethod
    def creat(cls, root: Term, term: Term | None, label: str,
              typedef: BoxDecl, recursion: bool) -> 'BoxDef':
        decl = BoxDecl.copy_change(typedef, term=term, recursion=recursion)
        return BoxDef(root, label, decl)

    def format_string(self, depth: int = 0) -> str:
        return self.decl.format_string(depth).replace(self.decl.format_string_head(), self.format_string_head())

    def format_string_head(self) -> str:
        hd = f'({self.label}: {self.root})' if self.label else f'({self.root})'
        return self.decl.format_string_head() + hd

    @property
    def body(self): return self.decl.body
    @property
    def where(self): return self.decl.where
    @property
    def recursion(self): return self.decl.recursion

# ======================================================================
# container definition
# ======================================================================

@dataclass
class ContainerLoop:

    item: str
    inst_seq: list['YieldOpt | Assignment']

    def __str__(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:

        lines: list[str] = []

        lines.append(padding(depth) + f'.forEach |{self.item}| {{')
        for inst in self.inst_seq:
            lines.append(inst.format_string(depth + 1))
        lines.append(padding(depth) + '}')

        return '\n'.join(lines)

@dataclass
class YieldOpt:

    item: 'TermAsShape | BoxDef | ContainerDef'

    def __str__(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:
        item = self.item.format_string(depth).removeprefix(padding(depth))
        return padding(depth) + f'yield {item}'

class ContainerDecl(ShapeDecl):

    def __init__(self, name: str, term: Term | None, body: ContainerLoop) -> None:
        super().__init__(name, term)
        self.body  = body

    @classmethod
    def creat_in_typedef(cls, name: str, term: Term | None, body: ContainerLoop) -> 'ContainerDecl':
        return ContainerDecl(name, term, body)

    def format_string(self, depth: int = 0) -> str:
        lines = [padding(depth) + self.format_string_head()]
        if self.body:
            xlines = self.body.format_string(depth).split('\n', maxsplit=1)
            assert len(xlines) == 2
            lines[0] += xlines[0].removeprefix(padding(depth))
            lines.append(xlines[1])
        return '\n'.join(lines)

class ContainerDef(ShapeDef):

    def __init__(self, root: Term | None, label: str, decl: ShapeDecl) -> None:
        super().__init__(None, label, decl)
        self.root = root
        self.decl: ContainerDecl

    @classmethod
    def creat_in_place(cls, root: Term | None, name: str, term: Term | None, label: str,
                       body: ContainerLoop) -> 'ContainerDef':
        decl = ContainerDecl(name, term, body)
        return ContainerDef(root, label, decl)

    @classmethod
    def creat(cls, root: Term, label: str, typedef: ContainerDecl) -> 'ContainerDef':
        return ContainerDef(root, label, typedef)

    def format_string(self, depth: int = 0) -> str:
        return self.decl.format_string(depth).replace(self.decl.format_string_head(), self.format_string_head())

    @property
    def body(self): return self.decl.body

@dataclass
class ContainerConvDef:

    name: str
    root: TermAsShape
    distill: str

    def __str__(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:
        return padding(depth) + f'{self.name}.convFrom({self.root!s})'

# ======================================================================
# switch-case rhs
# ======================================================================

@dataclass
class CaseDef:

    case_exprs: list[Term]
    shapedef: 'BoxDef | ContainerDef | ContainerConvDef | SwitchCaseDef'

    def __str__(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:
        case_exprs = ', '.join([expr.format_string() for expr in self.case_exprs])
        lines = [
            padding(depth) + f'case {case_exprs}:',
            self.shapedef.format_string(depth + 1)
        ]
        return '\n'.join(lines)

@dataclass
class SwitchCaseDef:

    switch_expr: Term
    cases: list[CaseDef]
    otherwise: 'BoxDef | ContainerDef | ContainerConvDef | SwitchCaseDef | None'

    def __str__(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:
        lines = [padding(depth) + f'switch {self.switch_expr.format_string()} {{']
        for case in self.cases:
            lines.append(case.format_string(depth))
        if self.otherwise:
            lines += [
                padding(depth) + f'otherwise:',
                self.otherwise.format_string(depth + 1)
            ]
        return '\n'.join(lines)

# ======================================================================
# top-level unit
# ======================================================================

@dataclass(kw_only=True)
class Assignment:

    lhs: str
    rhs: Term | SwitchCaseDef | BoxDef | ContainerDef | ContainerConvDef

    def __str__(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:
        rhs = self.rhs.format_string(depth).removeprefix(padding(depth))
        return padding(depth) + f'{self.lhs} = {rhs}'

PlotTargetDef = TermAsShape | BoxDef | ContainerDef | ContainerConvDef | SwitchCaseDef

@dataclass
class DiagramDef:

    name: str
    plots: list['PlotTargetDef']
    init_viewql: ViewQLCode

    def __str__(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:
        lines = [padding(depth) + f'diag {self.name} {{']
        for plot in self.plots:
            lines.append(plot.format_string(depth + 1))
        lines.append(padding(depth) + '}')
        if self.init_viewql:
            lines[-1] += ' with {'
            lines.append(self.init_viewql.format_string(depth + 1))
            lines.append(padding(depth) + '}')
        return '\n'.join(lines)

Instruction = Assignment | DiagramDef
ViewInst = TextDef | LinkDef | InnerShapeDef | BoxDef | ContainerDef | ViewOpt
