#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <stdint.h>
#include <assert.h>
#include <errno.h>

#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define N_PROCESS 3
#define PORT 8080

// #define af_type AF_INET
#define af_type AF_UNIX

void do_subprocess(struct sockaddr_in server_address) {
    int pid = getpid();

    int client_socket;
    // struct sockaddr_in server_address;

    // Create socket
    if ((client_socket = socket(af_type, SOCK_STREAM, 0)) == 0) {
        perror("socket failed");
        exit(EXIT_FAILURE);
    }

    // server_address.sin_family = af_type;
    // server_address.sin_port = htons(PORT);
    // if (inet_pton(af_type, "127.0.0.1", &server_address.sin_addr) <= 0) {
    //     perror("inet_pton failed");
    //     exit(EXIT_FAILURE);
    // }
    // printf("Subprocess %d get server_address: %#x\n", pid, server_address.sin_addr.s_addr);

    // Connect to the server
    if (connect(client_socket, (struct sockaddr *)&server_address, sizeof(server_address)) < 0) {
        perror("connect failed");
        exit(EXIT_FAILURE);
    }

    char buffer[1024] = {0};
    read(client_socket, buffer, sizeof(buffer));
    printf("Subprocess %d get message = %s\n", pid, buffer);

    // Subprocess finished its job
    printf("Subprocess %d finished\n", pid);
    close(client_socket); // Close the socket for this subprocess
    exit(EXIT_SUCCESS);
}

int do_main(void) {
    int server_socket;
    struct sockaddr_in server_address;
    int addrlen;
    int socket_opt = 1;

    // Create socket
    if ((server_socket = socket(af_type, SOCK_STREAM, 0)) == 0) {
        perror("socket failed");
        exit(EXIT_FAILURE);
    }

    // Set socket options
    if (setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR | SO_REUSEPORT, &socket_opt, sizeof(socket_opt))) {
        perror("setsockopt");
        exit(EXIT_FAILURE);
    }

    server_address.sin_family = af_type;
    server_address.sin_addr.s_addr = INADDR_ANY;
    server_address.sin_port = htons(PORT);

    // Bind socket
    if (bind(server_socket, (struct sockaddr *)&server_address, sizeof(server_address)) < 0) {
        perror("bind failed");
        exit(EXIT_FAILURE);
    }

    // Listen for incoming connections
    if (listen(server_socket, N_PROCESS) < 0) {
        perror("listen");
        exit(EXIT_FAILURE);
    }
    addrlen = sizeof(server_address);
    printf("now listening to clients...\n");

    // create subprocesses
    for (int i = 0; i < N_PROCESS; i ++) {
        pid_t pid = fork();
        if (pid == -1) {
            perror("fork");
            close(server_socket);
            exit(EXIT_FAILURE);
        } else if (pid == 0) {
            close(server_socket);
            do_subprocess(server_address);
        }
    }
    
    // set of socket descriptors
    int client_sockets[N_PROCESS];
    for (int i = 0; i < N_PROCESS; i ++) {
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
    // since client never reads, the message should be blocked in socket buffer
    char buffer[1024] = "hello from server";
    for (int i = 0; i < N_PROCESS; i ++) {
        // send(new_socket, message, sizeof(message), 0);
        write(client_sockets[i], buffer, strlen(buffer));
        printf("send message to client #%d OK\n", i);
    }

    // for gdb breakpoint
    char hostname[20] = "xxx";
    gethostname(hostname, sizeof(hostname));
    printf("hostname = %s\n", hostname);

    // wait subprocesses
    for (int i = 0; i < N_PROCESS; i ++) {
        wait(NULL);
        close(client_sockets[i]);
    }
    close(server_socket);
}

int main(void) {
    do_main();
    return 0;
}

// void socket_server_deprecated(void) {
//     int client_sockets[MAX_CLIENT_SOCKETS];
//     fd_set readfds;
//     int max_sd;
//     char buffer[1025];
//     char *message = "hello from server\r\n";
//     while (true) {
//         //clear the socket set
//         FD_ZERO(&readfds);
     
//         // add server socket to set
//         FD_SET(server_socket, &readfds);
//         max_sd = server_socket;

//         // add client sockets to set  
//         for (int i = 0 ; i < MAX_CLIENT_SOCKETS; i ++) {
//             int sd = client_sockets[i];
//             if (sd > 0) FD_SET(sd, &readfds);
//             if (sd > max_sd) max_sd = sd;
//         }

//         // wait for an activity on one of the sockets
//         // timeout is NULL so wait indefinitely
//         int activity = select(max_sd + 1, &readfds, NULL, NULL, NULL);
//         if ((activity < 0) && (errno!=EINTR)) {
//             printf("select error");
//         }

//         // If something happened on the server socket then its an incoming connection
//         if (FD_ISSET(server_socket, &readfds)) {
//             int new_socket;
//             if ((new_socket = accept(server_socket, (struct sockaddr *)&address, (socklen_t*)&addrlen)) < 0) {
//                 perror("accept");
//                 exit(EXIT_FAILURE);
//             }
//             // inform user of socket number - used in send and receive commands
//             printf("New connection, socket_fd = %d, ip = %s, port = %d\n",
//                 new_socket, inet_ntoa(address.sin_addr), ntohs(address.sin_port));
//             // send new connection greeting message
//             if (send(new_socket, message, strlen(message), 0) != strlen(message)) {
//                 perror("send");
//             }
//             puts("Welcome message sent successfully");
//             //add new socket to array of sockets
//             for (int i = 0; i < MAX_CLIENT_SOCKETS; i ++) {
//                 if (client_sockets[i] == 0) {
//                     client_sockets[i] = new_socket;
//                     printf("Adding to list of sockets as %d\n", i);
//                     break;
//                 }
//             }
//         }
//     }
// }
