#!/usr/bin/env python3

import sys, os
from pathlib import Path

DIR_VL = Path(__file__).parent
sys.path.insert(0, str(DIR_VL))
os.chdir(DIR_VL)

from visualinux.common import *
from visualinux.dsl.parser.utils import *
from visualinux.dsl.parser.viewql_converter import ViewQLConverter

from pathlib import Path
DIR_GRAMMAR = DIR_VL / 'visualinux' / 'grammar'

VIEWQL_TEST = '''
vaa = SELECT task_struct->se.load FROM a ^ b AS se WHERE (pid >= 2 OR pid == foo) AND (pid <= 4 OR pid == 5)
UPDATE g | (a | b ^ c \\ d) | e ^ f WITH view: foo
'''

if __name__ == '__main__':
    ViewQLConverter.convert(Lark((DIR_GRAMMAR / 'viewql.lark').read_text(), start='viewql').parse(VIEWQL_TEST))
