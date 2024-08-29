from visualinux import *
from visualinux.runtime.kvalue import *
from visualinux.runtime.linux.common import *

# define XA_CHUNK_SHIFT (CONFIG_BASE_SMALL ? 4 : 6)
XA_CHUNK_SHIFT = 6
XA_CHUNK_SIZE = (1 << XA_CHUNK_SHIFT)
XA_CHUNK_MASK = (XA_CHUNK_SIZE - 1)

gtype_ptr_xa_node = GDBType.lookup('xa_node')

def xa_is_node(entry: KValue) -> KValue:
    '''(xa_is_internal(entry) && (unsigned long)entry > 4096)
    '''
    value = (xa_is_internal(entry).value and entry.value_uint(ptr_size) > 4096)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def xa_is_value(entry: KValue) -> KValue:
    '''((unsigned long)entry & 1)
    '''
    value = (entry.value_uint(ptr_size) & 1)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def xa_is_internal(entry: KValue) -> KValue:
    '''(((unsigned long)entry & 3) == 2)
    '''
    value = ((entry.value_uint(ptr_size) & 3) == 2)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def xa_to_node(entry: KValue) -> KValue:
    '''((struct xa_node *)((unsigned long)entry - 2))
    '''
    value = (entry.value_uint(ptr_size) - 2)
    return KValue(gtype_ptr_xa_node, value)

def xa_to_value(entry: KValue) -> KValue:
    '''((unsigned long)entry >> 1)
    '''
    value = (entry.value_uint(ptr_size) >> 1)
    return KValue.FinalInt(GDBType.basic('unsigned long'), value)

def xa_to_internal(entry: KValue) -> KValue:
    '''((unsigned long)entry >> 2)
    '''
    value = (entry.value_uint(ptr_size) >> 2)
    return KValue.FinalInt(GDBType.basic('unsigned long'), value)

def __xa_mk_internal(v: int) -> int:
    '''((void *)((v << 2) | 2))
    '''
    return ((v << 2) | 2)

XA_RETRY_ENTRY = __xa_mk_internal(256)
XA_ZERO_ENTRY  = __xa_mk_internal(257)

def xa_is_retry(entry: KValue) -> KValue:
    '''(entry == XA_RETRY_ENTRY)
    '''
    value = (entry.value == XA_RETRY_ENTRY)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def xa_is_zero(entry: KValue) -> KValue:
    '''(entry == XA_ZERO_ENTRY)
    '''
    value = (entry.value == XA_ZERO_ENTRY)
    return KValue.FinalInt(GDBType.basic('bool'), value)

# define xa_is_sibling(entry) IS_ENABLED(CONFIG_XARRAY_MULTI) && ...
def xa_is_sibling(entry: KValue) -> KValue:
    '''(xa_is_internal(entry) && (entry < xa_mk_sibling(XA_CHUNK_SIZE - 1)))
    '''
    sibling = xa_mk_sibling(KValue.FinalInt(GDBType.basic('unsigned int'), XA_CHUNK_SIZE - 1))
    value = (xa_is_internal(entry).value and (entry.value < sibling.value))
    return KValue.FinalInt(GDBType.basic('bool'), value)

def xa_mk_sibling(offset: KValue) -> KValue:
    '''xa_mk_internal(offset)
    '''
    value = __xa_mk_internal(offset.value)
    return KValue(gtype_ptr_void, value)

def xa_to_sibling(entry: KValue) -> KValue:
    return xa_to_internal(entry)
