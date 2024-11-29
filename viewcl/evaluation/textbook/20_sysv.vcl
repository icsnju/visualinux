import lib.concurrency
import evaluation.textbook.12_proc_and_vfs

define IPCPerm as Box<kern_ipc_perm> [
    Text<bool> deleted
    Text id
    Text key
    Text uid
    Text refcount: refcount.refs.counter
]

define SemUndo as Box<sem_undo> [
    Text semid
    Text semadj
    // Link list_proc -> @list_proc
]

define SemArray as Box<sem_array> [
    IPCPerm sem_perm
    Link list_id -> @list_id
] where {
    list_id = List<sem_array.list_id>(@this.list_id).forEach |item| {
        yield SemUndo<sem_undo.list_id>(@item)
    }
}

define MsgMsgSeg as Box<msg_msgseg> [
    Link next -> @next
] where {
    next = MsgMsgSeg(@this.next)
}
define MsgMsg as Box<msg_msg> [
    Text m_type
    Text textsize: m_ts
    Link next -> @next
    Text<string> message: ${sysv_msg_get_text(@this)}
] where {
    next = MsgMsgSeg(@this.next)
}

define MsgReceiver as Box<msg_receiver> [
    Text r_tsk: r_tsk.pid
    Text r_mode
    Text r_msgtype
    Link r_msg -> @r_msg
] where {
    r_msg = MsgMsg(@this.r_msg)
}

define MsgSender as Box<msg_sender> [
    Text tsk: tsk.pid
    Text msgsz
]

define MsgQueue as Box<msg_queue> [
    IPCPerm q_perm
	Link q_messages  -> @q_messages
	Link q_receivers -> @q_receivers
	Link q_senders   -> @q_senders
    Text q_qnum
    Text lspid: q_lspid.numbers[0].nr
    Text lrpid: q_lrpid.numbers[0].nr
] where {
    q_messages = List<msg_queue.q_messages>(@this.q_messages).forEach |item| {
        yield MsgMsg<msg_msg.m_list>(@item)
    }
    q_receivers = List<msg_queue.q_receivers>(@this.q_receivers).forEach |item| {
        yield MsgReceiver<msg_receiver.r_list>(@item)
    }
    q_senders = List<msg_queue.q_senders>(@this.q_senders).forEach |item| {
        yield MsgSender<msg_sender.list>(@item)
    }
}

define Shmid as Box<shmid_kernel> [
    IPCPerm shm_perm
    Link shm_file -> @shm_file
    Text tsk_creator: shm_creator.pid
    // list_head shm_clist
] where {
    shm_file = File(@this.shm_file)
}
// task->sysvshm.shm_clist
