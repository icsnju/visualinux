shell echo "+ source config.gdb"

### initconfig

set confirm off
set print pretty on
set breakpoint pending on
# set scheduler-locking on

### general

set $__inited = 0
define init
    if $__inited == 0
        source scripts/gdb/macros.gdb
        source visualinux-gdb.py
        echo + Visualinux gdb extension loaded\n
        set $__inited = 1
    end
end

define hook-stop
    init
end

### timing

macro define BASE_STD 0
macro define BASE_DEF 1

### kernel data structure exploration

#### get per-cpu cfs_rq from p->se
macro define cfs_rq_of(se) &task_rq(task_of(se))->cfs
macro define task_of(_se)  container_of(_se, struct task_struct, se)
macro define task_rq(p)    cpu_rq(p->cpu)
macro define cpu_rq(cpu)   (&per_cpu(runqueues, (cpu)))

macro define rb_entry_task(node) task_of(rb_entry_se(node))
macro define rb_entry_se(node) rb_entry(node, struct sched_entity, run_node)

### memory transformation

macro define page_address(page) page_to_virt(page)
macro define page_to_virt(page) __va(PFN_PHYS(page_to_pfn(page)))

macro define page_to_pfn(page) (unsigned long)((page) - (struct page *)vmemmap_base)

macro define PFN_PHYS(x) ((phys_addr_t)(x) << PAGE_SHIFT)
macro define PAGE_SHIFT 12

macro define __va(x) ((void *)((unsigned long)(x) + PAGE_OFFSET))
macro define PAGE_OFFSET (unsigned long)page_offset_base

### process

define xpid
    xtask($lx_task_by_pid($arg0))
end

define xcurrent
    xtask(current)
end

macro define current $lx_current()
