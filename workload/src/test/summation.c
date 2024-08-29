#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>
#include <assert.h>
#include <errno.h>
#include <pthread.h>
#include <ctype.h>

#include <unistd.h>
#include <signal.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/syscall.h>
#include <sys/wait.h>

#include <sys/socket.h>
#include <sys/un.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#include <sys/ipc.h>
#include <sys/sem.h>
#include <sys/msg.h>

pid_t gettid(void);

// all evaluation except for process parenthood and IPC are prepared here
static void do_prepare_evaluation(void);

static sigset_t sigset;
static void signal_handler(int signum) {
    printf("MainProcess %d handles signal type=%d\n", getpid(), signum);
}
static void do_prepare_signal(void) {
    // Register the signal handler
    signal(SIGUSR1, signal_handler);
    signal(SIGUSR2, signal_handler);
    // Block the signal to help obeserve it in sigpending
    sigemptyset(&sigset);
    sigaddset(&sigset, SIGUSR1);
    sigaddset(&sigset, SIGUSR2);
    if (sigprocmask(SIG_BLOCK, &sigset, NULL) != 0) {
        perror("sigprocmask block failed");
        exit(1);
    }
    // send signals
    kill(getpid(), SIGUSR1);
    kill(getpid(), SIGUSR2);
    syscall(SYS_tkill, gettid(), SIGUSR2);
    printf("send signals OK\n");
}

#define FMAP_SIZE 10240
#define FMAP_N 50
int fmap_fd;
char fmap_buffer[FMAP_SIZE];
void * faddrs[5] = {0};

static void do_prepare_file_mapping(void) {
    //
    fmap_fd = open("fmap_test.log", O_RDWR | O_CREAT);
    if (fmap_fd < 0) {
        perror("open");
        exit(1);
    }
    if (fchmod(fmap_fd, 0666)) {
        perror("fchmod");
        exit(1);
    }
    printf("Open fd: %d\n", fmap_fd);
    //
    for (int i = 0; i < FMAP_SIZE; i ++) fmap_buffer[i] = 'a' + (i % 26);
    for (int i = 0; i < FMAP_N; i ++) write(fmap_fd, fmap_buffer, sizeof(fmap_buffer));
    memset(fmap_buffer, 0, sizeof(fmap_buffer));
    //
    off_t file_size = lseek(fmap_fd, 0, SEEK_END);
    if (file_size == -1) {
        perror("Failed to determine file size");
        exit(1);
    }
    //
    for (int i = 0; i < FMAP_N / 100 * 90; i ++) {
        if (i % 2 == 0) {
            read(fmap_fd, fmap_buffer, FMAP_SIZE);
        } else {
            lseek(fmap_fd, i * FMAP_SIZE, SEEK_SET);
        }
    }
    printf("filerw finished\n");
    //
    if ((faddrs[0] = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, fmap_fd, 0)) == MAP_FAILED) {
        perror("mmap");
        exit(1);
    }
    if ((faddrs[1] = mmap(NULL, 4096 * 2, PROT_READ, MAP_SHARED, fmap_fd, 4096)) == MAP_FAILED) {
        perror("mmap");
        exit(1);
    }
    if ((faddrs[2] = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_PRIVATE, fmap_fd, 4096 * 3)) == MAP_FAILED) {
        perror("mmap");
        exit(1);
    }
    if ((faddrs[3] = mmap(NULL, 4096 * 3, PROT_READ | PROT_WRITE, MAP_PRIVATE, fmap_fd, 4096 * 4)) == MAP_FAILED) {
        perror("mmap");
        exit(1);
    }
    if ((faddrs[4] = mmap(NULL, 4096, PROT_WRITE, MAP_SHARED, fmap_fd, 4096 * 7)) == MAP_FAILED) {
        perror("mmap");
        exit(1);
    }
    for (int i = 0; i < 5; i ++) {
        printf("Mapped file region at address: %p\n", faddrs[i]);
    }
}

