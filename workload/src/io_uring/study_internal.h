#ifndef IO_URING_STUDY_INTERNAL_H
#define IO_URING_STUDY_INTERNAL_H

#include <fcntl.h>
#include <sched.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/resource.h>
#include <unistd.h>

#define SUCCESS_MSG(msg) "\033[32m\033[1m" msg "\033[0m"
#define INFO_MSG(msg) "\033[34m\033[1m" msg "\033[0m"
#define ERR_MSG(msg) "\033[31m\033[1m" msg "\033[0m"

static inline void study_checkpoint(void)
{
    static int cnt = 1;
    static int sid = -1;

    printf("getsid #%d\n", cnt);
    sid = getsid(getpid());
    printf("getsid #%d = %d\n", cnt, sid);
    cnt++;
}

static inline void bind_core_for_study(int core)
{
    cpu_set_t cpu_set;

    CPU_ZERO(&cpu_set);
    CPU_SET(core, &cpu_set);
    sched_setaffinity(getpid(), sizeof(cpu_set), &cpu_set);

    printf(INFO_MSG("[*] 进程已绑定到 CPU: ") "%d\n", core);
}

static inline void raise_nofile_limit_for_study(unsigned long want)
{
    struct rlimit lim;

    if (getrlimit(RLIMIT_NOFILE, &lim) != 0)
        return;
    if (lim.rlim_cur >= want)
        return;

    lim.rlim_cur = lim.rlim_max < want ? lim.rlim_max : want;
    setrlimit(RLIMIT_NOFILE, &lim);
}

struct study_activity_record {
    uint64_t marker;
    uint64_t serial;
};

static inline int study_mapping_differs(const unsigned char *mapping,
                                        const unsigned char *baseline,
                                        size_t ring_bytes)
{
    return memcmp(mapping, baseline, ring_bytes) != 0;
}

static inline void study_fill_helper_pipe(int pipefd[2], unsigned round,
                                          unsigned index, int writes_per_pipe)
{
    struct study_activity_record record;

    for (int iter = 0; iter < writes_per_pipe; iter++) {
        record.marker = 0x6b70697045564e54ULL ^ ((uint64_t) round << 32) ^ iter;
        record.serial = ((uint64_t) round << 48) | ((uint64_t) index << 16) | iter;

        if (write(pipefd[1], &record, sizeof(record)) != sizeof(record)) {
            perror(ERR_MSG("[x] 写入辅助 pipe 失败"));
            exit(EXIT_FAILURE);
        }
    }
}

static inline void study_run_followup_activity(int (*helper_pipes)[2],
                                               int *helper_pipe_count,
                                               unsigned char **buffers,
                                               int nr_buffers,
                                               size_t ring_bytes,
                                               int affected_count,
                                               int max_rounds,
                                               int pipe_batch_nr,
                                               int writes_per_pipe)
{
    unsigned char **snapshots = calloc(nr_buffers, sizeof(*snapshots));

    if (!snapshots) {
        puts(ERR_MSG("[x] 分配内部快照失败"));
        exit(EXIT_FAILURE);
    }

    for (int i = 0; i < nr_buffers; i++) {
        snapshots[i] = malloc(ring_bytes);
        if (!snapshots[i]) {
            puts(ERR_MSG("[x] 分配内部快照失败"));
            exit(EXIT_FAILURE);
        }
        memcpy(snapshots[i], buffers[i], ring_bytes);
    }

    puts("[*] 继续执行一段与主要数据路径无直接对应的后续活动...");

    for (int round = 0; round < max_rounds; round++) {
        for (int i = 0; i < pipe_batch_nr; i++) {
            int *pipefd = helper_pipes[*helper_pipe_count];

            if (pipe(pipefd) < 0)
                break;

            study_fill_helper_pipe(pipefd, round, i, writes_per_pipe);
            (*helper_pipe_count)++;
        }

        for (int i = 0; i < affected_count; i++) {
            if (study_mapping_differs(buffers[i], snapshots[i], ring_bytes))
                goto out;
        }
    }

out:
    for (int i = 0; i < nr_buffers; i++)
        free(snapshots[i]);
    free(snapshots);
}

static inline void study_close_helper_pipes(int (*helper_pipes)[2], int count)
{
    for (int i = 0; i < count; i++) {
        close(helper_pipes[i][0]);
        close(helper_pipes[i][1]);
    }
}

#endif
