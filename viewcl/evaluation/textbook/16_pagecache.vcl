import lib.concurrency

define AddressSpaceOps as Box<address_space_operations> [
    Text<fptr> writepage, writepages, readahead
    // Text<fptr> read_folio, dirty_folio
    Text<fptr> write_begin, write_end
    // Text<fptr> ...
]
define AddressSpace as Box<address_space> [
    Link i_pages -> @i_pages
    Text<flag:gfp> gfp_mask
    Text nrpages
    Link a_ops -> @a_ops
] where {
    i_pages = XArray(@this.i_pages).forEach |item| {
        yield [ Text<raw_ptr> page: @item ]
        // yield [ Link page -> @page ] where {
        //     page = Box(@item) [ Text<raw_ptr> entry: @this ]
        // }
    }
    a_ops = AddressSpaceOps(@this.a_ops)
}

define INodePGCC as Box<inode> [
    Text<u16:b> i_mode
    Link i_mapping -> @i_mapping
] where {
    i_mapping = AddressSpace(@this.i_mapping)
}

define FilePGCC as Box<file> [
    Text<string> filename: f_path.dentry.d_name.name
    Link inode -> @inode
] where {
    inode = INodePGCC(@this.f_inode)
}

define TaskPGCC as Box<task_struct> [
    Text pid, comm
    Link fds -> @fds
    Link fd_array -> @fd_array
] where {
    fds = Array(fds: ${cast_to_parray(@this.files.fdtab.fd, file, NR_OPEN_DEFAULT)}).forEach |item| {
        member = switch @item {
        case ${NULL}:
            NULL
        otherwise:
            [ Link "file #{@index}" -> @file ] where {
                file = FilePGCC(@item)
            }
        }
        yield @member
    }
    fd_array = Array(@this.files.fd_array).forEach |item| {
        member = switch @item {
        case ${NULL}:
            NULL
        otherwise:
            [ Link "file #{@index}" -> @file ] where {
                file = FilePGCC(@item)
            }
        }
        yield @member
    }
}

tcc_current_task = TaskPGCC("task_current": ${per_cpu_current_task(current_cpu())})
diag textbook_16_file_pagecache {
    plot @tcc_current_task
} with {
    i_pages = SELECT address_space->i_pages FROM *
    UPDATE i_pages WITH trimmed: true
}
