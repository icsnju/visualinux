import lib.concurrency

define AnonVMAChain as Box<anon_vma_chain> [
    Text<u64> start_pgoff: vma.vm_pgoff
    Text<u64> last_pgoff: ${vma_last_pgoff(@this.vma)}
    // ${*@this.vma.vm_pgoff + vma_pages(@this.vma) - 1}
    Text rb_subtree_last
]

define AnonVMA as Box<anon_vma> [
    Text refcount.counter
    Text num_children
    Text num_active_vmas
    Link parent -> @parent
    Link vmas -> @vmas
] where {
    parent = AnonVMA(@this.parent)
    vmas = RBTree<anon_vma.rb_root>(@this.rb_root).forEach |item| {
        yield AnonVMAChain<anon_vma_chain.rb>(@item)
    }
}

define VMAreaAR as Box<vm_area_struct> [
    Text<u64:x> vm_start, vm_end
    Text<flag:vm_basic> vm_flags
    Link anon_vma -> @anon_vma
    // Link anon_vma_chain -> @anon_vma_chain
] where {
    anon_vma = AnonVMA(@this.anon_vma)
    // anon_vma_chain = List<vm_area_struct.anon_vma_chain>(@this.anon_vma_chain).forEach |item| {
    //     yield AnonVMAChain<anon_vma_chain.same_vma>(@item)
    // }
}

define MapleTreeARNode as Box [
    Text<enum:maple_type> type: @type
    Text<u64:x> min: @ma_min
    Text<u64:x> max: @ma_max
    Shape slots: @slots
    Shape pivots: @pivots
] where {
    is_leaf = ${mte_is_leaf(@this)}
    node = ${mte_to_node(@this)}
    type = ${mte_node_type(@this)}
    last_ma_min = @ma_min
    last_ma_max = @ma_max
    slots = switch @type {
    case ${maple_dense}:
        Array(slots: @node.slot).forEach |item| {
            ma_min = ${@last_ma_min + @index}
            ma_max = @ma_min
            yield [ Link slot -> @slot ] where {
                slot = VMAreaAR(@item)
            }
        }
    case ${maple_leaf_64}, ${maple_range_64}:
        Array(slots: @node.mr64.slot).forEach |item| {
            pivots = @node.mr64.pivot
            yield [ Link slot -> @slot_safe ] where {
                slot_entry = @item
                slot_length = ${sizeof((*@pivots)) / sizeof(void *)}
                ma_min = ${@index > 0 ? (*@pivots)[@index - 1] + 1 : @last_ma_min}
                ma_max = ${@index < @slot_length - 1 ? (*@pivots)[@index] : @last_ma_max}
                slot_is_safe = ${mt_slot_is_safe(@pivots, @index, @last_ma_max)}
                slot_safe = switch @slot_is_safe {
                case ${true}:
                    switch @is_leaf {
                        case ${true}:  VMAreaAR(@slot_entry)
                        case ${false}: MapleTreeARNode(maple_node: @slot_entry)
                    }
                case ${false}:
                    NULL
                }
            }
        }
    case ${maple_arange_64}:
        Array(slots: @node.ma64.slot).forEach |item| {
            pivots = @node.ma64.pivot
            yield [ Link slot -> @slot_safe ] where {
                slot_entry = @item
                slot_length = ${sizeof((*@pivots)) / sizeof(void *)}
                ma_min = ${@index > 0 ? (*@pivots)[@index - 1] + 1 : @last_ma_min}
                ma_max = ${@index < @slot_length - 1 ? (*@pivots)[@index] : @last_ma_max}
                slot_is_safe = ${mt_slot_is_safe(@pivots, @index, @last_ma_max)}
                slot_safe = switch @slot_is_safe {
                case ${true}:
                    switch @is_leaf {
                        case ${true}:  VMAreaAR(@slot_entry)
                        case ${false}: MapleTreeARNode(maple_node: @slot_entry)
                    }
                case ${false}:
                    NULL
                }
            }
        }
    otherwise:
        VBox(slots) [ Text unkown_type: @type ]
    }
    pivots = switch @type {
    case ${maple_dense}: NULL
    case ${maple_leaf_64}, ${maple_range_64}:
        Array(@node.mr64.pivot).forEach |item| {
            yield [ Text<u64:x> pivot: @item ]
        }
    case ${maple_arange_64}:
        Array(@node.ma64.pivot).forEach |item| {
            yield [ Text<u64:x> pivot: @item ]
        }
    }
}

define MapleTreeAR as Box<maple_tree> [
    Text<emoji:lock> ma_lock: ma_lock.rlock.raw_lock.locked
    Link ma_root -> @ma_root
    Text<flag:maple_tree> ma_flags
    Text height: ${mt_height(@this)}
    Text<bool> in_rcu: ${mt_in_rcu(@this)}
    Text<bool> ext_lk: ${mt_external_lock(@this)}
] where {
    ma_root_entry = @this.ma_root
    type = ${mte_node_type(@ma_root_entry)}
    ma_min = ${0}
    ma_max = ${mt_node_max(@type)}
    ma_root = switch ${xa_is_node(@ma_root_entry)} {
    case ${true}:
        MapleTreeARNode(maple_root: @this.ma_root)
    case ${false}:
        VBox(maple_root) [ Text ma_root: @ma_root_entry ]
    }
}

define MMMM as Box<mm_struct> {
    :default [
        Text<u64:x> mmap_base
        Text mm_count: mm_count.counter
        Text map_count
        Link mm_mt -> @mm_mt
    ]
} where {
    mm_mt = MapleTreeAR(@this.mm_mt)
}

define TaskAR as Box<task_struct> [
    Text pid, comm
    Text<string> state: ${get_task_state(@this)}
    Link as -> @mm_mt
    // Link children -> @children
] where {
    mm_mt = MapleTreeAR(@this.mm.mm_mt)
    // as = Array.selectFrom(@mm_mt, VMArea)
    // children = List<task_struct.children>(@this.children).forEach |node| {
    //     yield TaskAR<task_struct.sibling>("task #{pid}": @node)
    // }
}

ar_current_task = TaskAR("task_current": ${per_cpu_current_task(current_cpu())})
diag textbook_18_anon_rev {
    plot @ar_current_task
}