static void do_prepare_evaluation(void) {
    do_prepare_signal();
    do_prepare_file_mapping();
    printf("do_prepare_evaluation ok\n");
}
static void end_evaluation(void) {
    // signal
    // Unblock the signal to handle it
    if (sigprocmask(SIG_UNBLOCK, &sigset, NULL) != 0) {
        perror("sigprocmask unblock failed");
    }
    // file mapping
    munmap(faddrs[0], 4096);
    munmap(faddrs[1], 4096 * 2);
    // munmap(faddrs[2], 4096);
    munmap(faddrs[3], 4096 * 3);
    munmap(faddrs[4], 4096);
    printf("fmap_fd=%d\n", fmap_fd);
    if (close(fmap_fd)) {
        perror("close");
    }
    printf("end_prepare_evaluation ok\n");
}

// subprocess management

#define NPROC_THREADS 1
#define NPROC_SOCKET  2
#define NPROC_IPC     2
#define NPROC (NPROC_THREADS + NPROC_SOCKET + 1 + NPROC_IPC)

int * pfuck;

// subprocess for threads

#define N_THREAD  2

pthread_mutex_t mutex;
pthread_cond_t cond;
int subprocess_ready = 0;
int thread_ready = 0;

pthread_mutex_t mutex_end;
pthread_cond_t cond_end;
int thread_count = 0;

void * thread_function(void * arg) {
    int thread_id = *((int *)arg);
    int pid = getpid();

    // Print thread message
    printf("Thread %d in subprocess %d: Ready\n", thread_id, pid);

    // Wait for the signal from the parent process
    pthread_mutex_lock(&mutex);
    while (!thread_ready) {
        pthread_cond_wait(&cond, &mutex);
    }
    pthread_mutex_unlock(&mutex);

    // Print thread message
    printf("Thread %d in subprocess %d: Running\n", thread_id, pid);

    // Tell the parent process that this thread is ended
    printf("Thread %d in subprocess %d: End\n", thread_id, pid);
    pthread_mutex_lock(&mutex);
    thread_count ++;
    pthread_cond_broadcast(&cond_end);
    pthread_mutex_unlock(&mutex);
    return NULL;
}

void do_subprocess_threads() {

    // init pthread primitives
    pthread_mutex_init(&mutex, NULL);
    pthread_cond_init(&cond, NULL);
    pthread_cond_init(&cond_end, NULL);

    // Create threads
    pthread_t threads[N_THREAD];
    int thread_ids[N_THREAD];

    for (int i = 0; i < N_THREAD; i ++) {
        thread_ids[i] = i;
        pthread_create(&threads[i], NULL, thread_function, &thread_ids[i]);
    }

    // Print subprocess message
    int pid = getpid();
    printf("Subprocess %d created %d threads\n", pid, N_THREAD);

    // the subprocess should wait until parent passed the getsid() bar
    // so that we can clearly observe the state
    while (!*pfuck);

    // Signal threads to start
    pthread_mutex_lock(&mutex);
    thread_ready = 1;
    pthread_cond_broadcast(&cond);
    pthread_mutex_unlock(&mutex);

    // wait until all threads are finished
    pthread_mutex_lock(&mutex);
    while (thread_count < N_THREAD) {
        pthread_cond_wait(&cond_end, &mutex);
    }
    pthread_mutex_unlock(&mutex);

    // Subprocess finished its job
    printf("Subprocess %d finished\n", pid);
    exit(EXIT_SUCCESS);
}

// subprocess for socket

#define SOCK_PORT 8787
#define LOCAL_SOCK_PATH "__local_socket"

// void do_subprocess_socket(struct sockaddr_un _server_address) {
void do_subprocess_socket() {
    // Get server address
    struct sockaddr_in server_address;
    server_address.sin_family = AF_INET;
    server_address.sin_port = htons(SOCK_PORT);

    // Convert IPv4 and IPv6 addresses from text to binary form
    if (inet_pton(AF_INET, "127.0.0.1", &server_address.sin_addr) <= 0) {
        printf("Invalid address/ Address not supported: %s\n", strerror(errno));
        return;
    }

    // Create socket
    int client_socket;
    if ((client_socket = socket(AF_INET, SOCK_STREAM, 0)) == 0) {
        perror("socket failed");
        exit(EXIT_FAILURE);
    }

    // Connect to the server
    if (connect(client_socket, (struct sockaddr *)&server_address, sizeof(server_address)) < 0) {
        perror("connect failed");
        exit(EXIT_FAILURE);
    }

    // try write to socket
    char buffer[1024 + 1] = {0};
    memset(buffer, 'c', sizeof(buffer) - 1);
    for (int i = 0; i < 5; i ++)
        write(client_socket, buffer, sizeof(buffer) - 1);

    // Print subprocess message
    int pid = getpid();
    printf("Subprocess %d prepared\n", pid);

    // the subprocess should wait until parent passed the getsid() bar
    // so that we can clearly observe the state
    while (!*pfuck);

    // Print subprocess message
    memset(buffer, 'z', sizeof(buffer) - 1);
    int readret;
    readret = read(client_socket, buffer, sizeof(buffer) - 1);
    buffer[readret] = '\0';
    printf("Subprocess %d get message #1 = (len:%d) %s\n", pid, readret, buffer);
    readret = read(client_socket, buffer, sizeof(buffer) - 1);
    buffer[readret] = '\0';
    printf("Subprocess %d get message #2 = (len:%d) %s\n", pid, readret, buffer);

    // Subprocess finished its job
    printf("Subprocess %d finished\n", pid);
    close(client_socket); // Close the socket for this subprocess
    exit(EXIT_SUCCESS);
}

