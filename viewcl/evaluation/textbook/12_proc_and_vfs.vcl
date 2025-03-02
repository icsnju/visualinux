define Superblock as Box<super_block> [
    Text s_dev
    Text<string> s_type.name
    Text<string> s_id
]

define INode as Box<inode> [
    Text<u16:o> i_mode
    Link i_sb -> @superblock
] where {
    superblock = Superblock(@this.i_sb)
}

define DEntry as Box<dentry> [
    Link parent -> @parent
    Text<string> dirname: d_name.name
    Link inode -> @inode
    Text<string> d_iname
    // struct list_head d_child;	/* child of parent list */
    // struct list_head d_subdirs;	/* our children */
] where {
    parent = DEntry(@this.d_parent)
    inode = INode(@this.d_inode)
}

define File as Box<file> [
    Text<string> filename: f_path.dentry.d_name.name
    Link dentry -> @dentry
    // Link inode -> @inode
	Text f_count.counter
	Text<flag:fcntl> f_flags
	Text<flag:fmode> f_mode
    Text<u16:o> i_mode: @this.f_inode.i_mode
    Shape private_data: @priv_node
] where {
    dentry = DEntry(@this.f_path.dentry)
    inode = INode(@this.f_inode)
    // i_mode = @this.f_path.dentry.d_inode.i_mode
    i_mode = @this.f_inode.i_mode
    priv_data = @this.private_data
    priv_node = switch ${true} {
        case ${S_ISSOCK(@i_mode)}: [ Text<raw_ptr> priv_is_socket: @priv_data ]
        otherwise: [ Text<raw_ptr> priv_data: @priv_data ]
    }
}

define FDTable as Box<fdtable> [
    Link fds -> @fds
    Text max_fds
    Text<u64:b> open_fds: ${*@this.open_fds}
] where {
    fds = Array("fds": ${cast_to_parray(@this.fd, file, NR_OPEN_DEFAULT)}).forEach |item| {
        member = switch @item {
        case ${NULL}:
            NULL
        otherwise:
            [ Link "file #{@index}" -> @file ] where {
                file = File(@item)
            }
        }
        yield @member
    }
}

define FilesStruct as Box<files_struct> [
    Text count: count.counter
    Text next_fd
    Link fdt -> @fdt
    FDTable fdtab
    Shape fd_array: @fd_array
] where {
    fdt = FDTable(@this.fdt)
    fd_array = Array(@this.fd_array).forEach |item| {
        member = switch @item {
        case ${NULL}:
            NULL
        otherwise:
            [ Link "file #{@index}" -> @file ] where {
                file = File(@item)
            }
        }
        yield @member
    }
}

define TaskVFS as Box<task_struct> {
    :default [
        Text pid, comm
        Link files -> @files_struct
    ]
} where {
    files_struct = FilesStruct(@this.files)
}

tf_current_task = TaskVFS("task_current": ${per_cpu_current_task(current_cpu())})
diag textbook_12_proc_vfs {
    plot @tf_current_task
}
