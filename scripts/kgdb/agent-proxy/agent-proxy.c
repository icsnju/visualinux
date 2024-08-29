/*
 * agent-proxy.c  udp/tcp proxy for the gdbserver, wdbagent and kgdb
 *
 * Copyright (c) 2005-2010 Wind River Systems, Inc.
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

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#ifdef _WIN32
#include <winsock.h>
typedef unsigned int socklen_t;
#define CLOSESOCKET(fd) closesocket(fd)
#else /* ! _WIN32 */
#include <unistd.h>
#include <fcntl.h>
#include <signal.h>
#include <sys/socket.h>
#include <netinet/tcp.h>
#include <arpa/inet.h>
#include <netdb.h>
#define CLOSESOCKET(fd) close(fd)
#include <errno.h>
#include <sys/stat.h>
#endif /* ! _WIN32 */
#include "agent-proxy.h"

#ifdef DEBUGLOG
int debug = 1;
#else
int debug = 0;
#endif
int logchar = 0;

/* Class of port */
#define CLS_LOCAL_PORT    0x1
#define CLS_REMOTE_PORT   0x2
#define CLS_SCRIPT_PORT   0x4
#define CLS_SCRIPT_CLIENT 0x8

/* Operation mode of script port */
#define SCRIPT_READ  0x4
#define SCRIPT_WRITE 0x2
#define NO_TELNET_OPTION_NEGOTIATION 0x10

static struct port_st *rports = NULL;
static int nsockhandle;
static int listen_fd = -1;
static int fifo_con_fd = -1;
static struct port_st *l_ports;
static struct port_st *r_ports;
fd_set master_rds;
static fd_set master_wds;
static char *progname;
static int localPortReadMessage(struct port_st *l_port);
static int scriptPortReadMessage(struct port_st *l_port);
static int scriptClientPortReadMessage(struct port_st *l_port);
static int remotePortReadMessage(struct port_st *l_port);
static int remotePortAccept(struct port_st *l_port);
static int remotePortFifoConRead(struct port_st *l_port);
static int breakOnConnect = 1;
static int gdbSplit = 1;
#define MAX_GDB_BUF 1024 * 8
static char gdbArr[MAX_GDB_BUF];
static int gdbPtr = 0;
static int gdbGotDollar = 0;
static int telnetNegotiation = 0;
static char *fifo_con_file;

/* 
 * Program Usage.
 */

void usage()
{
	printf("agent-proxy version %1.2f\n", AGENT_VER);
	printf("Usage:\n");
	printf
	    (" agent-proxy <[udp:][virt IP:]local port | stdin> <remote host> <[udp:]remote port>\n");
	printf
	    ("   When using a debug splitter: -B      to turn off break on connect\n");
	printf
	    ("   When using a debug splitter: -G      to turn off gdb protocol split\n");
	printf
	    ("   When using a debug splitter: -s ###  to set alternate break char\n");
#ifdef USE_LATENCY
	printf(" Optional Delay Args: [-l <latency ms>] [-b <baudrate>]\n");
#endif /* USE_LATENCY */
	printf("   For udp wdb agent proxy example for default ports\n");
	printf("    agent-proxy udp:0x1001 10.0.0.2 udp:0x4321\n");
	printf("    agent-proxy udp:0x1002 remotehost2 udp:0x4321\n");
	printf("   For KGDB udp target to udp host with default g\n");
	printf("    agent-proxy udp:3331 10.0.0.2 udp:6443\n");
	printf("   For KGDB udp target to tcp host with default g\n");
	printf("    agent-proxy 3332 10.0.0.3 udp:6443\n");
	printf("   Also you can bind to a local vitual interface IE:\n");
	printf("      agent-proxy udp:47.1.1.2:0x4321 10.0.0.2 udp:0x4321\n");
	printf("      agent-proxy udp:47.1.1.3:0x4321 10.0.0.3 udp:0x4321\n");
	printf("      agent-proxy udp:47.1.1.3:6443 10.0.0.3 udp:6443\n");
	printf("      agent-proxy 47.1.1.3:44444 10.0.0.3 44444\n");
	printf
	    ("   Use stdin instead of a local port for kgdb, perhaps for inetd\n");
	printf("      agent-proxy stdin 10.0.0.3 udp:6443\n");
	printf("\n");
	printf("   Script proxy services to a terminal server on port 2011\n");
	printf("      agent-proxy 4440+4441 10.0.0.10 2011\n");
	printf("   Debug spliter to terminal server\n");
	printf("      agent-proxy 4440^4441 10.0.0.10 2011\n");
	printf("   Debug spliter to serial port at 115200 baud\n");
	printf("      agent-proxy 4440^4441 0 /dev/ttyS0,115200\n");
	printf("\n");
	exit(1);
}

#ifdef USE_LATENCY

/*
 * Add microsecond value to timeval.
 */

static void timevaladd_usec(struct timeval *tv, unsigned long usec)
{
	tv->tv_sec += usec / 1000000;
	tv->tv_usec += usec % 1000000;
	if (tv->tv_usec >= 1000000) {
		tv->tv_sec++;
		tv->tv_usec -= 1000000;
	}
}

/*
 * Subtract two timeval values
 */

static void timevalsub(struct timeval *tv1, struct timeval *tv2)
{
	tv1->tv_sec -= tv2->tv_sec;
	if (tv1->tv_usec < tv2->tv_usec) {
		tv1->tv_sec--;
		tv1->tv_usec += 1000000;
	}
	tv1->tv_usec -= tv2->tv_usec;
}

/*
 * Compare two timeval values and return in the typical fasion as strcmp().
 */

static int timevalcmp(struct timeval *tv1, struct timeval *tv2)
{
	if (tv1->tv_sec < tv2->tv_sec)
		return -1;
	if (tv1->tv_sec > tv2->tv_sec)
		return 1;
	if (tv1->tv_usec < tv2->tv_usec)
		return -1;
	if (tv1->tv_usec > tv2->tv_usec)
		return 1;
	return 0;
}

#ifdef	WIN32
/*
 * Windows implementation of POSIX function gettimeofday().
 */

static int gettimeofday(struct timeval *tv, struct timezone *tz)
{
	DWORD mstime = GetTickCount();

	tv->tv_sec = mstime / 1000;
	tv->tv_usec = (mstime % 1000) * 1000;
	return 0;
}
#endif /* WIN32 */

#endif /* USE_LATEENCY */

