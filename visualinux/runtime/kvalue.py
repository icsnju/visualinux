from visualinux import *
from visualinux.term import *
from visualinux.runtime.gdb.adaptor import *
from visualinux.runtime.gdb.type import *
from visualinux.model.decorators import *

from visualinux.evaluation import evaluation_counter

import re
import math

class KValue:

    def __init__(self, gtype: GDBType, value: int) -> None:
        self.gtype      = gtype
        self.value      = value # addr or scalar
        self.is_final   = False
        self.final_text: str | None = None

    @classmethod
    def FinalInt(cls, gtype: GDBType, value: int) -> 'KValue':
        kvalue = KValue(gtype, value)
        kvalue.is_final = True
        return kvalue

    @classmethod
    def FinalStr(cls, text: str) -> 'KValue':
        kvalue = KValue(GDBType.basic('char').pointer().pointer(), 0)
        kvalue.is_final = True
        kvalue.final_text = text
        return kvalue

    def __str__(self) -> str:
        return f'(({self.gtype.name}) {self.value:#x})'

    def __repr__(self) -> str:
        return self.__str__()

    def __hash__(self) -> int:
        return hash((self.gtype.name, str(self.value), str(self.final_text)))

    def __eq__(self, other: object) -> bool:
        if isinstance(other, KValue):
            return self.gtype == other.gtype and self.value == other.value
        if isinstance(other, int | bool):
            return self.value == other
        return False

    @property
    def address(self) -> int:
        if not self.gtype.is_pointer():
            raise TypeError(f'try to get address of non-pointer kobject: {self!s}')
        return self.value

    @property
    def json_data_key(self) -> str:
        return f'{self.value:#x}:{self.gtype.tag}'

    __dereference_cache: dict['KValue', 'KValue'] = {}
    @classmethod
    def reset(cls):
        cls.__dereference_cache.clear()

    @classmethod
    def gdb_eval(cls, expr: str) -> 'KValue':
        gval = gdb_adaptor.eval(expr)
        return KValue(gval.type, int(gval))

    @classmethod
    def eval(cls, term: Term, cast: Term | None = None) -> 'KValue':
        try:
            tstart = time.time()
            kobj = cls.gdb_eval(term.head).eval_fields(term.field_seq).cast(cast)
            tend = time.time()
            if vl_perf_on(): print(f'eval {int((tend - tstart) * 1000)} ms: {term!s}')
            return kobj
        except Exception as e:
            raise fuck_exc(e.__class__, f'{term = !s}, {cast = !s}, ' + str(e))

    def __get_field(self, field_def: str) -> 'KValue':
        if self.gtype.is_scalar() or not self.gtype.is_pointer() or self.gtype.target().is_pointer():
            raise fuck_exc(AssertionError, f'try get_field({field_def}) on a bad kvalue = {self!s}')
        if self.value == KValue_NULL.value:
            raise fuck_exc(AssertionError, f'try get_field({field_def}) on a nullptr kvalue = {self!s}')
        field_gtype, field_offset = self.gtype.get_field_info(field_def)
        kobj = KValue(field_gtype, self.address + field_offset)
        if vl_debug_on(): printd(f'get_field {self!s}[{field_def}] = {kobj!s}')
        return kobj

    def eval_field(self, field_def: str) -> 'KValue':
        return self.eval_fields([field_def])

    def eval_fields(self, field_defs: list[str]) -> 'KValue':
        if vl_debug_on(): printd(f'{self!s} eval_fields {field_defs}')
        if not self.gtype.is_pointer():
            if field_defs:
                raise fuck_exc(AssertionError, f'non-pointer kvalue {self!s} try eval_fields {field_defs}')
            return self
        if not field_defs:
            return self
        gdb_adaptor.preload(self.address, self.gtype)
        kobj = self
        for field_def in field_defs:
            kobj = kobj.__get_field(field_def)
            if vl_debug_on(): printd(f'    eval_fields {field_def} => {kobj!s}')
            if kobj.gtype.target().is_pointer():# and not kobj.gtype.target().is_scalar():
                kobj = kobj.dereference()
                if vl_debug_on(): printd(f'    eval_fields {field_def} dereferenced => {kobj!s}')
            if kobj.gtype.is_pointer() and kobj.value == KValue_NULL.value:
                return kobj
        if vl_debug_on(): printd(f'{self!s} eval_fields {field_defs} ok {kobj = !s}')
        return kobj

    def dereference(self) -> 'KValue':
        if self.final_text:
            return self
        if self in self.__dereference_cache:
            return self.__dereference_cache[self]
        try:
            assert self.gtype.is_pointer()
            if self.gtype.target().is_function():
                return self
            if self.gtype.target().name.find('char [') != -1:
                if vl_debug_on(): printd(f'dereference {self!s} read_string size={self.gtype.target().sizeof()}')
                text = gdb_adaptor.read_string(self.address, self.gtype.target().sizeof())
                return KValue.FinalStr(text)
            if self.gtype.name.endswith('char *'):
                fuck = gdb.Value(self.address).cast(self.gtype.inner)
                text = fuck.format_string(raw=True, symbols=False, address=False, format='s')[1 : -1]
                evaluation_counter.bytes += len(text)
                return KValue.FinalStr(text)
            signed = self.gtype.target().is_scalar() and not self.gtype.target().is_pointer()
            if vl_debug_on(): printd(f'dereference {self!s} read_scalar size={self.gtype.target().sizeof()} {signed=}')
            addr = gdb_adaptor.read_scalar(self.address, self.gtype.target().sizeof(), signed=signed)
            kobj = KValue(self.gtype.target(), addr)
            if vl_debug_on(): printd(f'dereference {self!s} => {kobj!s}')
            self.__dereference_cache[self] = kobj
            return kobj
        except Exception as e:
            raise fuck_exc(e.__class__, f'dereference {self!s} failed: ' + str(e))

    def decompose_array(self) -> 'list[KValue]':
        length = self.gtype.target().array_length()
        if vl_debug_on():
            printd(f'<decompose_array> {self!s}')
            printd(f'  {self.gtype.target() = !s}')
            printd(f'  {self.gtype.target().array_length() = !s}')
            printd(f'  {self.gtype.target().target() = !s}')
        item_gtype = self.gtype.target().target()
        arr: list[KValue] = []
        for i in range(length):
            kobj = KValue(item_gtype.pointer(), self.address + i * item_gtype.sizeof())
            if item_gtype.is_pointer():
                kobj = kobj.dereference()
            if vl_debug_on(): printd(f'  #{i}: {kobj!s}')
            arr.append(kobj)
        if vl_debug_on(): printd(f'<decompose_array> => {arr!s}')
        return arr

    def cast(self, term: Term | None, as_pointer: bool = False) -> 'KValue':
        if term is None or self.value == KValue_NULL.value:
            return self
        if self.gtype.tag == str(term):
            return self
        if vl_debug_on(): printd(f'[cast] {self = !s}, {term = !s}')
        # casted = KValue(self.inner.cast(type.inner))
        # gtype = gdb_adaptor.get_type(term.head)
        gtype = GDBType.lookup(term.head)
        if as_pointer: gtype = gtype.pointer()
        if term.field_seq:
            if vl_debug_on(): printd(f'[cast] cast_container_of')
            casted = KValue(gtype, self.value - KValue.offsetof(term))
        else:
            casted = KValue(gtype, self.value)
        if vl_debug_on(): printd(f'[cast] {self = !s}, {term = !s} => {casted!s}')
        return casted

    @classmethod
    def offsetof(cls, term: Term) -> int:
        if vl_debug_on(): printd(f'[KValue.offsetof] {term = !s}') 
        gtype = GDBType.lookup(term.head)
        if gtype.is_scalar():
            raise fuck_exc(AssertionError, f'KValue.offsetof() applied on scalar type: {term!s} => {gtype = !s}')
        kobj = KValue(gtype, 0)
        for fieldname in term.field_seq:
            gtype, offset = gtype.get_field_info(fieldname)
            kobj = KValue(gtype, kobj.value + offset)
        if vl_debug_on(): printd(f'[KValue.offsetof] {term = !s} => {kobj.address = !s}') 
        return kobj.address

    def value_uint(self, size: int) -> int:
        uint = (self.value + 2**size) % 2**size
        return uint

    def value_string(self, typo: TextFormat | None = None) -> str:
        if vl_debug_on(): printd(f'value_string of {self!s} with {typo=!s} ({self.final_text=})')
        if self.final_text:
            return self.final_text
        if typo:
            match typo.type:
                case TFType.AUTO: pass
                case TFType.INT:
                    if typo.is_unsigned():
                        value = self.value_uint(typo.size)
                    else:
                        value = self.value
                    if typo.fmt in ['b', 'o', 'x']:
                        return f'{value:#{typo.fmt}}'
                    return str(value)
                case TFType.ENUM:
                    try:
                        evaluation_counter.bytes += self.gtype.sizeof()
                        return str(gdb.Value(self.value).cast(self.gtype.inner))
                    except Exception as e:
                        return f'TFType.ENUM({self.value!s}, {self.gtype.inner!s}) err: ' + str(e)
                    return str(self.value)
                    return str(self.inner) # TODO
                case TFType.BOOL:
                    return 'false' if self.value == 0 else 'true'
                case TFType.CHAR:
                    return chr(self.value)
                case TFType.STR:
                    return str(self.value)
                    # return self.value_string_str()
                case TFType.PTR:
                    return f'{self.value:#x}'
                case TFType.FPTR:
                    if self.value == 0:
                        return '<NULL>'
                    raw_str = gdb.Value(self.value).format_string(raw=True, symbols=False, format='a')
                    if matched := re.search(r'(\<.+\>?)', raw_str):
                        raw_str = matched.group(1)
                    evaluation_counter.bytes += len(raw_str)
                    return raw_str
                case TFType.FLAG:
                    return f'{self.value:#b}'
                case TFType.EMOJI:
                    return str(self.value)
                case _: raise fuck_exc(AssertionError, f'unhandled {typo = }')
        return str(self.value)

    def value_size(self, typo: TextFormat | None = None) -> int:
        if typo:
            match typo.type:
                case TFType.BOOL: return 3
                case TFType.ENUM | TFType.STR: return self.value_size_str(typo)
                case TFType.FLAG: return 16#min(self.type.size * 2, 16)#TODO
                case TFType.EMOJI: return -1
        return 16

    def value_size_str(self, typo: TextFormat | None = None) -> int:
        return min(math.floor(len(self.value_string(typo)) / 2) + 1, 16)

# wrappers for special values

KValue_Undefined = KValue(GDBType.basic('void').pointer(), 0)
KValue_NULL = KValue(GDBType.basic('void').pointer(), 0)
KValue_XBox_FakeRoot = KValue(GDBType.basic('void').pointer(), 0xffffffffffffffff)

class KValueXBox(KValue):

    def __init__(self, xkey: int) -> None:
        super().__init__(GDBType.basic('void').pointer(), xkey)
        self.__xkey = xkey

    @property
    def json_data_key(self) -> str:
        return f'xbox#{self.__xkey}'
