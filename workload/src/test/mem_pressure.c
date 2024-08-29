#include <stdlib.h>
#include <stdio.h>

int main() {
    int size = 4096 * 4096;
    int ii = 0;
    int * p;
    int N = 25;
    while (N --) {
        p = malloc(size);
        if (p == NULL) {
            perror("mempressure: malloc failed");
            break;
        }
        printf("Mmempressure: alloc #%d: %p.\n", ii++, p);
        for (int i = 0; i < 1024; i++) {
            p[i] = rand();
        }
    }
    printf("Mmempressure OK. Now keep holding.\n");
    while (1);
    return 0;
}