static void setRemoteSockOpts(int nsock)
{
	int on;
	/*
	 * set SO_LINGER socket option on socket so that it
	 * closes the connections gracefully, when required to
	 * close.
	 */
	on = 0;
	setsockopt(nsock, SOL_SOCKET, SO_LINGER, (void *)&on, sizeof on);

	on = 1;
	/* Set TCP_NODELAY socket option to optimize communication */
	setsockopt(nsock, IPPROTO_TCP, TCP_NODELAY, (void *)&on, sizeof on);
}

/*
 * Compute the value that should be used for the first parameter to
 * select from the global set of file handles that are in use by the
 * proxy.
 */

static void refresh_nsockhandle()
{
	int temp = -1;
	struct port_st *iport = rports;
	while (iport != NULL) {
		if (temp < iport->sock) {
			temp = iport->sock;
		}
		iport = iport->next;
	}
	nsockhandle = temp + 1;

}

/* 
 * TCP specific routine for shutting down comunications
 */

static void tcp_portclose(struct port_st *port)
{
	shutdown(port->sock, 2);
	CLOSESOCKET(port->sock);
	FD_CLR(port->sock, &master_rds);
	port->sock = -1;
}

/* 
 * TCP specific routine for reading
 */

static int tcp_portread(struct port_st *port, char *buf, int size, int opts)
{
	int ret = recv(port->sock, buf, size, opts);
	return ret;
}

/* 
 * TCP specific routine for reading
 */

static int tcp_portwrite(struct port_st *port, char *buf, int size, int opts)
{
	int ret = send(port->sock, buf, size, opts);
#if 0
	{
		int i;
		printf("WRITE%i: ", port->sock);
		for (i = 0; i < size; i++) {
			printf("%0x ", (unsigned char)buf[i]);
		}
		printf("\n");
	}
#endif
	return ret;
}

/* 
 * UDP specific routine for reading
 */
static int udp_portread(struct port_st *port, char *buf, int size, int opts)
{
	unsigned int len = sizeof(port->serv_addr);
	return recvfrom(port->sock, buf, size, opts,
			(struct sockaddr *)&port->serv_addr, &len);
}

/* 
 * UDP specific routine for writing
 */
static int udp_portwrite(struct port_st *port, char *buf, int size, int opts)
{
	return sendto(port->sock, buf, size, opts,
		      (struct sockaddr *)&port->serv_addr,
		      sizeof(port->serv_addr));
}

/* 
 * STDIN specific routine for reading
 */
static int stdin_portread(struct port_st *port, char *buf, int size, int opts)
{
	return read(port->sock, buf, size);
}

/* 
 * STDOUT specific routine for writing
 */
static int stdin_portwrite(struct port_st *port, char *buf, int size, int opts)
{
	return write(fileno(stdout), buf, size);
}

/* 
 * Remove a communications port from the managed list.
 */

static void killport(struct port_st *port)
{
	struct port_st *iport = rports;
	struct port_st *prev_iport = rports;

	if (debug)
		printf("Killing cls: %i port: %i peer %i\n", port->cls,
		       port->sock, (port->peer ? port->peer->sock : -1));

	if (port->cls == CLS_LOCAL_PORT ||
	    port->cls == CLS_REMOTE_PORT || port->cls == CLS_SCRIPT_PORT) {
		/* Don't close the listener or the master receiver! */
		if (port->cls == CLS_REMOTE_PORT &&
		    (port->type == PORT_UDP || port->type == PORT_LISTEN ||
		     port->type == STDINOUT || port->type == PORT_FIFO_CON)) {
			port->peer = NULL;
		}
		if (port->type == PORT_LISTEN && listen_fd >= 0) {
			/* Kill off the existing port and swap back to the
			 * original listen handle 
			 */
			FD_CLR(port->sock, &master_rds);
			CLOSESOCKET(port->sock);
			FD_SET(listen_fd, &master_rds);
			refresh_nsockhandle();
			port->readMessage = remotePortAccept;
			port->sock = listen_fd;
			listen_fd = -1;
		}
		if (port->type == PORT_FIFO_CON && fifo_con_fd >= 0) {
			/* Kill off the existing port and swap back to the
			 * original handle
			 */
			FD_CLR(port->sock, &master_rds);
			CLOSESOCKET(port->sock);
			FD_SET(fifo_con_fd, &master_rds);
			refresh_nsockhandle();
			port->readMessage = remotePortFifoConRead;
			port->sock = fifo_con_fd;
			fifo_con_fd = -1;
		}
		return;
	}

	if (port->scriptRef && port == port->scriptRef->lscript) {
		if (!(port->scriptRef->rscript->type == PORT_UDP ||
		      port->scriptRef->rscript->type == PORT_LISTEN ||
		      port->scriptRef->rscript->type == STDINOUT ||
			  port->scriptRef->rscript->type == PORT_FIFO_CON))
			port->scriptRef->scriptInUse = 0;
	}

	if (rports == port) {
		rports = rports->next;
		if (port->portclose)
			port->portclose(port);
		if (port->peer && iport->peer->sock != -1) {
			killport(port->peer);
		}
		free(port);
		port = NULL;
		return;
	}
	while (iport != NULL) {
		if (iport == port) {
			prev_iport->next = iport->next;
			if (port->portclose)
				port->portclose(port);
			if (port->peer && iport->peer->sock != -1) {
				killport(port->peer);
			}
			free(port);
			port = NULL;
			refresh_nsockhandle();
			break;
		}
		prev_iport = iport;
		iport = iport->next;
	}
}

/* 
 * Setup a local communication channel which will what an external
 * client will connect to.
 * 
 */

static int setup_local_port(struct port_st *lport, char *port,
			    struct port_st *attachPort)
{
	char *endstr;
	char *local_bind_addr = 0;

	strcpy(lport->name, "localhost");
	lport->portclose = NULL;
	lport->isLocal = 1;
	if (attachPort == NULL) {
		lport->cls = CLS_LOCAL_PORT;
		lport->readMessage = localPortReadMessage;
	} else {
		lport->cls = CLS_SCRIPT_PORT;
		lport->readMessage = scriptPortReadMessage;
	}
	/* Determine port type */
#ifndef _WIN32
	if (strncmp("stdin", port, 5) == 0) {
		lport->portread = stdin_portread;
		lport->portwrite = stdin_portwrite;
		lport->sock = fileno(stdin);
		lport->type = STDINOUT;
		/* Switch to non-blocking mode */
		fcntl(lport->sock, F_SETFL,
		      fcntl(lport->sock, F_GETFL) | O_NONBLOCK);
	} else
#endif
	if (strncmp("udp:", port, 4) == 0)
		/* Now try UDP/TCP */
	{
		lport->portread = udp_portread;
		lport->portwrite = udp_portwrite;
		lport->sock = socket(AF_INET, SOCK_DGRAM, 0);
		lport->type = PORT_UDP;
		port += 4;
	} else {
		/* Default to TCP type port */
		lport->portread = tcp_portread;
		lport->portwrite = tcp_portwrite;
		lport->sock = socket(AF_INET, SOCK_STREAM, 0);
		setRemoteSockOpts(lport->sock);
		lport->type = PORT_TCP;
	}

