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

def main():

    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <dump_file>")
        sys.exit(1)
    relpath = Path(sys.argv[1])

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
        'snKey': '$foo',
        'snapshot': {
            'key': '$foo',
            'views': state,
            'pc': '0',
            'timestamp': datetime.now().timestamp(),
        }
    })
    send({
        'command': 'NEW',
        'snKey': '$bar',
        'snapshot': {
            'key': '$bar',
            'views': state,
            'pc': '11',
            'timestamp': datetime.now().timestamp(),
        }
    })

def time_ms() -> int:
    return int(time.time_ns() / 1000000)

if __name__ == '__main__':
    main()
