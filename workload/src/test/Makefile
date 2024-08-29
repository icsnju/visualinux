SRCS := $(shell find . -name "*.c")
BINS := $(addprefix $(DIR_BIN)/, $(basename $(SRCS)))

CC 	   := gcc
CFLAGS := -O0 -std=gnu11 -g -ggdb -static -pthread -Iinclude/ -Isrc/

bins: $(BINS)
.PHONY: bins

$(DIR_BIN)/%: %.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -o $@ $<
