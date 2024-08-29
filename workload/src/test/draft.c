#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <stdint.h>
#include <assert.h>
#include <sched.h>
#include <pthread.h>

#include <sys/syscall.h>
#include <sys/types.h>
#include <unistd.h>

#define max(x, y) ((x) > (y) ? (x) : (y))
#define min(x, y) ((x) < (y) ? (x) : (y))

int sched_getcpu(void);
pid_t gettid(void);

// int vruntime_shuffle(void) {
    // #define SYS_oli_vruntime_shuffle 501
    // return syscall(SYS_oli_vruntime_shuffle);
int plan_sched(void) {
    #define SYS_plan_sched 502
    int pids[5] = {};
    int ret = syscall(SYS_plan_sched, 3, pids, 0x1001);
    printf("syscall #502 ret = %d\n", ret);
    return ret;
}

#define MAXTHREAD 32
pthread_t tid[MAXTHREAD + 1];
int nthread;

pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t cond_shuffle  = PTHREAD_COND_INITIALIZER;
pthread_cond_t cond_continue = PTHREAD_COND_INITIALIZER;
int waitcount;
bool fuck;

void * foo(void * arg) {
    // do something
    for (int volatile i = 0; i < 1e6; i ++);
    // wait for bar()
    pthread_mutex_lock(&mutex);
    waitcount --;
    if (waitcount == 0) {
        pthread_cond_signal(&cond_shuffle);
    }
    // pthread_cond_wait(&cond_continue, &mutex);
    while (!fuck) {
        pthread_mutex_unlock(&mutex);
        sched_yield();
        pthread_mutex_lock(&mutex);
    }
    // rescheduled
    printf("pthread #%d rescheduled on cpu#%d\n", gettid(), sched_getcpu());
    pthread_mutex_unlock(&mutex);
}

void * bar(void * arg) {
    // wait until all other threads start waiting
    pthread_mutex_lock(&mutex);
    if (waitcount > 0) {
        pthread_cond_wait(&cond_shuffle, &mutex);
    }
    assert(waitcount == 0);
    // start a new scheduling plan and notifies all other threads
    int ret = plan_sched();
    // pthread_cond_broadcast(&cond_continue);
    fuck = true;
    pthread_mutex_unlock(&mutex);
}

int main(int argc, char ** argv) {
    // parse main arguments
    if (argc > 1) {
        nthread = min(atoi(argv[1]), MAXTHREAD);
    } else {
        nthread = 2;
    }
    //
    waitcount = nthread;
    fuck = false;
    pthread_create(&tid[0], NULL, bar, (void *)0);
    for (uintptr_t i = 1; i <= nthread; i ++) {
        pthread_create(&tid[i], NULL, foo, (void *)i);
    }
    for (uintptr_t i = 0; i <= nthread; i ++) {
        pthread_join(tid[i], NULL);
    }
    printf("\nEND\n");
    return 0;
}