	/* Determine if we are receving a bind address else select the
	 * localhost 
	 */
	if ((endstr = strchr(port, ':'))) {
		*endstr = '\0';
		local_bind_addr = port;
		port = endstr + 1;
	}
	if (lport->type == PORT_TCP || lport->type == PORT_UDP) {
		int tmp;
#ifdef _WIN32
		int val;
#else
		socklen_t val;
#endif
		struct sockaddr_in serv_addr;

		if (strncmp(port, "0x", 2) == 0)
			lport->port = strtol(port, &endstr, 16);
		else
			lport->port = atoi(port);

		if (lport->sock < 0) {
			printf("Error opening socket");
			return 1;
		}

		/* Setup the socket to bind to the local port and allow
		 * address reuse unless it is UDP */
		if (lport->type != PORT_UDP) {
			tmp = 1;
			setsockopt(lport->sock, SOL_SOCKET, SO_REUSEADDR,
				   (char *)&tmp, sizeof(tmp));
		}

		memset(&serv_addr, 0, sizeof(serv_addr));
		serv_addr.sin_family = AF_INET;
		if (local_bind_addr != 0) {
			serv_addr.sin_addr.s_addr = inet_addr(local_bind_addr);
		} else {
			serv_addr.sin_addr.s_addr = htonl(INADDR_ANY);
		}
		serv_addr.sin_port = htons((short)lport->port);
		val = sizeof(serv_addr);
		if (bind(lport->sock, (struct sockaddr *)&serv_addr, val) < 0) {
			CLOSESOCKET(lport->sock);
			printf("Error: on socket bind, address in use\n");
			return 1;
		}
		if (lport->type == PORT_TCP) {
			if (listen(lport->sock, 1) < 0) {
				printf("Error: on listen()\n");
				CLOSESOCKET(lport->sock);
				return 1;
			}
		}
	}
	/* add it to listen queue */
	lport->next = rports;
	rports = lport;

	if (debug)
		printf("Added local port: %s %i\n", lport->name, lport->sock);
	return 0;
}

/* 
 * Establish communications to the remote system which the external
 * client desires to connect to.
 */

static struct port_st *open_remote_port(struct port_st *peer)
{
	struct port_st *iport;
	int tmp;

	if (peer->remote->type == PORT_TCP) {
		iport = (struct port_st *)malloc(sizeof(struct port_st));
		memset(iport, 0, sizeof(struct port_st));
		iport->readMessage = remotePortReadMessage;
		iport->portclose = tcp_portclose;
		iport->portread = tcp_portread;
		iport->portwrite = tcp_portwrite;
		iport->port = peer->remote->port;
		iport->sock = socket(AF_INET, SOCK_STREAM, 0);

		setRemoteSockOpts(iport->sock);
		if (iport->sock < 0) {
			free(iport);
			iport = NULL;
			return NULL;
		}
		tmp =
		    connect(iport->sock,
			    (struct sockaddr *)&peer->remote->serv_addr,
			    sizeof(peer->remote->serv_addr));
		if (tmp < 0) {
			CLOSESOCKET(iport->sock);
			free(iport);
			iport = NULL;
			return NULL;
		}
		iport->peer = peer;
		/* Add the new socket to the list */
		iport->next = rports;
		rports = iport;
		refresh_nsockhandle();
		FD_SET(iport->sock, &master_rds);
		return iport;
	} else if (peer->remote->type == PORT_UDP ||
		   peer->remote->type == PORT_RS232) {
		if (peer) {
			peer->remote->peer = peer;
			return peer->remote;
		}
	}
	return NULL;
}

/* 
 * Setup the initial parameters for the remote system that external
 * clients want to connect to.
 */

