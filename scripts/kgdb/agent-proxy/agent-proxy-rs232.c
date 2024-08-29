/*
 * agent-proxy-rs232.c  rs232 specific stubs for the agent-proxy
 *
 * Copyright (c) 2005-2008 Wind River Systems, Inc.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2 as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
 *
 */
/*-----------------WINDOWS SERIAL IMPLEMENTATION-----------------*/
#ifdef _WIN32
/* 
 * Feel free to contribute some code to put here. :-)
 * Please send patches to kgdb-bugreport@lists.sourceforge.net 
 */
#else /* ! _WIN32 */
/*-----------------UNIX SERIAL IMPLEMENTATION-----------------*/
#include <stdio.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>
#ifdef linux
#define HAVE_TERMIOS
#endif /* linux */
#ifdef sun
#define HAVE_TERMIOS
#endif /* solaris */
#ifdef HAVE_TERMIOS
#include <termios.h>
#endif /* HAVE_TERMIOS */
#include "agent-proxy.h"

static struct {
	int rate;
	int code;
} baudtab[] = {
	{ 50, B50 },
	{ 75, B75 },
	{ 110, B110 },
	{ 134, B134 },
	{ 150, B150 },
	{ 200, B200 },
	{ 300, B300 },
	{ 600, B600 },
	{ 1200, B1200 },
	{ 1800, B1800 },
	{ 2400, B2400 },
	{ 4800, B4800 },
	{ 9600, B9600 },
	{ 19200, B19200 },
	{ 38400, B38400 },
#ifdef B57600
	{ 57600, B57600 },
#endif
#ifdef B115200
	{ 115200, B115200 },
#endif
#ifdef B230400
	{ 230400, B230400 },
#endif
#ifdef B460800
	{ 460800, B460800 },
#endif
#ifdef B500000
	{ 500000, B500000 },
#endif
#ifdef B576000
	{ 576000, B576000 },
#endif
#ifdef B921600
	{ 921600, B921600 },
#endif
#ifdef B1000000
	{ 1000000, B1000000 },
#endif
#ifdef B1152000
	{ 1152000, B1152000 },
#endif
#ifdef B1500000
	{ 1500000, B1500000 },
#endif
#ifdef B2000000
	{ 2000000, B2000000 },
#endif
#ifdef B2500000
	{ 2500000, B2500000 },
#endif
#ifdef B3000000
	{ 3000000, B3000000 },
#endif
#ifdef B3500000
	{ 3500000, B3500000 },
#endif
#ifdef B4000000
	{ 4000000, B4000000 },
#endif
	{ -1, -1 },
};

#ifdef HAVE_TERMIOS

struct hardwire_ttystate {
	struct termios termios;
};
#endif /* termios */

#ifdef HAVE_TERMIO

struct hardwire_ttystate {
	struct termio termio;
};
#endif /* termio */

#ifdef HAVE_SGTTY
struct hardwire_ttystate {
	struct sgttyb sgttyb;
	struct tchars tc;
	struct ltchars ltc;
	/* Line discipline flags.  */
	int lmode;
};
#endif /* sgtty */

static int rate_to_code(int rate)
{
	int i;

	for (i = 0; baudtab[i].rate != -1; i++) {
		/* test for perfect macth. */
		if (rate == baudtab[i].rate)
			return baudtab[i].code;
		else {
			/* check if it is in between valid values. */
			if (rate < baudtab[i].rate) {
				return -1;
			}
		}
	}
	return -1;
}

static int get_tty_state(unsigned int sock, struct hardwire_ttystate *state)
{
#ifdef HAVE_TERMIOS
	if (tcgetattr(sock, &state->termios) < 0) {
		perror("tcgetattr failed");
		return -1;
	}

	return 0;
#endif

#ifdef HAVE_TERMIO
	if (ioctl(sock, TCGETA, &state->termio) < 0) {
		perror("ioctl failed");
		return -1;
	}
	return 0;
#endif

#ifdef HAVE_SGTTY
	if (ioctl(sock, TIOCGETP, &state->sgttyb) < 0) {
		perror("ioctl failed");
		return -1;
	}
	if (ioctl(sock, TIOCGETC, &state->tc) < 0) {
		perror("ioctl failed");
		return -1;
	}
	if (ioctl(sock, TIOCGLTC, &state->ltc) < 0) {
		perror("ioctl failed");
		return -1;
	}
	if (ioctl(sock, TIOCLGET, &state->lmode) < 0) {
		perror("ioctl failed");
		return -1;
	}

	return 0;
#endif
}

