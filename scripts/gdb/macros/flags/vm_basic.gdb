shell echo "+ source macros/flags/vm_basic.gdb"

macro define VM_NONE         0x00000000

macro define VM_READ         0x00000001
macro define VM_WRITE        0x00000002
macro define VM_EXEC         0x00000004
macro define VM_SHARED       0x00000008

macro define VM_GROWSDOWN    0x00000100
