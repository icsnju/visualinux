source /home/jm233333/visualinux/user-study/work/gdb/shared/io_uring_common.gdb

define trace_pbuf_lifecycle
    __iou_trace_lifecycle
end

define trace_unregister_effects
    if $argc >= 1
        if $argc >= 2
            __iou_select_bgid $arg0 $arg1
        else
            __iou_select_bgid $arg0
        end
    end
    __iou_trace_unregister_effects
end

document trace_pbuf_lifecycle
Install neutral tracepoints on register, mmap, and unregister.
end

document trace_unregister_effects
Trace the teardown path for the selected bgid.
end
