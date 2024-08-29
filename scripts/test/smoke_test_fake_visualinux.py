#!/usr/bin/env python3

from pathlib import Path
import json
import requests

VL_DIR = Path(__file__).parents[1]
DATA_PATH = VL_DIR / 'tmp' / 'test.json'

if __name__ == '__main__':
    url = "http://localhost:9998/newstate"
    headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
    # data = {'sender': 'Alice', 'receiver': 'Bob', 'message': 'We did it!'}
    with open(DATA_PATH, 'r') as f:
        data = json.load(f)
    response = requests.post(url, headers=headers, json=data)
    print(f'{response = }')
