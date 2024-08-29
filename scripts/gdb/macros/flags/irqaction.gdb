shell echo "+ source macros/flags/irqaction.gdb"

macro define IRQF_TRIGGER_NONE    0x00000000
macro define IRQF_TRIGGER_RISING  0x00000001
macro define IRQF_TRIGGER_FALLING 0x00000002
macro define IRQF_TRIGGER_HIGH    0x00000004
macro define IRQF_TRIGGER_LOW     0x00000008
macro define IRQF_SHARED          0x00000080
macro define IRQF_PROBE_SHARED    0x00000100
macro define __IRQF_TIMER         0x00000200
macro define IRQF_PERCPU          0x00000400
macro define IRQF_NOBALANCING     0x00000800
macro define IRQF_IRQPOLL         0x00001000
macro define IRQF_ONESHOT         0x00002000
macro define IRQF_NO_SUSPEND      0x00004000
macro define IRQF_FORCE_RESUME    0x00008000
macro define IRQF_NO_THREAD       0x00010000
macro define IRQF_EARLY_RESUME    0x00020000
macro define IRQF_COND_SUSPEND    0x00040000
macro define IRQF_NO_AUTOEN       0x00080000
macro define IRQF_NO_DEBUG        0x00100000
