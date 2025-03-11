define SigSet as Box<sigset_t> [
    // Shape sig: @sig
    Text<flag> sig: @sig0
] where {
    // sig = Array(@this.sig).forEach |item| {
    //     yield [ Text<flag> sig: @item ]
    // }
    sig0 = @this.sig[0]
}

define SigQueue as Box<sigqueue> [
    Text<flag:sigqueue> flags
    Box info [
        Text si_signo, si_errno, si_code
    ]
]
define SigPending as Box<sigpending> [
    Link list -> @list
    SigSet signal
] where {
    list = List<sigpending.list>(@this.list).forEach |item| {
        yield SigQueue<sigqueue.list>(@item)
    }
}

define SignalStruct as Box<signal_struct> [
    Text sigcnt: sigcnt.refs.counter
    Text live: live.counter
    Text nr_threads
    SigPending shared_pending
]

define SigAction as Box<k_sigaction> [
    Text signum: ${@index + 1}
    Text<flag:signal> signame: ${@index + 1}
    Text<fptr> sa_handler: sa.sa_handler
    Text<flag:sigaction_x64> sa_flags: sa.sa_flags
    Shape sa_mask: @sa_mask
] where {
    sa_mask = SigSet(@this.sa.sa_mask)
}
define SigHandStruct as Box<sighand_struct> [
    Text<emoji:lock> locked: siglock.rlock.raw_lock.locked
    Text count: count.refs.counter
    Shape action: @action
] where {
    action = Array(@this.action).forEach |item| {
        // yield SigAction(@item)
        sigaction = switch @item.sa.sa_handler {
            case ${0}: NULL
            otherwise: SigAction("sigaction#${@index + 1}": @item)
        }
        yield @sigaction
    }
}

define TaskSignal as Box<task_struct> [
    Text pid, comm
    Text<string> state: ${get_task_state(@this)}
    Link signal -> @signal
    Link sighand -> @sighand
    Shape blocked: @blocked
    Shape real_blocked: @real_blocked
    SigPending pending
] where {
    signal = SignalStruct(@this.signal)
    sighand = SigHandStruct(@this.sighand)
    blocked = SigSet(@this.blocked)
    real_blocked = SigSet(@this.real_blocked)
}

ts_current_task = TaskSignal("task_current": ${per_cpu_current_task(current_cpu())})
diag textbook_11_task_signal {
    plot @ts_current_task
} with {
    actions = SELECT k_sigaction
        FROM *
        WHERE sa_handler == "<NULL>"
    UPDATE actions WITH trimmed: true
}
