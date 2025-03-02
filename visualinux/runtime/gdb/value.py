from visualinux import *
from visualinux.runtime.gdb import gdb
from visualinux.runtime.gdb.type import GDBType
from visualinux.dsl.model.decorators import *

import re
import math

class GDBValue:

    def __init__(self, inner: gdb.Value) -> None:
        self.__inner = inner
        self.__type  = GDBType(inner.type)

    def __str__(self) -> str:
        ss = self.raw_string()
        return f'(({self.type_name}) {ss!s})'

    def __repr__(self) -> str:
        ss_addr = f' on addr {self.address_of():#x}' if self.is_addressable() else ', not addressable'
        return f'GDBValue(({self.type_name}) {self.inner!s})' + ss_addr

    def __hash__(self) -> int:
        return hash(str(self.inner))

    def __eq__(self, other) -> bool:
        if isinstance(other, GDBValue):
            return self.inner == other.inner
        if isinstance(other, int | bool):
            return self.inner == other
        return False

    def __int__(self) -> int:
        return int(self.inner)

    @property
    def inner(self) -> gdb.Value:
        return self.__inner
    @property
    def type(self) -> GDBType:
        return self.__type

    @property
    def type_name(self) -> str:
        return str(self.type)
    @property
    def type_stat_name(self) -> str:
        # print(f'???tag_v {self.type.inner.name} | {self.type.inner.tag}')
        if self.is_pointer():
            return self.dereference().type_stat_name
        if self.is_array():
            return self.type_name
        return self.type_name.split(' ')[-1]

    def is_addressable(self) -> bool:
        return self.inner.address is not None

    def address_of(self) -> 'GDBValue':
        try:
            assert self.inner.address
            return GDBValue(self.inner.address)
        except Exception as e:
            raise fuck_exc(e.__class__, f'{self.inner = !s}, ' + str(e))

    def dereference(self) -> 'GDBValue':
        try:
            return GDBValue(self.inner.dereference())
        except Exception as e:
            raise fuck_exc(e.__class__, f'{self.inner = !s}, ' + str(e))

    def fetch_string(self) -> str:
        try:
            return self.inner.string()
        except Exception as e:
            raise fuck_exc(e.__class__, f'{self.inner = !s}, ' + str(e))

    def raw_string(self, format: str = 'x') -> str:
        fmtstr: str = self.inner.format_string(raw=True, symbols=False, format=format)
        if (ii := fmtstr.rfind('<')) != -1:
            fmtstr = fmtstr[: ii-1]
        return fmtstr

    def value_string(self, typo: TextFormat | None = None) -> str:
        if typo:
            match typo.type:
                case TFType.AUTO: pass
                case TFType.INT:
                    fmt = typo.desc.split(':')[1]
                    if fmt == 'b':
                        return 'b' + self.raw_string(format='t')
                    if fmt == 'd' and typo.desc[0] == 'u': fmt = 'u'
                    return self.raw_string(format=fmt)
                case TFType.ENUM:
                    return str(self.inner)
                case TFType.BOOL:
                    return 'false' if self.inner == 0 else 'true'
                case TFType.CHAR:
                    return self.raw_string(format='c')
                case TFType.STR:
                    return self.value_string_str()
                case TFType.PTR:
                    return self.raw_string(format='x') # TODO: 'z' for filling leading zeros
                case TFType.FPTR:
                    if self.inner == 0:
                        return '<NULL>'
                    raw_str = self.inner.format_string(raw=True, symbols=False, format='a')
                    if matched := re.search(r'(\<.+\>?)', raw_str):
                        return matched.group(1)
                    return raw_str
                case TFType.FLAG:
                    return self.raw_string(format='t')
                case TFType.EMOJI:
                    return self.raw_string(format='d')
                case _: raise fuck_exc(AssertionError, f'unhandled {typo = }')
        if self.type_name.startswith('char ['):
            return self.value_string_str()
        if self.is_pointer() or self.type_stat_name == 'uintptr_t':
            return self.raw_string(format='x')
        else:
            return self.raw_string(format='d')

    def value_string_str(self) -> str:
        pchar = self.inner.cast(gdb.lookup_type('char').pointer())
        return pchar.format_string(raw=True, symbols=False, address=False, format='s')

    # below are fast entries for useful KType methods

    def sizeof(self) -> int:
        return self.type.sizeof()

    def is_scalar(self) -> bool:
        return self.type.is_scalar()

    def is_pointer(self) -> bool:
        return self.type.is_pointer()

    def is_array(self) -> bool:
        return self.type.is_array()

    def is_struct(self) -> bool:
        return self.type.is_struct()

    def is_union(self) -> bool:
        return self.type.is_union()

    def array_length(self) -> int:
        return self.type.array_length()
