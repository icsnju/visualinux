# constants, configurations and flags

ifdef smp
NCPU := $(smp)
endif

ifndef NCPU
NCPU := 2
endif

ifndef GDBPORT
GDBPORT := 26001
endif

KERNEL_IMAGE := kernel/arch/x86/boot/bzImage

INITRAMFS_IMAGE := workload/initramfs.img
ROOTDISK_IMAGE  := workload/rootdisk.img
INITBIN := /init

QEMU := qemu-system-x86_64

# -device e1000,netdev=net0 -netdev user,id=net0,hostfwd=tcp::5555-:22
# -netdev user,id=vmnic -device virtio-net,netdev=vmnic

QEMUFLAGS_GENERAL   := -kernel $(KERNEL_IMAGE) -serial mon:stdio -nographic -no-reboot \
                       -m 1G -smp cpus=$(NCPU),cores=1,threads=1,sockets=$(NCPU) \
                       -virtfs local,path=./tmp,mount_tag=exp,security_model=none \
                       -netdev user,id=vmnic -device virtio-net,netdev=vmnic

QEMUFLAGS_GDB       := -S -gdb tcp::$(GDBPORT)

QEMUFLAGS_INITRAMFS := $(QEMUFLAGS_GENERAL) \
                       -initrd $(INITRAMFS_IMAGE) \
                       -append "console=ttyS0 root=/dev/ram init=$(INITBIN) nokaslr net.ifnames=0"

# QEMUFLAGS_ROOTDISK  := -hda $(ROOTDISK_IMAGE) -hdb ./disk.img \
                       -append "console=ttyS0 root=/dev/sda init=$(INITBIN) rw"
QEMUFLAGS_ROOTDISK  := $(QEMUFLAGS_GENERAL) \
                       -hda $(ROOTDISK_IMAGE) \
                       -append "console=ttyS0 root=/dev/sda init=$(INITBIN) nokaslr rw"

QEMUFLAGS_BULLSEYE  := $(QEMUFLAGS_GENERAL) \
                       -append "console=ttyS0 root=/dev/sda earlyprintk=serial net.ifnames=0" \
                       -drive file=workload/images-bullseye/bullseye.img,format=raw

# rules: build

build: build-kernel build-workload

build-kernel:
	make -C kernel/ -j4
	cd kernel/ && ./scripts/clang-tools/gen_compile_commands.py
#	./scripts/build/postbuild.py
#	cp vmlinux.map kernel.map

build-workload:
	make -C workload/

.PHONY: build build-kernel build-workload

# rules: run and debug

gdb-start: $(KERNEL_IMAGE) $(INITRAMFS_IMAGE)
	mkdir -p tmp/
	$(QEMU) $(QEMUFLAGS_ROOTDISK) $(QEMUFLAGS_GDB)
#	$(QEMU) $(QEMUFLAGS_INITRAMFS) $(QEMUFLAGS_GDB)
.PHONY: gdb-start

gdb-attach:
	gdb kernel/vmlinux -ex "target remote :$(GDBPORT)" -x "scripts/gdb/config.gdb"
.PHONY: gdb-attach

run: run-rootdisk
#	$(QEMU) $(QEMUFLAGS_BULLSEYE)
.PHONY: run

run-initramfs: $(KERNEL_IMAGE) $(INITRAMFS_IMAGE)
	$(QEMU) $(QEMUFLAGS_INITRAMFS)
.PHONY: run-initramfs

run-rootdisk: $(KERNEL_IMAGE) $(ROOTDISK_IMAGE)
	$(QEMU) $(QEMUFLAGS_ROOTDISK)
.PHONY: run-rootdisk

# rules: kgdb

raspi-kgdb-agent:
	./scripts/kgdb/agent-proxy/agent-proxy 5550^5551 0 /dev/ttyUSB0,115200
.PHONY: raspi-kgdb-agent

raspi-kgdb-watch:
	telnet localhost 5550
.PHONY: raspi-kgdb-watch

RASPI_KGDB_ARGS := \
    -x "./gdb/config-raspi-kgdb.gdb" \
    -ex "target remote localhost:5551"

raspi-kgdb-attach:
	gdb-multiarch ./linux-raspi-5.15.0/vmlinux $(RASPI_KGDB_ARGS)
.PHONY: raspi-kgdb-attach

# rules: clean

clean-cache:
	find visualinux/ -type d -name __pycache__ | xargs rm -r
.PHONY: clean-cache

clean: clean-cache
	make -C kernel/ clean
	make -C workload/ clean

.PHONY: clean
