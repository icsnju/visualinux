from visualinux import *
from visualinux.runtime.kvalue import *
from visualinux.runtime.linux.common import *

TIMER_ARRAYSHIFT = 22
TIMER_ARRAYMASK  = 0xFFC00000

def timer_get_flag(timer: KValue) -> KValue:
    '''(timer->flags & ~TIMER_ARRAYMASK)
    '''
    flags = timer.eval_field('flags')
    value = (flags.value & ~TIMER_ARRAYMASK)
    return KValue.FinalInt(GDBType.basic('uint32_t'), value)

def timer_get_idx(timer: KValue) -> KValue:
    '''((timer->flags & TIMER_ARRAYMASK) >> TIMER_ARRAYSHIFT)
    '''
    flags = timer.eval_field('flags')
    value = ((flags.value & TIMER_ARRAYMASK) >> TIMER_ARRAYSHIFT)
    return KValue.FinalInt(GDBType.basic('uint32_t'), value)
