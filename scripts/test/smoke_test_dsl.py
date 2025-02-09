#!/usr/bin/env python3
# this script must be used in DIR_VL because of Lark's import error
import sys
from pathlib import Path
from lark import Lark
from pprint import pprint

DIR_VL = Path(__file__).parents[2]
sys.path.insert(0, str(DIR_VL))

from visualinux.dsl.parser.parser import Parser

DIR_GRAMMAR = DIR_VL / 'visualinux' / 'lang'
DIR_PROGRAM = DIR_VL / 'viewcl'

def smoke_test_cexpr(grammar: Path, program: Path, silent: bool = False):
    parser = Lark(grammar.read_text())
    parsetree = parser.parse(program.read_text())
    if not silent:
        print(parsetree.pretty())

def smoke_test(grammar: Path, program: Path, silent: bool = False):
    parser = Parser(grammar)
    view = parser.parse(program.read_text())
    print(str(view))
    # json_data = view.sync()
    # pprint(json_data)

from visualinux.runtime.utils import *

def smoke_test_peval():
    tstart = time.time()
    for i in range(1000):
        eval(f'task_test({i})')
    tend = time.time()
    print(f'smoke_test_peval {int((tend - tstart) * 1000)} ms')

if __name__ == '__main__':
    print('start smoke test for ViewCL/ViewQL grammar')

    # smoke_test_cexpr(
    #     grammar = DIR_GRAMMAR / 'cexpr.lark',
    #     program = DIR_PROGRAM / 'test' / 'cexpr.txt',
    #     silent = True
    # )

    smoke_test(
        grammar = DIR_GRAMMAR / 'grammar.lark',
        program = DIR_PROGRAM / 'evaluation' / 'textbook' / '06_scheduling.vcl'
    )
