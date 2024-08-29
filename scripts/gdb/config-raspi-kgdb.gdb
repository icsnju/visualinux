shell echo "+ source config-raspi-kgdb.gdb"

set architecture aarch64
set substitute-path /build/linux-raspi-9otUFW .

source scripts/gdb/config.gdb

b security_task_getsid
