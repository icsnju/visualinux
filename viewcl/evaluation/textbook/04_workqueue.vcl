define WorkStruct as Box<work_struct> [
    Text<u64:x> data: data.counter
    Text<fptr> func
]
define OnceWork as Box<once_work> [
    WorkStruct work
    Text key: key.key.enabled.counter
    Text<string> module.name
]
define DelayedWork as Box<delayed_work> [
    WorkStruct work
    Text cpu
]

define Worker as Box<worker> [
    Text<string> desc
    Text id
    Link current_work -> @current_work
    Text<fptr> current_func
    Text current_color
    Text task_id: task.pid
    Text task_name: task.comm
    Text<raw_ptr> pool
    Text<fptr> last_func
] where {
    current_work = WorkStruct(@this.current_work)
}

define WorkerPool as Box<worker_pool> [
    Text cpu, node, id
    Text nr_running
    Link worklist -> @worklist
    Link idle_list -> @idle_list
    Text nr_workers, nr_idle
    Link manager -> @manager
    Link workers -> @workers
    Text refcnt
] where {
    worklist = List<worker_pool.worklist>(@this.worklist).forEach |item| {
        // yield WorkStruct<work_struct.entry>(@item)
        work = switch ${container_of(@item, struct work_struct, entry)->func} {
            case ${&addrconf_dad_work}, ${&mld_dad_work}, ${&vmstat_shepherd}, ${&vmstat_update}:
                DelayedWork<delayed_work.work.entry>("delayed_work": @item)
            case ${&once_deferred}: OnceWork<once_work.work.entry>("once_work": @item)
            case ${&free_work}:     Box<vfree_deferred.wq.entry>("free_work": @item) [ WorkStruct wq ]
            otherwise:              WorkStruct<work_struct.entry>("work": @item)
        }
        yield @work
    }
    idle_list = List<worker_pool.idle_list>(@this.idle_list).forEach |item| {
        yield WorkStruct<work_struct.entry>(@item)
    }
    manager = WorkStruct(@this.manager)
    workers = List<worker_pool.workers>(@this.workers).forEach |item| {
        yield Worker<worker.node>(@item)
    }
}

define PWQ as Box<pool_workqueue> [
    Link pool -> @pool
    Text wq: wq.name
    Text work_color
    Text refcnt
    Text nr_active, max_active
//	struct work_struct	unbound_release_work;
] where {
    pool = WorkerPool(@this.pool)
}

define WQStruct as Box<workqueue_struct> [
        Text<string> name
        Text work_color
        Link rescuer -> @rescuer
        Link pwqs -> @pwqs
        Link cpu_pwqs -> @cpu_pwqs
] where {
    pwqs = List<workqueue_struct.pwqs>(@this.pwqs).forEach |item| {
        yield PWQ<pool_workqueue.pwqs_node>(@item)
    }
    rescuer = Worker("worker (rescuer)": @this.rescuer)
    cpu_pwqs = PWQ(${per_cpu_ptr(@this.cpu_pwqs, 0)})
}

// workqueues = List<list_head>(${&workqueues}).forEach |item| {
//     yield WQStruct<workqueue_struct.list>(@item)
// }
// diag workqueues {
//     plot @workqueues
// }

// cpu_worker_pools = WorkerPool(${per_cpu_ptr(cpu_worker_pools, 0)})

diag textbook_04_mm_percpu_wq {
    plot WQStruct(${mm_percpu_wq})
}
