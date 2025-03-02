define PipeFDA as Box<pipe_inode_info> [
    Text head, tail
    Text max_usage, ring_size, nr_accounted
	Text readers, writers
    Text files
	Text r_counter, w_counter
]

define SocketFDA as Box<socket> [
    Text<enum:socket_state> state
    Text<enum:sock_type> type
    Text<flag:socket> flags
]

define FileFDA as Box<file> [
    Text<string> filename: f_path.dentry.d_name.name
	Text f_count.counter
	Text<flag:fcntl> f_flags
	Text<flag:fmode> f_mode
    Text<u16:o> i_mode: @this.f_inode.i_mode
    Shape private_data: @priv_node
] where {
    i_mode = @this.f_inode.i_mode
    priv_data = @this.private_data
    priv_node = switch ${true} {
        case ${S_ISCHR(@i_mode)}: [ Text<raw_ptr> chardev: @priv_data ]
        case ${S_ISBLK(@i_mode)}: [ Text<raw_ptr> blockdev: @priv_data ]
        case ${S_ISFIFO(@i_mode)}:
            [ Link pipe -> @pipe ] where {
                pipe = PipeFDA("pipe": @priv_data)
            }
        case ${S_ISSOCK(@i_mode)}:
            [ Link socket -> @socket ] where {
                socket = SocketFDA("socket": @priv_data)
            }
        otherwise: [ Text<raw_ptr> priv_data: @priv_data ]
    }
}

define TaskFDA as Box<task_struct> [
    Text pid, comm
    Shape files: @files
] where {
    files = Array(@this.files.fd_array).forEach |item| {
        member = switch @item {
        case ${NULL}:
            NULL
        otherwise: 
            [ Link "file #{@index}" -> @file ] where {
                file = FileFDA(@item)
            }
        }
        yield @member
    }
}

diag textbook_13_fd_array {
    plot TaskFDA("task_current": ${per_cpu_current_task(current_cpu())})
}
