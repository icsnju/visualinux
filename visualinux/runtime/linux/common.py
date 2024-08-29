from visualinux import *
from visualinux.runtime.kvalue import *

### basic

NR_OPEN_DEFAULT = 64

# cast_to_array(id, type, length) ((struct type (*)[length])(id))
def cast_to_array(id: KValue, type: str, length: KValue | int) -> KValue:
    if isinstance(length, KValue):
        if length.gtype.is_pointer():
            length = length.dereference()
        length = length.value
    gval = gdb.parse_and_eval(f'((struct {type} (*)[{length}])({id.address}))')
    return KValue(GDBType(gval.type), id.address)

# cast_to_parray(id, type, length) ((struct type * (*)[length])(id))
def cast_to_parray(id: KValue, type: str, length: KValue | int) -> KValue:
    print(f'try cast_to_parray {id=} {type=} {length=}')
    return cast_to_array(id, f'{type} *', length)

def get_bitfield(var: KValue, fieldname: str) -> KValue:
    value = gdb.Value(var.address).cast(var.gtype.inner)[fieldname]
    return KValue.FinalInt(GDBType.basic('int'), value)

### per-cpu access

import linux.cpus

def current_cpu() -> KValue:
    value = linux.cpus.get_current_cpu()
    return KValue.FinalInt(GDBType.basic('int'), value)

# def per_cpu(var: KValue, cpu: KValue | int) -> KValue:
#     '''(*per_cpu_ptr(&(var), cpu))
#     '''
#     assert False

def per_cpu_ptr(ptr: KValue, cpu: KValue | int) -> KValue:
    '''((typeof(ptr))((uintptr_t)ptr + per_cpu_offset(cpu)))
       this hacking can speedup gdb but we haven't adapt it to kvm-enabled situ.
    '''
    if ptr.address == 0:
        return KValue(ptr.gtype, 0)
    address = (ptr.address + per_cpu_offset(cpu)) % (2**ptr_size)
    return KValue(ptr.gtype, address)

def per_cpu_offset(cpu: KValue | int) -> int:
    if isinstance(cpu, KValue):
        cpu = cpu.value
    gval = gdb.parse_and_eval(f'__per_cpu_offset[{cpu}]')
    return int(gval)

### specific per-cpu access for kgdb cases

def per_cpu_current_task(cpu: KValue | int) -> KValue:
    '''(*per_cpu_ptr(&(var), cpu))
    '''
    try:
        ptr = gdb.parse_and_eval(f'per_cpu(current_task, {cpu!s})')
    except:
        ptr = gdb.parse_and_eval(f'kgdb_info[{cpu!s}].task')
    return KValue(GDBType.lookup('task_struct'), int(ptr))
