// define PageInSLAB as Box<page> [
//     
//     //
// ]

define SLAB_on_node as Box<slab> {
    :default [
        Text<flag> __page_flags
        Text<string> slab_cache.name
        // Link freelist -> @freelist
        Text freelist
        // we must force to eval bit-fields in gdb hackings since they are not addressable
        Text inuse:   ${get_bitfield(@this, "inuse")}
        Text objects: ${get_bitfield(@this, "objects")}
        Text frozen:  ${get_bitfield(@this, "frozen")}
        Text __unused
        Text refcount: __page_refcount.counter
    ]
} where {
    // freelist = 
}
define SLAB_on_cpu as Box<slab> {
    :default [
        Text<flag> __page_flags
        Text<string> slab_cache.name
        // Link freelist -> @freelist
        Text freelist
        Text inuse, objects, frozen
        Text __unused
        Text refcount: __page_refcount.counter
        Link next -> @next
        Text slabs
    ]
} where {
    // freelist = 
    next = SLAB_on_cpu(@this.next)
}

define KMemCacheCPU as Box<kmem_cache_cpu> [
    // Link freelist -> @freelist
    Text freelist
    Link slab -> @slab
    Link partial -> @partial
    Text tid
] where {
    // freelist = 
    slab = SLAB_on_cpu(@this.slab)
    partial = SLAB_on_cpu(@this.partial)
}

define KMemCacheNode as Box<kmem_cache_node> [
	Text nr_partial
	Link partial -> @partial
// #ifdef CONFIG_SLUB_DEBUG
	Text nr_slabs: nr_slabs.counter
	Text total_objects: total_objects.counter
	// Link full -> @full
] where {
    partial = List<kmem_cache_node.partial>(@this.partial).forEach |node| {
        yield SLAB_on_node<slab.slab_list>(@node)
    }
    full = List<kmem_cache_node.full>(@this.full).forEach |node| {
        yield SLAB_on_node<slab.slab_list>(@node)
    }
}

define KMemCache as Box<kmem_cache> [
    Text<string> name
    Link cpu_slab -> @cpu_slab
    Text<flag:slab> flags
    Text min_partial
    Text size, object_size, offset
    Text cpu_partial
    Text cpu_partial_slabs
    Text<flag:gfp> allocflags
    Text refcount
    // TODO: support array slicing
    // Text nr_node_ids: ${nr_node_ids}
    Link node -> @node
] where {
    cpu_slab = KMemCacheCPU(${per_cpu_ptr(@this.cpu_slab, 0)})
    // node = Array(@this.node).forEach |node| {
    //     yield [ Link node -> @kmem_cache_node ] where { kmem_cache_node = KMemCacheNode(@node) }
    // }
    node = KMemCacheNode(@this.node[0])
}

// struct kmem_cache * kmalloc_caches[NR_KMALLOC_TYPES][KMALLOC_SHIFT_HIGH + 1]
// slab_caches = List<list_head>(${&slab_caches}).forEach |node| {
//     yield KMemCache<kmem_cache.list>(@node)
// }

kmem_cache         = KMemCache(${kmem_cache})
task_struct_cachep = KMemCache(${task_struct_cachep})
vm_area_cachep     = KMemCache(${vm_area_cachep})
inode_cachep       = KMemCache(${inode_cachep})
// names_cachep       = KMemCache(${names_cachep})
// sigqueue_cachep    = KMemCache(${sigqueue_cachep})

// TODO: fix the Array key confliction bug
diag textbook_0809_kmem_cache_examples {
    // plot @slab_caches
    plot @kmem_cache
    plot @task_struct_cachep
    plot @vm_area_cachep
    plot @inode_cachep
    // plot @names_cachep
    // plot @sigqueue_cachep
}
