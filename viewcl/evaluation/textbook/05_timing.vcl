import lib.concurrency

define TimerList as Box<timer_list> [
    Text expires
    Text<fptr> function
    Text<flag:timer> flags: @flags
    Text flags_idx: @flags_idx
] where {
    flags = ${timer_get_flag(@this)}
    flags_idx = ${timer_get_idx(@this)}
}

define TimerBase as Box<timer_base> [
    Text<emoji:lock> lock: lock.raw_lock.locked
    Link running_timer -> @running_timer
    Text clk, next_expiry
    Text cpu
    Text<bool> next_expiry_recalc, is_idle, timers_pending
    Shape pending_map: @pending_map
    Shape vectors: @vectors
] where {
    running_timer = TimerList(@this.running_timer)
    vectors = Array(@this.vectors).forEach |item| {
        member = switch @item.first {
        case ${NULL}:
            NULL
        otherwise:
            Box("timer #{@index}": @item) [
                Link list -> @timer_list
            ] where {
                timer_list = HList(@this).forEach |node| {
                    yield TimerList<timer_list.entry>(@node)
                }
            }
        }
        yield @member
    }
    pending_map = Array(@this.pending_map).forEach |item| {
        yield [ Text<u64:x> item: @item ]
    }
}

tbase_std_cpu = TimerBase(${per_cpu_ptr(&timer_bases[BASE_STD], 0)})
tbase_def_cpu = TimerBase(${per_cpu_ptr(&timer_bases[BASE_DEF], 0)})

diag textbook_05_dyntimer {
    plot @tbase_std_cpu
    plot @tbase_def_cpu
}
