#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <unistd.h>
#include <sys/syscall.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <fcntl.h>

#define SYS_hello 500

int main(void) {
    printf("hello, fs!\n");
    int ret;
    ret = syscall(SYS_hello, 12, 24);
    printf("syscall #500 ret = %d\n", ret);
    int mode = S_IRWXU | S_IRWXG | S_IRWXO;
    mkdir("/hellofs", mode);
    creat("/hellofs/test1", mode);
    int fd = open("/hellofs/test1", O_WRONLY);
    int n = write(fd, "abcdefg\n", 8);
    printf("open fd=%d write n=%d\n", fd, n);
    fflush(stdout);
    return 0;
}
