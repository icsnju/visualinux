import lib.concurrency

define NetDevice as Box<net_device> [
    Text name
    Text<u64:x> mem_start, mem_end, base_addr
    Text state
]

define SkBuff as Box<sk_buff> [
    Link next -> @next
    Link dev -> @dev
    Text tail, end
    Text<raw_ptr> head
    Text<raw_ptr> data
    Text len, data_len, mac_len, hdr_len
] where {
    next = switch ${*@this.next.len} {
        case ${0}: NULL
        otherwise: SkBuff("sk_buff": @this.next)
    }
    dev = NetDevice(@this.dev)
}

define SkBuffHead as Box<sk_buff_head> [
    Link next -> @next
    // Link prev -> @prev
    Text qlen
    Text<emoji:lock> lock: lock.rlock.raw_lock.locked
] where {
    next = switch ${*@this.next.len} {
        case ${0}: NULL
        otherwise: SkBuff("sk_buff": @this.next)
    }
}

define Sock as Box<sock> [
    SkBuffHead sk_receive_queue
    SkBuffHead sk_write_queue
]

define SocketWQ as Box<socket_wq> [
    // wait_queue_head_t	wait;
    Text<flag:socket> flags
]

define Socket as Box<socket> [
    Text<enum:socket_state> state
    Text<enum:sock_type> type
    Text<flag:socket> flags
    Link sock -> @sock
    SocketWQ wq
] where {
    sock = Sock(@this.sk)
}

define FileSS as Box<file> [
    Text<string> filename: f_path.dentry.d_name.name
	Text f_count.counter
	Text<flag:fcntl> f_flags
	Text<flag:fmode> f_mode
    Text<u16:o> i_mode: @this.f_inode.i_mode
    Link private_data -> @priv_node
] where {
    i_mode = @this.f_inode.i_mode
    priv_data = @this.private_data
    priv_node = switch ${true} {
        case ${S_ISSOCK(@i_mode)}: Socket(@this.private_data)
        otherwise: [ Text<raw_ptr> priv_data: @this.private_data ]
    }
}

define TaskSS as Box<task_struct> [
    Text pid, comm
    Shape sockets: @sockets
    // Link children -> @children
] where {
    sockets = Array(@this.files.fd_array).forEach |item| {
        member = switch @item {
        case ${NULL}:
            NULL
        otherwise:
            switch ${true} {
                case ${S_ISSOCK(@item.f_inode.i_mode)}:
                    [ Link "socket #{@index}" -> @socket ] where {
                        socket = Socket(@item.private_data)
                    }
                otherwise:
                    NULL
            }
        }
        yield @member
    }
    children = List<task_struct.children>(@this.children).forEach |node| {
        yield TaskSS<task_struct.sibling>("task #{pid}": @node)
    }
}

diag textbook_21_sockstack {
    plot TaskSS("task_current": ${per_cpu_current_task(current_cpu())})
} with {
    empty_queues = SELECT sk_buff_head
        FROM *
        WHERE next == NULL
    sock_not_queuing = SELECT sock
        FROM *
        WHERE sk_receive_queue IN empty_queues AND
            sk_write_queue IN empty_queues
    UPDATE sock_not_queuing WITH trimmed: true
}
