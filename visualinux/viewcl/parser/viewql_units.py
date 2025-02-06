from visualinux import *
from visualinux.term import *

# ======================================================================
# primitives
# ======================================================================

@dataclass
class ExprSuffix:
    identifier: str
    opt: str

@dataclass
class Expression:

    head: str
    suffix: list[ExprSuffix]

    def __str__(self) -> str:
        return self.head + ''.join(f'{suf.opt}{suf.identifier}' for suf in self.suffix)

@dataclass
class CondOpt:

    opt: str
    lhs: Self | str
    rhs: Self | str

    def __str__(self) -> str:
        return f'({self.lhs!s} {self.opt} {self.rhs!s})'

@dataclass
class SetOpt:

    opt: str
    lhs: Self | str
    rhs: Self | str

    def __str__(self) -> str:
        return f'({self.lhs!s} {self.opt} {self.rhs!s})'

# ======================================================================
# top-level units
# ======================================================================

@dataclass
class Select:

    object_set: str
    selector:  Expression
    scope:     str | SetOpt
    alias:     str | None
    condition: CondOpt

    def __str__(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:
        basic = f'select {self.selector} from {self.scope}'
        alias = f' as {self.alias}' if self.alias else ''
        condition = f' where {self.condition}' if self.condition else ''
        return padding(depth) + f'{self.object_set} = {basic}{alias}{condition}'

@dataclass
class Update:

    set_expr:   SetOpt | str
    attr_name:  str
    attr_value: str

    def __str__(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:
        return padding(depth) + f'update {self.set_expr} with {self.attr_name}: {self.attr_value}'

ViewQLStmt = Select | Update
