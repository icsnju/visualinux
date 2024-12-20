# import all necessary modules for the WHOLE visualinux package
# other files can use `from visualinux import *` to reduce code redundancy

import sys, os
from pathlib import Path

from abc import ABCMeta, abstractmethod
from dataclasses import dataclass
from enum import Enum, auto
from collections import OrderedDict

from typing import Any
from typing import Iterable, Iterator, Generator, Callable
from typing_extensions import Type
from typing import TYPE_CHECKING

# from visualinux.debug import gdb
import gdb

# load configurable variables (from .env and .env.local)

from visualinux.initconfig import *

# exception re-throw utils
# by default python gdb in vscode throw exceptions silently, which is really annoying

def fuck_exc(ExcType: Type[Exception], msg, *args) -> Exception:
    print(f'[{ExcType.__name__}] {msg}')
    fuck_print_frames()
    return ExcType(msg, *args)

def fuck_print_frames() -> None:
    i = 0
    while i := i + 1:
        try:
            frame = sys._getframe(i + 1)
        except ValueError:
            break
        abspath = Path(frame.f_code.co_filename).absolute()
        try:
            relpath = abspath.relative_to(Path(__file__).parents[1])
        except:
            relpath = abspath
        lineno  = frame.f_lineno
        code    = frame.f_code.co_name
        print(f'    #{i}. File {relpath}, line {lineno}, in {code}')

# debug print utils

__vl_debug_flag: bool = False
def vl_debug_on() -> bool:
    return __vl_debug_flag
def set_vl_debug(flag: bool):
    global __vl_debug_flag
    __vl_debug_flag = flag
def printd(*args):
    if vl_debug_on(): print(*args)

__vl_perf_flag: bool = False
def vl_perf_on() -> bool:
    return __vl_perf_flag
def set_vl_perf(flag: bool):
    global __vl_perf_flag
    __vl_perf_flag = flag

# debug performance measurement utils

import time

def show_time_usage(name: str, fn: Callable):
    name = name.replace(' ', '_')
    time0 = time.time_ns()
    ret = fn()
    time1 = time.time_ns()
    time_usage = int((time1 - time0) / 10**6)
    print(f'{name} time_usage {time_usage} ms')
    return ret
