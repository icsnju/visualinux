from visualinux import *

padding: Callable[[int], str] = lambda d : ' ' * 4 * d

class TermType(Enum):

    Variable = auto()
    CExpr    = auto()
    Type     = auto()
    Field    = auto()
    ItemVar  = auto()

    @property
    def fmt_prefix(self) -> str:
        if self == TermType.Variable or self == TermType.ItemVar:
            return '@'
        if self == TermType.CExpr:
            return '$'
        return ''

class Term:

    def __init__(self, category: TermType, head: str, field_seq: list[str]) -> None:
        self.category  = category
        self.head      = head
        self.field_seq = field_seq
        self.__fmt_str = '.'.join([self.category.fmt_prefix + self.head] + self.field_seq).removeprefix('.')

    def __str__(self) -> str:
        return self.__fmt_str

    def __repr__(self) -> str:
        return f'Term.{self.category.name}({self.__fmt_str})'

    def __hash__(self) -> int:
        return hash(str(self))

    def __eq__(self, other) -> bool:
        if isinstance(other, Term):
            return self.category == other.category and str(self) == str(other)
        return False

    def format_string_head(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:
        return padding(depth) + self.__fmt_str
        head = self.category.fmt_prefix + self.head
        return padding(depth) + '.'.join([head] + [field for field in self.field_seq]).removeprefix('.')

    def extend(self, field_seq: list[str]):
        return Term(self.category, self.head, self.field_seq + field_seq)

    def is_variable(self) -> bool:
        return self.category == TermType.Variable
    def is_cexpr(self) -> bool:
        return self.category == TermType.CExpr
    def is_type(self) -> bool:
        return self.category == TermType.Type
    def is_field(self) -> bool:
        return self.category == TermType.Field
    def is_item_variable(self) -> bool:
        return self.category == TermType.ItemVar

    @classmethod
    def Variable(cls, text: str) -> 'Term':
        return Term(TermType.Variable, text, [])
    @classmethod
    def CExpr(cls, cexpr: str) -> 'Term':
        return Term(TermType.CExpr, cexpr, [])
    @classmethod
    def Type(cls, text: str) -> 'Term':
        return Term(TermType.Type, text, [])
    @classmethod
    def Field(cls, text: str | list[str]) -> 'Term':
        if isinstance(text, list):
            return Term(TermType.Field, '', text)
        return Term(TermType.Field, '', text.split('.'))
    @classmethod
    def ItemVar(cls, text: str)  -> 'Term':
        return Term(TermType.ItemVar, text, [])

class TermAsShape(Term):
    @classmethod
    def Variable(cls, text: str) -> 'TermAsShape':
        return TermAsShape(TermType.Variable, text, [])

# ======================================================================
# shape+view+anno for llm usage
# ======================================================================

@dataclass
class ShapeDesc:

    shapename: str
    viewname: str
    annotation: str

    def to_prompt(self):
        return f'{self.shapename}, {self.viewname}: {self.annotation}'
