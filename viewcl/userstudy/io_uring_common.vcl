import stdlib

define Page as Box<page> [
    Text<raw_ptr> page_ptr: @this
    Text refcount: _refcount.counter
    Text<flag:page> flags
]

define IOUringBufRing as Box<io_uring_buf_ring> [
    Text<raw_ptr> ring_ptr: @this
    Text tail
    Link first_page -> @page
] where {
    page = Page(${virt_to_page(@this.bufs)})
}

define IOBufferList as Box<io_buffer_list> {
    :default [
        Text bgid
        Text is_mapped, is_mmap
        Text nr_entries, mask, head
    ]
    :default => :show_buf_ring [
        Link buf_ring -> @buf_ring
    ]
} where {
    buf_ring = switch @this.buf_ring {
        case ${NULL}: NULL
        otherwise: IOUringBufRing(@this.buf_ring)
    }
}

define IORingCtx as Box<io_ring_ctx> [
    Text<raw_ptr> ctx_ptr: @this
    Text flags
    Text submit_pid: submitter_task.pid
    Link low_bls -> @low_bls
    Link high_bls -> @high_bls
] where {
    low_bls = switch @this.io_bl {
        case ${NULL}: NULL
        otherwise:
            Array(bls: ${cast_to_array(@this.io_bl, io_buffer_list, 64)}).forEach |item| {
                yield [ Link "bl #{@index}" -> @bl ] where {
                    bl = IOBufferList(@item)
                }
            }
    }
    high_bls = XArray(@this.io_bl_xa).forEach |item| {
        yield [ Link "bl_xa #{@index}" -> @bl ] where {
            bl = IOBufferList(@item)
        }
    }
}

define IOTCtxNode as Box<io_tctx_node> [
    Text task_pid: task.pid
    Link ctx -> @ctx
] where {
    ctx = IORingCtx(@this.ctx)
}

define IOUFile as Box<file> [
    Text<string> filename: f_path.dentry.d_name.name
    Text<raw_ptr> private_data
]

define VMArea as Box<vm_area_struct> {
    :default [
        Text<u64:x> vm_start, vm_end
        Text<u64:x> vm_pgoff
        Text<flag:vm_basic> vm_flags
    ]
    :default => :show_iou [
        Text<bool> is_io_uring: ${@this.vm_file != NULL && @this.vm_file->f_op == &io_uring_fops}
        Link file -> @file
    ]
    :default => :show_pages [
        Link pages -> @pages
    ]
} where {
    file = switch @this.vm_file {
        case ${NULL}: NULL
        otherwise: IOUFile(@this.vm_file)
    }
    pages = Array(phys_pages: ${get_pages_in_vma(@this)}).forEach |item| {
        yield [ Link "page #{@index}" -> @page ] where {
            page = Page(@item)
        }
    }
}

define MapleNode as Box<maple_node> [
    Text<enum:maple_type> type: @type
    Text<u64:x> min: @ma_min
    Text<u64:x> max: @ma_max
    Shape slots: @slots
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
                slot = VMArea(@item)
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
                        case ${true}: VMArea("vm_area_struct": @slot_entry)
                        case ${false}: MapleNode("maple_node": @slot_entry)
                    }
                case ${false}: NULL
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
                        case ${true}: VMArea("vm_area_struct": @slot_entry)
                        case ${false}: MapleNode("maple_node": @slot_entry)
                    }
                case ${false}: NULL
                }
            }
        }
    otherwise:
        VBox(slots) [ Text unknown_type: @type ]
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
    ma_max = ${mt_node_max(@ma_root_entry)}
    ma_root = switch ${xa_is_node(@ma_root_entry)} {
    case ${true}:
        MapleNode(maple_root: @this.ma_root)
    case ${false}:
        VBox(maple_root) [ Text ma_root: @ma_root_entry ]
    }
}

define MMStruct as Box<mm_struct> [
    Text<u64:x> mmap_base
    Text mm_count: mm_count.counter
    Text map_count
    Link addrspace -> @mm_as
] where {
    mm_mt = MapleTree(@this.mm_mt)
    mm_as = Array.convFrom(@mm_mt, vm_area_struct)
}

define TaskStruct as Box<task_struct> {
    :default [
        Text pid, comm
    ]
    :default => :show_iou [
        Link io_uring_xa -> @xa
    ]
    :show_iou => :show_iou_mm [
        Link mm -> @mm
    ]
} where {
    xa = switch @this.io_uring {
        case ${NULL}: NULL
        otherwise:
            XArray(@this.io_uring.xa).forEach |item| {
                yield [ Link "tctx #{@index}" -> @tctx ] where {
                    tctx = IOTCtxNode(@item)
                }
            }
    }
    mm = MMStruct(@this.mm)
}
