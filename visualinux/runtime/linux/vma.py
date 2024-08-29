from visualinux import *
from visualinux.runtime.kvalue import *

PAGE_SHIFT = 12
PAGE_SIZE = (1 << PAGE_SHIFT)
PAGE_MASK = (~(PAGE_SIZE - 1))

def vma_pages(vma: KValue) -> KValue:
    '''((vma->vm_end - vma->vm_start) >> PAGE_SHIFT)
    '''
    vm_start = vma.eval_field('vm_start').dereference().value
    vm_end = vma.eval_field('vm_end').dereference().value
    value = (vm_end - vm_start) >> PAGE_SHIFT
    return KValue(GDBType.basic('unsigned long'), value)

def vma_last_pgoff(vma: KValue) -> KValue:
    '''vma->vm_pgoff + vma_pages(vma) - 1
    '''
    vm_pgoff = vma.eval_field('vm_pgoff').dereference().value
    value = vm_pgoff + vma_pages(vma).value - 1
    return KValue(GDBType.basic('unsigned long'), value)

# 

VM_WRITE = 0x00000002

def vma_is_writable(vma: KValue) -> KValue:
    vm_flags = vma.eval_field('vm_flags').dereference().value
    value = (vm_flags & VM_WRITE)
    return KValue(GDBType.basic('bool'), value)