// subprocess for ipc

#define SEM_KEY 0x1234
#define SEM_NPROC 2

int * pfuck_sem;

union semun {
    int val;
    struct semid_ds *buf;
    unsigned short *array;
};

void semaphore_setup(int sem_id) {
    union semun sem_union;
    sem_union.val = 1;
    if (semctl(sem_id, 0, SETVAL, sem_union) == -1) {
        perror("semctl");
        exit(1);
    }
}

void do_subsub_sem() {

    // get the semaphore
    int sem_id = semget(SEM_KEY, 0, 0);
    printf("SubSub %d get semaphore #%x => id=%d\n", getpid(), SEM_KEY, sem_id);
    if (sem_id == -1) {
        perror("semget");
        exit(EXIT_FAILURE);
    }

    // Wait for parent the subprocess sem
    while (!*pfuck_sem);

    // Wait for the semaphore
    struct sembuf sem_op;
    sem_op.sem_num = 0; // Semaphore number
    sem_op.sem_op = -1; // Wait operation
    sem_op.sem_flg = SEM_UNDO;
    if (semop(sem_id, &sem_op, 1) == -1) {
        perror("semop");
        exit(EXIT_FAILURE);
    }

    // Print thread message
    printf("SubSub %d for sem: Running\n", getpid());

    // Release the semaphore
    sem_op.sem_op = 1;
    semop(sem_id, &sem_op, 1);
    exit(EXIT_SUCCESS);
}
void do_subprocess_ipc_sem() {

    pfuck_sem = (int *)mmap(NULL, sizeof(int), PROT_READ | PROT_WRITE, MAP_SHARED | MAP_ANONYMOUS, -1, 0);
    *pfuck_sem = 0;

    int sem_id = semget(SEM_KEY, 3, IPC_CREAT | 0666);
    if (sem_id == -1) {
        perror("semget");
        exit(1);
    }
    semaphore_setup(sem_id);

    int pid = getpid();
    printf("Subprocess %d create semaphore #%x => id=%d\n", pid, SEM_KEY, sem_id);

    //
    for (int i = 0; i < SEM_NPROC; i ++) {
        pid_t pid = fork();
        if (pid == -1) {
            perror("fork");
            semctl(sem_id, 0, IPC_RMID, 0);
            exit(EXIT_FAILURE);
        } else if (pid == 0) {
            do_subsub_sem();
            printf("ERROR: subsub should not execute to here\n");
        }
    }

    // Wait for the semaphore
    struct sembuf sem_op;
    sem_op.sem_num = 0; // Semaphore number
    sem_op.sem_op = -1; // Wait operation
    sem_op.sem_flg = SEM_UNDO;
    if (semop(sem_id, &sem_op, 1) == -1) {
        perror("semop");
        exit(1);
    }

    // let them go
    *pfuck_sem = 1;

    // create another semaphore for visualization only
    int another_sem_id = semget(IPC_PRIVATE, 2, IPC_CREAT | 0666);
    if (another_sem_id == -1) {
        perror("semget");
        exit(1);
    }
    semaphore_setup(another_sem_id);

    // Print subprocess message
    printf("Subprocess %d sem waitqueue prepared\n", pid);

    // the subprocess should wait until parent passed the getsid() bar
    // so that we can clearly observe the state
    while (!*pfuck);

    // Release the semaphore
    printf("Subprocess %d sem releasing\n", pid);
    sem_op.sem_op = 1;
    semop(sem_id, &sem_op, 1);

    // Wait
    for (int i = 0; i < SEM_NPROC; i ++) {
        wait(NULL);
    }

    // Remove the semaphore
    if (semctl(another_sem_id, 0, IPC_RMID, 0) == -1) {
        perror("semctl");
        exit(1);
    }
    if (semctl(sem_id, 0, IPC_RMID, 0) == -1) {
        perror("semctl");
        exit(1);
    }

    // Subprocess finished its job
    printf("Subprocess %d finished\n", pid);
    exit(EXIT_SUCCESS);
}

