# manually set the import path for in-gdb usage

import sys, os
sys.path.insert(0, os.path.dirname(__file__))
# sys.setrecursionlimit(1000)

# loadin the customized gdb commands.
# see core.py for the start point of ViewCL parsing and object graph extraction.

from visualinux.common import *
from visualinux.cmd import *

try:
    VPlot()
    VCtrl()
    VChat()
    VDiff()
except:
    raise fuck_exc(AssertionError, 'internal error on loading v-commands')
