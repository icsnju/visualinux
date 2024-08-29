shell echo "+ source macros/flags/socket.gdb"

# Historically, SOCKWQ_ASYNC_NOSPACE & SOCKWQ_ASYNC_WAITDATA were located
# in sock->flags, but moved into sk->sk_wq->flags to be RCU protected.
# Eventually all flags will be in sk->sk_wq->flags.

macro define SOCKWQ_ASYNC_NOSPACE  0
macro define SOCKWQ_ASYNC_WAITDATA 1
macro define SOCK_NOSPACE          2
macro define SOCK_PASSCRED         3
macro define SOCK_PASSSEC          4
macro define SOCK_SUPPORT_ZC       5
