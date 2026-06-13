source /home/jm233333/visualinux/scripts/gdb/macros/flags/vm.gdb

set pagination off
set $vl_ctx = 0
set $vl_bgid = 0
set $vl_addr = 0

# UAPI constants for io_uring provided-buffer mmap offsets.
set $iou_pbuf_ring_off = 0x80000000ULL
set $iou_pbuf_shift = 16
set $iou_low_bgid_array = 64

define iou_use_ctx
    if $argc < 1
        echo usage: iou_use_ctx <ctx>\n
    else
        set $vl_ctx = (unsigned long)$arg0
        printf "[iou] selected ctx = %p\n", (void *)$vl_ctx
    end
end

define iou_use_bgid
    if $argc < 1
        echo usage: iou_use_bgid <bgid>\n
    else
        set $vl_bgid = (unsigned int)$arg0
        printf "[iou] selected bgid = %u\n", (unsigned int)$vl_bgid
    end
end

define iou_use_addr
    if $argc < 1
        echo usage: iou_use_addr <addr>\n
    else
        set $vl_addr = (unsigned long)$arg0
        printf "[iou] selected addr = %#lx\n", (unsigned long)$vl_addr
    end
end

define __iou_warn_missing_ctx
    if $vl_ctx == 0
        echo [iou] no ctx selected; use iou_use_ctx, trace_pbuf_lifecycle, or break on an io_uring path first.\n
    end
end

define __iou_warn_high_bgid
    if $vl_bgid >= $iou_low_bgid_array
        printf "[iou] bgid %u is stored in ctx->io_bl_xa; the text helpers in this file only support the inline low-bgid array.\n", (unsigned int)$vl_bgid
    end
end

define __iou_decode_vma_bgid
    set $iou_vma_pgoff = (unsigned long long)$arg0->vm_pgoff
    set $iou_pbuf_base_pgoff = ($iou_pbuf_ring_off >> 12)
    if $iou_vma_pgoff >= $iou_pbuf_base_pgoff
        set $iou_vma_bgid = (unsigned int)(($iou_vma_pgoff - $iou_pbuf_base_pgoff) >> ($iou_pbuf_shift - 12))
    else
        set $iou_vma_bgid = 0xffffffffU
    end
end

define __iou_select_ctx
    if $argc >= 1
        set $vl_ctx = (unsigned long)$arg0
    end
end

define __iou_select_bgid
    if $argc >= 1
        set $vl_bgid = (unsigned int)$arg0
    end
    if $argc >= 2
        set $vl_ctx = (unsigned long)$arg1
    end
end

define __iou_select_addr
    if $argc >= 1
        set $vl_addr = (unsigned long)$arg0
    end
end

define __iou_lookup_low_bl
    set $iou_ctx = (struct io_ring_ctx *)$vl_ctx
    set $iou_bl = 0
    if $iou_ctx != 0 && $vl_bgid < $iou_low_bgid_array && $iou_ctx->io_bl != 0
        set $iou_bl = ((struct io_buffer_list *)$iou_ctx->io_bl) + $vl_bgid
    end
end

define __iou_print_ctx
    __iou_warn_missing_ctx
    if $vl_ctx != 0
        set $ctx = (struct io_ring_ctx *)$vl_ctx
        printf "ctx=%p flags=%#x submitter_task=%p submitter_pid=%d io_bl=%p io_bl_xa_head=%p\n", \
            $ctx, $ctx->flags, $ctx->submitter_task, \
            $ctx->submitter_task ? $ctx->submitter_task->pid : -1, \
            $ctx->io_bl, $ctx->io_bl_xa.xa_head
    end
end

define __iou_print_bgid
    __iou_warn_missing_ctx
    __iou_warn_high_bgid
    __iou_lookup_low_bl
    if $iou_bl == 0
        if $vl_ctx != 0 && $vl_bgid < $iou_low_bgid_array
            echo [iou] ctx->io_bl is NULL.\n
        end
    else
        printf "bgid=%u bl=%p buf_ring=%p buf_pages=%p buf_nr_pages=%u nr_entries=%u mask=%#x head=%u is_mapped=%u is_mmap=%u\n", \
            (unsigned int)$iou_bl->bgid, $iou_bl, $iou_bl->buf_ring, $iou_bl->buf_pages, \
            $iou_bl->buf_nr_pages, $iou_bl->nr_entries, $iou_bl->mask, $iou_bl->head, \
            $iou_bl->is_mapped, $iou_bl->is_mmap
    end
end

define __iou_print_all_bgid_summary
    __iou_warn_missing_ctx
    if $vl_ctx != 0
        set $ctx = (struct io_ring_ctx *)$vl_ctx
        if $ctx->io_bl == 0
            echo [iou] ctx->io_bl is NULL.\n
        else
            set $bl_base = (struct io_buffer_list *)$ctx->io_bl
            set $i = 0
            while $i < $iou_low_bgid_array
                set $bl = $bl_base + $i
                if $bl->is_mapped || $bl->is_mmap || $bl->buf_ring || $bl->nr_entries
                    printf "[%02u] bl=%p buf_ring=%p is_mapped=%u is_mmap=%u nr_entries=%u head=%u mask=%#x\n", \
                        $i, $bl, $bl->buf_ring, $bl->is_mapped, $bl->is_mmap, \
                        $bl->nr_entries, $bl->head, $bl->mask
                end
                set $i = $i + 1
            end
        end
    end
end

