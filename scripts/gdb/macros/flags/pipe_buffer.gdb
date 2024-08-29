shell echo "+ source macros/flags/pipe_buffer.gdb"

macro define PIPE_BUF_FLAG_LRU       0x01
macro define PIPE_BUF_FLAG_ATOMIC    0x02
macro define PIPE_BUF_FLAG_GIFT      0x04
macro define PIPE_BUF_FLAG_PACKET    0x08
macro define PIPE_BUF_FLAG_CAN_MERGE 0x10
macro define PIPE_BUF_FLAG_WHOLE     0x20
macro define PIPE_BUF_FLAG_LOSS      0x40
