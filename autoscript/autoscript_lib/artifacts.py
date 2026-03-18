from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import shutil


@dataclass(frozen=True)
class ArtifactCollection:
    exports: list[str]
    perf_artifacts: list[str]


def _path_has_updates(path: Path, started_at_epoch: float) -> bool:
    if not path.exists():
        return False
    if path.is_file():
        return path.stat().st_mtime >= started_at_epoch
    for child in path.rglob("*"):
        if child.exists() and child.stat().st_mtime >= started_at_epoch:
            return True
    return False


def collect_artifacts(repo_root: Path, export_dir: Path, perf_dir: Path, started_at_epoch: float) -> ArtifactCollection:
    repo_out_dir = repo_root / "out"
    repo_tmp_dir = repo_root / "tmp"

    copied_exports: list[str] = []
    copied_perf: list[str] = []

    export_dir.mkdir(parents=True, exist_ok=True)
    perf_dir.mkdir(parents=True, exist_ok=True)

    if repo_out_dir.exists():
        for candidate in sorted(repo_out_dir.iterdir()):
            if not _path_has_updates(candidate, started_at_epoch):
                continue
            destination = export_dir / candidate.name
            if candidate.is_dir():
                shutil.copytree(candidate, destination, dirs_exist_ok=True)
            else:
                shutil.copy2(candidate, destination)
            copied_exports.append(str(destination))

    perf_file = repo_tmp_dir / "visualinux-sync.perf"
    if _path_has_updates(perf_file, started_at_epoch):
        destination = perf_dir / perf_file.name
        shutil.copy2(perf_file, destination)
        copied_perf.append(str(destination))

    return ArtifactCollection(exports=copied_exports, perf_artifacts=copied_perf)
