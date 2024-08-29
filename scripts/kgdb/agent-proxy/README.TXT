This is a simple, small proxy which was intended for use with kgdb, or
gdbserver type connections where you want to share a text console and
a debug session.

The idea is that you use the agent-proxy to connect to a serial port
directly or to a remote terminal server.

An example is to use kgdboc with the 2.6.26 or greater kernel
connected to a local serial port on your debug host (ttyS0 for example).

Start on your debug host:

## Start the agent-proxy in the background
./agent-proxy 5550^5551 0 /dev/ttyS0,115200 &

## Now connect to the console port
telnet localhost 5550

## Boot the remote system with the kernel arg:  kgdboc=ttyS0,115200

## Now you can connect gdb to the debug port
gdb ./vmlinux
tar rem localhost:5551

If you use a terminal server instead of a local serial port for your
connection use these instructions:

## Start the agent-proxy in the background
./agent-proxy 5550^5551 REMOTE_IPaddress_OR_NAME PORT_NUMBER &
######## Example: ./agent-proxy 5550^5551 10.0.55.4 2004 &

## Now connect to the console port
telnet localhost 5550

## Boot the remote system with the kernel arg:  kgdboc=ttyS0,115200

## Now you can connect gdb to the debug port
gdb ./vmlinux
tar rem localhost:5551


FAQ:
----------------------------------------------------------------
Q: Why do I see "junk" on my console when I am debugging?
A: The console port sees and repeats everything, so yes
   you will see the debug traffic as well as your normal console traffic.

Please send patches and questions to: kgdb-bugreport@lists.sourceforge.net