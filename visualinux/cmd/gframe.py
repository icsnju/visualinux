from visualinux import *
import gdb
import subprocess

class GetCurrentFrameFilename(gdb.Command):
    def __init__(self):
        super(GetCurrentFrameFilename, self).__init__("fuckfuck", gdb.COMMAND_USER)

    def invoke(self, arg, from_tty):
        # Get the newest frame
        frame = gdb.newest_frame()
        while frame:
            sal = frame.find_sal()
            if not (sal and sal.symtab):
                print("Could not determine the function details for the current frame.")
                frame = frame.older()
                continue

            funcname: str = str(frame.function()) # frame.name()
            filename: str = sal.symtab.fullname()
            command = f'ctags -x --c-kinds=f {filename} | grep "{funcname}"'
            res = subprocess.run(command, shell=True, capture_output=True, text=True, stderr=subprocess.STDOUT).stdout
            # res: str = gdb.execute(command, to_string=True)
            print(f'{frame.level() = !s}')
            print(f'{funcname = }, {filename = }')
            print(f'{res = }')

            frame = frame.older()
            break

GetCurrentFrameFilename()
