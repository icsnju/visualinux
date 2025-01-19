from visualinux import *
from visualinux.snapshot.snapshot import Snapshot, StateView
from dataclasses import dataclass

@dataclass
class Plot:
    state: StateView
    attrs: dict[str, Any]

class SnapshotManager:

    def __init__(self):
        self.data: dict[str, Snapshot] = {}

    def set(self, key: str, snapshot: Snapshot):
        self.data[key] = snapshot

    def get(self, key: str) -> Snapshot:
        return self.data[key]
