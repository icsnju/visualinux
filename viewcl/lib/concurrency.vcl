// spinlock

define RawSpinlock as Box<raw_spinlock> {
    :default [
        Text<emoji:lock> locked: raw_lock.locked
        Text owner_cpu: owner_cpu // TODO: CONFIG_DEBUG_SPINLOCK
    ]
    :full [
        Text raw_lock.locked
        Text raw_lock.pending
        Text owner_cpu
    ]
}

define Spinlock as Box<spinlock_t> {
    :default [
        Text<emoji:lock> locked: rlock.raw_lock.locked
        Text owner_cpu: rlock.owner_cpu
    ]
    :full [
        RawSpinlock rlock
    ]
}

// rwsem

define RWSemWaiter as Box<rwsem_waiter> [
    // Link task -> Task(@this.task)
    Text task.pid
    Text<enum:rwsem_waiter_type> type
    Text timeout
    Text handoff_set
]

define RWSemaphore as Box<rw_semaphore> [
    Text count: count.counter
    Text owner: owner.counter
    Text osq: osq.tail.counter
    RawSpinlock wait_lock
]
//     Link wait_list -> @wait_list
// ] where {
//     wait_list = List<rwsem_waiter.list>(@this.wait_list).forEach |waiter| {
//         yield RWSemWaiter(@waiter)
//     }
// }

// rcu