#define MSG_SIZE 128

struct msgbuf {
    long mtype;
    char mtext[MSG_SIZE];
};

void do_subprocess_ipc_msg() {

    // Create the message queue
    int msgid = msgget(IPC_PRIVATE, IPC_CREAT | 0666);
    if (msgid == -1) {
        perror("msgget");
        exit(1);
    }
    struct msgbuf msg;

    // Fork the child process
    pid_t pid0 = fork();
    if (pid0 == 0) {
        for (int i = 0; i < 5; i++) {
            sprintf(msg.mtext, "Hello from subsub (%d)", i);
            msg.mtype = 1;
            if (msgsnd(msgid, &msg, sizeof(msg.mtext), 0) == -1) {
                perror("msgsnd");
                exit(1);
            }
        }
        exit(EXIT_SUCCESS);
    }

    // Print subprocess message
    int pid = getpid();
    printf("Subprocess %d prepared\n", pid);

    // the subprocess should wait until parent passed the getsid() bar
    // so that we can clearly observe the state
    while (!*pfuck);

    for (int i = 0; i < 5; i++) {
        if (msgrcv(msgid, &msg, sizeof(msg.mtext), 1, 0) == -1) {
            perror("msgrcv");
            exit(1);
        }
        printf("Subprocess %d msgqueue received: %s\n", pid, msg.mtext);
    }

    // Remove the message queue
    if (msgctl(msgid, IPC_RMID, NULL) == -1) {
        perror("msgctl");
        exit(1);
    }

    // Subprocess finished its job
    wait(NULL);
    printf("Subprocess %d finished\n", pid);
    exit(EXIT_SUCCESS);
}

void do_subprocess_ipc(int type) {
    if (type == 0) return do_subprocess_ipc_sem();
    if (type == 1) return do_subprocess_ipc_msg();
    // if (type == 2) return do_subprocess_ipc_shm();
}

// main process

