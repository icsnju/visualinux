from visualinux import *
from visualinux.runtime.gdb import gdb
from visualinux.runtime.gdb.wrappers import *

from visualinux.evaluation import evaluation_counter

class GDBAdaptor:

    def __init__(self) -> None:
        self.cache: dict[str, gdb.Value] = {}

    def reset(self) -> None:
        self.cache.clear()

    def eval(self, expr: str) -> GDBValue:
        if expr not in self.cache:
            if vl_debug_on(): printd(f'gdb.parse_and_eval({expr})')
            gdb_val = gdb.parse_and_eval(expr)
            if not gdb_val.type.is_scalar and not gdb_val.type.code == gdb.TYPE_CODE_PTR:
                gdb_val = gdb_val.address
            if vl_debug_on(): printd(f'gdb.parse_and_eval({expr}) => {gdb_val.format_string()}')
            self.cache[expr] = gdb_val
        gval = GDBValue(self.cache[expr])
        # if not gval.is_pointer():
        #     gval = gval.address_of()
        # if not gval.is_pointer():
        #     raise TypeError('GDBAdaptor.eval: the value should be a pointer')
        if vl_debug_on(): printd(f'gdb_adaptor.eval({expr}) => {gval!s}')
        return gval

    def preload(self, addr: int, gtype: GDBType) -> None:
        pass
        # if vl_debug_on(): printd(f'preload({addr:#x}, {typename})')
        # self.dumpset.preload(addr, gtype.target_size())

    def read_scalar(self, addr: int, size: int, signed: bool = True) -> int:
        evaluation_counter.bytes += size
        if vl_debug_on(): printd(f'gdump.fuckread {addr=:#x} uint{size * 8}_t')
        # gval = gdb.parse_and_eval(f'*((uint{size * 8}_t *){addr:#x})')
        # return int(gval)
        return int(gdb.Value(addr).cast(gdb.lookup_type(f'uint{size * 8}_t').pointer()).dereference())

    def read_string(self, addr: int, size: int) -> str:
        evaluation_counter.bytes += size
        if vl_debug_on(): printd(f'read_string {addr = :#x}, {size = }')
        return gdb.Value(addr).cast(gdb.lookup_type(f'char').pointer()).format_string(raw=True, symbols=False, address=False, format='s')[1 : -1]

gdb_adaptor = GDBAdaptor()
