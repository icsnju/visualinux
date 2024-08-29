#!/usr/bin/env python3

import sys
import os
import subprocess
from pathlib import Path
import shutil

DIR_SCRIPTS  = Path(__file__).parent
DIR_WORKLOAD = DIR_SCRIPTS.parent
DIR_KERNEL   = DIR_WORKLOAD.parent / 'kernel'

DIR_BUSYBOX     = DIR_WORKLOAD / 'busybox'
DIR_BUSYBOX_BIN = DIR_BUSYBOX / '_install'

DIR_BIN         = Path('_bin')

def build():
    build_busybox()
    subprocess.run(['make', 'build-src'])

def clean():
    subprocess.run(['make', 'clean'])

# ============================================================
# busybox
# ============================================================

def build_busybox():
    if not (DIR_BUSYBOX_BIN / 'bin' / 'busybox').is_file():
        shutil.copy(DIR_SCRIPTS / 'busybox.config', DIR_BUSYBOX / '.config')
        subprocess.run(['make', '-C', DIR_BUSYBOX, '-j4'], check=True)
        subprocess.run(['make', '-C', DIR_BUSYBOX, 'install'], check=True)
        assert DIR_BUSYBOX_BIN.is_dir()

# ============================================================
# initramfs
# ============================================================

CPIO_LIST     = DIR_SCRIPTS / 'cpio_list'
CPIO_LIST_GEN = DIR_SCRIPTS / 'cpio_list_gen'
RELPATH_GEN_INITRAMFS = Path('usr/gen_initramfs.sh')
RELPATH_GEN_INIT_CPIO = Path('usr/gen_init_cpio')

def gen_initramfs():

    subprocess.run([
        DIR_SCRIPTS / 'gen_cpio_list.sh', CPIO_LIST_GEN, DIR_BIN
    ])

    RELPATH_GEN_INITRAMFS.parent.mkdir(exist_ok=True)
    shutil.copy(DIR_KERNEL / RELPATH_GEN_INITRAMFS, RELPATH_GEN_INITRAMFS)
    shutil.copy(DIR_KERNEL / RELPATH_GEN_INIT_CPIO, RELPATH_GEN_INIT_CPIO)

    subprocess.run([
        RELPATH_GEN_INITRAMFS, '-o', 'initramfs.img', 
        DIR_BUSYBOX_BIN,
        # CPIO_LIST,
        CPIO_LIST_GEN
    ])

# ============================================================
# rootdisk
# ============================================================

DIR_DISK = Path('_disk')
DISK_SIZE = 128

def gen_rootdisk():

    shutil.rmtree(DIR_DISK, ignore_errors=True)
    shutil.copytree(DIR_BUSYBOX_BIN, DIR_DISK, symlinks=True)
    shutil.copytree(DIR_BIN, DIR_DISK / 'workload')
    shutil.copy('init.sh', DIR_DISK / 'init')

    subprocess.run([
        DIR_SCRIPTS / 'gen_diskimg.sh', 'rootdisk.img', str(DISK_SIZE), DIR_DISK
    ])

# ============================================================
# main entry
# ============================================================

if __name__ == '__main__':

    if not DIR_KERNEL.is_dir():
        raise AssertionError(f'Failed to find {DIR_KERNEL = }.')
    if not (DIR_KERNEL / 'vmlinux').is_file():
        raise AssertionError(f'Should build kernel first.')

    os.chdir(DIR_WORKLOAD)
    build()

    if len(sys.argv) > 1:
        opt = sys.argv[1]
    else:
        opt = 'all'

    match opt:
        case 'all':
            gen_initramfs()
            gen_rootdisk()
        case 'initramfs':
            gen_initramfs()
        case 'rootdisk':
            gen_rootdisk()
        case 'clean':
            clean()
        case _:
            raise ValueError(f'unknown workload {opt = }')