define __iou_print_bufring
    __iou_lookup_low_bl
    __iou_print_bgid
    if $iou_bl != 0 && $iou_bl->buf_ring != 0
        printf "buf_ring=%p tail=%u\n", $iou_bl->buf_ring, $iou_bl->buf_ring->tail
        set $j = 0
        while $j < 4 && $j < $iou_bl->nr_entries
            printf "  bufs[%u]: addr=%#llx len=%u bid=%u\n", \
                $j, $iou_bl->buf_ring->bufs[$j].addr, $iou_bl->buf_ring->bufs[$j].len, $iou_bl->buf_ring->bufs[$j].bid
            set $j = $j + 1
        end
    end
end

define __iou_print_bufring_pages
    __iou_warn_missing_ctx
    __iou_warn_high_bgid
    __iou_lookup_low_bl
    if $iou_bl == 0
        if $vl_ctx != 0 && $vl_bgid < $iou_low_bgid_array
            echo [iou] selected bl is unavailable.\n
        end
    else
        if $iou_bl->buf_ring == 0
            echo [iou] selected bl has no buf_ring.\n
        else
            printf "buf_ring=%p, first payload slot=%p\n", $iou_bl->buf_ring, &$iou_bl->buf_ring->bufs[0]
            eval "lx-virt_to_page %#lx", (unsigned long)&$iou_bl->buf_ring->bufs[0]
        end
    end
end

define __iou_print_vma
    if $vl_addr == 0
        echo [iou] no addr selected; use iou_use_addr first.\n
    else
        set $mm = current->mm
        set $vma = find_vma($mm, $vl_addr)
        if $vma == 0 || $vl_addr < $vma->vm_start
            printf "[iou] no VMA covers %#lx\n", (unsigned long)$vl_addr
        else
            __iou_decode_vma_bgid $vma
            printf "vma=%p [%#lx, %#lx) vm_pgoff=%#llx vm_flags=%#lx vm_file=%p private_data=%p is_io_uring=%d\n", \
                $vma, (unsigned long)$vma->vm_start, (unsigned long)$vma->vm_end, \
                (unsigned long long)$vma->vm_pgoff, \
                (unsigned long)$vma->vm_flags, $vma->vm_file, \
                $vma->vm_file ? $vma->vm_file->private_data : 0, \
                $vma->vm_file ? ($vma->vm_file->f_op == &io_uring_fops) : 0
            # (($vma->vm_flags & VM_PFNMAP) != 0)
            # (unsigned int)$iou_vma_bgid
        end
    end
end

define __iou_compare_mapping
    echo === io_uring side ===\n
    __iou_print_bgid
    echo === VMA side ===\n
    __iou_print_vma
    __iou_lookup_low_bl
    if $iou_bl != 0 && $vl_addr != 0
        set $vma = find_vma(current->mm, $vl_addr)
        if $vma != 0 && $vl_addr >= $vma->vm_start
            __iou_decode_vma_bgid $vma
            printf "summary: same_ctx=%d same_bgid=%d bl_torn_down=%d mapping_present=%d\n", \
                ($vma->vm_file ? ($vma->vm_file->private_data == (void *)$vl_ctx) : 0), \
                ((unsigned int)$iou_vma_bgid == (unsigned int)$vl_bgid), \
                (($iou_bl->buf_ring == 0) && ($iou_bl->is_mapped == 0) && ($iou_bl->is_mmap == 0)), \
                1
        end
    end
end

define __iou_trace_unregister_effects
    break __io_remove_buffers if bl && bl->bgid == $vl_bgid
    commands
        silent
        set $vl_ctx = (unsigned long)ctx
        printf "[__io_remove_buffers] ctx=%p bl=%p bgid=%u is_mapped=%u is_mmap=%u buf_ring=%p nbufs=%u\n", \
            ctx, bl, bl->bgid, bl->is_mapped, bl->is_mmap, bl->buf_ring, nbufs
        continue
    end
    break io_unregister_pbuf_ring
    commands
        silent
        set $reg = (struct io_uring_buf_reg *)arg
        set $vl_ctx = (unsigned long)ctx
        set $vl_bgid = $reg->bgid
        printf "[io_unregister_pbuf_ring] ctx=%p bgid=%u\n", ctx, $reg->bgid
        continue
    end
    echo [iou] installed unregister-effect tracepoints.\n
end

define __iou_trace_lifecycle
    break io_register_pbuf_ring
    commands
        silent
        set $reg = (struct io_uring_buf_reg *)arg
        set $vl_ctx = (unsigned long)ctx
        set $vl_bgid = $reg->bgid
        printf "[register] ctx=%p bgid=%u entries=%u flags=%#x ring_addr=%#llx\n", \
            ctx, $reg->bgid, $reg->ring_entries, $reg->flags, $reg->ring_addr
        continue
    end

    break io_uring_mmap
    commands
        silent
        set $vl_ctx = (unsigned long)file->private_data
        set $vl_addr = (unsigned long)vma->vm_start
        __iou_decode_vma_bgid vma
        set $vl_bgid = $iou_vma_bgid
        printf "[mmap] ctx=%p addr=%#lx vm_pgoff=%#llx decoded_bgid=%u flags=%#lx\n", \
            file->private_data, (unsigned long)vma->vm_start, \
            (unsigned long long)vma->vm_pgoff, (unsigned int)$iou_vma_bgid, \
            (unsigned long)vma->vm_flags
        continue
    end

    break io_unregister_pbuf_ring
    commands
        silent
        set $reg = (struct io_uring_buf_reg *)arg
        set $vl_ctx = (unsigned long)ctx
        set $vl_bgid = $reg->bgid
        printf "[unregister] ctx=%p bgid=%u\n", ctx, $reg->bgid
        continue
    end
    echo [iou] installed lifecycle tracepoints.\n
end
