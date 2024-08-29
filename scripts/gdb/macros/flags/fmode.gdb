shell echo "+ source macros/flags/fmode.gdb"

# file is open for reading
macro define FMODE_READ     0x1
# file is open for writing
macro define FMODE_WRITE    0x2
# file is seekable
macro define FMODE_LSEEK    0x4
# file can be accessed using pread
macro define FMODE_PREAD    0x8
# file can be accessed using pwrite
macro define FMODE_PWRITE  0x10
# File is opened for execution with sys_execve / sys_uselib
macro define FMODE_EXEC    0x20
# File is opened with O_NDELAY (only set for block devices)
macro define FMODE_NDELAY  0x40
# File is opened with O_EXCL (only set for block devices)
macro define FMODE_EXCL    0x80
# File is opened using open(.., 3, ..) and is writeable only for ioctls (specialy hack for floppy.c)
macro define FMODE_WRITE_IOCTL       0x100
# 32bit hashes as llseek() offset (for directories)
macro define FMODE_32BITHASH         0x200
# 64bit hashes as llseek() offset (for directories)
macro define FMODE_64BITHASH         0x400

# Don't update ctime and mtime.
# Currently a special hack for the XFS open_by_handle ioctl, but we'll
# hopefully graduate it to a proper O_CMTIME flag supported by open(2) soon.
macro define FMODE_NOCMTIME          0x800

# Expect random access pattern
macro define FMODE_RANDOM           0x1000

# File is huge (eg. /dev/mem): treat loff_t as unsigned
macro define FMODE_UNSIGNED_OFFSET  0x2000

# File is opened with O_PATH; almost nothing can be done with it
macro define FMODE_PATH             0x4000

# File needs atomic accesses to f_pos
macro define FMODE_ATOMIC_POS       0x8000
# Write access to underlying fs
macro define FMODE_WRITER          0x10000
# Has read method(s)
macro define FMODE_CAN_READ        0x20000
# Has write method(s)
macro define FMODE_CAN_WRITE       0x40000

macro define FMODE_OPENED          0x80000
macro define FMODE_CREATED        0x100000

# File is stream-like
macro define FMODE_STREAM         0x200000

# File supports DIRECT IO
macro define FMODE_CAN_ODIRECT    0x400000

# File was opened by fanotify and shouldn't generate fanotify events
macro define FMODE_NONOTIFY      0x4000000

# File is capable of returning -EAGAIN if I/O will block
macro define FMODE_NOWAIT        0x8000000

# File represents mount that needs unmounting
macro define FMODE_NEED_UNMOUNT 0x10000000

# File does not contribute to nr_files count
macro define FMODE_NOACCOUNT    0x20000000

# File supports async buffered reads
macro define FMODE_BUF_RASYNC   0x40000000

# File supports async nowait buffered writes
macro define FMODE_BUF_WASYNC   0x80000000
