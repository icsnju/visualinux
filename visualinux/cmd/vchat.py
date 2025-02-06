from visualinux import *
from visualinux.cmd.vplot import VPlotHandler
from visualinux.cmd.vctrl import VCtrlHandler
from visualinux.cmd.askllm import askllm
import gdb

VCHAT_PROMPT = (PROMPT_DIR / 'vchat.md').read_text()

# TODO: vchat prompt that dispatch the request to either vplot or vctrl

class VChat(gdb.Command):

    def __init__(self):
        super(VChat, self).__init__("vchat", gdb.COMMAND_USER)

    def invoke(self, arg: str, from_tty: bool) -> None:
        if arg == '-h' or arg == '--help':
            print('usage: vchat <message>')
            print('    the message will be classified as one of two basic commands: vplot or vctrl, and passed to the chat API of that command.')
            print('    vplot utilizes ViewCL to extract object graphs from the runtime data.')
            print('    vctrl utilizes ViewQL and pane commands to manipulates the views displayed in visualizer.')
            print('examples:')
            print('    vchat plot p with fields pid, comm, se.vruntime')
            print('    vchat plot p with scheduling-related fields')
            print('    vchat in pane #4, find me all vm_area_struct whose address is not 0xffffffffff871a20, and shrink them')
            print('    vchat horizontally split pane #1')
            return
        print(f'+ vchat {arg = }')
        VCtrlHandler.invoke_chat(arg)
        # vcmd = askllm(VCHAT_PROMPT, arg)
        # print(f'  + llm judged: {vcmd}')
        # if vcmd == 'vplot':
        #     VPlotHandler.invoke_chat(arg)
        # elif vcmd == 'vctrl':
        #     VCtrlHandler.invoke_chat(arg)
        # else:
        #     print(f'[VCHAT ERROR] LLM returns neither vplot nor vctrl. You have to fine-tune the prompt to match the rule.')
