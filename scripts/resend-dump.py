#!/usr/bin/env python3

import os
import sys
import json
import time
from datetime import datetime
import requests
from pathlib import Path
from dotenv import load_dotenv

dir_scripts = Path(__file__).parent.absolute()
dir_project = dir_scripts.parent

load_dotenv(dir_project / '.env')
load_dotenv(dir_project / '.env.local')

VISUALIZER_PORT = int(os.getenv('VISUALINUX_VISUALIZER_PORT', 3000))

def main():

    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <dump_dir>")
        sys.exit(1)
    dump_dir = Path(sys.argv[1])

    if not dump_dir.is_dir():
        print(f"Error: {dump_dir} is not a directory")
        sys.exit(1)

    relpaths = [p for p in dump_dir.iterdir() if p.is_dir()]
    if not relpaths:
        print(f"Error: No subdirectories found in {dump_dir}")
        sys.exit(1)

    for i, relpath in enumerate(relpaths):
        handle_one(f'$foo_{i}', relpath)
        if i > 0:
            send({
                'command': 'DIFF',
                'snKeySrc': f'$foo_{i-1}',
                'snKeyDst': f'$foo_{i}',
            })

    send({
        'command': 'USE',
        'snKey': 'diff-$foo_0-$foo_1',
    })

def handle_one(sn_key: str, relpath: Path):

    if relpath.is_dir():
        files = relpath.glob('**/*.json')
    else:
        files = [relpath]

    state = {}
    for filepath in files:
        try:
            substate = json.load(open(filepath))
            state[filepath.stem] = substate
        except Exception as e:
            print(f"[ERROR] Failed to load the dump file {filepath}")
            print(f"- {e!s}")
            sys.exit(1)

    send({
        'command': 'NEW',
        'snKey': sn_key,
        'snapshot': {
            'key': sn_key,
            'views': state,
            'pc': '0',
            'timestamp': datetime.now().timestamp(),
        }
    })

def send(json_data: dict):
    server_url = f'http://localhost:{VISUALIZER_PORT}'
    url = f'{server_url}/vcmd'
    headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
    try:
        response = requests.post(url, headers=headers, json=json_data)
        print(f'POST to visualizer {response}')
    except Exception as e:
        print(f'[ERROR] Failed to POST data to visualizer; please check the connection.')
        print(f'- {e!s}')
        print(f'- {url = }')

def time_ms() -> int:
    return int(time.time_ns() / 1000000)

if __name__ == '__main__':
    main()
