import lib.utils
import lib.concurrency
import evaluation.textbook.20_sysv

define IDR_IPCS as Box<idr> {
    :default [
        Link idr_rt -> @idr_rt
        Text idr_base
        Text idr_next
    ]
} where {
    idr_rt = XArray(@this.idr_rt).forEach |item| {
        yield [ Link perm -> @perm ] where {
            perm = IPCPerm(@item)
        }
    }
}
define IPCIDs as Box<ipc_ids> [
    Text<bool> in_use
    Text seq
    IDR_IPCS ipcs_idr
]

define IPCNamespace as Box<ipc_namespace> [
    // Shape ids: @ids
    Link idrs_sem -> @idrs_sem
    Link idrs_msg -> @idrs_msg
    Link idrs_shm -> @idrs_shm
    TextArray sem_ctls
    Text used_sems
] where {
    // ids = Array(@this.ids).forEach |item| {
    //     yield IPCIDs(@item)
    // }
    idrs_sem = XArray(@this.ids[0].ipcs_idr.idr_rt).forEach |item| {
        yield [ Link perm -> @perm ] where {
            perm = SemArray(@item)
        }
    }
    idrs_msg = XArray(@this.ids[1].ipcs_idr.idr_rt).forEach |item| {
        yield [ Link perm -> @perm ] where {
            perm = MsgQueue(@item)
        }
    }
    idrs_shm = XArray(@this.ids[2].ipcs_idr.idr_rt).forEach |item| {
        yield [ Link perm -> @perm ] where {
            perm = Shmid(@item)
        }
    }
}

ipc_ids = IPCNamespace(${&init_ipc_ns})
diag textbook_20_ipc_ids {
    plot @ipc_ids
}
