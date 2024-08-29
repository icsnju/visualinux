from visualinux import *
from visualinux.runtime.kvalue import *
from visualinux.runtime.linux.common import *

S_IFMT  = 0o0170000
S_IFSOCK = 0o140000
S_IFLNK	 = 0o120000
S_IFREG  = 0o100000
S_IFBLK  = 0o060000
S_IFDIR  = 0o040000
S_IFCHR  = 0o020000
S_IFIFO  = 0o010000
S_ISUID  = 0o004000
S_ISGID  = 0o002000
S_ISVTX  = 0o001000

def S_ISLNK(m: KValue) -> KValue:
    '''(((m) & S_IFMT) == S_IFLNK)
    '''
    value = ((m.dereference().value & S_IFMT) == S_IFLNK)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def S_ISREG(m: KValue) -> KValue:
    '''(((m) & S_IFMT) == S_IFREG)
    '''
    value = ((m.dereference().value & S_IFMT) == S_IFREG)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def S_ISDIR(m: KValue) -> KValue:
    '''(((m) & S_IFMT) == S_IFDIR)
    '''
    value = ((m.dereference().value & S_IFMT) == S_IFDIR)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def S_ISCHR(m: KValue) -> KValue:
    '''(((m) & S_IFMT) == S_IFCHR)
    '''
    value = ((m.dereference().value & S_IFMT) == S_IFCHR)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def S_ISBLK(m: KValue) -> KValue:
    '''(((m) & S_IFMT) == S_IFBLK)
    '''
    value = ((m.dereference().value & S_IFMT) == S_IFBLK)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def S_ISFIFO(m: KValue) -> KValue:
    '''(((m) & S_IFMT) == S_IFIFO)
    '''
    value = ((m.dereference().value & S_IFMT) == S_IFIFO)
    return KValue.FinalInt(GDBType.basic('bool'), value)

def S_ISSOCK(m: KValue) -> KValue:
    '''(((m) & S_IFMT) == S_IFSOCK)
    '''
    value = ((m.dereference().value & S_IFMT) == S_IFSOCK)
    return KValue.FinalInt(GDBType.basic('bool'), value)

S_IRWXU = 0o0700
S_IRUSR = 0o0400
S_IWUSR = 0o0200
S_IXUSR = 0o0100

S_IRWXG = 0o0070
S_IRGRP = 0o0040
S_IWGRP = 0o0020
S_IXGRP = 0o0010

S_IRWXO = 0o0007
S_IROTH = 0o0004
S_IWOTH = 0o0002
S_IXOTH = 0o0001
