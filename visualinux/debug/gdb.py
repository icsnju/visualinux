'''Fake python-gdb APIs for fast debugging without starting up a gdb server.
All gdb.Value are filled with fucking random numbers.
All type checking will be passed in any context.
'''

from typing_extensions import TypeAlias
import random

error = Exception

def parse_and_eval(__expression: str) -> 'Value':
    return Value.fuck()

def eval(__expression: str) -> 'Value':
    return Value.fuck()

def execute(__inst: str):
    pass

class Thread:
    num: int
    def __init__(self, num: int) -> None:
        self.num = num
def selected_thread():
    return Thread(1)

# Enums

TYPE_CODE_PTR: int = 1 << 0
TYPE_CODE_ARRAY: int = 1 << 1
TYPE_CODE_STRUCT: int = 1 << 2
TYPE_CODE_UNION: int
TYPE_CODE_ENUM: int
TYPE_CODE_FLAGS: int
TYPE_CODE_FUNC: int
TYPE_CODE_INT: int
TYPE_CODE_FLT: int
TYPE_CODE_VOID: int
TYPE_CODE_SET: int
TYPE_CODE_RANGE: int
TYPE_CODE_STRING: int
TYPE_CODE_BITSTRING: int
TYPE_CODE_ERROR: int
TYPE_CODE_METHOD: int
TYPE_CODE_METHODPTR: int
TYPE_CODE_MEMBERPTR: int
TYPE_CODE_REF: int
TYPE_CODE_RVALUE_REF: int
TYPE_CODE_CHAR: int
TYPE_CODE_BOOL: int
TYPE_CODE_COMPLEX: int
TYPE_CODE_TYPEDEF: int
TYPE_CODE_NAMESPACE: int
TYPE_CODE_DECFLOAT: int
TYPE_CODE_INTERNAL_FUNCTION: int

# Values

_ValueOrNative: TypeAlias = 'bool | float | str | Value'
_ValueOrInt: TypeAlias = 'Value | int'

class Value:
    address: 'Value | None'
    is_optimized_out: bool
    type: 'Type'
    dynamic_type: 'Type'
    is_lazy: bool

    def __index__(self) -> int: ...
    def __int__(self) -> int: return int(self._val)
    def __float__(self) -> float: ...
    def __add__(self, other: _ValueOrInt) -> 'Value': ...
    def __sub__(self, other: _ValueOrInt) -> 'Value': ...
    def __mul__(self, other: _ValueOrInt) -> 'Value': ...
    def __truediv__(self, other: _ValueOrInt) -> 'Value': ...
    def __mod__(self, other: _ValueOrInt) -> 'Value': ...
    def __and__(self, other: _ValueOrInt) -> 'Value': ...
    def __or__(self, other: _ValueOrInt) -> 'Value': ...
    def __xor__(self, other: _ValueOrInt) -> 'Value': ...
    def __lshift__(self, other: _ValueOrInt) -> 'Value': ...
    def __rshift__(self, other: _ValueOrInt) -> 'Value': ...
    def __eq__(self, other: _ValueOrInt) -> bool:
        if isinstance(other, Value):
            return self._val == other._val
        else:
            return self._val == other
    def __ne__(self, other: _ValueOrInt) -> bool: ...  # type: ignore[override]
    def __lt__(self, other: _ValueOrInt) -> bool: ...
    def __le__(self, other: _ValueOrInt) -> bool: ...
    def __gt__(self, other: _ValueOrInt) -> bool: ...
    def __ge__(self, other: _ValueOrInt) -> bool: ...
    def __getitem__(self, key: 'int | str | Field') -> 'Value':
        return Value.fuck()
    def __call__(self, *args: _ValueOrNative) -> 'Value': ...
    def __init__(self, val: _ValueOrNative) -> None:
        self._val = val
        if val == 0:
            self.address = None
        else:
            self.address = Value(0)
        self.type = Type()
    def cast(self, type: 'Type') -> 'Value':
        return self
    def dereference(self) -> 'Value': return self
    def referenced_value(self) -> 'Value': ...
    def reference_value(self) -> 'Value': ...
    def const_value(self) -> 'Value': ...
    def dynamic_cast(self, type: 'Type') -> 'Value': ...
    def reinterpret_cast(self, type: 'Type') -> 'Value': ...
    def format_string(
        self,
        raw: bool = ...,
        pretty_arrays: bool = ...,
        pretty_structs: bool = ...,
        array_indexes: bool = ...,
        symbols: bool = ...,
        unions: bool = ...,
        address: bool = ...,
        deref_refs: bool = ...,
        actual_objects: bool = ...,
        static_members: bool = ...,
        max_elements: int = ...,
        max_depth: int = ...,
        repeat_threshold: int = ...,
        format: str = ...,
    ) -> str:
        return str(self._val)
    def string(self, encoding: str = ..., errors: str = ..., length: int = ...) -> str: ...

    @classmethod
    def fuck(cls) -> 'Value':
        return Value(random.randint(1, 1 << 31))

# Types

class Block:
    pass
def lookup_type(name: str, block: Block = ...) -> 'Type':
    return Type()

class Type:
    alignof: int
    code: int = TYPE_CODE_PTR
    dynamic: bool
    name: str = 'fucktype'
    sizeof: int = 233
    tag: str | None
    is_scalar: bool = True

    def __getitem__(self, name: str) -> 'Field':
        return Field()

    def fields(self) -> list['Field']: ...
    def array(self, n1: int | Value, n2: int | Value = ...) -> 'Type': ...
    def vector(self, n1: int, n2: int = ...) -> 'Type': ...
    def const(self) -> 'Type': ...
    def volatile(self) -> 'Type': ...
    def unqualified(self) -> 'Type': ...
    def range(self) -> tuple[int, int]: ...
    def reference(self) -> 'Type': ...
    def pointer(self) -> 'Type':
        tt = Type()
        tt.code = TYPE_CODE_PTR
        return tt
    def strip_typedefs(self) -> 'Type': ...
    def target(self) -> 'Type':
        tt = Type()
        tt.code = 0
        return tt
    def template_argument(self, n: int, block: Block = ...) -> 'Type': ...
    def optimized_out(self) -> Value: ...

class Field:
    bitpos: int
    enumval: int
    name: str | None
    artificial: bool
    is_base_class: bool
    bitsize: int
    type: Type
    parent_type: Type
