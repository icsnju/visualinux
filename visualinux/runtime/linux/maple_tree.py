from visualinux import *
from visualinux.runtime.kvalue import *
from visualinux.runtime.linux.common import *

from enum import Enum

### maple tree (struct maple_node *node, struct maple_enode *entry)

MA_ROOT_PARENT = 1

MAPLE_NODE_MASK        = 0xff
MAPLE_NODE_TYPE_MASK   = 0x0f
MAPLE_NODE_TYPE_SHIFT  = 0x03

# Bit 1 indicates the root is a node
MAPLE_ROOT_NODE        = 0x02
# maple_type stored bit 3-6
MAPLE_ENODE_TYPE_SHIFT = 0x03
# Bit 2 means a NULL somewhere below
MAPLE_ENODE_NULL       = 0x04

# gtype_enum_maple = GDBType.lookup('maple_type')
# gtype_ptr_maple_node = GDBType.lookup('maple_node')
# gtype_ptr_maple_topiary = GDBType.lookup('maple_topiary')

gtype_enum_maple:        GDBType = GDBType.lookup_safe('maple_type')    # type: ignore
gtype_ptr_maple_node:    GDBType = GDBType.lookup_safe('maple_node')    # type: ignore
gtype_ptr_maple_topiary: GDBType = GDBType.lookup_safe('maple_topiary') # type: ignore

class maple_type(Enum):
	maple_dense     = 0
	maple_leaf_64   = 1
	maple_range_64  = 2
	maple_arange_64 = 3

def mte_node_type(entry: KValue) -> KValue:
    '''((enum maple_type)(((unsigned long)entry >> MAPLE_NODE_TYPE_SHIFT) & MAPLE_NODE_TYPE_MASK))
    '''
    value = (entry.value_uint(ptr_size) >> MAPLE_NODE_TYPE_SHIFT) & MAPLE_NODE_TYPE_MASK
    return KValue.FinalInt(gtype_enum_maple, value)

def mte_to_node(entry: KValue) -> KValue:
    '''((struct maple_node *)((unsigned long)entry & ~MAPLE_NODE_MASK))
    '''
    value = (entry.value_uint(ptr_size) & ~MAPLE_NODE_MASK)
    return KValue(gtype_ptr_maple_node, value)

def mte_to_mat(entry: KValue) -> KValue:
    '''((struct maple_topiary *)((unsigned long)entry & ~MAPLE_NODE_MASK))
    '''
    value = (entry.value_uint(ptr_size) & ~MAPLE_NODE_MASK)
    return KValue(gtype_ptr_maple_topiary, value)

def ma_is_dense(type: KValue) -> KValue:
    '''(type < maple_leaf_64)
    '''
    value = (type.value < maple_type.maple_leaf_64.value)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def ma_is_leaf(type: KValue) -> KValue:
    '''(type < maple_range_64)
    '''
    value = (type.value < maple_type.maple_range_64.value)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def mte_is_leaf(entry: KValue) -> KValue:
    '''ma_is_leaf(mte_node_type(entry))
    '''
    return ma_is_leaf(mte_node_type(entry))

def ma_is_root(node: KValue) -> KValue:
    '''((unsigned long)node->parent & MA_ROOT_PARENT)
    '''
    parent = node.eval_field('parent')
    value = (parent.value_uint(ptr_size) & MA_ROOT_PARENT)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def mte_is_root(entry: KValue) -> KValue:
    '''ma_is_root(mte_to_node(entry))
    '''
    return ma_is_root(mte_to_node(entry))

### maple tree: the parent pointer

# Excluding root, the parent pointer is 256B aligned like all other tree nodes.
# When storing a 32 or 64 bit values, the offset can fit into 5 bits.
# The 16 bit values need an extra bit to store the offset.
# This extra bit comes from a reuse of the last bit in the node type.
# This is possible by using bit 1 to indicate if bit 2 is part of the type or the slot.
# Note types:
#  0x??1 = Root
#  0x?00 = 16 bit nodes
#  0x010 = 32 bit nodes
#  0x110 = 64 bit nodes
# Slot size and alignment
#  0b??1 : Root
#  0b?00 : 16 bit values, type in 0-1, slot in 2-7
#  0b010 : 32 bit values, type in 0-2, slot in 3-7
#  0b110 : 64 bit values, type in 0-2, slot in 3-7

MAPLE_PARENT_ROOT           = 0x01

MAPLE_PARENT_SLOT_SHIFT     = 0x03
MAPLE_PARENT_SLOT_MASK      = 0xF8

MAPLE_PARENT_16B_SLOT_SHIFT = 0x02
MAPLE_PARENT_16B_SLOT_MASK  = 0xFC

MAPLE_PARENT_RANGE64        = 0x06
MAPLE_PARENT_RANGE32        = 0x04
MAPLE_PARENT_NOT_RANGE16    = 0x02

### maple tree: tree properties

