shell echo "+ source macros/flags/maple_tree.gdb"

macro define MT_FLAGS_ALLOC_RANGE   0x01
macro define MT_FLAGS_USE_RCU       0x02
# define MT_FLAGS_HEIGHT_OFFSET 0x02
# define MT_FLAGS_HEIGHT_MASK   0x7C
# define MT_FLAGS_LOCK_MASK     0x300
macro define MT_FLAGS_LOCK_IRQ      0x100
macro define MT_FLAGS_LOCK_BH       0x200
macro define MT_FLAGS_LOCK_EXTERN   0x300
