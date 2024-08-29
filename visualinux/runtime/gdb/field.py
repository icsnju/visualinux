from visualinux import *
from visualinux import gdb
from visualinux.runtime.gdb.type import GDBType

class GDBField:

    def __init__(self, inner: gdb.Field) -> None:
        self.__inner = inner

    def __str__(self) -> str:
        return f'GDBField({self.name}, {self.type.name})'

    def __repr__(self) -> str:
        return self.inner.__repr__()

    @property
    def inner(self) -> gdb.Field:
        return self.__inner

    @property
    def name(self) -> str | None:
        return self.inner.name

    @property
    def type(self) -> GDBType:
        return GDBType(self.inner.type)
