from visualinux import *
from visualinux.runtime.kvalue import *
from visualinux.runtime.linux.common import *

### task states

# Used in tsk->state:
TASK_RUNNING         = 0x00000000
TASK_INTERRUPTIBLE   = 0x00000001
TASK_UNINTERRUPTIBLE = 0x00000002
__TASK_STOPPED       = 0x00000004
__TASK_TRACED        = 0x00000008
# Used in tsk->exit_state:
EXIT_DEAD            = 0x00000010
EXIT_ZOMBIE          = 0x00000020
EXIT_TRACE           = (EXIT_ZOMBIE | EXIT_DEAD)
# Used in tsk->state again:
TASK_PARKED          = 0x00000040
TASK_DEAD            = 0x00000080
TASK_WAKEKILL        = 0x00000100
TASK_WAKING          = 0x00000200
TASK_NOLOAD          = 0x00000400
TASK_NEW             = 0x00000800
TASK_RTLOCK_WAIT     = 0x00001000
TASK_FREEZABLE       = 0x00002000
### __TASK_FREEZABLE_UNSAFE =        (0x00004000 * IS_ENABLED(CONFIG_LOCKDEP))
TASK_FROZEN          = 0x00008000
TASK_STATE_MAX       = 0x00010000

TASK_ANY = (TASK_STATE_MAX-1)

TASK_FREEZABLE_UNSAFE = TASK_FREEZABLE ### (TASK_FREEZABLE | __TASK_FREEZABLE_UNSAFE)

TASK_KILLABLE = (TASK_WAKEKILL | TASK_UNINTERRUPTIBLE)
TASK_STOPPED  = (TASK_WAKEKILL | __TASK_STOPPED)
TASK_TRACED   = __TASK_TRACED

TASK_IDLE = (TASK_UNINTERRUPTIBLE | TASK_NOLOAD)

TASK_NORMAL = (TASK_INTERRUPTIBLE | TASK_UNINTERRUPTIBLE)

TASK_REPORT = (TASK_RUNNING | TASK_INTERRUPTIBLE | \
    TASK_UNINTERRUPTIBLE | __TASK_STOPPED | \
    __TASK_TRACED | EXIT_DEAD | EXIT_ZOMBIE | \
    TASK_PARKED)

TASK_REPORT_IDLE = (TASK_REPORT + 1)
TASK_REPORT_MAX  = (TASK_REPORT_IDLE << 1)

task_state_array: list[str] = [
    "R (running)",
    "S (sleeping)",
    "D (disk sleep)",
    "T (stopped)",
    "t (tracing stop)",
    "X (dead)",
    "Z (zombie)",
    "P (parked)",
    "I (idle)",
]

def get_task_state(task: KValue) -> KValue:
    '''task_state_array[task_state_index(tsk)]
    '''
    task_state = task.eval_field('__state').dereference().value
    task_exit_state = task.eval_field('exit_state').dereference().value
    text = task_state_array[__task_state_index(task_state, task_exit_state)]
    return KValue.FinalStr(text)

def __task_state_index(task_state: int, task_exit_state: int) -> int:
    state = (task_state | task_exit_state) & TASK_REPORT
    if task_state == TASK_IDLE:
        state = TASK_REPORT_IDLE
    if task_state == TASK_RTLOCK_WAIT:
        state = TASK_UNINTERRUPTIBLE
    return __fls(state)

def __fls(x: int) -> int:
    # for (i = 31; i >= 0; i --) {
    for i in range(31, -1, -1):
        if (x >> i) & 1: return i + 1
    return 0

### pid hash

def task_active_pid_ns(task: KValue) -> KValue:
    '''ns_of_pid((tsk)->thread_pid)
    '''
    return ns_of_pid(task.eval_field('thread_pid'))

def ns_of_pid(pid: KValue) -> KValue:
    '''((pid) ? (pid)->numbers[(pid)->level].ns : NULL)
    '''
    if pid.value == KValue_NULL.value:
        return KValue_NULL
    else:
        numbers = pid.eval_field('numbers')
        level = pid.eval_field('level').dereference().value
        arr = numbers.decompose_array()
        return arr[level].eval_field('ns')
