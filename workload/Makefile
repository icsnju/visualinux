## Configurations of Workload Compilation

BUSYBOX := busybox/

## Rules: build

build-all: $(BUSYBOX)
	./scripts/generate.py
.PHONY: build-all

rebuild-all: clean build-all
.PHONY: rebuild-all

$(BUSYBOX):
	bash ../scripts/get-busybox.sh

build-src:
	make -C src/ DIR_BIN=$(realpath .)/_bin/
.PHONY: build-src

## Rules: Clean

clean-all: clean

clean: clean-initramfs clean-rootdisk
	rm -rf _bin/
	rm -rf src/_bin/

clean-initramfs:
	rm -rf usr/
	rm -f scripts/cpio_list_gen
	rm -f initramfs.img

clean-rootdisk:
	rm -rf _disk/
	rm -f rootdisk.img

.PHONY: clean-all clean clean-initramfs clean-rootdisk
