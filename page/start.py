#!/usr/bin/env python3

# This is a simple script to quickly startup/terminate all components
# of the Visualinux framework in one place,
# as well as uniformly display them on a single front-end page.
#
# Note that this script is not required for the use of Visualinux;
# You can also run the components individually according to your need.
# For example, you can use gdb in a traditional CLI or VSCode extension
# and launch the visualizer separately on another web page.
# It is also possible to have Visualinux work with multiple gdb-stubs
# to compare the runtime state of multiple Linux kernel instances.
#

import sys
import pathlib
import subprocess
import time
import atexit
import signal

PAGE_DIR       = pathlib.Path(__file__).parent
PROJECT_DIR    = PAGE_DIR.parent
VISUALIZER_DIR = PROJECT_DIR / 'visualizer'

# Since ttyd will create child processes of proc #1, it is impossible to
# clean up properly by terminating all children of the startup script.
#
# Instead, we use a simple trick to ensure all cleanup works.
#

TTYD_MARK = f"echo #TTYD#"
CMD_CLEAN = f"ps -ef | grep '; {TTYD_MARK}' | grep -v 'tmux' | grep -v 'grep' | awk '{{print \\$2}}' | xargs -r kill -9"
CMD_TMUX  = f"tmux new-session -s ttyd 'make gdb-attach; {TTYD_MARK}' \\; split-window -h 'make gdb-start; {TTYD_MARK}' \\;"
CMD_TTYD  = f"ttyd -p 9801 bash -c \"{CMD_CLEAN}; {CMD_TMUX}\""

CMD_VISUALIZER = "npm run dev"

if __name__ == '__main__':

    cmd_page = "npm run dev"
    if len(sys.argv) > 1 and sys.argv[1] == '--public':
        print('[NOTICE] page will be publicly available')
        cmd_page = "npm run dev-public"

    proc_ttyd       = subprocess.Popen(CMD_TTYD,       shell=True, cwd=PROJECT_DIR)
    proc_visualizer = subprocess.Popen(CMD_VISUALIZER, shell=True, cwd=VISUALIZER_DIR)
    proc_page       = subprocess.Popen(cmd_page,       shell=True, cwd=PAGE_DIR)

    def exit_handler():
        proc_ttyd.terminate()
        proc_visualizer.terminate()
        proc_page.terminate()
        subprocess.run(f"bash -c \"{CMD_CLEAN}\"", shell=True)
    atexit.register(exit_handler)
    signal.signal(signal.SIGTERM, lambda signum, frame: sys.exit(0))
    signal.signal(signal.SIGINT,  lambda signum, frame: sys.exit(0))

    while True:
        time.sleep(5)
