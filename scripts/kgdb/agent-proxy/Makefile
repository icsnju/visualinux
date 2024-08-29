############################################################################
#                                                                          #
# Description : Agent proxy                                                #
#                                                                          #
# Copyright (c) 2005-2010 Wind River Systems Inc. All rights reserved      #
# Original design by Jason Wessel                                          #
############################################################################

AGENTVER=1.97

ifeq ($(shell uname -s),Linux) 
OSTYPE := linux
endif

ifeq ($(findstring solaris,$(OSTYPE)),solaris)
ARCH := solaris
LDLIBS = -lnsl -lsocket
endif

ifeq ($(findstring linux,$(OSTYPE)),linux)
ARCH := linux
endif

OBJS = agent-proxy.o agent-proxy-rs232.o
SRCS = $(patsubst %.o,%.c,$(OBJS))
OBJS := $(patsubst %.o,$(CROSS_COMPILE)%.o,$(OBJS))
ifneq ($(extpath),)
OBJS := $(patsubst %.o,$(extpath)%.o,$(OBJS))
endif

## Windows options ##
ifeq ($(ARCH),)
CFLAGS = /GZ /Z7 /MTd -DDEBUG -nologo
LINKFLAGS = 
CC = cl
#Change .o to .obj
OBJS:=$(patsubst %.o,%.obj,$(OBJS))
TLSPATH_INC=-I T:/rome_tls/x86-win/encap/sdk0204/include
## Unix Options ##
else
CFLAGS = -g -Wall -Wno-unused-parameter -D$(ARCH)
CC = $(CROSS_COMPILE)gcc
AGENTPROXY = $(CROSS_COMPILE)agent-proxy
endif

all: $(CROSS_COMPILE)agent-proxy

## Build for win32 or unix
ifeq ($(ARCH),)
$(CROSS_COMPILE)agent-proxy: $(OBJS)
	$(CC) -DAGENT_VER=$(AGENTVER) $(LINKFLAGS) $(CFLAGS) -o $(extpath)$@ $(OBJS) wsock32.lib
else
$(CROSS_COMPILE)agent-proxy: $(OBJS)
	$(CC) -DAGENT_VER=$(AGENTVER) $(CFLAGS) -o $(extpath)$@ $(OBJS) $(LDLIBS)
endif


distclean: clean
	rm -f $(extpath).depend $(extpath).depend.bak $(extpath)*~ $(extpath)*.bak
clean:
	rm -f $(extpath)$(CROSS_COMPILE)agent-proxy $(extpath)agent-proxy $(extpath)*.o $(extpath)*.obj $(extpath)*.exp $(extpath)*.exe $(extpath)*.ilk $(extpath)*.pdb *~

$(extpath)$(CROSS_COMPILE)%.o::%.c
	$(CC) -DAGENT_VER=$(AGENTVER) $(CFLAGS) -c $< -o $@

$(extpath)%.obj:%.c
	$(CC) -DAGENT_VER=$(AGENTVER) $(CFLAGS) -c -Fo$@ $(TLSPATH_INC) $<