static int setup_remote_port(struct port_st *rport, char *host, char *port)
{
	char *endstr;
	char *ptr;

	rport->cls = CLS_REMOTE_PORT;
	strncpy(rport->name, host, NAMESIZE - 1);
	rport->sock = -1;
	rport->readMessage = remotePortReadMessage;
	/* Determine port type */
	if (strncmp("udp:", port, 4) == 0) {
		rport->sock = socket(AF_INET, SOCK_DGRAM, 0);
		if (rport->sock < 0) {
			printf("Could not allocate socket\n");
			return 1;
		}
		rport->type = PORT_UDP;
		port += 4;
		/* Check if we should be sending/receiving from a particular
		 * source port for udp
		 */
		if ((ptr = strchr(port, ':'))) {
#ifdef _WIN32
			int val;
#else
			socklen_t val;
#endif
			struct sockaddr_in serv_addr;
			int srcport;

			memset(&serv_addr, 0, sizeof(serv_addr));
			serv_addr.sin_family = AF_INET;

			*ptr = '\0';
			ptr++;
			if (strncmp(port, "0x", 2) == 0)
				srcport = strtol(port, &endstr, 16);
			else
				srcport = atoi(port);
			serv_addr.sin_addr.s_addr = htonl(INADDR_ANY);
			serv_addr.sin_port = htons((short)srcport);
			val = sizeof(serv_addr);
			if (debug)
				printf("Binding local port %i\n", srcport);
			if (bind
			    (rport->sock, (struct sockaddr *)&serv_addr,
			     val) < 0) {
				printf("Could not bind remote udp socket\n");
				return 1;
			}
			port = ptr;
		}

	} else if (strncmp(port, "tcplisten:", 10) == 0) {
		int tmp;
		port += 10;
		rport->type = PORT_LISTEN;
		rport->sock = socket(AF_INET, SOCK_STREAM, 0);
		if (rport->sock < 0) {
			printf("Could not allocate socket\n");
			return 1;
		}
		tmp = 1;
		setsockopt(rport->sock, SOL_SOCKET, SO_REUSEADDR,
			   (char *)&tmp, sizeof(tmp));
		rport->readMessage = remotePortAccept;
	} 
#ifndef _WIN32
	else if (strncmp(port, "fifocon:", 8) == 0) {
		port += 8;
		rport->type = PORT_FIFO_CON;
		fifo_con_file = strdup(port);
		if (mkfifo(port, 0700)) {
			if (errno != EEXIST) {
				fprintf(stderr, "Error creating %s fifo\n",	port);
				return 1;
			}
		}
		rport->sock = open(port, O_RDONLY|O_NONBLOCK);
		if (rport->sock < 0) {
			fprintf(stderr, "Error opening fifo\n");
			return 1;
		}
		rport->readMessage = remotePortFifoConRead;
		/* Setup call backs */
		rport->portwrite = tcp_portwrite;
		rport->portread = tcp_portread;
		rport->portclose = tcp_portclose;

		/* Add this port to the remote queue */
		rport->next = rports;
		rports = rport;
		FD_SET(rport->sock, &master_rds);
	} else if (port[0] == '/' || port[0] == 'C' || port[0] == 'c') {
		char *baudinfo;
		if ((baudinfo = strchr(port, ','))) {
			*baudinfo = '\0';
			baudinfo++;
		}

		if (port[0] == '/') {
			rport->sock = open(port, O_RDWR);
			if (rport->sock < 0) {
				printf("ERROR: opening %s\n", port);
				return 1;
			}

			if (baudinfo) {
				if (setbaudrate(rport->sock, atoi(baudinfo)))
					return 1;
			}
			setstopbits(rport->sock, "1");
			setcondefaults(rport->sock);
			rport->type = PORT_RS232;
			fcntl(rport->sock, F_SETFL,
			      fcntl(rport->sock, F_GETFL) | O_NONBLOCK);
			rport->portwrite = rs232_portwrite;
			rport->portread = rs232_portread;
			rport->portclose = rs232_portclose;

			/* Add this port to the remote queue */
			rport->next = rports;
			rports = rport;
			FD_SET(rport->sock, &master_rds);
		}
	}
#endif /* ! _WIN32 */
	else {
		/* Default to TCP type port */
		rport->type = PORT_TCP;
	}

	if (rport->type == PORT_TCP || rport->type == PORT_UDP ||
	    rport->type == PORT_LISTEN) {
#ifdef _WIN32
		int val;
#else
		socklen_t val;
#endif
		struct hostent *hostent;
		hostent = gethostbyname(host);
		if (!hostent) {
			printf("Could not lookup hostname: %s\n", host);
			return 1;
		}
		if (strncmp(port, "0x", 2) == 0)
			rport->port = strtol(port, &endstr, 16);
		else
			rport->port = atoi(port);

		/* Setup remote address */
		memset(&rport->serv_addr, 0, sizeof(rport->serv_addr));
		rport->serv_addr.sin_family = AF_INET;
		memcpy(&rport->serv_addr.sin_addr.s_addr, hostent->h_addr,
		       sizeof(struct in_addr));
		rport->serv_addr.sin_port = htons((short)rport->port);
		val = sizeof(rport->serv_addr);

		if (rport->type == PORT_UDP) {
			rport->portwrite = udp_portwrite;
			rport->portread = udp_portread;
			rport->portclose = tcp_portclose;
			/* type is PORT_UDP */
			if (rport->sock < 0) {
				printf("Error opening remote socket");
				return 1;
			}

			/* Issue a connect to the remote address.  On UDP this
			 * just means this is the only address we'll send and
			 * receive from 
			 */
			connect(rport->sock,
				(struct sockaddr *)&rport->serv_addr,
				sizeof(rport->serv_addr));
			/* Add this port to the remote queue */
			rport->next = rports;
			rports = rport;
			FD_SET(rport->sock, &master_rds);
		}
		if (rport->type == PORT_LISTEN) {
			rport->portwrite = udp_portwrite;
			rport->portread = udp_portread;
			rport->portclose = tcp_portclose;
			/* type is PORT_UDP */
			if (rport->sock < 0) {
				printf("Error opening remote socket");
				return 1;
			}
			if (bind
			    (rport->sock, (struct sockaddr *)&rport->serv_addr,
			     val) < 0) {
				printf("Could not bind remote udp socket\n");
				return 1;
			}

			listen(rport->sock, 1);
			/* Add this port to the remote queue */
			rport->next = rports;
			rports = rport;
			FD_SET(rport->sock, &master_rds);
		}
	}
	if (debug)
		printf("Rport socket: %i\n", rport->sock);
	return 0;
}

static void killScriptClient(struct port_st *s_port, struct port_st **iport,
			     int incrementIport)
{
	struct port_st *prev = s_port->clients;
	struct port_st *find = s_port->clients;

	/* Find the previous port */
	while (find != *iport) {
		prev = find;
		find = find->clientNext;
	}
	if (incrementIport) {
		if ((*iport)->clientNext == find)
			*iport = find->clientNext;
		else
			*iport = (*iport)->clientNext;
	}

	if (find == s_port->clients) {
		s_port->clients = find->clientNext;
	} else {
		prev->clientNext = find->clientNext;
	}
	killport(find);
}

static int writeScriptClients(struct port_st *s_port, char *buf, int bytes,
			      int opts)
{
	struct port_st *iport = s_port->clients;
	int got;
	int i;

	if (s_port->breakPort && gdbSplit) {
		int xmit = 0;
		for (i = 0; i < bytes; i++) {
			if (gdbPtr >= MAX_GDB_BUF) {
				gdbPtr = 0;
				gdbGotDollar = 0;
			} else if (buf[i] == '+' || buf[i] == '-') {
				gdbArr[gdbPtr++] = buf[i];
				if (!gdbGotDollar)
					xmit = 1;
			} else if (buf[i] == '$') {
				gdbGotDollar = 1;
				gdbArr[gdbPtr++] = buf[i];
			} else if (gdbGotDollar) {
				gdbArr[gdbPtr++] = buf[i];
				if (gdbGotDollar > 1)
					gdbGotDollar++;
				if (buf[i] == '#' && gdbGotDollar <= 1) {
					gdbGotDollar++;
				}
				if (gdbGotDollar >= 4) {
					gdbGotDollar = 0;
					xmit = 1;
				}
			}
		}
		if (!xmit)
			return 1;
		buf = gdbArr;
		bytes = gdbPtr;
	}

	while (iport != NULL) {
		got = iport->portwrite(iport, buf, bytes, opts);
		if (logchar)
			printf(">=%i#%i= ", iport->sock, got);
		if (got <= 0) {

			if (debug)
				printf
				    ("ERROR on write of client port %i got %i\n",
				     iport->sock, got);
			killScriptClient(s_port, &iport, 1);
			continue;
		}
		iport = iport->clientNext;
	}
	if (s_port->breakPort) {
		gdbPtr = 0;
	}
	return 1;
}

