shell echo "+ source macros/flags/vm.gdb"

macro define VM_NONE         0x00000000

macro define VM_READ         0x00000001
macro define VM_WRITE        0x00000002
macro define VM_EXEC         0x00000004
macro define VM_SHARED       0x00000008

macro define VM_MAYREAD      0x00000010
macro define VM_MAYWRITE     0x00000020
macro define VM_MAYEXEC      0x00000040
macro define VM_MAYSHARE     0x00000080

macro define VM_GROWSDOWN    0x00000100
macro define VM_UFFD_MISSING 0x00000200
macro define VM_PFNMAP       0x00000400
macro define VM_UFFD_WP      0x00001000

macro define VM_LOCKED       0x00002000
macro define VM_IO           0x00004000

macro define VM_SEQ_READ     0x00008000
macro define VM_RAND_READ    0x00010000

macro define VM_DONTCOPY     0x00020000
macro define VM_DONTEXPAND   0x00040000
macro define VM_LOCKONFAULT  0x00080000
macro define VM_ACCOUNT      0x00100000
macro define VM_NORESERVE    0x00200000
macro define VM_HUGETLB      0x00400000
macro define VM_SYNC         0x00800000
macro define VM_ARCH_1       0x01000000
macro define VM_WIPEONFORK   0x02000000
macro define VM_DONTDUMP     0x04000000

macro define VM_SOFTDIRTY    0x08000000

macro define VM_MIXEDMAP     0x10000000
macro define VM_HUGEPAGE     0x20000000
macro define VM_NOHUGEPAGE   0x40000000
macro define VM_MERGEABLE    0x80000000
