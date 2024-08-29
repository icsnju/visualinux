# Compiler
CC := gcc

# Normal compiler flags
CFLAGS := -Wall -Wunreachable-code

# Debugging
#CFLAGS += -ggdb

CFLAGS += -D_XOPEN_SOURCE

%.o: %.c
	$(CC) $(CFLAGS) -c -o $@ $<

kdmx: kdmx.o
	$(CC) -o $@ kdmx.o

distclean: clean

clean:
	rm -f *.o kdmx
