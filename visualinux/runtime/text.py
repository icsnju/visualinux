from visualinux import *

import re

# Flag

class FlagConfig:

    def __init__(self, name: str) -> None:
        self.name = name
        self.typo: str | None = None
        self.values: dict[int, str] = {}

    def __contains__(self, key: int): return self.values.__contains__(key)
    def __getitem__(self, key: int): return self.values.__getitem__(key)
    def __setitem__(self, key: int, value: str): self.values.__setitem__(key, value)

    def eval(self, flag: int) -> str:
        matched: list[str] = []
        for value, name in self.values.items():
            if vl_debug_on(): printd(f'[FLAG:{self.name}] {flag = :b}, {value = :b}, {name = } => {(flag & value) = :b}')
            checked: bool
            if self.typo == 'ENUM':
                checked = (flag == value)
            else:
                checked = ((flag & value) != 0)
            if checked:
                matched.append(name)
        if not matched:
            if flag == 0:
                return self.values[0]
            return f'???({flag:#x})'
        return '\n'.join(matched)

class FlagHandler:

    cache: dict[str, FlagConfig] = {}

    @classmethod
    def load(cls, filename: str) -> FlagConfig:

        if vl_debug_on(): printd(f'[FLAG] load {filename = }')
        path = GDB_FLAGCONFIG_DIR / f'{filename}.gdb'
        if not path.is_file():
            raise fuck_exc(FileNotFoundError, path)

        flag_config = FlagConfig(filename)
        with open(path, 'r') as f:
            for line in f:
                if vl_debug_on(): printd(f'[FLAG] {line = }')
                if match := re.search(r'macro\s+define\s+(\w+)\s+((?:0x[0-9a-fA-F]+)|(?:[0-9]+))', line):
                    name, value = match.group(1), match.group(2)
                    base = 16 if value.startswith('0x') else 10
                    value = int(value, base=base)
                    if vl_debug_on(): printd(f'[FLAG] matched: {name = }, {value = }')
                    if value in flag_config:
                        raise fuck_exc(AssertionError, f'duplicated {value = } ({name}) in flag_config {filename = } (existed: {flag_config[value]})')
                    flag_config[value] = name
                elif match := re.search(r'#EVAL_AS\s+(\w+)', line):
                    flag_config.typo = match.group(1)
                    if vl_debug_on(): printd(f'[FLAG] {flag_config.typo = }')

        flag_config.values.setdefault(0, 'NONE')
        return flag_config

    @classmethod
    def handle(cls, name: str, value: int) -> str:
        if not name:
            return f'b{value:b}'
        if name not in cls.cache:
            cls.cache[name] = cls.load(name)
        return cls.cache[name].eval(value)

# EMOJI

class EMOJIHandler:

    @classmethod
    def handle(cls, name: str, value: int) -> str:
        match name:
            case 'lock':
                return cls.handleLock(value)
            case _:
                return '&#9940;'

    @classmethod
    def handleLock(cls, value: int) -> str:
        match value:
            case 0:  # '&#9898;'
                return '&#11093;'
            case 1:
                return '&#128274;'
            case _:
                return '&#9940;'
