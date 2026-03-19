source /home/jm233333/visualinux/user-study/work/gdb/shared/io_uring_common.gdb

define compare_vma_and_bgid
    if $argc >= 1
        __iou_select_addr $arg0
    end
    if $argc >= 2
        if $argc >= 3
            __iou_select_bgid $arg1 $arg2
        else
            __iou_select_bgid $arg1
        end
    end
    __iou_compare_mapping
end

define summarize_selected_mapping_state
    if $argc >= 1
        __iou_select_addr $arg0
    end
    if $argc >= 2
        if $argc >= 3
            __iou_select_bgid $arg1 $arg2
        else
            __iou_select_bgid $arg1
        end
    end
    __iou_compare_mapping
    __iou_lookup_low_bl
    if $iou_bl != 0 && $vl_addr != 0
        set $vma = find_vma(current->mm, $vl_addr)
        if $vma != 0 && $vl_addr >= $vma->vm_start
            printf "mapping-state: vma_present=%d buf_ring_present=%d mm_flag_pair=%u/%u\n", \
                1, ($iou_bl->buf_ring != 0), $iou_bl->is_mapped, $iou_bl->is_mmap
        end
    end
end

document compare_vma_and_bgid
Show the selected io_buffer_list state next to the VMA covering the
selected user address.
end

document summarize_selected_mapping_state
Print a compact bridge summary after compare_vma_and_bgid.
end
