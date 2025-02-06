from visualinux import *
from visualinux.core import core
from visualinux.cmd.askllm import askllm

import gdb
import argparse
import re

VCTRL_PROMPT = lambda: (PROMPT_DIR / 'vctrl.md').read_text()
VIEWQL_PROMPT = lambda: (PROMPT_DIR / 'viewql.md').read_text()

class VCtrl(gdb.Command):

    def __init__(self):
        super(VCtrl, self).__init__("vctrl", gdb.COMMAND_USER)

    def invoke(self, arg: str, from_tty: bool) -> None:
        VCtrlHandler.invoke(arg)

class VCtrlHandler:

    @classmethod
    def invoke(cls, arg: str):
        parser = argparse.ArgumentParser(description="vctrl command line interface. use `vctrl <command> -h` to check usage of each command.")
        subparsers = parser.add_subparsers(dest='command')

        split_parser = subparsers.add_parser('split', help='Split command', description="Split command")
        split_parser.add_argument('id', type=int, help='ID must be a number')
        split_parser.add_argument('-d', '--direction', type=str, 
                                    choices=['v', 'h', 'vertical', 'horizontal'], help='Split direction')
        split_parser.set_defaults(handle=cls.__invoke_split)

        pick_parser = subparsers.add_parser('pick', help='pick command')
        pick_parser.add_argument('id', type=int, help='ID must be a number')
        pick_parser.add_argument('symbol_or_key', type=str, help='Symbol/Key is a string')
        pick_parser.set_defaults(handle=cls.__invoke_pick)

        # TODO: __invoke_switch

        focus_parser = subparsers.add_parser('focus', help='Focus command')
        focus_parser.add_argument('symbol', type=str, help='Symbol is a string')
        focus_parser.set_defaults(handle=cls.__invoke_focus)

        remove_parser = subparsers.add_parser('remove', help='Remove command')
        remove_parser.add_argument('id', type=int, help='ID must be a number')
        remove_parser.set_defaults(handle=cls.__invoke_remove)

        apply_parser = subparsers.add_parser('apply', help='Apply command')
        apply_parser.add_argument('id', type=int, help='ID must be a number')
        apply_parser.add_argument('viewql', type=str, nargs='+', help='ViewQL is a string')
        apply_parser.set_defaults(handle=cls.__invoke_apply)

        chat_parser = subparsers.add_parser('chat', help='Chat interface')
        chat_parser.add_argument('message', type=str, nargs='+', help='Message sent to LLM')
        chat_parser.set_defaults(handle=cls.__invoke_chat)

        args = parser.parse_args(re.split(r'\s+', arg))

        if hasattr(args, 'handle'):
            args.handle(args)
        else:
            parser.print_help()

    @classmethod
    def invoke_chat(cls, message: str):
        print(f'+ vctrl chat {message = }')
        cmd = askllm(VCTRL_PROMPT(), message)
        print(f'  + llm generated cmd: {cmd}')
        if cmd.startswith('apply'):
            _, id, apply_message = cmd.split(' ', maxsplit=2)
            code = askllm(VIEWQL_PROMPT(), apply_message)
            code = code.strip('`\n').rstrip('`\n')
            print(f'  > ViewQL code:\n{code}')
            data = {
                'command': 'APPLY',
                'wKey': id,
                'vqlCode': code
            }
            core.send(data)
        else:
            VCtrlHandler.invoke(cmd)

    @classmethod
    def __invoke_split(cls, args):
        print(f'+ vctrl split id={args.id} dir={args.direction}')
        if not args.direction:
            args.direction = 'h'
        direction = 2 if args.direction[0] == 'h' else 1
        data = {
            'command': 'SPLIT',
            'wKey': args.id,
            'direction': direction
        }
        core.send(data)

    @classmethod
    def __invoke_pick(cls, args):
        print(f'+ vctrl pick id={args.id} symbol_or_key={args.symbol_or_key}')
        # if args.symbol_or_key is symbol:
        #     pass
        # pass
        data = {
            'command': 'PICK',
            'wKey': args.id,
            'objectKey': args.symbol_or_key
        }
        core.send(data)

    @classmethod
    def __invoke_focus(cls, args):
        print(f'+ vctrl focus symbol={args.symbol}')
        # if args.symbol_or_key is symbol:
        #     pass
        # pass
        data = {
            'command': 'FOCUS',
            'objectKey': args.symbol
        }
        core.send(data)

    @classmethod
    def __invoke_remove(cls, args):
        print(f'+ vctrl remove id={args.id}')
        data = {
            'command': 'REMOVE',
            'id': args.id
        }
        core.send(data)

    @classmethod
    def __invoke_apply(cls, args):
        print(f'+ vctrl apply id={args.id} vql={args.vql}')
        data = {
            'command': 'APPLY',
            'id': args.id,
            'vql': args.vql
        }
        core.send(data)

    @classmethod
    def __invoke_chat(cls, args):
        return cls.invoke_chat(' '.join(args.message))

'''
from dialog import Dialog

def __invoke_noarg_dialog_deprecated():

    print(f'+ vctrl')
    d = Dialog(dialog="dialog")
    text = """Sample 'menu' dialog box with help_button=True and \
item_help=True."""
    # # list of (tag, item, help_text)
    # insts: list[tuple[str, str, str]] = [
    #     ("Tag 1", "Item 1", "Help text for item 1"),
    # ]
    choices=[
        ("Tag 1", "Item 1", "Help text for item 1"),
        ("Tag 2", "Item 2", "Help text for item 2"),
        ("Tag 3", "Item 3", "Help text for item 3"),
        ("Tag 4", "Item 4", "Help text for item 4"),
        ("Tag 5", "Item 5", "Help text for item 5"),
        ("Tag 6", "Item 6", "Help text for item 6"),
        ("Tag 7", "Item 7", "Help text for item 7"),
        ("Tag 8", "Item 8", "Help text for item 8")
    ]
    code, tag = d.menu(
        text, height=16, width=60, choices=choices,
        title="A menu with help facilities",
        help_button=True, item_help=True, help_tags=True
    )
    print(f' => {code = }, {tag = }')
'''
