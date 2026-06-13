import userstudy.io_uring_common

diag io_uring_plot {
    plot TaskStruct("task_current": ${per_cpu_current_task(current_cpu())})
} with {
    task = SELECT task_struct FROM *
    UPDATE task WITH view: show_iou

    all_bls = SELECT io_buffer_list FROM *
    UPDATE all_bls WITH view: show_buf_ring

    configured_bls = SELECT io_buffer_list
        FROM *
        WHERE nr_entries != 0
    UPDATE all_bls \ configured_bls WITH trimmed: true

    bls_in_range = SELECT io_buffer_list
        FROM *
        WHERE bgid >= 0 AND bgid < 10
    UPDATE all_bls \ bls_in_range WITH trimmed: true

    all_pages = SELECT page FROM *

    active_pages = SELECT page FROM REACHABLE(configured_bls)
    UPDATE all_pages \ active_pages WITH trimmed: true

    pages_in_range = SELECT page FROM REACHABLE(bls_in_range)
    UPDATE all_pages \ pages_in_range WITH trimmed: true
}
