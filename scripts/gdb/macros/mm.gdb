shell echo "+ source macros/mm.gdb"

### vm flag judgers

macro define vma_is_writable(vma) ((vma)->vm_flags & VM_WRITE)

### page types

macro define PAGE_SHIFT 12
macro define PAGE_SIZE  (1UL << PAGE_SHIFT)
macro define PAGE_MASK  (~(PAGE_SIZE - 1))

macro define vma_pages(vma) ((vma->vm_end - vma->vm_start) >> PAGE_SHIFT)

### page flags

macro define ZONES_MASK       ((1UL << ZONES_WIDTH) - 1)
macro define NODES_MASK       ((1UL << NODES_WIDTH) - 1)
macro define SECTIONS_MASK    ((1UL << SECTIONS_WIDTH) - 1)
macro define LAST_CPUPID_MASK ((1UL << LAST_CPUPID_SHIFT) - 1)
macro define KASAN_TAG_MASK   ((1UL << KASAN_TAG_WIDTH) - 1)
macro define ZONEID_MASK      ((1UL << ZONEID_SHIFT) - 1)

