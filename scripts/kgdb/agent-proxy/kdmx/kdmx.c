/*
 * kdmx.c
 *
 * The guts of a gdb/console demuxer.  We take from one input both
 * GDB packets (typically from KGDB, but could be gdbserver) and regular
 * console I/O and split them into two pseudo-ttys.
 *
 * Author: Tom Rini <trini@mvista.com>
 * Rename and significant update by: Frank Rowand <frank.rowand@sonymobile.com>
 *
 * 2004 (c) MontaVista Software, Inc.
 * Copyright (c) 2014 Sony Mobile Communications Inc.
 *
 * This file is licensed under the terms of the GNU General Public License
 * version 2. This program is licensed "as is" without any warranty of any
 * kind, whether express or implied.  See the file COPYING for more details.
 */

/*
 * expose:
 *  ftruncate(2)
 *  ptsname_r(3)
 */
#define _GNU_SOURCE

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <errno.h>
#include <termios.h>
#include <unistd.h>

#include <sys/ioctl.h>
#include <sys/select.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <sys/param.h>

/*
 * "Version Update Fix"
 * Format: YYMMDDX
 *   YY is year
 *   MM is month
 *   DD is day
 *   X  is an incrementing value a..z, restarting at 'a' for each new YYMMDD
 */
#define VUFX "141210a"

