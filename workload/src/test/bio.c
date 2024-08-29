#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>

int main() {
    char buffer[4096];
    int fd = open("/dev/sda", O_RDONLY);
    if (fd == -1) {
        perror("Failed to open block device");
        return 1;
    }
    ssize_t bytesRead = read(fd, buffer, sizeof(buffer));
    if (bytesRead == -1) {
        perror("Read failed");
        close(fd);
        return 1;
    }
    printf("Read %zd bytes from the block device\n", bytesRead);
    close(fd);
    return 0;
}
