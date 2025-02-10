define TaskParenthood as Box<task_struct> {
    :default [
        Text pid, comm
        Text<string> state: ${get_task_state(@this)}
        Text ppid: parent.pid
    ]
    :default => :show_children [
        Link children -> @children
    ]
    // :default => :show_threads [
    //     Text tgid
    //     Link thread_group -> @thread_group
    // ]
} where {
    children = List<task_struct.children>(@this.children).forEach |node| {
        yield TaskParenthood<task_struct.sibling>("task #{pid}": @node)
    }
    // thread_group = List<task_struct.thread_group>(@this.thread_group).forEach |node| {
    //     yield TaskParenthood<task_struct.thread_group>("task #{pid}": @node)
    // }
    parent = TaskParenthood(@this.parent)
}

diag textbook_01_task_children {
    plot TaskParenthood(${&init_task})
    // plot TaskParenthood("task_current": ${per_cpu_current_task(current_cpu())})
} with {
    all_tasks = SELECT task_struct FROM *
    UPDATE all_tasks WITH view: show_children

    kthreads = SELECT task_struct
        FROM all_tasks
        WHERE pid == 2 OR ppid == 2
    UPDATE kthreads WITH shrinked: true

    task_children_list = SELECT task_struct->children
        FROM all_tasks
    UPDATE task_children_list WITH direction: vertical
}
