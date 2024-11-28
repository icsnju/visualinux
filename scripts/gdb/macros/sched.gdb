shell echo "+ source macros/sched.gdb"

### CFS run queue

### get per-cpu cfs_rq from p->se
macro define cfs_rq_of(se) &task_rq(task_of(se))->cfs
macro define task_of(_se)  container_of(_se, struct task_struct, se)
macro define task_rq(p)    cpu_rq(p->cpu)
macro define cpu_rq(cpu)   (&per_cpu(runqueues, (cpu)))

macro define rb_entry_task(node) task_of(rb_entry_se(node))
macro define rb_entry_se(node) rb_entry(node, struct sched_entity, run_node)
