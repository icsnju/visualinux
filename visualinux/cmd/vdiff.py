from visualinux import *
from visualinux.core import core
from visualinux.snapshot import *

import argparse
import re

class VDiff(gdb.Command):

    def __init__(self):
        super(VDiff, self).__init__("vdiff", gdb.COMMAND_USER)

    def invoke(self, arg: str, from_tty: bool) -> None:
        VDiffHandler.invoke(arg)

class VDiffHandler:

    @classmethod
    def invoke(cls, arg: str):
        parser = argparse.ArgumentParser(description="vdiff command line interface (example: vdiff $src $dst).")
        parser.add_argument('snapshot_src', type=str, help='the key of the src snapshot')
        parser.add_argument('snapshot_dst', type=str, help='the key of the dst snapshot')

        args = parser.parse_args(re.split(r'\s+', arg))
        return cls.handle(args.snapshot_src, args.snapshot_dst)

    @classmethod
    def handle(cls, sn_key_1: str, sn_key_2: str):
        print(f'+ vdiff {sn_key_1} {sn_key_2}')
        snapshot_1 = core.sn_manager.get(sn_key_1)
        snapshot_2 = core.sn_manager.get(sn_key_2)
        if snapshot_1 is None:
            print(f'  > vdiff error: snapshot src not found: {sn_key_1}')
            return
        if snapshot_2 is None:
            print(f'  > vdiff error: snapshot dst not found: {sn_key_2}')
            return
        if snapshot_1.timestamp < snapshot_2.timestamp:
            core.send_diff(sn_key_1, sn_key_2)
        else:
            core.send_diff(sn_key_2, sn_key_1)

