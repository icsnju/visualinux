shell echo "+ source macros/general.gdb"

### base address (x86-64)

# # dump_pagetables.c
# address_markers

# macro define CONFIG_PHYSICAL_START 0x1000000
# macro define CONFIG_PHYSICAL_ALIGN 0x200000
# macro define __PHYSICAL_START ((CONFIG_PHYSICAL_START + (CONFIG_PHYSICAL_ALIGN - 1)) & ~(CONFIG_PHYSICAL_ALIGN - 1))
# macro define __START_KERNEL_map 0xffffffff80000000
# macro define __START_KERNEL (__START_KERNEL_map + __PHYSICAL_START)

### basic

macro define NULL ((void *)0)

macro define NR_OPEN_DEFAULT 64
macro define cast_to_parray(id, type, length) ((struct type * (*)[length])(id))

### per-cpu access

macro define per_cpu(var, cpu)     (*per_cpu_ptr(&(var), cpu))
macro define per_cpu_ptr(ptr, cpu) ((typeof(ptr))((uintptr_t)ptr + per_cpu_offset(cpu)))
macro define per_cpu_offset(cpu)   __per_cpu_offset[cpu]

# macro define raw_cpu_ptr(ptr) arch_raw_cpu_ptr(ptr)
# macro define arch_raw_cpu_ptr(ptr) $gs + per_cpu_offset(cpu)
# asm volatile(
#     "add %%gs:%1, %0" : "=r"(tcp_ptr__) : "m"(this_cpu_off),
#     "0"(s->cpu_slab)
# );

### container_of

macro define offsetof(t, f) &((t *)0)->f
macro define container_of(ptr, type, member) ((type *)((void *)ptr - (void *)offsetof(type, member)))

### list

macro define list_entry(ptr, type, member) container_of(ptr, type, member)
macro define list_first_entry(ptr, type, member) list_entry((ptr)->next, type, member)
macro define list_last_entry(ptr, type, member)  list_entry((ptr)->prev, type, member)
# macro define list_next_entry(pos, member) list_entry((pos)->member.next, typeof(*(pos)), member)
# macro define list_prev_entry(pos, member) list_entry((pos)->member.prev, typeof(*(pos)), member)
macro define list_next_entry(ptr, type, member) list_entry((ptr)->member.next, type, member)
macro define list_prev_entry(ptr, type, member) list_entry((ptr)->member.prev, type, member)

### rbtree

macro define rb_entry(ptr, type, member) container_of(ptr, type, member)
