source /home/jm233333/visualinux/user-study/work/gdb/shared/io_uring_common.gdb

define show_ctx
    if $argc >= 1
        __iou_select_ctx $arg0
    end
    __iou_print_ctx
end

define show_bgid
    if $argc >= 1
        if $argc >= 2
            __iou_select_bgid $arg0 $arg1
        else
            __iou_select_bgid $arg0
        end
    end
    __iou_print_bgid
end

define show_all_bgid_summary
    if $argc >= 1
        __iou_select_ctx $arg0
    end
    __iou_print_all_bgid_summary
end

define show_bufring
    if $argc >= 1
        if $argc >= 2
            __iou_select_bgid $arg0 $arg1
        else
            __iou_select_bgid $arg0
        end
    end
    __iou_print_bufring
end

define show_bufring_pages
    if $argc >= 1
        if $argc >= 2
            __iou_select_bgid $arg0 $arg1
        else
            __iou_select_bgid $arg0
        end
    end
    __iou_print_bufring_pages
end

define show_vma_by_addr
    if $argc >= 1
        __iou_select_addr $arg0
    end
    __iou_print_vma
end

document show_ctx
Show the selected io_ring_ctx summary.
end

document show_bgid
Show the selected low-bgid inline io_buffer_list (bgid < 64).
end

document show_all_bgid_summary
Show a compact summary for the configured inline io_buffer_list entries.
end

document show_bufring
Show the selected buffer ring and a few payload slots.
end

document show_bufring_pages
Show the page backing the selected buffer ring payload.
end

document show_vma_by_addr
Show the VMA that covers the selected user address.
end
