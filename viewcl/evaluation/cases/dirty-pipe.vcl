define Page_simple as Box<page> [
    Text<raw_ptr> addr: @this
]

define PipeBufOps as Box<pipe_buf_operations> [
    Text<fptr> confirm, release, try_steal, get
]

define PipeBuffer as Box<pipe_buffer> [
    Link page -> @page
    Text offset, len
    Text<flag:pipe_buffer> flags
    // Link ops ~> @ops
] where {
    page = Page_simple(@this.page)
    ops = PipeBufOps(@this.ops)
}

define PipeINodeInfo as Box<pipe_inode_info> [
    Text head, tail
    Text max_usage, ring_size, nr_accounted
	Text readers, writers
    Text files
	Text r_counter, w_counter
    Link bufs -> @bufs
] where {
    // bufs = PipeBuffer(@this.bufs)
    bufs = Array("pipe_bufs": ${cast_to_array(@this.bufs, "pipe_buffer", @this.ring_size)}).forEach |item| {
        yield [ Link "pipe_buf #{@index}" -> @pipe_buf ] where {
            pipe_buf = PipeBuffer(@item)
        }
    }
}

define FileToPipe as Box<file> [
    Text<string> filename: f_path.dentry.d_name.name
	Text<flag:fcntl> f_flags
    Link pipe_info -> @pipe_info
    Link pagecache -> @pagecache
] where {
    i_mode = @this.f_inode.i_mode
    pipe_info = switch ${true} {
        case ${S_ISFIFO(@i_mode)}: PipeINodeInfo("pipe_info": @this.private_data)
        otherwise: NULL
    }
    pagecache = XArray(@this.f_inode.i_mapping.i_pages).forEach |item| {
        // yield [ Text<raw_ptr> page: @item ]
        yield [ Link page -> @page ] where {
            page = Page_simple(@item)
        }
    }
}

define TaskDP as Box<task_struct> [
    Text pid, comm
    Shape files: @files
] where {
    files = Array(fds: ${cast_to_parray(@this.files.fdt.fd, file, NR_OPEN_DEFAULT)}).forEach |item| {
        member = switch @item {
            case ${NULL}: NULL
            otherwise: [
                Link "file #{@index}" -> @file
            ] where {
                file = FileToPipe(@item)
            }
        }
        yield @member
    }
}

diag dirty_pipe {
    plot TaskDP("task_current": ${per_cpu_current_task(current_cpu())})
} with {
    file_pgc = SELECT file->pagecache FROM *
    file_pgs = SELECT page FROM REACHABLE(file_pgc)

    pipe_buf = SELECT pipe_inode_info->bufs FROM *
    pipe_pgs = SELECT page FROM REACHABLE(pipe_buf)
    UPDATE pipe_pgs \ file_pgs WITH trimmed: true
}
