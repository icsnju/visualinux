import userstudy.io_uring_common

diag io_uring_plot {
    plot TaskStruct("task_current": ${per_cpu_current_task(current_cpu())})
} with {
    task = SELECT task_struct FROM *
    UPDATE task WITH view: show_iou_mm

    all_vmas = SELECT vm_area_struct FROM *
    io_uring_vmas = SELECT vm_area_struct
        FROM *
        WHERE is_io_uring == true
    UPDATE all_vmas \ io_uring_vmas WITH trimmed: true

    all_bls = SELECT io_buffer_list FROM *
    configured_bls = SELECT io_buffer_list
        FROM *
        WHERE nr_entries != 0
    UPDATE all_bls \ configured_bls WITH trimmed: true

    UPDATE all_vmas WITH view: show_pages
    UPDATE all_bls WITH view: show_buf_ring

    vma_pages = SELECT page FROM REACHABLE(io_uring_vmas)
    bl_pages = SELECT page FROM REACHABLE(configured_bls)
    all_pages = SELECT page FROM *
    UPDATE all_pages \ vma_pages WITH trimmed: true
    UPDATE bl_pages WITH trimmed: false
}