static int serialBreak(struct port_st *port)
{
#ifdef HAVE_TERMIOS
	tcsendbreak(port->sock, 0);
#endif /* linux */

#ifdef HAVE_TERMIO
	return ioctl(port->sock, TCSBRK, 0);
#endif /* solaris */
	return 0;
}

char defaultBrkStr[2] = { 0xff, 0xf3 };

char defaultBrkStrLen = 2;
char staticBrkStr[3] = { 0xff, 0xf3, 'g' };

char staticBrkStrLen = 3;
char *breakStr;
char breakStrLen = 0;

static int sendSpecialBreak(struct port_st *port, char *breakString, int len)
{
	char *ptr = breakString;
	int i;
	int rec;

	for (i = 0; i < len; i++) {
		if ((unsigned char)ptr[i] == 0xff &&
		    (i + 1 < len) &&
		    (unsigned char)ptr[i + 1] == 0xf3 &&
		    port->type == PORT_RS232) {
			serialBreak(port);
			i++;
		} else {
			rec = port->portwrite(port, &ptr[i], 1, 0);
			if (rec != 1)
				return 1;
		}
	}
	return 0;
}

static int processIACoptions(struct port_st *iport, int got)
{
	int i;
	int j = 0;

	for (i = 0; i < got; i++) {
		if (iport->inIAC > 0) {
			if ((unsigned char)iport->buf[i] == IAC
			    && iport->inIAC == 1) {
				/* Eat all the IAC commands except break */
				/* IAC_client_send_break()... */
			} else {
				if ((unsigned char)iport->buf[i] == 0xf3) {
					if (iport->readMessage ==
					    scriptClientPortReadMessage) {
						if (iport->scriptRef->breakPort)
							sendSpecialBreak(iport->
									 scriptRef->
									 rscript,
									 breakStr,
									 breakStrLen);
						else
							sendSpecialBreak(iport->
									 scriptRef->
									 rscript,
									 defaultBrkStr,
									 defaultBrkStrLen);
					} else
						sendSpecialBreak(iport->peer,
								 defaultBrkStr,
								 defaultBrkStrLen);

					iport->inIAC = 0;
				} else {
					iport->inIAC++;
				}
			}
			if (iport->inIAC >= 3) {
				iport->inIAC = 0;
			}
		} else {
			if ((unsigned char)iport->buf[i] == IAC) {
				iport->inIAC = 1;
			} else {
				if (iport->readMessage ==
				    scriptClientPortReadMessage
				    && (unsigned char)iport->buf[j] == 3
				    && iport->scriptRef->breakPort
				    && iport->scriptRef->rscript) {
					sendSpecialBreak(iport->scriptRef->
							 rscript, breakStr,
							 breakStrLen);
				} else {
					if (j != i)
						iport->buf[j] = iport->buf[i];
					j++;
				}
			}
		}
	}
	return j;
}

/* Take care of a read case from a script client port 
 * 0 == success 
 * 1 == failure
 */
static int scriptClientPortReadMessage(struct port_st *iport)
{
	int got;
	got = iport->portread(iport, iport->buf, sizeof(iport->buf), 0);
	if (got <= 0) {
		killScriptClient(iport->scriptRef, &iport, 0);
		/* No further processing */
		goto bad_status;
	}
	if (debug) {
		printf("Read from script: %i got: %i\n", iport->sock, got);
	}
	if (logchar) {
		int j;
		printf("<%i=", iport->sock);
		for (j = 0; j < got; j++)
			printf("%c", iport->buf[j]);
		printf("= ");
	}

	if (!(iport->mode & NO_TELNET_OPTION_NEGOTIATION)) {
		got = processIACoptions(iport, got);
		if (got <= 0)
			goto good_status;
	}

	if (!iport->scriptRef->scriptInUse)
		goto good_status;

	/* Send to remote port based on mode bits */
	if (iport->scriptRef->rscript
	    && iport->scriptRef->rscript->mode & SCRIPT_WRITE) {
		got =
		    iport->scriptRef->rscript->portwrite(iport->scriptRef->
							 rscript, iport->buf,
							 got, 0);
		if (logchar)
			printf(">=%i#%i= ", iport->scriptRef->rscript->sock,
			       got);
		if (got <= 0) {
			killport(iport->scriptRef->rscript);
			/* No further processing */
			goto bad_status;
		}
	}
	/* Send to local and port based on mode bits */
	if (iport->scriptRef->lscript
	    && iport->scriptRef->lscript->mode & SCRIPT_WRITE) {
		got =
		    iport->scriptRef->lscript->portwrite(iport->scriptRef->
							 lscript, iport->buf,
							 got, 0);
		if (logchar)
			printf(">=%i#%i= ", iport->scriptRef->lscript->sock,
			       got);
		if (got <= 0) {
			killport(iport->scriptRef->lscript);
			/* No further processing */
			goto bad_status;
		}
	}

good_status:
	if (logchar)
		printf("\n");
	return 0;
bad_status:
	if (logchar)
		printf("\n");
	return 1;

}

static void iacStartup(struct port_st *iport)
{
	char resp_buf[4];
	/* Send the telnet negotion to put telnet in binary, no echo, single char mode */
	sprintf(resp_buf, "%c%c%c", 0xff, 0xfb, 0x01);	/* IAC WILL ECHO */
	iport->portwrite(iport, (char *)resp_buf, 3, 0);
	sprintf(resp_buf, "%c%c%c", 0xff, 0xfb, 0x03);	/* IAC WILL Suppress go ahead */
	iport->portwrite(iport, (char *)resp_buf, 3, 0);
	sprintf(resp_buf, "%c%c%c", 0xff, 0xfd, 0x03);	/* IAC DO Suppress go ahead */
	sprintf(resp_buf, "%c%c%c", 0xff, 0xfb, 0x00);	/* IAC WILL Binary */
	iport->portwrite(iport, (char *)resp_buf, 3, 0);
	sprintf(resp_buf, "%c%c%c", 0xff, 0xfd, 0x00);	/* IAC DO Binary */
	iport->portwrite(iport, (char *)resp_buf, 3, 0);
}

