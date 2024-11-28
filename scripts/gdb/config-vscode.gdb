shell echo "+ source config-vscode.gdb"

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
        set $__inited = 1
    end
end

define hook-stop
    init
end