#define pr_debug(fmt, ...) \
({ \
	if (debug) \
		fprintf(stderr, fmt, ##__VA_ARGS__); \
})

#define pr_err(fmt, ...) \
	fprintf(stderr, fmt, ##__VA_ARGS__)

#define pr_info(fmt, ...) \
	printf(fmt, ##__VA_ARGS__)

#define pr_stat_gdb(fmt, ...)                                         \
	do {                                                          \
		if (status_gdb_fd != -1) {                            \
			rewind(status_gdb_file);                      \
			ftruncate(status_gdb_fd, 0);                  \
			fprintf(status_gdb_file, fmt, ##__VA_ARGS__); \
			fflush(status_gdb_file);                      \
		} ;                                                   \
	} while (0)

#define pr_stat_trm(fmt, ...)                                 \
	do {                                                          \
		if (status_trm_fd != -1) {                            \
			rewind(status_trm_file);                      \
			ftruncate(status_trm_fd, 0);                  \
			fprintf(status_trm_file, fmt, ##__VA_ARGS__); \
			fflush(status_trm_file);                      \
		} ;                                                   \
	} while (0)

int status_gdb_fd = -1;
int status_trm_fd = -1;
FILE *status_gdb_file;
FILE *status_trm_file;

int print_g;
int print_s;
int print_t;
int print_G;
int print_S;
int print_T;
int print_label;

int prev_fd = -1;

#define DW_FLAG_BREAK 0x00000001

enum {
	PREV_IO_NONE,
	PREV_IO_READ,
	PREV_IO_WRITE
} prev_io = PREV_IO_NONE;

#define DEFAULT_SERIAL "/dev/ttyS0"
#define BUFMAX	2048

int debug;
int passthru_null_from_term;

speed_t new_baudrate = B9600;	/* see /usr/include/bits/termios.h */

int serial_fd;
int term_fd;		/* terminal emulator pty master */
int gdb_fd;		/* gdb pty master */

int die(const char *msg)
{
	perror(msg);
	exit(EXIT_FAILURE);
}

/*
 * Open /dev/ptmx and get us a master/slave combo.  This assumes a
 * Unix98 style environment.
 */
void get_pty(int *master)
{
	/* Get the master */
	(*master) = open("/dev/ptmx", O_RDWR);
	if (grantpt((*master)))
		die("grantpt");

	if (unlockpt((*master)))
		die("unlockpt");
}

/*
 * Read one char at a time, and return it.  Optionally print out
 * what / where it happened.
 */
char do_read(int fd, int *ret_errno)
{
	unsigned char buf;
	int ret;

	*ret_errno = 0;

	/* Perform the read */
	ret = read(fd, &buf, sizeof(buf));
	if (ret == -1) {
		*ret_errno = errno;
		return -1;
	}

	/*
	 * select() reports read fd is readable on end-of-file.
	 * Do not get into an infinite loop in that case.
	 */
	if (ret == 0) {
		pr_err("End of file on ");
		if (fd == gdb_fd)
			pr_err("gdb pty\n");
		if (fd == serial_fd)
			pr_err("serial port\n");
		if (fd == term_fd)
			pr_err("terminal pty\n");
		exit(EXIT_FAILURE);
	}

	if (print_label) {
		if ((prev_io != PREV_IO_READ) || (prev_fd != fd)) {
			if (print_g && (fd == gdb_fd)) {
				pr_debug("\ng> ");
				prev_fd = fd;
				prev_io = PREV_IO_READ;
			} else if (print_S && (fd == serial_fd)) {
				pr_debug("\ns< ");
				prev_fd = fd;
				prev_io = PREV_IO_READ;
			} else  if (print_t && (fd == term_fd)) {
				pr_debug("\nt> ");
				prev_fd = fd;
				prev_io = PREV_IO_READ;
			}
		}
	}

	if ((print_g && (fd == gdb_fd))    ||
	    (print_S && (fd == serial_fd)) ||
	    (print_t && (fd == term_fd))
	   ) {

		if ((buf > 0x1f) && (buf < 0x7f))
			pr_debug("%c", buf);
		else
			pr_debug(" 0x%02x ", buf);

		if (((fd != serial_fd) && (buf == '\r')) ||
		    ((fd == serial_fd) && (buf == '\n'))
		   ) {
			pr_debug("\n");
		}
	}

	return buf;
}

/* Write a buffer, and optionally print out what / where it happened */
void do_write(int fd, char *buf, size_t len, int dw_flag)
{
	char *_buf;
	int _len;
	int k;
	int retry_count = 0;
	int sel_ret;	/* select() */
	ssize_t ret;	/* write()  */
	fd_set writefds;

	if ((print_label && len) || (dw_flag & DW_FLAG_BREAK)) {
		if ((prev_io != PREV_IO_WRITE) || (prev_fd != fd)) {
			if (print_G && (fd == gdb_fd)) {
				pr_debug("\ng< ");
				prev_fd = fd;
				prev_io = PREV_IO_WRITE;
			} else if (print_s && (fd == serial_fd)) {
				pr_debug("\ns> ");
				prev_fd = fd;
				prev_io = PREV_IO_WRITE;
			} else if (print_T && (fd == term_fd)) {
				pr_debug("\nt< ");
				prev_fd = fd;
				prev_io = PREV_IO_WRITE;
			}
		}
	}



	if ((dw_flag & DW_FLAG_BREAK) && (fd == serial_fd)) {
		int ret;
		ret = ioctl(fd, TCSBRK, 0);
		if (ret)
			perror("serial port BREAK ioctl()");
		else if (print_s)
			/* zzz not a unique string.... */
			pr_debug("__BREAK__");
	}



	/* Perform the write */
	while (len > 0) {

		if (retry_count++) {
			FD_ZERO(&writefds);
			FD_SET(fd, &writefds);
			sel_ret = select(fd + 1, NULL, &writefds, NULL, NULL);
			if (sel_ret == -1)
				die("select");
		}

		_buf = buf;
		ret = write(fd, buf, len);
		_len = ret;

		if (ret == -1) {
			if (errno != EAGAIN) {
				if (fd == gdb_fd)
					perror("gdb pty write()");
				else if (fd == serial_fd)
					perror("serial port write()");
				else if (fd == term_fd)
					perror("terminal emulator pty write()");
				else
					perror("unknown write()");
				exit(EXIT_FAILURE);
			}
		} else if (ret != len) {
			buf += ret;
			len -= ret;
			pr_debug("do_write() failed to write full buffer, len = %ld, ret = %ld\n",
				 len, ret);
		} else {
			len = 0;
		}

		if ((print_G && (fd == gdb_fd))    ||
		    (print_s && (fd == serial_fd)) ||
		    (print_T && (fd == term_fd))
		   ) {

			for (k = 0; k < _len; k++, _buf++) {

				if ((*_buf > 0x1f) && (*_buf < 0x7f))
					pr_debug("%c", *_buf);
				else
					pr_debug(" 0x%02x ", *_buf);

				if (((fd == serial_fd) && (*_buf == '\r')) ||
				    ((fd != serial_fd) && (*_buf == '\n'))
				   ) {
					pr_debug("\n");
				}
			}
		}
	}
}


/* Convert a single hex char to its int value */
int hex(unsigned char ch)
{
	if (ch >= 'a' && ch <= 'f')
		return ch - 'a' + 10;
	if (ch >= '0' && ch <= '9')
		return ch - '0';
	if (ch >= 'A' && ch <= 'F')
		return ch - 'A' + 10;
	return 0;	/* No value */
}

void parse_debug(char *options)
{
	for (; *options; options++) {
		switch (*options) {
		case 'g':
			print_g = 1;
			break;
		case 's':
			print_s = 1;
			break;
		case 't':
			print_t = 1;
			break;
		case 'G':
			print_G = 1;
			break;
		case 'S':
			print_S = 1;
			break;
		case 'T':
			print_T = 1;
			break;
		default:
			pr_err("Invalid 'D' sub-option\n");
			exit(EXIT_FAILURE);
		}
	}
}

/*
 * String input of a baud rate.  Convert to an int, make sure it is valid.
 */
void parse_baud(char *rate)
{
	int baudrate;

	baudrate = strtol(rate, NULL, 10);

	/*
	 * 9600 or better (an artificial limit)
	 *
	 * When modifying list of cases, update usage() to match.
	 */
	switch (baudrate) {
	case 9600:
		new_baudrate = B9600;
		break;
	case 19200:
		new_baudrate = B19200;
		break;
	case 38400:
		new_baudrate = B38400;
		break;
	case 57600:
		new_baudrate = B57600;
		break;
	case 115200:
		new_baudrate = B115200;
		break;
	case 230400:
		new_baudrate = B230400;
		break;
	default:
		pr_err("Invalid baud rate given\n");
		exit(EXIT_FAILURE);
	}
}

void
usage(void)
{
	/*
	 * Output should fit in 79 columns:
	 *
	 *              1         2         3         4         5         6         7         \n");
	 *     12345678901234567890123456789012345678901234567890123456789012345678901234567890
	 */

	pr_err("\n");
	pr_err("Usage: kdmx [options]\n");
	pr_err("\n");
	pr_err("    -?       Print this message\n");
	pr_err("    -b rate  Set serial port baud rate. default: 9600\n");
	pr_err("               9600, 19200, 38400, 57600, 115200, 230400\n");
	pr_err("    -d       Enable debug messages to stderr\n");
	pr_err("    -Dx      Enable debug print of data stream(s) to stderr\n");
	pr_err("               Any number of values for 'x' allowed\n");
	pr_err("               x == lower case is from host   to target\n");
	pr_err("               x == upper case is from target to host\n");
	pr_err("                 g  from gdb\n");
	pr_err("                 s  to serial port\n");
	pr_err("                 t  from terminal emulator (eg minicom)\n");
	pr_err("                 G  to gdb\n");
	pr_err("                 S  from serial port\n");
	pr_err("                 T  to terminal emulator (eg minicom)\n");
	pr_err("    -h       Print this message\n");
	pr_err("    -n       Allow terminal emulator to send null (\\0) characters\n");
	pr_err("    -p port  Serial port path. default: %s\n", DEFAULT_SERIAL);
	pr_err("    -s spath write pty path to status file:\n");
	pr_err("               ${spath}_gdb: gdb pty path\n");
	pr_err("               ${spath}_trm: terminal emulator pty path\n");
	pr_err("    -v       Print version\n");
	pr_err("\n");
	pr_err("  Console multiplexor for kgdb Linux kernel debugger.\n");
	pr_err("  Splits the console traffic to/from a serial port between two\n");
	pr_err("  pseudo-terminals.  One pty connects to a terminal emulator, such as\n");
	pr_err("  minicom.  The second pty connects to gdb. The names of the ptys are\n");
	pr_err("  reported when this program is executed.\n");
	pr_err("\n");
	pr_err("  To exit from kdmx, kill the program or issue a control-c.\n");
	pr_err("\n");
	pr_err("\n");
	pr_err("  KNOWN ISSUES:\n");
	pr_err("\n");
	pr_err("  The intended user of this program is an advanced kernel debugger, who is\n");
	pr_err("  a 'wizard'.  With this intended user, there are some 'sharp edges' that\n");
	pr_err("  have not been removed from kdmx -- use this program with caution.\n");
	pr_err("\n");
	pr_err("  kdmx:\n");
	pr_err("\n");
	pr_err("    - The BREAK signal can not be sent from the terminal emulator to kdmx.\n");
	pr_err("      Workaround: Enter '~B' in the terminal emulator, immediately following\n");
	pr_err("      a carriage return.  kdmx will strip the '~B' from the input stream and\n");
	pr_err("      replace it with a BREAK signal on the serial port.\n");
	pr_err("\n");
	pr_err("  target system:\n");
	pr_err("\n");
	pr_err("    - Usage:\n");
	pr_err("        Trigger the connect sequence on the target before trying to connect\n");
	pr_err("        from gdb.  Methods to trigger include:\n");
	pr_err("          1) send a magic sysrq command via the proc file system:\n");
	pr_err("             echo g > /proc/sysrq-trigger\n");
	pr_err("          2) send a magic sysrq command via a BREAK sequence:\n");
	pr_err("             '~Bg'\n");
	pr_err("          3) via the boot command line.  Add 'kgdbwait' to the command line.\n");
	pr_err("\n");
	pr_err("  gdb:\n");
	pr_err("\n");
	pr_err("    - Usage:\n");
	pr_err("        After triggering the connect sequence on the target, connect from\n");
	pr_err("        gdb.  For example:\n");
	pr_err("        (gdb) target remote /dev/pts/30\n");
	pr_err("\n");
	pr_err("  Minicom:\n");
	pr_err("\n");
	pr_err("    - If minicom is connected to kdmx when kdmx is killed, then minicom will\n");
	pr_err("      repeatedly attempt to reopen the slave pty that it was connected to.\n");
	pr_err("      If a new terminal emulator (such as gnome-terminal, xfce Terminal, or\n");
	pr_err("      Konsole) is executed during this time, it is likely to create a new\n");
	pr_err("      slave pty with the same name as the slave pty that minicom is attempting\n");
	pr_err("      to reopen.  Both the terminal emulator and minicom will open the same\n");
	pr_err("      slave tty, with the result that some output will go to minicom and some\n");
	pr_err("      will go to the terminal emulator.  The terminal emulator will appear\n");
	pr_err("      to randomly lose characters.\n");
	pr_err("      Workaround:  terminate minicom before killing kdmx.\n");
	pr_err("      [minicom version 2.5]\n");
	pr_err("\n");
	pr_err("    - If minicom is connected to kdmx when kdmx is killed, then minicom will\n");
	pr_err("      not respond to 'CTRL-A Z', which is a normal way to quit minicom.\n");
	pr_err("      Workaround: terminate minicom before killing kdmx.\n");
	pr_err("      [minicom version 2.5]\n");
	pr_err("\n");
	pr_err("  Debugging the serial connection:\n");
	pr_err("\n");
	pr_err("    - It may to useful to view the traffic between kdmx and the serial port.\n");
	pr_err("      An example kdmx invocation to enable this is:\n");
	pr_err("        kdmx -DsS -d -p/dev/ttyUSB0 -b115200  2>kdmx_debug\n");
	pr_err("      Then in another terminal window:\n");
	pr_err("        tail -f kdmx_debug\n");
	pr_err("      '-DsS' enables debug print of the data to and from the serial port\n");
	pr_err("      '2>FILE' redirects the debug data to the FILE.\n");
	pr_err("\n");
}


int debug_opened = 0;		/* Has GDB opened up yet? */
int response_pending = 0;	/* waiting for an ACK / NAK ? */

void
handle_gdb(void)
{
	char rcv;
	int ret_errno;
	int old_gdb_fd;
	int ret;
	char name[MAXPATHLEN];
	char old_name[MAXPATHLEN];

	debug_opened = 1;
	response_pending = 1;

	rcv = do_read(gdb_fd, &ret_errno);
	if (ret_errno) {

		/*
		 * <ctrl>C in gdb or the gdb kill command will result in
		 * reads of the gdb pty returning errno == EIO.
		 *
		 * The gdb session for the two cases look like:
		 *
		 *    ^C
		 *    ^CInterrupted while waiting for the program.
		 *    Give up (and stop debugging it)? (y or n) y
		 *    (gdb)
		 *
		 *    (gdb) k
		 *    Kill the program being debugged? (y or n) y
		 *    (gdb)
		 *
		 */

		if (ret_errno != EIO) {
			pr_err("gdb pty read() unexpected errno %d\n",
			       ret_errno);
			exit(EXIT_FAILURE);
		}

		pr_err("gdb pty read(): Input/output error, re-opening pty\n");
		pr_err("  Not an error if gdb closed the connection\n");

		/*
		 * The gdb / kgdb (gdb_server) conversation is done.  Do not
		 * divert '-' and '+' from the serial port to gdb.
		 */
		response_pending = 0;

		old_gdb_fd = gdb_fd;

		ret = ptsname_r(gdb_fd, old_name, sizeof(old_name));
		if (ret) {
			perror("gdb pty ptsname_r() [1]");
			old_name[0] = '\0';
		}

		ret = close(gdb_fd);
		if (ret)
			perror("gdb pty close()");

		get_pty(&gdb_fd);
		if (gdb_fd != old_gdb_fd) {
			pr_err("new gdb pty fd is different than old gdb pty fd, giving up\n");
			exit(EXIT_FAILURE);
		}

		ret = ptsname_r(gdb_fd, name, sizeof(name));
		if (ret) {
			name[0] = '\0';
			perror("gdb pty ptsname_r() [2]");
		}

		pr_stat_gdb("%s\n", name);
		pr_info("%s is slave pty for gdb\n", name);

		if (strcmp(name, old_name))
			pr_err("WARNING: gdb slave pty path has changed\n");
		else
			pr_err("gdb slave pty path is unchanged\n");
		pr_err("\n");

	} else {
		do_write(serial_fd, &rcv, sizeof(rcv), 0);
	}
}

void
reset_term(int ret_errno)
{
	int old_term_fd;
	int ret;
	char name[MAXPATHLEN];
	char old_name[MAXPATHLEN];

	/*
	 * Terminating minicom will result in reads of
	 * the terminal emulator pty returning errno == EIO.
	 */

	if (ret_errno != EIO) {
		pr_err("terminal emulator pty read(), unexpected errno %d\n",
		       ret_errno);
		exit(EXIT_FAILURE);
	}

	pr_err("terminal emulator pty read(): Input/output error, re-opening pty\n");
	pr_err("  Not an error if terminal emulator exited\n");

	old_term_fd = term_fd;

	ret = ptsname_r(term_fd, old_name, sizeof(old_name));
	if (ret) {
		old_name[0] = '\0';
		perror("terminal emulator pty ptsname_r() [1]");
	}

	ret = close(term_fd);
	if (ret)
		perror("terminal emulator pty close()");

	get_pty(&term_fd);
	if (term_fd != old_term_fd) {
		pr_err("new terminal emulator pty fd is different than old terminal emulator pty fd, giving up\n");
		exit(EXIT_FAILURE);
	}

	ret = ptsname_r(term_fd, name, sizeof(name));
	if (ret) {
		name[0] = '\0';
		perror("terminal emulator pty ptsname_r() [2]");
	}

	pr_stat_trm("%s\n", name);
	pr_info("%s is slave pty for terminal emulator\n", name);

	if (strcmp(name, old_name))
		pr_err("WARNING: terminal emulator slave pty path has changed\n");
	else
		pr_err("terminal emulator slave pty path is unchanged\n");
	pr_err("\n");
}

void
handle_serial(void)
{
	int buf_pos;
	int sel_ret;
	int ret_errno;
	int seen_hash;
	fd_set readfds;
	char buf[BUFMAX + 1];
	unsigned char run_csum;
	unsigned char rcv_csum;
	char rcv;

	memset(buf, 0, sizeof(buf));

	rcv = do_read(serial_fd, &ret_errno);
	if (ret_errno) {
		pr_err("serial port read() [1] unexpected errno %d\n",
		       ret_errno);
		exit(EXIT_FAILURE);
	}

	/* response to a GDB packet? */
	if (response_pending && (rcv == '+' || rcv == '-')) {
		response_pending = 0;
		/* Write it out */
		do_write(gdb_fd, &rcv, sizeof(rcv), 0);

	} else if (rcv == '$') {

		/*
		 * Both console and KGDB traffic are on the same serial
		 * port. If get a '$' from the the serial port, it may be
		 * the start of a packet to gdb, stop checking whether the
		 * console pty is readable until finished processing the
		 * GDB packet.
		 *
		 * If the buffer gets to BUFMAX, assume that it is not a
		 * GDB packet.
		 */
		buf[0] = '$';	/* already received */
		buf_pos = 1;

		run_csum = 0;
		seen_hash = 0;
		while (1) {
			struct timeval tv;
			/*
			 * If don't get anything for 0.07 seconds, assume
			 * it's not a gdb packet.
			 */
			tv.tv_sec = 0;
			tv.tv_usec = 70000;

			FD_ZERO(&readfds);
			FD_SET(serial_fd, &readfds);

			sel_ret = select(serial_fd + 1, &readfds, NULL, NULL, &tv);
			if (sel_ret == 0) {
				/* Timeout, write buffer to terminal emulator */
				do_write(term_fd, buf, buf_pos, 0);
				break;
			} else if (sel_ret == -1) {
				die("select");
			}

			/*
			 * If have already read BUFMAX characters,
			 * assume it's not a gdb packet.
			 */
			if (buf_pos == BUFMAX) {
				do_write(term_fd, buf, buf_pos, 0);
				break;
			}

			/* read one char */
			rcv = do_read(serial_fd, &ret_errno);
			if (ret_errno) {
				pr_err("serial port read() [2] unexpected errno %d\n",
				       ret_errno);
				exit(EXIT_FAILURE);
			}
			buf[buf_pos++] = rcv;
			if (rcv == '#') {
				seen_hash = 1;
			} else if (!seen_hash) {
				run_csum += rcv;
			} else if (seen_hash == 1) {
				rcv_csum = hex(rcv) << 4;
				seen_hash = 2;
			} else if (seen_hash == 2) {
				rcv_csum |= hex(rcv);
				seen_hash = 3;
			}

			if (seen_hash == 3) {
				/* packet completed */
				run_csum %= 256;
				if (rcv_csum == run_csum) {
					if (debug_opened)
						do_write(gdb_fd, buf, buf_pos, 0);
				} else {
					/* write corrupt packet to terminal */
					do_write(term_fd, buf, buf_pos, 0);
				}
				seen_hash = 0;
				break;
			}
		}

	} else
		/* Just pass this along to the console */
		do_write(term_fd, &rcv, sizeof(rcv), 0);
}

void
handle_term(void)
{
	static int in_escape;
	static char last_cons_rcv;

	int ret_errno;
	int drop_char = 0;
	char escape_char = '~';		/* using same value as ssh */
	char rcv;

	rcv = do_read(term_fd, &ret_errno);
	if (ret_errno) {
		reset_term(ret_errno);
		return;
	}

	if (in_escape) {
		in_escape = 0;
		drop_char = 1;

		if (rcv == 'B') {
			do_write(serial_fd, NULL, 0, DW_FLAG_BREAK);
		} else {
			pr_err("invalid escape character: 0x%2x '%c'\n", rcv,
			       (rcv >= 0x20) && (rcv <=  0x7e) ? rcv : '.');
		}
	}

	if ((last_cons_rcv == '\r') && (rcv == escape_char)) {
		in_escape = 1;
		drop_char = 1;
	}

	last_cons_rcv = rcv;

	if (drop_char)
		return;

	if ((rcv != 0) || passthru_null_from_term)
		do_write(serial_fd, &rcv, sizeof(rcv), 0);
}

int
main(int argc, char **argv)
{
	int select_nfds;
	struct termios termios;
	char serial_port_path[MAXPATHLEN];
	char status_gdb_path[MAXPATHLEN];
	char status_trm_path[MAXPATHLEN];
	char name[MAXPATHLEN];
	fd_set readfds;
	int ret;

	/* default status file */
	status_gdb_path[0] = '\0';
	status_trm_path[0] = '\0';

	/* default serial port */
	memset(serial_port_path, 0, sizeof(serial_port_path));
	strcpy(serial_port_path, DEFAULT_SERIAL);

	/* parse options */
	while (1) {
		int opt;

		optopt = '?';

		opt = getopt(argc, argv, "?b:dhl:np:s:vD:");

		if (opt == -1)
			break;

		switch (opt) {

		case 'b':
			parse_baud(optarg);
			break;

		case 'd':
			debug = 1;
			break;

		case 'D':
			parse_debug(optarg);
			break;

		/* case 'h':  see "default:" */

		case 'n':
			passthru_null_from_term = 1;
			break;

		case 'p':
			if (strlen(optarg) >= sizeof(serial_port_path)) {
				pr_err("Path length for serial port too long\n");
				exit(EXIT_FAILURE);
			}
			strcpy(serial_port_path, optarg);
			break;

		case 's':
			if ((strlen(optarg) >= (sizeof(status_gdb_path) + strlen("_xxx"))) ||
			    (strlen(optarg) >= (sizeof(status_trm_path) + strlen("_xxx")))) {
				pr_err("Path length for status file too long\n");
				exit(EXIT_FAILURE);
			}

			/* len of suffix is strlen("_xxx") */

			strcpy(status_gdb_path, optarg);
			strcpy(status_trm_path, optarg);

			strcat(status_gdb_path, "_gdb");
			strcat(status_trm_path, "_trm");

			break;

		case 'v':
			pr_err("kdmx %s\n", VUFX);
			exit(EXIT_SUCCESS);
			break;

		case '?':
			if (optopt != 0) {
				/*
				 * getopt() reports error as opt == '?' and
				 * optopt == the unknown argument or argument
				 * with bad value
				 */
				pr_err("Use the '-h' argument to print usage information\n");
				exit(EXIT_FAILURE);
			} else {
				usage();
				exit(EXIT_SUCCESS);
			}
			break;

		case 'h':
			usage();
			exit(EXIT_SUCCESS);
			break;

		default:
			/*
			 * getopt() reports error as opt == '?'
			 * Should only get here if option added to
			 * getopt(,, opstring) but not added to this case.
			 */
			pr_err("Use the '-h' argument to print usage information\n");
			exit(EXIT_SUCCESS);
			break;
		}

	}

	/* print stream label only if multiple streams are printed */
	print_label = print_g + print_s + print_t + print_G + print_S + print_T;
	if (print_label < 2)
		print_label = 0;

	if (strlen(status_gdb_path)) {
		/*
		 * fopen() creates file with mode == 0666.  use open() to
		 * create with mode 0640
		 */
		status_gdb_fd = open(status_gdb_path,
				 O_RDWR | O_CREAT | O_TRUNC,
				 S_IRUSR | S_IWUSR | S_IRGRP);
		if (status_gdb_fd == -1) {
			char msg[strlen("open of ") + sizeof(status_gdb_path) + 1];

			memset(msg, 0, sizeof(msg));
			sprintf(msg, "open of %s", status_gdb_path);
			die(msg);
		}
		status_gdb_file = fdopen(status_gdb_fd, "r+");
		if (status_gdb_file == NULL) {
			char msg[strlen("fdopen of ") + sizeof(status_gdb_path) + 1];

			memset(msg, 0, sizeof(msg));
			sprintf(msg, "fdopen of %s", status_gdb_path);
			die(msg);
		}
		pr_debug("gdb status file: %s\n", status_gdb_path);
	}

	if (strlen(status_trm_path)) {
		/*
		 * fopen() creates file with mode == 0666.  use open() to
		 * create with mode 0640
		 */
		status_trm_fd = open(status_trm_path,
				 O_RDWR | O_CREAT | O_TRUNC,
				 S_IRUSR | S_IWUSR | S_IRGRP);
		if (status_trm_fd == -1) {
			char msg[strlen("open of ") + sizeof(status_trm_path) + 1];

			memset(msg, 0, sizeof(msg));
			sprintf(msg, "open of %s", status_trm_path);
			die(msg);
		}
		status_trm_file = fdopen(status_trm_fd, "r+");
		if (status_trm_file == NULL) {
			char msg[strlen("fdopen of ") + sizeof(status_trm_path) + 1];

			memset(msg, 0, sizeof(msg));
			sprintf(msg, "fdopen of %s", status_trm_path);
			die(msg);
		}
		pr_debug("terminal emulator status file: %s\n", status_trm_path);
	}

	pr_debug("serial port: %s\n", serial_port_path);

	serial_fd = open(serial_port_path, O_RDWR|O_NDELAY|O_NOCTTY);
	if (serial_fd == -1) {
		char msg[strlen("open() of ") + sizeof(serial_port_path) + 1];
		memset(msg, 0, sizeof(msg));
		sprintf(msg, "open() of %s", serial_port_path);
		die(msg);
	}

	switch (new_baudrate) {
	case B9600:
		pr_debug("Initalizing the serial port to 9600 8n1\n");
		break;
	case B19200:
		pr_debug("Initalizing the serial port to 19200 8n1\n");
		break;
	case B38400:
		pr_debug("Initalizing the serial port to 38400 8n1\n");
		break;
	case B57600:
		pr_debug("Initalizing the serial port to 57600 8n1\n");
		break;
	case B115200:
		pr_debug("Initalizing the serial port to 115200 8n1\n");
		break;
	case B230400:
		pr_debug("Initalizing the serial port to 230400 8n1\n");
		break;
	default:
		/*
		 * parse_baud() was updated without updating this switch
		 */
		pr_debug("Initalizing the serial port to ???\n");
		break;
	}

	/* Get the current infos on the serial port */
	if (tcgetattr(serial_fd, &termios))
		die("tcgetattr() serial port");

	/* Modify the speed */
	cfsetispeed(&termios, new_baudrate);
	cfsetospeed(&termios, new_baudrate);

	termios.c_iflag = IGNBRK;
	termios.c_iflag |= IXON | IXOFF | IXANY;

	termios.c_oflag = 0;

	termios.c_cflag &= ~(PARENB|CSTOPB);
	termios.c_cflag &= ~(CSIZE);
	termios.c_cflag |= CS8 | CLOCAL | CREAD;

	termios.c_lflag = 0;

	termios.c_cc[VMIN] = 1;
	termios.c_cc[VTIME] = 5;

	if (tcsetattr(serial_fd, TCSANOW, &termios))
		die("tcsetattr");

	get_pty(&term_fd);
	get_pty(&gdb_fd);
	select_nfds = gdb_fd + 1;

	ret = ptsname_r(term_fd, name, sizeof(name));
	if (ret)
		perror("terminal emulator pty ptsname_r() [3]");

	pr_stat_trm("%s\n", name);
	pr_info("%s is slave pty for terminal emulator\n", name);

	ret = ptsname_r(gdb_fd, name, sizeof(name));
	if (ret)
		perror("gdb pty ptsname_r() [3]");

	pr_stat_gdb("%s\n", name);
	pr_info("%s is slave pty for gdb\n", name);

	pr_info("\n");
	pr_info("Use <ctrl>C to terminate program\n");
	pr_info("\n");

	while (1) {

		FD_ZERO(&readfds);

		FD_SET(gdb_fd,    &readfds);
		FD_SET(serial_fd, &readfds);
		FD_SET(term_fd,   &readfds);

		if (select(select_nfds, &readfds, NULL, NULL, NULL) == -1)
			die("select");

		/* Order of handling readable descriptors matters */

		if (FD_ISSET(serial_fd, &readfds))

			handle_serial();

		else if (FD_ISSET(gdb_fd, &readfds))

			handle_gdb();

		else if (FD_ISSET(term_fd, &readfds))

			handle_term();
	}
}
