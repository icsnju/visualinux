shell echo "+ source macros/timer_list.gdb"

macro define TIMER_ARRAYSHIFT 22
macro define TIMER_ARRAYMASK  0xFFC00000

macro define timer_get_flag(timer) (timer->flags & ~TIMER_ARRAYMASK)
macro define timer_get_idx(timer) ((timer->flags & TIMER_ARRAYMASK) >> TIMER_ARRAYSHIFT)
