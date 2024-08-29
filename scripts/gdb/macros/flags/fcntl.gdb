shell echo "+ source macros/flags/fcntl.gdb"

macro define O_ACCMODE    00000003
macro define O_RDONLY     00000000
macro define O_WRONLY     00000001
macro define O_RDWR       00000002
macro define O_CREAT      00000100
macro define O_EXCL       00000200
macro define O_NOCTTY     00000400
macro define O_TRUNC      00001000
macro define O_APPEND     00002000
macro define O_NONBLOCK   00004000
macro define O_DSYNC      00010000
macro define FASYNC       00020000
macro define O_DIRECT     00040000
macro define O_LARGEFILE  00100000
macro define O_DIRECTORY  00200000
macro define O_NOFOLLOW   00400000
macro define O_NOATIME    01000000
macro define O_CLOEXEC    02000000

macro define __O_SYNC     04000000

macro define O_PATH      010000000

macro define __O_TMPFILE 020000000
