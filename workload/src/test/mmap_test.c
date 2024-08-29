#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <stdint.h>
#include <assert.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>

#include <sys/syscall.h>
#include <sys/types.h>

int main(void) {
    int fd = open("file.txt", O_RDWR | O_CREAT);
    if (fd < 0) {
        perror("open");
        exit(1);
    }
    void *faddr = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    if (faddr == MAP_FAILED) {
        perror("mmap");
        exit(1);
    }
    printf("Mapped file region at address: %p\n", faddr);
    printf("fd = %d\n", fd);

    #define NUM_MAPPINGS 25
    void *addr[NUM_MAPPINGS];
    for (int i = 0; i < NUM_MAPPINGS; i ++) {
        addr[i] = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
        if (addr[i] == MAP_FAILED) {
            perror("mmap");
            exit(1);
        }
        if (i % 2 == 0) {
            printf("Mapped dynamic region #%d at address: %p\n", i+1, addr[i]);
        }
    }
    for (int i = 0; i < NUM_MAPPINGS; i ++) {
        if (i % 2 == 1) munmap(addr[i], 4096);
    }

    // for gdb breakpoint
    int sid = getsid(getpid());
    printf("main sid = %d\n", sid);

    for (int i = 0; i < 5; i ++) {
        if (i % 2 == 1) addr[i] = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    }

    // Unmap the regions
    munmap(faddr, 4096);
    for (int i = NUM_MAPPINGS - 1; i >= 0; i--) {
        if (i % 2 == 0 || i < 5) munmap(addr[i], 4096);
    }
    close(fd);

    return 0;
}
