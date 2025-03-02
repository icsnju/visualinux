import lib.concurrency

define TaskPidHash as Box<task_struct> [
    Text pid, comm
    Text<string> state: ${get_task_state(@this)}
]

define Pid as Box<pid> [
        Text nr: numbers[0].nr
        Text level
        Text refcount: @this.count.refs.counter
        Link tasks_pid -> @tasks_pid
] where {
    tasks_pid = Array(@this.tasks).forEach |item| {
        yield Box(@item) [
            Link tasks -> @tasks
        ] where {
            tasks = HList(@this).forEach |node| {
                yield TaskPidHash<task_struct.pid_links[@index]>(@node)
            }
        }
    }
}

define IDR as Box<idr> {
    :default [
        Link idr_rt -> @idr_rt
        Text idr_base
        Text idr_next
    ]
} where {
    idr_rt = XArray(@this.idr_rt).forEach |item| {
        yield [ Link pid -> @pid ] where {
            pid = Pid(@item)
        }
    }
}

define PidNamespace as Box<pid_namespace> [
    Shape idr: @idr
    Text<u32> pid_allocated
    Text level
    Link parent -> @parent
] where {
    idr = IDR(@this.idr)
    parent = PidNamespace(@this.parent)
}

pid_ns = PidNamespace(${task_active_pid_ns(per_cpu_current_task(current_cpu()))})
diag textbook_02_pid_namespace {
    plot @pid_ns
} with {
    pids = SELECT pid
        FROM *
        WHERE nr != 2
    UPDATE pids WITH shrinked: true
}
