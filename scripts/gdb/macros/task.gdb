shell echo "+ source macros/task.gdb"

### pidhash

macro define task_active_pid_ns(tsk) ns_of_pid((tsk)->thread_pid)
macro define ns_of_pid(pid) ((pid) ? (pid)->numbers[(pid)->level].ns : NULL)

### thread

define xpid
    xtask($lx_task_by_pid($arg0))
end

define xcurrent
    xtask(current)
end

macro define current $lx_current()