/* Take care of a read case from a script connection port.
 *
 * This will create a script client connection 
 * 0 == success 
 * 1 == failure
 */
static int scriptPortReadMessage(struct port_st *s_port)
{

	struct port_st *iport;
	struct sockaddr addr;
	socklen_t addr_len = sizeof(addr);
	int nsock;

	if (s_port->type != PORT_TCP) {
		printf("Error: Only TCP ports are supported for scripting\n");
		return 1;
	}

	if ((nsock = accept(s_port->sock, &addr, &addr_len)) < 0) {
		printf("error on socket accept() %i\n", nsock);
	}
	if (debug)
		printf("Opened from remote %i \n", nsock);

	setRemoteSockOpts(nsock);

	/* Add the newly attached script client to the clients list of the script refrence */
	iport = (struct port_st *)malloc(sizeof(struct port_st));
	memset(iport, 0, sizeof(struct port_st));
	iport->readMessage = scriptClientPortReadMessage;
	iport->portclose = tcp_portclose;
	iport->portread = tcp_portread;
	iport->portwrite = tcp_portwrite;
	iport->sock = nsock;
	iport->type = PORT_TCP;
	iport->cls = CLS_SCRIPT_CLIENT;
	iport->scriptRef = s_port;
	iport->clientNext = s_port->clients;
	s_port->clients = iport;

	if (debug)
		printf("Added script client: %i\n", iport->sock);

	/* Connect up to the external port and put that on
	 * the queue as well as setting up the peer.
	 */
	/* Add the new socket to the master list */
	iport->next = rports;
	rports = iport;
	refresh_nsockhandle();
	FD_SET(nsock, &master_rds);

	if (!(s_port->mode & NO_TELNET_OPTION_NEGOTIATION) &&
	    !iport->scriptRef->breakPort)
		iacStartup(iport);

	if (breakOnConnect && iport->scriptRef->rscript &&
	    iport->scriptRef->breakPort)
		sendSpecialBreak(iport->scriptRef->rscript, breakStr,
				 breakStrLen);

	return 0;
}

/* Take care of a read case from a local port
 * 0 == success 
 * 1 == failure
 */
static int localPortReadMessage(struct port_st *l_port)
{
	struct port_st *peer;
	struct port_st *iport;
	int got;

	if (l_port->type == PORT_TCP) {
		struct sockaddr addr;
		socklen_t addr_len = sizeof(addr);
		int nsock;
		if ((nsock = accept(l_port->sock, &addr, &addr_len)) < 0) {
			printf("error on socket accept() %i\n", nsock);
		}
		if (debug)
			printf("Opened from remote %i \n", nsock);

		setRemoteSockOpts(nsock);

		/* Connect the peer else close the remote socket */
		iport = (struct port_st *)malloc(sizeof(struct port_st));
		if (iport <= 0) {
			printf("ERROR allocating memory\n");
			exit(-1);
		}
		memset(iport, 0, sizeof(struct port_st));
		iport->readMessage = remotePortReadMessage;
		iport->portclose = tcp_portclose;
		iport->portread = tcp_portread;
		iport->portwrite = tcp_portwrite;
		iport->sock = nsock;
		iport->type = PORT_TCP;
		iport->remote = l_port->remote;
		iport->isLocal = 1;
		if ((peer = open_remote_port(iport)) == NULL) {
			if (debug)
				printf("Error opening remote socket\n");
			free(iport);
			iport = NULL;
			shutdown(nsock, 2);
			CLOSESOCKET(nsock);
			return 0;
		} else {
			iport->peer = peer;
			/* Connect up to the external port and put that on
			 * the queue as well as setting up the peer.
			 */
			/* Add the new socket to the list */
			iport->next = rports;
			rports = iport;
			refresh_nsockhandle();
			FD_SET(nsock, &master_rds);
		}

		if (l_port->remote->type == PORT_RS232) {
			telnetNegotiation = 1;
			iacStartup(iport);
		}

		/* The local connection is bound to the remote.  Now connect
		 * the script port if a scriptRef exists 
		 */
		if (l_port->scriptRef != NULL
		    && !l_port->scriptRef->scriptInUse) {
			/* local setup */
			iport->scriptRef = l_port->scriptRef;
			iport->mode = l_port->scriptRef->lmode;
			/* Remote setup */
			peer->scriptRef = l_port->scriptRef;
			peer->mode = l_port->scriptRef->rmode;
			/* general script setup */
			l_port->scriptRef->lscript = iport;
			l_port->scriptRef->rscript = peer;
			l_port->scriptRef->scriptInUse = 1;
		}
	} else if (l_port->type == PORT_UDP || l_port->type == STDINOUT) {
		if ((peer = open_remote_port(l_port)) == NULL) {
			/* Throw away any read because the remote side is not there */
			printf("Warning remote socket could not be opened\n");
			l_port->portread(l_port, l_port->buf,
					 sizeof(l_port->buf), 0);
		} else {
			l_port->peer = peer;
			got =
			    l_port->portread(l_port, l_port->buf,
					     sizeof(l_port->buf), 0);
			if (debug)
				printf
				    ("Read from child1: %i got: %i write to %i\n",
				     l_port->sock, got, l_port->peer->sock);
			/* If stdin is closed, then we need to exit */
			if (got <= 0 && l_port->type == STDINOUT) {
				printf
				    ("Terminating because STDIN read return <= 0\n");
				exit(0);
			}
			if (logchar) {
				int j;
				printf("<%i=", l_port->sock);
				for (j = 0; j < got; j++)
					printf("%c", l_port->buf[j]);
				printf("=\n");
			}
			got =
			    l_port->peer->portwrite(l_port->peer, l_port->buf,
						    got, 0);
			if (got <= 0) {
				printf("Error writing to remote: %s on %i\n",
				       l_port->peer->name, l_port->peer->sock);
			}
		}
	}
	return 0;
}

/* Take care of a read case from a remote port 
 * 0 == success 
 * 1 == failure
 */
static int remotePortAccept(struct port_st *iport)
{
	int fd;
	fd = accept(iport->sock, 0, 0);
	if (fd < 0)
		/* We return zero so no one closes the socket */
		return 0;

	if (listen_fd < 0) {
		/* Swap the new port for the listen port */
		listen_fd = iport->sock;
		iport->sock = fd;
		FD_CLR(listen_fd, &master_rds);
		FD_SET(iport->sock, &master_rds);
		refresh_nsockhandle();
		iport->readMessage = remotePortReadMessage;
	}
	return 0;
}


