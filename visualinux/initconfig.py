# initconfig.py is loaded in __init__.py
# other files should use `from visualinux import *` to use these configurable variables

import os
from pathlib import Path
from dotenv import load_dotenv

VL_DIR = Path(__file__).absolute().parents[1]

load_dotenv(VL_DIR / '.env')
load_dotenv(VL_DIR / '.env.local')

VIEWCL_SRC_DIR     = VL_DIR / os.getenv('VISUALINUX_VIEWCL_SRC_DIR', 'viewcl')
PROMPT_DIR         = VL_DIR / os.getenv('VISUALINUX_PROMPT_DIR', 'scripts/prompts')
GDB_FLAGCONFIG_DIR = VL_DIR / os.getenv('VISUALINUX_GDB_FLAGCONFIG_DIR', 'scripts/gdb/macros/flags')

TMP_DIR    = VL_DIR / os.getenv('VISUALINUX_TMP_DIR', 'tmp')
EXPORT_DIR = VL_DIR / os.getenv('VISUALINUX_EXPORT_DIR', 'tmp/export')

VISUALIZER_PORT = int(os.getenv('VISUALINUX_VISUALIZER_PORT', 3000))
