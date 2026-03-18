from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import json
from pathlib import Path


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class RunStatus:
    run_id: str
    run_dir: str
    phase: str = "init"
    ok: bool = False
    error: str | None = None
    breakpoint: str = ""
    breakpoint_hit: bool = False
    timed_out: bool = False
    dry_run: bool = False
    gdb_exit_code: int | None = None
    qemu_exit_code: int | None = None
    export_count: int = 0
    exports: list[str] = field(default_factory=list)
    perf_artifacts: list[str] = field(default_factory=list)
    copied_inputs: dict[str, str] = field(default_factory=dict)
    logs: dict[str, str] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)
    started_at: str = field(default_factory=utc_now)
    finished_at: str | None = None

    def set_phase(self, phase: str) -> None:
        self.phase = phase

    def add_note(self, note: str) -> None:
        if note not in self.notes:
            self.notes.append(note)

    def fail(self, phase: str, message: str) -> None:
        self.phase = phase
        self.ok = False
        self.error = message

    def finish(self, ok: bool) -> None:
        self.ok = ok
        self.finished_at = utc_now()

    def to_dict(self) -> dict:
        return asdict(self)

    def write(self, run_dir: Path) -> None:
        status_path = run_dir / "status.json"
        summary_path = run_dir / "summary.txt"

        with status_path.open("w", encoding="utf-8") as fh:
            json.dump(self.to_dict(), fh, indent=2, sort_keys=True)
            fh.write("\n")

        summary_path.write_text(self.summary_text(), encoding="utf-8")

    def summary_text(self) -> str:
        lines = [
            f"run_id: {self.run_id}",
            f"ok: {self.ok}",
            f"phase: {self.phase}",
            f"breakpoint: {self.breakpoint}",
            f"breakpoint_hit: {self.breakpoint_hit}",
            f"timed_out: {self.timed_out}",
            f"dry_run: {self.dry_run}",
            f"gdb_exit_code: {self.gdb_exit_code}",
            f"qemu_exit_code: {self.qemu_exit_code}",
            f"export_count: {self.export_count}",
            f"run_dir: {self.run_dir}",
            f"started_at: {self.started_at}",
            f"finished_at: {self.finished_at}",
        ]

        if self.error:
            lines.append(f"error: {self.error}")
        if self.notes:
            lines.append("notes:")
            lines.extend(f"- {note}" for note in self.notes)
        if self.exports:
            lines.append("exports:")
            lines.extend(f"- {item}" for item in self.exports)
        if self.perf_artifacts:
            lines.append("perf_artifacts:")
            lines.extend(f"- {item}" for item in self.perf_artifacts)

        return "\n".join(lines) + "\n"
