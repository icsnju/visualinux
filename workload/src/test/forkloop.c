#include <stdio.h>
#include <stdbool.h>
#include <stdint.h>
#include <assert.h>
#include <pthread.h>

#include <sys/syscall.h>
#include <sys/types.h>
#include <unistd.h>

int sched_getcpu(void);
pid_t gettid(void);

# define MAXTHREAD 20
int nfork = 10;

void * foo(void * arg) {
    printf("foo %lu\n", (uintptr_t)arg);
    for (int volatile i = 0; i < 1e7; i ++);
    printf("foo %lu ok\n", (uintptr_t)arg);
}

int main(void) {
    pthread_t tid[MAXTHREAD];
    for (uintptr_t i = 1; i < nfork; i ++) {
        pthread_create(&tid[i], NULL, foo, (void *)i);
    }
    for (uintptr_t i = 1; i < nfork; i ++) {
        pthread_join(tid[i], NULL);
    }
    printf("\nEND\n");
    return 0;
}
