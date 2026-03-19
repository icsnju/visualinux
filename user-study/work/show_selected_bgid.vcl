import userstudy.io_uring_common

diag io_uring_plot {
    plot TaskStruct("task_current": ${per_cpu_current_task(current_cpu())})
} with {
    task = SELECT task_struct FROM *
    UPDATE task WITH view: show_iou

    all_bls = SELECT io_buffer_list FROM *
    target_bls = SELECT io_buffer_list
        FROM *
        WHERE bgid == 0

    UPDATE all_bls \ target_bls WITH trimmed: true
}
