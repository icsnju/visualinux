from visualinux import *
from visualinux.snapshot.state import StateView
from visualinux.runtime.utils import get_current_pc
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Plot:
    state: StateView
    attrs: dict[str, Any]

class Snapshot:

    def __init__(self) -> None:
        self.key = '<undefined>'
        self.views: list[StateView] = []
        self.pc = get_current_pc()
        self.timestamp = datetime.now().timestamp()

    def add_view(self, view: StateView):
        self.views.append(view)

    def to_json(self) -> dict:
        return {
            'key': self.key,
            'views': dict((view.name, view.to_json()) for view in self.views),
            'pc': str(self.pc),
            # 'timestamp': datetime.fromtimestamp(self.timestamp).strftime('%m.%d-%H:%M:%S'),
            'timestamp': self.timestamp,
        }

class SnapshotManager:

    next_anon_key: int = 0
    @classmethod
    def alloc_anon_key(cls) -> str:
        cls.next_anon_key += 1
        return f'_anon_{cls.next_anon_key}'

    def __init__(self):
        self.data: dict[str, Snapshot] = {}

    def set(self, sn_key: str, snapshot: Snapshot):
        self.data[sn_key] = snapshot
        timestr = datetime.fromtimestamp(snapshot.timestamp).strftime('%m.%d-%H:%M:%S')
        print(f'new visualinux snapshot {sn_key!s}: {snapshot.pc!s} ({timestr})')

    def get(self, sn_key: str) -> Snapshot | None:
        return self.data.get(sn_key)
