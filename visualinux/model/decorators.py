from visualinux import *
from visualinux.term import *

class TFType(Enum):
    AUTO = auto()
    INT  = auto()
    ENUM = auto()
    BOOL = auto()
    CHAR = auto()
    STR  = auto()
    PTR  = auto()
    FPTR = auto()
    FLAG = auto()
    EMOJI = auto()

class TextFormat:

    def __init__(self, type: TFType, desc: str) -> None:
        self.type = type
        self.desc = desc
        if type == TFType.INT:
            if desc == 'raw_ptr':
                desc = 'u64:x'
            size, fmt = desc.split(':', maxsplit=1)
            if not size[0].isdigit():
                sign = size[0]
                size = size[1 :]
            else:
                sign = ''
            self.sign = sign if sign == 'u' else ''
            self.size = int(size)
            self.fmt  = fmt

    def __str__(self) -> str:
        return f'{self.type!s}[{self.desc}]'

    def __repr__(self) -> str:
        return self.__str__()

    def is_unsigned(self):
        return self.sign == 'u'

    @classmethod
    def gen_default(cls) -> 'TextFormat':
        return TextFormat(TFType.AUTO, '')

    def to_term(self) -> Term | None:
        match self.type:
            case TFType.INT:
                return self.int_to_term()
        return None

    def int_to_term(self) -> Term | None:
        typename = f'{self.sign}int{self.size}_t'
        return Term(TermType.Type, typename, [])

class LinkType(Enum):
    DIRECT = auto()
    REMOTE = auto()
    def __str__(self) -> str:
        match self:
            case LinkType.DIRECT: return '->'
            case LinkType.REMOTE: return '~>'
            case _: raise fuck_exc(AssertionError, f'LinkType.str unhandled {self}')
    def __repr__(self) -> str:
        return self.__str__()
    @classmethod
    def gen_from(cls, desc: str) -> 'LinkType':
        match desc:
            case '->': return LinkType.DIRECT
            case '~>': return LinkType.REMOTE
            case _: raise fuck_exc(AssertionError, f'LinkType.gen_from illegal {desc = }')

@dataclass
class Distiller:
    name: str
    cond: Term | None
    def __str__(self)  -> str: return f'{self.name}: {self.cond if self.cond else ""}'
    def __repr__(self) -> str: return self.__str__()

    def __hash__(self) -> int:
        return hash((self.name, str(self.cond)))

    def __eq__(self, other) -> bool:
        if isinstance(other, Distiller):
            return self.name == other.name and self.cond == other.cond
        return False

ShapeStyle = dict[str, str]