MT_FLAGS_ALLOC_RANGE   =  0x01
MT_FLAGS_USE_RCU       =  0x02
MT_FLAGS_HEIGHT_OFFSET =  0x02
MT_FLAGS_HEIGHT_MASK   =  0x7C
MT_FLAGS_LOCK_MASK     = 0x300
MT_FLAGS_LOCK_IRQ      = 0x100
MT_FLAGS_LOCK_BH       = 0x200
MT_FLAGS_LOCK_EXTERN   = 0x300

def mt_height(mt: KValue) -> KValue:
    '''((mt->ma_flags & MT_FLAGS_HEIGHT_MASK) >> MT_FLAGS_HEIGHT_OFFSET)
    '''
    ma_flags = mt.eval_field('ma_flags')
    value = ((ma_flags.value & MT_FLAGS_HEIGHT_MASK) >> MT_FLAGS_HEIGHT_OFFSET)
    return KValue.FinalInt(GDBType.basic('int'), value)

def mt_in_rcu(mt: KValue) -> KValue:
    '''((bool)(mt->ma_flags & MT_FLAGS_USE_RCU))
    '''
    ma_flags = mt.eval_field('ma_flags')
    value = ((ma_flags.value & MT_FLAGS_USE_RCU))
    return KValue.FinalInt(GDBType.basic('bool'), value)

def mt_external_lock(mt: KValue) -> KValue:
    '''((mt->ma_flags & MT_FLAGS_LOCK_MASK) == MT_FLAGS_LOCK_EXTERN)
    '''
    ma_flags = mt.eval_field('ma_flags')
    value = ((ma_flags.value & MT_FLAGS_LOCK_MASK) == MT_FLAGS_LOCK_EXTERN)
    return KValue.FinalInt(GDBType.basic('bool'), value)

### maple tree: traversing

MAPLE_NODE_SLOTS = 31 #if defined(CONFIG_64BIT) || defined(BUILD_VDSO32_64)
ULONG_MAX = 0xffffffff

mt_max = {
	maple_type.maple_dense.value:     MAPLE_NODE_SLOTS,
	maple_type.maple_leaf_64.value:   ULONG_MAX,
	maple_type.maple_range_64.value:  ULONG_MAX,
	maple_type.maple_arange_64.value: ULONG_MAX,
}

def mt_node_max(entry: KValue) -> KValue:
    value = mt_max[mte_node_type(entry).value]
    return KValue.FinalInt(GDBType.basic('unsigned long'), value)

# slot_length = ${sizeof((*@pivots)) / sizeof(void *)}
# ma_min = ${@index > 0 ? (*@pivots)[@index - 1] + 1 : @last_ma_min}
# ma_max = ${@index < @slot_length - 1 ? (*@pivots)[@index] : @last_ma_max}

def ma_calc_min(pivots: KValue, index: KValue, last_ma_min: KValue) -> KValue:
    value = __ma_calc_min(__mt_decompose_pivots(pivots), index.value, last_ma_min.value)
    return KValue.FinalInt(GDBType.basic('unsigned long'), value)

def __ma_calc_min(pivots: list[int], index: int, last_ma_min: int) -> int:
    return pivots[index - 1] + 1 if index > 0 else last_ma_min

def ma_calc_max(pivots: KValue, index: KValue, last_ma_max: KValue) -> KValue:
    value = __ma_calc_max(__mt_decompose_pivots(pivots), index.value, last_ma_max.value)
    return KValue.FinalInt(GDBType.basic('unsigned long'), value)

def __ma_calc_max(pivots: list[int], index: int, last_ma_max: int) -> int:
    return pivots[index] if index < len(pivots) - 1 else last_ma_max

# slot_safety_check_1 = ${@index > 0 && (*@pivots)[@index - 1] == @last_ma_max}
# slot_safety_check_2 = ${@index > 0 && (*@pivots)[@index - 1] == 0}
# slot_safety_check_3 = ${@index > 0 && @index < @slot_length - 1 && (*@pivots)[@index] == 0}
# slot_safety_check   = ${@slot_safety_check_1 || @slot_safety_check_2 || @slot_safety_check_3}
# slot_safe = switch ${@slot_safety_check * 10 + @is_leaf} {

def mt_slot_is_safe(pivots: KValue, index: KValue, last_ma_max: KValue) -> KValue:
    # print(f'call mt_slot_is_safe {pivots=} {index=} {last_ma_max=}')
    value = __mt_slot_is_safe(__mt_decompose_pivots(pivots), index.value, last_ma_max.value)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def __mt_slot_is_safe(pivots: list[int], index: int, last_ma_max: int) -> bool:
    # print(f'  > __ {pivots=} {index=} {last_ma_max=}')
    if index > 0 and pivots[index - 1] == last_ma_max:
        return False
    if index > 0 and pivots[index - 1] == 0:
        return False
    if index > 0 and index < len(pivots) - 1 and pivots[index] == 0:
        return False
    return True

def __mt_decompose_pivots(pivots: KValue) -> list[int]:
    return [pivot.dereference().value for pivot in pivots.decompose_array()]
