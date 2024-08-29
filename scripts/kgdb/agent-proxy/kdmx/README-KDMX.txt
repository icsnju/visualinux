kdmx is a program designed to split GDB packets and other trafic coming
from a target on a serial line into 2 separate pseudo-ttys.

The most common use of this is to run kgdb and console on a single serial
port, but should be usable for alternating gdbserver or console over a serial
line as well.

To exit from kdmx, kill the program or issue a control-c.

Full usage information can be obtained from:

   make
   ./kdmx -h
