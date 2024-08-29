from visualinux import *
from visualinux.vkern import Parser
from visualinux.model import View
from visualinux.runtime import State
from visualinux.model.symtable import *
from visualinux.runtime.gdb.adaptor import gdb_adaptor

import json
import shutil
import requests

import cProfile, pstats, io
from pstats import SortKey

VKERN_GRAMMAR_PATH = VL_DIR / 'visualinux' / 'grammar' / 'vkern.lark'

class Core:
    '''Note that there should be only one Engine instance existing.
    '''
    def __init__(self) -> None:

        self.parser = Parser(VKERN_GRAMMAR_PATH)
        self.history: list[State] = []

    def parse_file(self, src_file: Path):
        return self.parse(src_file.read_text())

    def parse(self, code: str):
        model = self.parser.parse(code)
        return model

    def sync_file(self, src_file: Path):
        return self.sync(src_file.read_text())

    def sync(self, code: str):
        ''' The start point of VKern parsing and object graph extraction.
        '''
        if vl_debug_on(): printd(f'vl_sync()')
        gdb_adaptor.reset()
        KValue.reset()
        SymTable.reset()
        pr = cProfile.Profile()
        pr.disable()
        if vl_perf_on():
            pr.enable()
        try:
            model = self.parse(code)
            state = model.sync()
        except Exception as e:
            print(f'vl_sync() unhandled exception: ' + str(e))
            state = State()
        self.history.append(state)
        if vl_debug_on(): printd(f'vl_sync(): view sync OK')
        if vl_perf_on():
            pr.disable()
            s = io.StringIO()
            sortby = SortKey.CUMULATIVE
            ps = pstats.Stats(pr, stream=s).sort_stats(sortby)
            ps.print_stats()
            ps.dump_stats(VL_DIR / 'tmp' / 'visualinux-sync.perf')
            # print(s.getvalue())

        self.send({
            'command': 'NEWSTATE',
            'data': state.to_json()
        })

        if vl_debug_on():
            TMP_DIR.mkdir(exist_ok=True)
            EXPORT_DEBUG_DIR.mkdir(exist_ok=True)
            for name, substate in state.substates.items():
                print(f'--export {name}.json')
                print(f'    {substate.init_vql=}')
                self.export_for_debug(substate.to_json(), EXPORT_DEBUG_DIR / f'{name}.json')
            self.reload_and_reexport_debug()

        return state

    def send(self, json_data: dict):
        server_url = f'http://localhost:{VISUALIZER_PORT}'
        url = f'{server_url}/vcmd'
        headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
        try:
            response = requests.post(url, headers=headers, json=json_data)
            print(f'POST data {response = }')
        except Exception as e:
            print(f'[ERROR] Failed to POST data to visualizer; please check the connection.')
            print(f'- {e!s}')
            print(f'- {url = }')

    def export_for_debug(self, json_data: dict, path: Path):
        with open(path, 'w') as f:
            json.dump(json_data, f, indent=4)

    def import_for_debug(self, path: Path) -> dict:
        with open(path, 'r') as f:
            return json.load(f)

    def reload_and_reexport_debug(self):
        DUMP_DIR = VL_DIR / 'visualizer' / 'public' / 'statedump'
        DUMP_DIR.mkdir(exist_ok=True)
        print(f'vl_sync(): data export')
        full_json_data = {}
        for path in EXPORT_DEBUG_DIR.glob('**/*.json'):
            full_json_data[path.stem] = self.import_for_debug(path)
        if (DUMP_DIR / 'latest.json').is_file():
            shutil.copy(DUMP_DIR / 'latest.json', DUMP_DIR / 'old.json')
        self.export_for_debug(full_json_data, DUMP_DIR / 'latest.json')
        print(f'vl_sync(): data export OK')

    def curr_state(self) -> State:
        assert self.history
        return self.history[-1]

    # def send(self, json_data: dict):
    #     url = f'{self.server_url}/vcmd'
    #     headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
    #     print(f'POST send data to {url!s}')
    #     response = requests.post(url, headers=headers, json=json_data)
    #     print(f'POST send data {response = }')

core = Core()
