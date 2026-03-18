#define _GNU_SOURCE

// 该 workload 面向用户实验中的交互式调试任务。
//
// 参与者可以把它视为一个带源码的可复现程序：
// 1. 创建测试上下文；
// 2. 准备一批可观测对象；
// 3. 记录初始状态；
// 4. 对其中一部分对象执行一次管理操作；
// 5. 继续运行一段后续活动；
// 6. 比较不同阶段中的对象状态。

#include <liburing.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/user.h>

#include "study_internal.h"

#define NR_PAGES 4
#define NR_GROUPS 0x200
#define GROUPS_WITH_STATE_CHANGE 0x100

#define RING_BYTES (NR_PAGES * PAGE_SIZE)
#define PREFIX_BYTES 4

#define PIPE_BATCH_NR 0x300
#define PIPE_WRITES_PER_PIPE 4
#define MAX_ACTIVITY_ROUNDS 4
#define GROUPS_PER_LINE 12

static void dump_prefix_bytes(const unsigned char *buf, size_t len)
{
    size_t dump_len = len < PREFIX_BYTES ? len : PREFIX_BYTES;

    for (size_t i = 0; i < dump_len; i++)
        printf("%02x", buf[i]);
}

// 打印所有 buffer 的紧凑内容概览。
// 每个 buffer 只显示开头几个字节，便于在不滚动过长输出的情况下
// 快速比较运行前后的整体状态。
static void print_buffer_overview(const char *phase, unsigned char **buffers)
{
    printf("[*] %s\n", phase);
    for (int i = 0; i < NR_GROUPS; i++) {
        if ((i % GROUPS_PER_LINE) == 0)
            printf("    ");
        printf("%03x:", i);
        dump_prefix_bytes(buffers[i], RING_BYTES);
        if ((i % GROUPS_PER_LINE) == GROUPS_PER_LINE - 1 || i == NR_GROUPS - 1)
            putchar('\n');
        else
            printf("  ");
    }
}

static void initialize_groups(struct io_uring *ring, unsigned char **buffers)
{
    struct io_uring_buf_reg buf_reg;
    off_t offset;
    size_t ring_size;
    int ret;

    for (int i = 0; i < NR_GROUPS; i++) {
        memset(&buf_reg, 0, sizeof(buf_reg));
        buf_reg.ring_entries = NR_PAGES * PAGE_SIZE / sizeof(struct io_uring_buf);
        buf_reg.bgid = i;
        buf_reg.flags = IOU_PBUF_RING_MMAP;

        ret = io_uring_register_buf_ring(ring, &buf_reg, 0);
        if (ret) {
            printf(ERR_MSG("[x] 无法注册第 %d 组对象，错误码: %d\n"), i, ret);
            exit(EXIT_FAILURE);
        }

        // 每组对象都通过同一个 ring fd 建立一段用户态可观测映射。
        offset = IORING_OFF_PBUF_RING | ((uint64_t) i << IORING_OFF_PBUF_SHIFT);
        ring_size = buf_reg.ring_entries * sizeof(struct io_uring_buf);
        buffers[i] = mmap(NULL, ring_size, PROT_READ | PROT_WRITE,
                          MAP_SHARED | MAP_POPULATE, ring->ring_fd, offset);
        if (buffers[i] == MAP_FAILED) {
            printf(ERR_MSG("[x] 无法映射第 %d 组对象\n"), i);
            exit(EXIT_FAILURE);
        }

        io_uring_buf_ring_init((struct io_uring_buf_ring *) buffers[i]);
    }
}

static void seed_groups(unsigned char **buffers)
{
    for (int i = 0; i < NR_GROUPS; i++)
        memset(buffers[i], 0xcc, RING_BYTES);
}

static void apply_management_operation(struct io_uring *ring, int group_count)
{
    int ret;

    for (int i = 0; i < group_count; i++) {
        ret = io_uring_unregister_buf_ring(ring, i);
        if (ret) {
            printf(ERR_MSG("[x] 无法对第 %d 组对象执行管理操作，错误码: %d\n"), i, ret);
            exit(EXIT_FAILURE);
        }
    }
}

void trigger(void)
{
    struct io_uring ring;
    unsigned char **buffers;
    int (*helper_pipes)[2];
    int helper_pipe_count = 0;

    bind_core_for_study(0);
    raise_nofile_limit_for_study(
        (unsigned long) PIPE_BATCH_NR * MAX_ACTIVITY_ROUNDS * 2 + 256
    );

    puts("[*] 阶段 1：创建测试上下文。");
    if (io_uring_queue_init(4, &ring, 0) < 0) {
        perror(ERR_MSG("[x] 初始化 io_uring 失败"));
        exit(EXIT_FAILURE);
    }
    study_checkpoint();

    puts("[*] 阶段 2：准备一批可观测对象。");
    buffers = calloc(NR_GROUPS, sizeof(*buffers));
    helper_pipes = calloc(PIPE_BATCH_NR * MAX_ACTIVITY_ROUNDS, sizeof(*helper_pipes));
    if (!buffers || !helper_pipes) {
        puts(ERR_MSG("[x] 分配实验缓冲区失败"));
        exit(EXIT_FAILURE);
    }
    initialize_groups(&ring, buffers);
    seed_groups(buffers);

    print_buffer_overview("阶段 2 结束后的初始状态：", buffers);
    study_checkpoint();

    // 这里对前一部分对象执行一次批量管理操作，保留后一部分作为对照。
    puts("[*] 阶段 3：对前一部分对象执行管理操作。");
    apply_management_operation(&ring, GROUPS_WITH_STATE_CHANGE);
    print_buffer_overview("阶段 3 结束后：", buffers);
    study_checkpoint();

    // 这里继续运行一段后续活动，用于观察已记录对象是否出现进一步变化。
    puts("[*] 阶段 4：继续运行后续活动。");
    study_run_followup_activity(
        helper_pipes,
        &helper_pipe_count,
        buffers,
        NR_GROUPS,
        RING_BYTES,
        GROUPS_WITH_STATE_CHANGE,
        MAX_ACTIVITY_ROUNDS,
        PIPE_BATCH_NR,
        PIPE_WRITES_PER_PIPE
    );

    print_buffer_overview("阶段 4 结束后：", buffers);
    puts("[*] 程序执行完毕。");
    study_checkpoint();

    study_close_helper_pipes(helper_pipes, helper_pipe_count);
}

int main(int argc, char **argv, char **envp)
{
    trigger();
    return 0;
}
