shell echo "+ source config.gdb"

### initconfig

set confirm off
set print pretty on
set breakpoint pending on
# set scheduler-locking on

### general

set $__inited = 0
define init
    if $__inited == 0
        source scripts/gdb/macros.gdb
        source visualinux-gdb.py
        # echo + Visualinux gdb extension loaded\n
        # echo ++++++ Visualinux Online Artifact Evaluation\n
        # echo ++++++ Please wait for the kernel boot, which will take a few seconds...\n
        # echo ++++++ Use vplot -f evaluation.vcl to reproduce textbook results\n
        # echo ++++++ You can freely use our gdb commands: vplot and vctrl\n
        # echo ++++++ However, vchat is not supported, since it requires LLM API key\n
        # b security_task_getsid
        # c
        # # vplot -f evaluation/textbook/01_process_parenthood.vcl
        # vplot -f evaluation/textbook/06_scheduling.vcl --debug
        set $__inited = 1
    end
end

define hook-stop
    init
end

init
