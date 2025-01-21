from visualinux import *

@dataclass
class ProgramPoint:
    is_valid: bool
    pc: int
    filename: str
    line: int
    def __str__(self):
         if self.is_valid:
             return f'{self.filename}:{self.line}[{self.pc:#x}]'
         return '[invalid PC]'

def get_current_pc() -> ProgramPoint:
    frame = gdb.newest_frame()
    if frame is None or not frame.is_valid():
        return ProgramPoint(is_valid=False, pc=0, filename='', line=0)
    sal = frame.find_sal()
    return ProgramPoint(is_valid=True, pc=frame.pc(), filename=sal.symtab.filename, line=sal.line)
