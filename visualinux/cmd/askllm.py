from visualinux import *

from openai import OpenAI

OPENAI_API_KEY   = os.getenv('OPENAI_API_KEY')
OPENAI_API_URL   = os.getenv('OPENAI_API_URL')
OPENAI_API_MODEL = os.getenv('OPENAI_API_MODEL')

__ERRMSG = '[WARNING] LLM client initialization failed. Please check visualinux/cmd/askllm.py for details.'

try:
    client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_API_URL)
except:
    print(__ERRMSG)
    client = None

def askllm(prompt: str, query: str) -> str:
    if not client:
        print(__ERRMSG)
        return f'[ASKLLM ERROR] LLM client initialization failed.'
    comp = client.chat.completions.create(
        model=OPENAI_API_MODEL,
        temperature=0,
        messages=[
            {'role': 'system', 'content': prompt},
            {'role': 'user', 'content': query},
        ]
    )
    return str(comp.choices[0].message.content)
