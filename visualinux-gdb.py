import sys, os
sys.path.insert(0, os.path.dirname(__file__))
# sys.setrecursionlimit(200)

from visualinux import *

# loadin the customized gdb commands.
# see core.py for the start point of VKern parsing and object graph extraction.

from visualinux.cmd import *

try:
    VPlot()
    VCtrl()
    VChat()
except:
    raise fuck_exc(AssertionError, 'internal error on loading v-commands')
