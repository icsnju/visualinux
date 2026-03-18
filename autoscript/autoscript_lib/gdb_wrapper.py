from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import shutil

from .config import Layout, TaskConfig


BREAKPOINT_MARKER = "::AUTOSCRIPT_BREAKPOINT_HIT::"
SCRIPT_BEGIN_MARKER = "::AUTOSCRIPT_SOURCE_SCRIPT_BEGIN::"
SCRIPT_END_MARKER = "::AUTOSCRIPT_SOURCE_SCRIPT_END::"
VPLOT_BEGIN_MARKER = "::AUTOSCRIPT_VPLOT_BEGIN::"
VPLOT_END_MARKER = "::AUTOSCRIPT_VPLOT_END::"
DONE_MARKER = "::AUTOSCRIPT_DONE::"


@dataclass(frozen=True)
class StagedInputs:
    script_path: Path
    viewcl_path: Path
    task_env_path: Path | None

    def as_dict(self) -> dict[str, str]:
        data = {
            "script.gdb": str(self.script_path),
            "viewcl.vcl": str(self.viewcl_path),
        }
        if self.task_env_path is not None:
            data["task.env"] = str(self.task_env_path)
        return data


def stage_task_inputs(layout: Layout, task_config: TaskConfig) -> StagedInputs:
    layout.inputs_dir.mkdir(parents=True, exist_ok=True)

    source_script = layout.task_dir / task_config.script_name
    source_viewcl = layout.task_dir / task_config.viewcl_name
    source_env = layout.task_dir / task_config.env_name

    if not source_script.is_file():
        raise FileNotFoundError(f"missing required GDB script: {source_script}")
    if not source_viewcl.is_file():
        raise FileNotFoundError(f"missing required ViewCL file: {source_viewcl}")

    staged_script = layout.inputs_dir / "script.gdb"
    staged_viewcl = layout.inputs_dir / "viewcl.vcl"
    staged_env = layout.inputs_dir / "task.env" if source_env.exists() else None

    shutil.copy2(source_script, staged_script)
    shutil.copy2(source_viewcl, staged_viewcl)
    if staged_env is not None:
        shutil.copy2(source_env, staged_env)

    return StagedInputs(script_path=staged_script, viewcl_path=staged_viewcl, task_env_path=staged_env)


def _build_vplot_command(task_config: TaskConfig, staged_inputs: StagedInputs) -> str:
    args = ["vplot", "-f", str(staged_inputs.viewcl_path.resolve())]
    if task_config.vplot_debug:
        args.append("--debug")
    if task_config.vplot_perf:
        args.append("--perf")
    if task_config.run_vplot:
        args.append("--export")
    return " ".join(args)


def write_wrapper_script(layout: Layout, task_config: TaskConfig, staged_inputs: StagedInputs) -> Path:
    wrapper_path = layout.run_dir / "wrapper.gdb"
    lines = [
        "set pagination off",
        "set confirm off",
        "set breakpoint pending on",
        "set target-async off",
        "set non-stop off",
        f"file {layout.repo_root / 'kernel' / 'vmlinux'}",
        f"target remote :{task_config.gdb_port}",
        f"source {layout.repo_root / 'scripts' / 'gdb' / 'config.gdb'}",
        f"tbreak {task_config.breakpoint}",
        "commands",
        "silent",
        f"echo {BREAKPOINT_MARKER}\\n",
        f"echo {SCRIPT_BEGIN_MARKER}\\n",
        f"source {staged_inputs.script_path.resolve()}",
        f"echo {SCRIPT_END_MARKER}\\n",
    ]

    if task_config.run_vplot:
        lines.extend(
            [
                f"echo {VPLOT_BEGIN_MARKER}\\n",
                _build_vplot_command(task_config, staged_inputs),
                f"echo {VPLOT_END_MARKER}\\n",
            ]
        )

    lines.extend(
        [
            f"echo {DONE_MARKER}\\n",
            "quit",
            "end",
            "continue",
        ]
    )

    wrapper_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return wrapper_path


def parse_gdb_markers(log_path: Path) -> dict[str, bool]:
    if not log_path.exists():
        return {}

    data = log_path.read_text(encoding="utf-8", errors="replace")
    return {
        "breakpoint_hit": BREAKPOINT_MARKER in data,
        "script_started": SCRIPT_BEGIN_MARKER in data,
        "script_completed": SCRIPT_END_MARKER in data,
        "vplot_started": VPLOT_BEGIN_MARKER in data,
        "vplot_completed": VPLOT_END_MARKER in data,
        "done": DONE_MARKER in data,
    }
