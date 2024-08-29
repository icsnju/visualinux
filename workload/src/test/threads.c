#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <stdint.h>
#include <assert.h>
#include <sched.h>
#include <pthread.h>
#include <time.h>

#include <sys/syscall.h>
#include <sys/types.h>
#include <unistd.h>

#define max(x, y) ((x) > (y) ? (x) : (y))
#define min(x, y) ((x) < (y) ? (x) : (y))

static inline int64_t timespec_ns(struct timespec * tp) {
    return tp->tv_sec * 1e9 + tp->tv_nsec;
}

static inline int64_t timespec_delta_ns(struct timespec * tp_begin, struct timespec * tp_end) {
    return timespec_ns(tp_end) - timespec_ns(tp_begin);
}

static inline double timespec_delta(struct timespec * tp_begin, struct timespec * tp_end) {
    return (double)timespec_delta_ns(tp_begin, tp_end) / 1e9;
}

int sched_getcpu(void);
pid_t gettid(void);

int vruntime_shuffle(void) {
    #define SYS_oli_vruntime_shuffle 501
    return syscall(SYS_oli_vruntime_shuffle);
}

#define MAXTHREAD 32
pthread_t tid[MAXTHREAD + 1];
int nthread;

#define SYS_hello 500

void * foo(void * arg) {
    for (int i = 0; i < 1e6; i ++) {
        syscall(SYS_hello, 10 * (int)(uintptr_t)(arg), i);
    }
}

int main(int argc, char ** argv) {
    // parse main arguments
    if (argc > 1) {
        nthread = min(atoi(argv[1]), MAXTHREAD);
    } else {
        nthread = 2;
    }
    struct timespec ts_begin, ts_end;
    clock_gettime(CLOCK_MONOTONIC, &ts_begin);
    //
    for (uintptr_t i = 0; i < nthread; i ++) {
        pthread_create(&tid[i], NULL, foo, (void *)i);
    }
    for (uintptr_t i = 0; i < nthread; i ++) {
        pthread_join(tid[i], NULL);
    }
    //
    clock_gettime(CLOCK_MONOTONIC, &ts_end);
    printf("\nbenchmark execution %.6f sec.\n", timespec_delta(&ts_begin, &ts_end));
    return 0;
}