#define MAX_FIFO_BUF 50
char fifo_buf[MAX_FIFO_BUF];
int fifo_idx = 0;

/* Take care of a read case from the console fifo
 * 0 == success 
 * 1 == failure
 */
static int remotePortFifoConRead(struct port_st *iport)
{
	int cc;
	char ibuf[2];

	if ((cc = read(iport->sock, ibuf, 1)) > 0) {
		if (ibuf[0] == '\n') {
			int port = atoi(fifo_buf);
			int sock;
			struct sockaddr_in serv_addr;

			fifo_idx = 0;
			sock = socket(AF_INET, SOCK_STREAM, 0);
			if (sock < 0)
				goto fifo_out;
			setRemoteSockOpts(sock);
			memset(&serv_addr, 0, sizeof(serv_addr));
			serv_addr.sin_family = AF_INET;
			serv_addr.sin_port = htons((short)port);
			serv_addr.sin_addr.s_addr = inet_addr("127.0.0.1");
			if (connect(sock, (struct sockaddr *) &serv_addr,
				    sizeof (serv_addr)) < 0) {
				close(sock);
				fprintf(stderr,"Error connecting to local port %i\r\n", port);
				goto fifo_out;
			}
			if (fifo_con_fd < 0) {
				/* Swap the new port for the fifo_con port */
				fifo_con_fd = iport->sock;
				iport->sock = sock;
				FD_CLR(fifo_con_fd, &master_rds);
				FD_SET(iport->sock, &master_rds);
				refresh_nsockhandle();
				iport->readMessage = remotePortReadMessage;
			}
		}
fifo_out:
		if (ibuf[0] != '\r' && ibuf[0] != '\n') {
			fifo_buf[fifo_idx] = ibuf[0];
			fifo_idx++;
		}
		if (fifo_idx >= MAX_FIFO_BUF)
			fifo_idx = 0;
	} else {
		close(iport->sock);
		FD_CLR(iport->sock, &master_rds);
		iport->sock = open(fifo_con_file, O_RDONLY|O_NONBLOCK);
		if (iport->sock < 0) {
			fprintf(stderr, "Error opening fifo\r\n");
			exit(1);
		}
		FD_SET(iport->sock, &master_rds);
		refresh_nsockhandle();
	}
	return 0;
}

/* Take care of a read case from a remote port 
 * 0 == success 
 * 1 == failure
 */
static int remotePortReadMessage(struct port_st *iport)
{
	int rgot;
	int wgot;

	rgot = iport->portread(iport, iport->buf, sizeof(iport->buf), 0);
	if (logchar) {
		int j;
		printf("<%i=", iport->sock);
		for (j = 0; j < rgot; j++)
			printf("%c", iport->buf[j]);
		printf("= ");
	}
	if (rgot <= 0) {
		killport(iport);
		/* No further processing */
		goto bad_status;
	} else {
		if (telnetNegotiation) {
			rgot = processIACoptions(iport, rgot);
			if (rgot <= 0)
				goto good_status;
		}

		if (iport->peer && iport->peer->sock >= 0) {
			wgot =
			    iport->peer->portwrite(iport->peer, iport->buf,
						   rgot, 0);
			if (logchar)
				printf(">=%i#%i= ", iport->sock, wgot);

			if (debug)
				printf
				    ("Read from child2: %i got: %i write to %i\n",
				     iport->sock, rgot, iport->peer->sock);
			if (wgot <= 0) {
				killport(iport);
				/* No further processing */
				goto bad_status;
			}
		} else {
			if (debug)
				printf
				    ("Read from child3: %i got: %i to /dev/null\n",
				     iport->sock, rgot);
		}

		if (iport->scriptRef) {
			if (iport->mode & SCRIPT_READ)
				return writeScriptClients(iport->scriptRef,
							  iport->buf, rgot, 0);
		}
	}
good_status:
	if (logchar)
		printf("\n");
	return 0;
bad_status:
	if (logchar)
		printf("\n");
	return 1;
}

static int parse_local_port(struct port_st *lport, char *portStr)
{
	char *scriptStr = NULL;
	int breakPort = 0;

	/* Check to see if there scriptPort parameters */
	if ((scriptStr = strchr(portStr, '+'))) {
		*scriptStr = '\0';
		scriptStr++;
	} else if ((scriptStr = strchr(portStr, '^'))) {
		*scriptStr = '\0';
		scriptStr++;
		breakPort = 1;
	}

	if (setup_local_port(lport, portStr, NULL))
		return 1;

	/* setup the script port if one was passed in */
	if (scriptStr) {
		struct port_st *scriptPort;
		scriptPort = (struct port_st *)malloc(sizeof(struct port_st));
		memset(scriptPort, 0, (sizeof(struct port_st)));
		if (setup_local_port(scriptPort, scriptStr, lport)) {
			printf("Error: connecting to %s\n", scriptStr);
			free(scriptPort);
			return 1;
		}
		/* If the local port is udp we must immediately set the lscript handle */
		if (lport->type == PORT_UDP || lport->type == STDINOUT) {
			scriptPort->scriptInUse = 1;
			scriptPort->lscript = lport;
		}
		FD_SET(scriptPort->sock, &master_rds);
		lport->scriptRef = scriptPort;
		/* setup additional attributes */
		scriptPort->lmode = 0;	/* No access to back to the local port by default */
		scriptPort->rmode = (SCRIPT_READ | SCRIPT_WRITE);
		scriptPort->breakPort = breakPort;
	}
	FD_SET(lport->sock, &master_rds);

	return 0;
}

/*
 * Main entry
 */

int main(int argc, char *argv[])
{
	struct port_st *iport;	/* Iterator over ports */
	fd_set rds;
	fd_set wds;
	fd_set eds;
	FILE *pidf;
	int pid;
	int ind;
#ifdef USE_LATENCY
	int baud;
	int latency;
#endif /* USE_LATENCY */
	int got;
	int select_ret;
	char *s;
	char *pidfile = 0;
	int c;
	int do_fork = 0;
	int pargs = 0;
	char *proxy_args[3];	/* Each of the main three aguments */

#ifdef _WIN32
	WSADATA wsaData;	/* Windows Socket init data */
#endif /* _WIN32 */

	progname = argv[0];

#ifdef _WIN32
	if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
		fprintf(stderr, "%s: Error starting WSA\n", progname);
		exit(1);
	}
