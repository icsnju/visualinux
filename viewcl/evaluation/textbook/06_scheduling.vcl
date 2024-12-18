define TaskSched as Box<task_struct> {
    :default [
        Text pid, comm
        Text<string> state: ${get_task_state(@this)}
        Text ppid: parent.pid
    ]
    :default => :sched [
        Text vruntime: se.vruntime
    ]
    :default => :sched_details [
        Box se [
            Text load_weight: load.weight
            Text<bool> on_rq
            Text vruntime
            Text exec_start
            Text sum_runtime: sum_exec_runtime
            Text psum_runtime: prev_sum_exec_runtime
        ]
    ]
}

define RunqueueCFS as Box<cfs_rq> {
    :default [
        Text nr_running, min_vruntime
        Box load [
            Text weight
        ]
    ]
    :default => :sched_tree [
        Link tasks_timeline -> @sched_tree
    ]
    :default => :sched_queue [
        Link sched_queue -> @sched_queue
    ]
} where {
    sched_tree = RBTree<cfs_rq.tasks_timeline>(@this.tasks_timeline).forEach |node| {
        yield TaskSched<task_struct.se.run_node>(@node)
    }
    sched_queue = Array.convFrom(@sched_tree)
}

diag textbook_06_cfs_runqueue {
    plot RunqueueCFS(${&cpu_rq(0).cfs})
} with {
    root = SELECT cfs_rq FROM *
    UPDATE root WITH view: sched_tree

    rq = SELECT cfs_rq->tasks_timeline FROM *
    UPDATE rq WITH direction: vertical

    tasks = SELECT task_struct FROM *
    UPDATE tasks WITH view: sched
}
