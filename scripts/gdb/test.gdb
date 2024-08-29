shell echo "run gdbscript test.gdb..."

set confirm off
set breakpoint pending on

# # breakpoints: the first user process
# b start_kernel
# b run_init_process
# b *ret_from_fork+31
# b cpu_startup_entry

# # skip kernel initialization
# b run_init_process

# # breakpoints: system calls
# b *common_interrupt_return+96
# b __do_sys_write
# b ksys_write
# b mysys_hello

# # breakpoints: interrupt handler
# b asm_sysvec_apic_timer_interrupt
# b irqentry_exit_to_user_mode
# b exit_to_user_mode_prepare
# b exit_to_user_mode_loop

# b scheduler_tick

# b enter_from_user_mode

# # breakpoints: scheduler
# b schedule
# b __schedule
# b context_switch
# b __switch_to_asm

# below are forgotten breakpoints...

b mount_block_root

# b bprm_execve
# b do_open_execat
# b do_filp_open
# b path_openat
# b exec_binprm