int do_main(void) {

    pfuck = (int *)mmap(NULL, sizeof(int), PROT_READ | PROT_WRITE, MAP_SHARED | MAP_ANONYMOUS, -1, 0);
    *pfuck = 0;

    // create subprocesses for threads
    for (int i = 0; i < NPROC_THREADS; i ++) {
        pid_t pid = fork();
        if (pid == -1) {
            perror("fork");
            exit(EXIT_FAILURE);
        } else if (pid == 0) {
            do_subprocess_threads();
            printf("ERROR: should not execute to here\n");
        }
    }

    // create subprocesses for ipc
    for (int i = 0; i < NPROC_IPC; i ++) {
        pid_t pid = fork();
        if (pid == -1) {
            perror("fork");
            exit(EXIT_FAILURE);
        } else if (pid == 0) {
            do_subprocess_ipc(i);
            printf("ERROR: should not execute to here\n");
        }
    }

    // create subprocess for socket unix pair

    int socket_pair[2];
    char buf_socket_pair[256 + 1] = {0};

    if (socketpair(AF_UNIX, SOCK_STREAM, 0, socket_pair) == -1) {
        perror("socketpair");
        exit(1);
    }

    pid_t pid_socket_unix = fork();
    if (pid_socket_unix == -1) {
        perror("fork");
        exit(EXIT_FAILURE);
    } else if (pid_socket_unix == 0) {
        while (!*pfuck);
        for (int i = 0; i < 3; i ++) {
            read(socket_pair[1], buf_socket_pair, sizeof(buf_socket_pair));
            printf("sockpair child: read %s\n", buf_socket_pair);
        }
        memset(buf_socket_pair, '8', sizeof(buf_socket_pair) - 1);
        write(socket_pair[1], buf_socket_pair, sizeof(buf_socket_pair));
        printf("sockpair child: sent %s\n", buf_socket_pair);
        exit(EXIT_SUCCESS);
    } else {
        for (int i = 0; i < 3; i ++) {
            memset(buf_socket_pair, '3' + i, sizeof(buf_socket_pair) - 1);
            write(socket_pair[0], buf_socket_pair, sizeof(buf_socket_pair));
            printf("sockpair parent: sent %s\n", buf_socket_pair);
        }
    }

    // create subprocesses for socket

    int server_socket;
    struct sockaddr_in server_address;
    int addrlen;
    int socket_opt = 1;

    // Create socket
    if ((server_socket = socket(AF_INET, SOCK_STREAM, 0)) == 0) {
        perror("socket failed");
        exit(EXIT_FAILURE);
    }

    // Set socket options
    if (setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, &socket_opt, sizeof(socket_opt))) {
        perror("setsockopt");
        exit(EXIT_FAILURE);
    }

    server_address.sin_family = AF_INET;
    server_address.sin_addr.s_addr = INADDR_ANY;
    server_address.sin_port = htons(SOCK_PORT);

    // Bind socket
    if (bind(server_socket, (struct sockaddr *)&server_address, sizeof(server_address)) < 0) {
        perror("bind failed");
        exit(EXIT_FAILURE);
    }

    // Listen for incoming connections
    if (listen(server_socket, NPROC_SOCKET) < 0) {
        perror("listen");
        exit(EXIT_FAILURE);
    }
    addrlen = sizeof(server_address);
    printf("now listening to clients...\n");

    pid_t pids_socket[NPROC_SOCKET];
    for (int i = 0; i < NPROC_SOCKET; i ++) {
        pid_t pid = fork();
        if (pid == -1) {
            perror("fork");
            // close(socket_pair[0]); close(socket_pair[1]);
            close(server_socket);
            exit(EXIT_FAILURE);
        } else if (pid == 0) {
            // close(socket_pair[0]); close(socket_pair[1]);
            close(server_socket);
            // do_subprocess_socket(server_address);
            do_subprocess_socket();
            printf("ERROR: should not execute to here\n");
        } else {
            pids_socket[i] = pid;
        }
    }

    // set of socket descriptors
    int client_sockets[NPROC_SOCKET];
    for (int i = 0; i < NPROC_SOCKET; i ++) {
        struct sockaddr_in client_address;
        int client_addrlen = sizeof(client_address);
        client_sockets[i] = accept(server_socket, (struct sockaddr *)&client_address, &client_addrlen);
        if (client_sockets[i] < 0) {
            perror("Failed to accept connection");
            close(client_sockets[i]);
        }
        printf("connected to client #%d\n", i);
    }

    // send messages to subprocesses
    // since clients don't read until parent says ok, the message should be blocked in socket buffer
    // char buffer[1024] = "hello from server";
    char buffer[1024];
    for (int i = 0; i < NPROC_SOCKET; i ++) {
        // send(new_socket, message, sizeof(message), 0);
        // write(client_sockets[i], buffer, strlen(buffer));
        memset(buffer, 'a', sizeof(buffer));
        write(client_sockets[i], buffer, sizeof(buffer));
        memset(buffer, 'b', sizeof(buffer));
        write(client_sockets[i], buffer, sizeof(buffer) * 3 / 4);
        printf("send message to client #%d OK\n", i);
    }

    // prepare program state in mainprocess for visualinux evaluation
    do_prepare_evaluation();
    munmap(faddrs[2], 4096);

    // for gdb breakpoint
    printf("main process %d try get sid\n", getpid());
    int sid = getsid(getpid());
    printf("main process get sid = %d\n", sid);

    // let subprocesses go
    *pfuck = 1;

    // wait for sockpair child
    // read(socket_pair[0], buf_socket_pair, sizeof(buf_socket_pair));
    // printf("sockpair parent: read %s\n", buf_socket_pair);
    // wait(NULL);

    // retrieve all resources
    end_evaluation();
    for (int i = 0; i < NPROC; i ++) {
        wait(NULL);
    }
    for (int i = 0; i < NPROC_SOCKET; i ++) {
        close(client_sockets[i]);
    }
    close(server_socket);
    unlink(LOCAL_SOCK_PATH);
    return 0;
}

int main(void) {
    return do_main();
}
