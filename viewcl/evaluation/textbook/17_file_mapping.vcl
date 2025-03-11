import lib.concurrency

define VMAreaFM as Box<vm_area_struct> [
    Text<u64:x> vm_start, vm_end
    Text<flag:vm> vm_flags
    Text<u64> start_pgoff: vm_pgoff
    Text<u64> last_pgoff: ${vma_last_pgoff(@this)}
    Text<u64:x> rb_subtree_last: shared.rb_subtree_last
]

define FileFM as Box<file> [
    Text<string> filename: f_path.dentry.d_name.name
    Link file_mapping -> @file_mapping
] where {
    file_mapping = RBTree(@this.f_mapping.i_mmap).forEach |node| {
        yield VMAreaFM<vm_area_struct.shared.rb>(@node)
    }
}

define TaskFM as Box<task_struct> [
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
                file = FileFM(@item)
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
                file = FileFM(@item)
            }
        }
        yield @member
    }
}

tfm_current_task = TaskFM("task_current": ${per_cpu_current_task(current_cpu())})
diag textbook_17_file_mapping {
    plot @tfm_current_task
} with {
    file_no_mapping = SELECT file
        FROM *
        WHERE file_mapping == "(empty)"
    UPDATE file_no_mapping WITH trimmed: true
}
