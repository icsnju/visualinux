shell echo "+ source macros/maple-tree.gdb"

### maple tree (struct maple_node *node, struct maple_enode *entry)

macro define MA_ROOT_PARENT 1

macro define MAPLE_NODE_MASK        0xff
macro define MAPLE_NODE_TYPE_MASK   0x0f
macro define MAPLE_NODE_TYPE_SHIFT  0x03

# Bit 1 indicates the root is a node
macro define MAPLE_ROOT_NODE        0x02
# maple_type stored bit 3-6
macro define MAPLE_ENODE_TYPE_SHIFT 0x03
# Bit 2 means a NULL somewhere below
macro define MAPLE_ENODE_NULL       0x04

macro define mte_node_type(entry) ((enum maple_type)(((unsigned long)entry >> MAPLE_NODE_TYPE_SHIFT) & MAPLE_NODE_TYPE_MASK))

macro define mte_to_node(entry) ((struct maple_node *)((unsigned long)entry & ~MAPLE_NODE_MASK))
macro define mte_to_mat(entry)  ((struct maple_topiary *)((unsigned long)entry & ~MAPLE_NODE_MASK))

macro define ma_is_dense(type) (type < maple_leaf_64)
macro define ma_is_leaf(type) (type < maple_range_64)
macro define mte_is_leaf(entry) ma_is_leaf(mte_node_type(entry))

macro define ma_is_root(node) ((unsigned long)node->parent & MA_ROOT_PARENT)
macro define mte_is_root(entry) ma_is_root(mte_to_node(entry))

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

macro define MAPLE_PARENT_ROOT              0x01

macro define MAPLE_PARENT_SLOT_SHIFT        0x03
macro define MAPLE_PARENT_SLOT_MASK         0xF8

macro define MAPLE_PARENT_16B_SLOT_SHIFT    0x02
macro define MAPLE_PARENT_16B_SLOT_MASK     0xFC

macro define MAPLE_PARENT_RANGE64           0x06
macro define MAPLE_PARENT_RANGE32           0x04
macro define MAPLE_PARENT_NOT_RANGE16       0x02

### maple tree: tree properties

macro define MT_FLAGS_ALLOC_RANGE    0x01
macro define MT_FLAGS_USE_RCU        0x02
macro define MT_FLAGS_HEIGHT_OFFSET  0x02
macro define MT_FLAGS_HEIGHT_MASK    0x7C
macro define MT_FLAGS_LOCK_MASK     0x300
macro define MT_FLAGS_LOCK_IRQ      0x100
macro define MT_FLAGS_LOCK_BH       0x200
macro define MT_FLAGS_LOCK_EXTERN   0x300

macro define mt_height(mt)        ((mt->ma_flags & MT_FLAGS_HEIGHT_MASK) >> MT_FLAGS_HEIGHT_OFFSET)
macro define mt_in_rcu(mt)        ((bool)(mt->ma_flags & MT_FLAGS_USE_RCU))
macro define mt_external_lock(mt) ((mt->ma_flags & MT_FLAGS_LOCK_MASK) == MT_FLAGS_LOCK_EXTERN)
