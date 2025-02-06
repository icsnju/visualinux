from visualinux import *
from visualinux.runtime.gdb import gdb

import re

class GDBType:

    def __init__(self, inner: gdb.Type) -> None:
        self.__inner = inner
        self.name = str(inner)
        self.tag = ''
        if self.is_pointer():
            self.tag = self.target().tag
        elif self.is_array():
            self.tag = self.name
        else:
            self.tag = self.name.split(' ')[-1]
        self.__sizeof = self.inner.sizeof
        self.__target_size = self.target().sizeof() if self.is_pointer() else self.sizeof()
        self.__is_scalar = self.target().is_scalar() if self.is_pointer() else self.inner.is_scalar

    def __str__(self) -> str:
        return self.name

    def __repr__(self) -> str:
        return self.__str__()

    def __eq__(self, other) -> bool:
        if isinstance(other, GDBType):
            return self.inner == other.inner
        return False

    @property
    def inner(self) -> gdb.Type:
        return self.__inner

    def sizeof(self) -> int:
        return self.__sizeof

    def target_size(self) -> int:
        return self.__target_size

    __gtype_cache: 'dict[tuple[str, str], tuple[GDBType, int]]' = {}

    def get_field_info(self, field_def: str) -> 'tuple[GDBType, int]':
        if (index := field_def.find('[')) == -1:
            fieldname = field_def
            fieldindex = -1
        else:
            fieldname = field_def[: index]
            fieldindex = int(field_def[index + 1 : -1])
        if (self.name, field_def) in self.__gtype_cache:
            return self.__gtype_cache[(self.name, field_def)]
        try:
            if vl_debug_on(): printd(f'get_field_info({field_def = } => {fieldname = }, {fieldindex = }) for {self.inner!s}')
            base = gdb.Value(0).cast(self.inner)[fieldname].address
            gtype = GDBType(base.type)
            offset = int(base)
            if vl_debug_on(): printd(f'    {fieldname = } => {gtype = }, {offset = }')
            if fieldindex != -1:
                if not gtype.name.endswith(']'):
                    print(f'WARNING: for {field_def = }, {fieldindex = } but {gtype = }')
                if vl_debug_on(): printd(f'    {fieldindex = } => {gtype.target() = }, {gtype.target().target() = }, {gtype.target().target().pointer() = }')
                gtype = gtype.target().target().pointer()
                offset += gtype.target_size() * fieldindex
                if vl_debug_on(): printd(f'    {fieldindex = } => {gtype = }, {offset = }')
            self.__gtype_cache[(self.name, field_def)] = gtype, offset
            return gtype, offset
        except Exception as e:
            raise fuck_exc(e.__class__, f'get_field_info({field_def = }) failed, ' + str(e))

    def is_scalar(self) -> bool:
        return self.__is_scalar
        # if self.is_pointer():
        #     return self.target().is_scalar()
        # return self.inner.is_scalar

    def is_pointer(self) -> bool:
        return self.inner.code == gdb.TYPE_CODE_PTR

    def is_array(self) -> bool:
        return self.inner.code == gdb.TYPE_CODE_ARRAY

    def is_struct(self) -> bool:
        return self.inner.code == gdb.TYPE_CODE_STRUCT

    def is_union(self) -> bool:
        return self.inner.code == gdb.TYPE_CODE_UNION

    def is_function(self) -> bool:
        return self.inner.code == gdb.TYPE_CODE_FUNC

    def array_length(self) -> int:
        if not self.is_array():
            raise fuck_exc(AssertionError, f'try array_length() on non-array ktype {self!s}')
        try:
            matched = re.search(r'\[(\d+)\]', self.name)
            assert matched
            return int(matched.group(1))
        except Exception as e:
            raise fuck_exc(e.__class__, str(e))

    def pointer(self) -> 'GDBType':
        return GDBType(self.inner.pointer())

    __target_cache: dict[str, 'GDBType'] = {}

    def target(self) -> 'GDBType':
        try:
            if self.name not in self.__target_cache:
                self.__target_cache[self.name] = GDBType(self.inner.target())
            return self.__target_cache[self.name]
        except Exception as e:
            raise fuck_exc(e.__class__, str(e))

    __type_lookup_cache: dict[str, 'GDBType'] = {}

    @classmethod
    def lookup(cls, typename: str) -> 'GDBType':
        try:
            if vl_debug_on(): printd(f'gdb.lookup_type {typename}')
            type = cls.__lookup(typename)
            if vl_debug_on(): printd(f'gdb.lookup_type {typename} => {type!s}')
            return type
        except Exception as e:
            raise fuck_exc(AssertionError, f'GDBType.lookup({typename}) failed: ' + str(e))

    @classmethod
    def lookup_safe(cls, typename: str) -> 'GDBType | None':
        try:
            return cls.__lookup(typename)
        except:
            return None

    @classmethod
    def __lookup(cls, typename: str) -> 'GDBType':
        if typename not in cls.__type_lookup_cache:
            try: gdbtype = gdb.lookup_type(f'struct {typename}').pointer()
            except: pass
            try: gdbtype = gdb.lookup_type(typename).pointer()
            except: pass
            try: gdbtype = gdb.lookup_type(f'enum {typename}')
            except: pass
            try: gdbtype = gdb.lookup_type(f'union {typename}')
            except: pass
            assert gdbtype
            cls.__type_lookup_cache[typename] = GDBType(gdbtype)
        return cls.__type_lookup_cache[typename]

    @classmethod
    def basic(cls, typename: str) -> 'GDBType':
        if typename not in cls.__type_lookup_cache:
            try:
                gdbtype = gdb.lookup_type(typename)
            except Exception as e:
                raise fuck_exc(AssertionError, f'GDBType.basic({typename}) failed: ' + str(e))
            cls.__type_lookup_cache[typename] = GDBType(gdbtype)
        return cls.__type_lookup_cache[typename]

# basic type preload

for typename in ['char', 'short', 'int', 'long']:
    GDBType.basic(typename)
    GDBType.basic(f'unsigned {typename}')

for size in [8, 16, 32, 64]:
    for sign in ['', 'u']:
        GDBType.basic(f'{sign}int{size}_t')

for typename in ['uintptr_t']:
    GDBType.basic(typename)

ptr_size: int = GDBType.basic('unsigned long').sizeof() * 8
gtype_ptr_void = GDBType.lookup('void')
