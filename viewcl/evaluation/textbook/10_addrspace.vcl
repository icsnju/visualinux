import lib.concurrency

define VMFile as Box<file> [
    Text<string> filename: f_path.dentry.d_name.name
]

define AnonVMASimple as Box<anon_vma> [
    Text refcount.counter
    Text num_children
    Text num_active_vmas
]

define VMArea as Box<vm_area_struct> [
    Text<u64:x> vm_start, vm_end
    Text<flag:vm_basic> vm_flags
    Text<bool> is_writable: ${vma_is_writable(@this)}
    Link vm_file -> @vm_file
    Link anon_vma -> @anon_vma
] where {
    vm_file = VMFile(@this.vm_file)
    anon_vma = AnonVMASimple(@this.anon_vma)
}

define MapleNode as Box<maple_node> [
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
            yield [ Link "slot #{@index}" -> @slot ] where {
                slot = VMArea("vm_area_struct #{@index}": @item)
            }
        }
    case ${maple_leaf_64}, ${maple_range_64}:
        Array(slots: @node.mr64.slot).forEach |item| {
            pivots = @node.mr64.pivot
            yield [ Link "slot #{@index}" -> @slot_safe ] where {
                slot_entry = @item
                ma_min = ${ma_calc_min(@pivots, @index, @last_ma_min)}
                ma_max = ${ma_calc_max(@pivots, @index, @last_ma_max)}
                slot_is_safe = ${mt_slot_is_safe(@pivots, @index, @last_ma_max)}
                slot_safe = switch @slot_is_safe {
                case ${true}:
                    switch @is_leaf {
                        case ${true}:  VMArea("vm_area_struct #{@index}": @slot_entry)
                        case ${false}: MapleNode(maple_node: @slot_entry)
                    }
                case ${false}:
                    NULL
                }
            }
        }
    case ${maple_arange_64}:
        Array(slots: @node.ma64.slot).forEach |item| {
            pivots = @node.ma64.pivot
            yield [ Link "slot #{@index}" -> @slot_safe ] where {
                slot_entry = @item
                ma_min = ${ma_calc_min(@pivots, @index, @last_ma_min)}
                ma_max = ${ma_calc_max(@pivots, @index, @last_ma_max)}
                slot_is_safe = ${mt_slot_is_safe(@pivots, @index, @last_ma_max)}
                slot_safe = switch @slot_is_safe {
                case ${true}:
                    switch @is_leaf {
                        case ${true}:  VMArea("vm_area_struct #{@index}": @slot_entry)
                        case ${false}: MapleNode(maple_node: @slot_entry)
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
        Array(pivots: @node.mr64.pivot).forEach |item| {
            yield [ Text<u64:x> "pivot #{@index}": @item ]
        }
    case ${maple_arange_64}:
        Array(pivots: @node.ma64.pivot).forEach |item| {
            yield [ Text<u64:x> "pivot #{@index}": @item ]
        }
    }
}

define MapleTree as Box<maple_tree> [
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
        MapleNode(maple_root: @this.ma_root)
    case ${false}:
        VBox(maple_root) [ Text ma_root: @ma_root_entry ]
    }
}

define MMStruct as Box<mm_struct> {
    :default [
        Text<u64:x> mmap_base
        Text mm_count: mm_count.counter
        Text map_count
    ]
    :default => :mm_mt [
        Link mt -> @mm_mt
    ]
    :default => :as [
        Link as -> @mm_as
    ]
} where {
    mm_mt = MapleTree(@this.mm_mt)
    mm_as = Array.convFrom(@mm_mt, vm_area_struct)
}

define TaskMM as Box<task_struct> [
    Text pid, comm
    Text<string> state: ${get_task_state(@this)}
    Link mm -> @mm
] where {
    mm = MMStruct(@this.mm)
}

tm_current_task = TaskMM("task_current": ${per_cpu_current_task(current_cpu())})
diag textbook_10_task_mm_mt {
    plot @tm_current_task
} with {
    mm = SELECT mm_struct FROM *
    UPDATE mm WITH view: mm_mt

    slots = SELECT maple_node.slots FROM *
    UPDATE slots WITH collapsed: true

    writable = SELECT vm_area_struct
        FROM *
        WHERE is_writable == true
    UPDATE writable WITH shrinked: true
}