static int set_tty_state(unsigned int sock, struct hardwire_ttystate *state)
{
#ifdef HAVE_TERMIOS
	if (tcsetattr(sock, TCSANOW, &state->termios) < 0)
		return -1;

	return 0;
#endif

#ifdef HAVE_TERMIO
	if (ioctl(sock, TCSETA, &state->termio) < 0)
		return -1;
	return 0;
#endif

#ifdef HAVE_SGTTY
	if (ioctl(sock, TIOCSETN, &state->sgttyb) < 0)
		return -1;
	if (ioctl(sock, TIOCSETC, &state->tc) < 0)
		return -1;
	if (ioctl(sock, TIOCSLTC, &state->ltc) < 0)
		return -1;
	if (ioctl(sock, TIOCLSET, &state->lmode) < 0)
		return -1;

	return 0;
#endif
}

int setbaudrate(int sock, int baud)
{
	struct hardwire_ttystate state;
	int baud_code = rate_to_code(baud);

	if (baud_code < 0) {
		/* The baud rate was not valid. */
		fprintf(stderr, "Invalid baud rate\n");
		errno = EINVAL;
		return -1;
	}

	if (get_tty_state(sock, &state)) {
		fprintf(stderr, "Cannot get tty state\n");
		return -1;
	}

#ifdef HAVE_TERMIOS
	cfsetospeed(&state.termios, baud_code);
	cfsetispeed(&state.termios, baud_code);
#endif

#ifdef HAVE_TERMIO
#ifndef CIBAUD
#define CIBAUD CBAUD
#endif

	state.termio.c_cflag &= ~(CBAUD | CIBAUD);
	state.termio.c_cflag |= baud_code;
#endif

#ifdef HAVE_SGTTY
	state.sgttyb.sg_ispeed = baud_code;
	state.sgttyb.sg_ospeed = baud_code;
#endif

	return set_tty_state(sock, &state);
}

int setstopbits(unsigned int sock, char *stopbits)
{
	struct hardwire_ttystate state;
	int newbit;

	if (get_tty_state(sock, &state))
		return -1;

	if (strcmp(stopbits, "2") == 0)
		newbit = 1;
	else if (strcmp(stopbits, "1.5") == 0)
		newbit = 1;
	else			/* Default to 1 stop bit */
		newbit = 0;

#ifdef HAVE_TERMIOS
	if (!newbit)
		state.termios.c_cflag &= ~CSTOPB;
	else
		state.termios.c_cflag |= CSTOPB;	/* two bits */
#endif

#ifdef HAVE_TERMIO
	if (!newbit)
		state.termio.c_cflag &= ~CSTOPB;
	else
		state.termio.c_cflag |= CSTOPB;	/* two bits */
#endif

#ifdef HAVE_SGTTY
	return -1;		/* sgtty doesn't support this */
#endif

	return set_tty_state(sock, &state);
}

int setcondefaults(unsigned int sock)
{
	struct hardwire_ttystate state;

	if (get_tty_state(sock, &state))
		return -1;

#ifdef HAVE_TERMIOS
	state.termios.c_iflag = 0;
	state.termios.c_oflag = 0;
	state.termios.c_lflag = 0;
	state.termios.c_cflag &= ~(CSIZE | PARENB);
	state.termios.c_cflag |= CLOCAL | CS8;
	state.termios.c_cc[VMIN] = 0;
	state.termios.c_cc[VTIME] = 0;
#endif

#ifdef HAVE_TERMIO
	state.termio.c_iflag = 0;
	state.termio.c_oflag = 0;
	state.termio.c_lflag = 0;
	state.termio.c_cflag &= ~(CSIZE | PARENB);
	state.termio.c_cflag |= CLOCAL | CS8;
	state.termio.c_cc[VMIN] = 0;
	state.termio.c_cc[VTIME] = 0;
#endif

#ifdef HAVE_SGTTY
	state.sgttyb.sg_flags |= RAW | ANYP;
	state.sgttyb.sg_flags &= ~(CBREAK | ECHO);
#endif

	if (set_tty_state(sock, &state))
		return -1;
	return 0;
}

/* 
 * TCP specific routine for shutting down comunications
 */
void rs232_portclose(struct port_st *port)
{
	close(port->sock);
	FD_CLR(port->sock, &master_rds);
	port->sock = -1;
}

/* 
 * TCP specific routine for reading
 */

int rs232_portread(struct port_st *port, char *buf, int size, int opts)
{
	opts = 0;
	return read(port->sock, buf, size);
}

/* 
 * TCP specific routine for reading
 */

int rs232_portwrite(struct port_st *port, char *buf, int size, int opts)
{
	opts = 0;
	return write(port->sock, buf, size);
}

#endif /* !_WIN32 */
