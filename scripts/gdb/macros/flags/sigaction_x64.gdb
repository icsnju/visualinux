shell echo "+ source macros/flags/sigaction.gdb"

macro define SA_NOCLDSTOP      0x00000001
macro define SA_NOCLDWAIT      0x00000002
macro define SA_SIGINFO        0x00000004
macro define SA_UNSUPPORTED    0x00000400
macro define SA_EXPOSE_TAGBITS 0x00000800
macro define SA_IMMUTABLE      0x00800000
macro define SA_RESTORER       0x04000000
macro define SA_ONSTACK        0x08000000
macro define SA_RESTART        0x10000000
macro define SA_NODEFER        0x40000000
macro define SA_RESETHAND      0x80000000
