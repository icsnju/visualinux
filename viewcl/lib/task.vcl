define Task as Box<task_struct> {
    # basic identity information of the object #
    :default [
        Text pid, comm
        Text<string> state: ${get_task_state(@this)}
        Text ppid: parent.pid
    ]
    # basic information about CFS scheduling #
    :default => :sched [
        Text<bool> on_rq
        Text prio
        Text vruntime: se.vruntime
    ]
    # more detailed information about CFS scheduling #
    :sched => :sched_full [
        Box se [
            Text exec_start
            Text sum_exec_runtime
            Text prev_sum_exec_runtime
            Box avg [
                Text last_update_time
                Text load_avg
                Text runnable_avg
                Text util_avg
            ]
        ]
    ]
    # additional information about per process flags PF_... #
    :default => :pf_flags [
        Text<flag:per_process> flags
    ]
}
