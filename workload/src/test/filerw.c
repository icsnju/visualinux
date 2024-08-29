#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <stdint.h>
#include <assert.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>

#include <sys/syscall.h>
#include <sys/types.h>

#define SIZ 10240
#define N 50
char buffer[SIZ];

int main(void) {

    int fd = open("file.txt", O_RDWR | O_CREAT);
    if (fd < 0) {
        perror("open");
        exit(1);
    }
    printf("Open fd: %d\n", fd);

    for (int i = 0; i < SIZ; i ++) buffer[i] = 'a' + (i % 26);
    for (int i = 0; i < N; i ++) write(fd, buffer, sizeof(buffer));
    memset(buffer, 0, sizeof(buffer));

    off_t file_size = lseek(fd, 0, SEEK_END);
    if (file_size == -1) {
        perror("Failed to determine file size");
        close(fd);
        return 1;
    }

    for (int i = 0; i < N / 100 * 90; i ++) {
        if (i % 2 == 0) {
            read(fd, buffer, SIZ);
        } else {
            lseek(fd, i * SIZ, SEEK_SET);
        }
    }
    printf("filerw finished\n");

    void * faddrs[5] = {0};
    if ((faddrs[0] = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0)) == MAP_FAILED) {
        perror("mmap");
        exit(1);
    }
    if ((faddrs[1] = mmap(NULL, 4096, PROT_READ, MAP_SHARED, fd, 4096)) == MAP_FAILED) {
        perror("mmap");
        exit(1);
    }
    if ((faddrs[2] = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_PRIVATE, fd, 4096 * 2)) == MAP_FAILED) {
        perror("mmap");
        exit(1);
    }
    if ((faddrs[3] = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_PRIVATE, fd, 4096 * 3)) == MAP_FAILED) {
        perror("mmap");
        exit(1);
    }
    if ((faddrs[4] = mmap(NULL, 4096, PROT_WRITE, MAP_SHARED, fd, 4096 * 4)) == MAP_FAILED) {
        perror("mmap");
        exit(1);
    }
    for (int i = 0; i < 5; i ++)
        printf("Mapped file region at address: %p\n", faddrs[i]);

    // for gdb breakpoint
    int sid = getsid(getpid());
    printf("getsid = %d\n", sid);

    for (int i = 0; i < 5; i ++)
        munmap(faddrs[i], 4096);
    close(fd);
    return 0;
}
