#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <unistd.h>
#include <sys/syscall.h>

#define SYS_hello 500
#define SYS_plan_sched 502

int main(void) {
    printf("hello, world!\n");
    int ret;
    ret = syscall(SYS_hello, 12, 24);
    printf("syscall #500 ret = %d\n", ret);
    void * mem[3];
    for (int i = 0; i < 3; i ++) {
        printf("malloc #%d\n", i);
        mem[i] = malloc(40960);
        printf("malloc #%d -> %lx\n", i, (uintptr_t)mem[i]);
        *((int *)mem[i]) = 1000 * i;
        printf("malloc #%d := %d\n", i, *((int *)mem[i]));
    }
    fflush(stdout);
    return 0;
}
