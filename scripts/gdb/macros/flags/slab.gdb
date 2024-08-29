shell echo "+ source macros/flags/slab.gdb"

macro define SLAB_CONSISTENCY_CHECKS 0x00000100U
macro define SLAB_RED_ZONE           0x00000400U
macro define SLAB_POISON             0x00000800U
macro define SLAB_KMALLOC            0x00001000U
macro define SLAB_HWCACHE_ALIGN      0x00002000U
macro define SLAB_CACHE_DMA          0x00004000U
macro define SLAB_CACHE_DMA32        0x00008000U
macro define SLAB_STORE_USER         0x00010000U
macro define SLAB_PANIC              0x00040000U
macro define SLAB_TYPESAFE_BY_RCU    0x00080000U
macro define SLAB_MEM_SPREAD         0x00100000U
macro define SLAB_TRACE              0x00200000U
macro define SLAB_DEBUG_OBJECTS      0x00400000U
macro define SLAB_NOLEAKTRACE        0x00800000U
macro define SLAB_FAILSLAB           0x02000000U
macro define SLAB_ACCOUNT            0x04000000U
macro define SLAB_KASAN              0x08000000U
macro define SLAB_NO_USER_FLAGS      0x10000000U
macro define SLAB_SKIP_KFENCE        0x20000000U
macro define SLAB_RECLAIM_ACCOUNT    0x00020000U