#else /* ! _WIN32 */
	signal(SIGPIPE, SIG_IGN);
#endif /* ! _WIN32 */

	if (argc < 2) {
		usage();
	}

	printf("Agent Proxy %01.2f Started with:", AGENT_VER);
	for (ind = 1; ind < argc; ind++) {
		printf(" %s", argv[ind]);
	}
	printf("\n");
	/* Initalize the default break handler */
	breakStr = staticBrkStr;
	breakStrLen = staticBrkStrLen;

	for (ind = 1; ind < argc; ind++) {
		s = argv[ind];
		if (*s != '-') {
			/* Add a proxy agurment */
			if (pargs > 2) {
				fprintf(stderr, "Too many aguments at: %s\n",
					s);
				exit(-1);
			}
			proxy_args[pargs] = s;
			pargs++;
			continue;
		}
		s++;
		if (*s == '-' && s[1] == '\0') {
			/* Terminate option scanning on -- */
			ind++;
			break;
		}
		while ((c = *s++) != '\0') {
			switch (c) {
			case 'd':
				logchar = 1;
				break;
			case 'v':
				debug = 1;
				break;
			case 'D':
				do_fork = 1;
				break;
			case 'f':
				if (ind + 1 >= argc) {
					fprintf(stderr,
						"%s: no argument specified for option -%c\n",
						progname, c);
					usage();
				}
				pidfile = argv[ind + 1];
				ind++;
				break;
			case 'G':
				gdbSplit = 0;
				break;
			case 'B':
				breakOnConnect = 0;
				break;
			case 'b':
			case 'l':
			case 'p':
			case 's':
				if (*s == '\0') {
					if (ind + 1 >= argc) {
						fprintf(stderr,
							"%s: no argument specified for option -%c\n",
							progname, c);
						usage();
					}
					s = argv[++ind];
				}
				switch (c) {
				case 's':
					breakStr = (char *)malloc(sizeof(char));
					breakStrLen = 1;
					breakStr[0] = (unsigned char)atoi(s);
					break;
#ifdef USE_LATENCY
				case 'b':
					baud = atoi(s);
					break;
				case 'l':
					latency = atoi(s);
					break;
#endif /* USE_LATENCY */
				default:
					fprintf(stderr,
						"%s: option -%c not recognized\n",
						progname, c);
					usage();
				}
				s = "";
				break;

			default:
				fprintf(stderr,
					"%s: option -%c not recognized\n",
					progname, c);
				usage();
			}
		}
	}
	/* Initialize the master read and write handles */
	FD_ZERO(&master_rds);
	FD_ZERO(&master_wds);

	l_ports = (struct port_st *)malloc(sizeof(struct port_st));
	memset(l_ports, 0, sizeof(struct port_st));

	if (parse_local_port(l_ports, proxy_args[0])) {
		printf("Open of local port failed\n");
		exit(1);
	}

	r_ports = (struct port_st *)malloc(sizeof(struct port_st));
	memset(r_ports, 0, sizeof(struct port_st));

	if (setup_remote_port(r_ports, proxy_args[1], proxy_args[2])) {
		printf("Open of local port failed\n");
		exit(1);
	}
	/* Connect the l_port to the now setup r_port */
	l_ports->remote = r_ports;

	/* When the remote side is udp and we are using script ports,
	 * activate communications right away 
	 */
	if ((r_ports->type == PORT_UDP || r_ports->type == PORT_LISTEN ||
		 r_ports->type == PORT_FIFO_CON)
	    && l_ports->scriptRef) {
		l_ports->scriptRef->scriptInUse = 1;
		l_ports->scriptRef->rscript = r_ports;
		l_ports->scriptRef->rscript->mode =
		    (SCRIPT_READ | SCRIPT_WRITE);
		r_ports->scriptRef = l_ports->scriptRef;
	}

	/* Open the pid file handle */
	if (pidfile) {
		pidf = fopen(pidfile, "w");
		if (!pidf) {
			printf("ERROR: Could not open pid file: %s\n", pidfile);
			exit(1);
		}
	}
#ifndef _WIN32
	if (do_fork) {
		if ((pid = fork())) {
			if (pidfile) {
				fprintf(pidf, "%i", pid);
				fclose(pidf);
			}
			exit(0);
		}
		if (pidfile)
			fclose(pidf);
	} else
#endif
	if (pidfile) {
		fprintf(pidf, "%i", getpid());
		fclose(pidf);
	}

	printf("Agent Proxy running. pid: %i\n", getpid());
	refresh_nsockhandle();
	while (1) {
		memcpy(&rds, &master_rds, sizeof(master_rds));
		memcpy(&eds, &master_rds, sizeof(master_rds));
		memcpy(&wds, &master_wds, sizeof(master_wds));
		select_ret = select(nsockhandle, &rds, &wds, &eds, NULL);
		if (select_ret <= 0) {
			if (debug)
				printf("Select return: %i\n", select_ret);
		}

		/* Iterate over all the listening ports to see if any have
		 * data that should be transmitted. 
		 */
		iport = rports;
		while (iport != NULL && select_ret > 0) {
			if (FD_ISSET(iport->sock, &rds)) {
				FD_CLR(iport->sock, &rds);
				select_ret--;

				if (iport->readMessage(iport)) {
					/* reset the list pointer to the top because one
					 * or more list handles a was destroyed with
					 * killport.
					 */
					iport = rports;
					continue;
				}
			}
			iport = iport->next;
		}

		/* Check for any Out Of Band OOB data */
		iport = rports;
		while (iport != NULL && select_ret > 0) {
			if (FD_ISSET(iport->sock, &eds)) {
				FD_CLR(iport->sock, &eds);
				select_ret--;
				got =
				    iport->portread(iport, iport->buf, 1,
						    MSG_OOB);
				if (got <= 0) {
					killport(iport);
					/* reset the list pointer to the top because one
					 * or more list handles a was destroyed with
					 * killport.
					 */
					iport = rports;
					continue;
				} else {
					if (debug)
						printf
						    ("OOB child: %i got: %i\n",
						     iport->sock, got);
					got =
					    iport->peer->portwrite(iport->peer,
								   iport->buf,
								   got,
								   MSG_OOB);
					if (got <= 0) {
						killport(iport);
						/* reset the list pointer to the top because one
						 * or more list handles a was destroyed with
						 * killport.
						 */
						iport = rports;
						continue;
					}
				}
			}
			iport = iport->next;
		}
	}
	return 0;
}
