from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


DEFAULT_BREAKPOINT = "mount_block_root"
DEFAULT_GDB_PORT = 26001
DEFAULT_STUB_TIMEOUT_SEC = 60
DEFAULT_GDB_TIMEOUT_SEC = 180
DEFAULT_TERM_GRACE_SEC = 3
DEFAULT_KILL_GRACE_SEC = 1


def parse_bool(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ValueError(f"unsupported boolean value: {value}")


def parse_env_file(path: Path) -> dict[str, str]:
    data: dict[str, str] = {}
    if not path.exists():
        return data

    for lineno, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise ValueError(f"invalid env line {lineno} in {path}: {raw_line}")
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip()

    return data


@dataclass(frozen=True)
class Layout:
    repo_root: Path
    autoscript_root: Path
    task_dir: Path
    runs_dir: Path
    run_id: str
    run_dir: Path
    inputs_dir: Path
    logs_dir: Path
    artifacts_dir: Path
    export_dir: Path
    perf_dir: Path


@dataclass(frozen=True)
class TaskConfig:
    breakpoint: str = DEFAULT_BREAKPOINT
    gdb_port: int = DEFAULT_GDB_PORT
    stub_timeout_sec: int = DEFAULT_STUB_TIMEOUT_SEC
    gdb_timeout_sec: int = DEFAULT_GDB_TIMEOUT_SEC
    term_grace_sec: int = DEFAULT_TERM_GRACE_SEC
    kill_grace_sec: int = DEFAULT_KILL_GRACE_SEC
    run_vplot: bool = True
    vplot_debug: bool = False
    vplot_perf: bool = False
    script_name: str = "script.gdb"
    viewcl_name: str = "viewcl.vcl"
    env_name: str = "task.env"

    @classmethod
    def from_task_dir(cls, task_dir: Path) -> "TaskConfig":
        env_path = task_dir / "task.env"
        raw = parse_env_file(env_path)
        if not raw:
            return cls()

        values = {
            "breakpoint": raw.get("BREAKPOINT", DEFAULT_BREAKPOINT),
            "gdb_port": int(raw.get("GDB_PORT", DEFAULT_GDB_PORT)),
            "stub_timeout_sec": int(raw.get("STUB_TIMEOUT_SEC", DEFAULT_STUB_TIMEOUT_SEC)),
            "gdb_timeout_sec": int(raw.get("GDB_TIMEOUT_SEC", DEFAULT_GDB_TIMEOUT_SEC)),
            "term_grace_sec": int(raw.get("TERM_GRACE_SEC", DEFAULT_TERM_GRACE_SEC)),
            "kill_grace_sec": int(raw.get("KILL_GRACE_SEC", DEFAULT_KILL_GRACE_SEC)),
            "run_vplot": parse_bool(raw.get("RUN_VPLOT", "1")),
            "vplot_debug": parse_bool(raw.get("VPLOT_DEBUG", "0")),
            "vplot_perf": parse_bool(raw.get("VPLOT_PERF", "0")),
            "script_name": raw.get("SCRIPT_NAME", "script.gdb"),
            "viewcl_name": raw.get("VIEWCL_NAME", "viewcl.vcl"),
            "env_name": "task.env",
        }
        return cls(**values)


def create_layout(
    repo_root: Path,
    autoscript_root: Path,
    task_dir: Path,
    runs_dir: Path,
    run_id: str | None = None,
) -> Layout:
    actual_run_id = run_id or datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = runs_dir / actual_run_id
    return Layout(
        repo_root=repo_root,
        autoscript_root=autoscript_root,
        task_dir=task_dir,
        runs_dir=runs_dir,
        run_id=actual_run_id,
        run_dir=run_dir,
        inputs_dir=run_dir / "inputs",
        logs_dir=run_dir / "logs",
        artifacts_dir=run_dir / "artifacts",
        export_dir=run_dir / "artifacts" / "export",
        perf_dir=run_dir / "artifacts" / "perf",
    )
