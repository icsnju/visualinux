from __future__ import annotations

from pathlib import Path
import time

from .artifacts import collect_artifacts
from .config import Layout, TaskConfig
from .gdb_wrapper import parse_gdb_markers, stage_task_inputs, write_wrapper_script
from .process import (
    ManagedProcess,
    run_logged_command,
    start_logged_process,
    terminate_process_group,
    wait_for_tcp_port,
)
from .status import RunStatus


class HarnessLogger:
    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._fh = path.open("w", encoding="utf-8")

    def log(self, phase: str, message: str) -> None:
        self._fh.write(f"[{phase}] {message}\n")
        self._fh.flush()

    def close(self) -> None:
        if not self._fh.closed:
            self._fh.close()


def _prepare_run_dir(layout: Layout) -> None:
    layout.run_dir.mkdir(parents=True, exist_ok=False)
    layout.inputs_dir.mkdir(parents=True, exist_ok=True)
    layout.logs_dir.mkdir(parents=True, exist_ok=True)
    layout.export_dir.mkdir(parents=True, exist_ok=True)
    layout.perf_dir.mkdir(parents=True, exist_ok=True)


def _update_latest_symlink(layout: Layout) -> None:
    latest_link = layout.runs_dir / "latest"
    if latest_link.exists() or latest_link.is_symlink():
        latest_link.unlink()
    latest_link.symlink_to(layout.run_dir.name)


def run_once(layout: Layout, task_config: TaskConfig, dry_run: bool = False) -> RunStatus:
    _prepare_run_dir(layout)
    _update_latest_symlink(layout)

    qemu_log = layout.logs_dir / "qemu.log"
    gdb_log = layout.logs_dir / "gdb.log"
    harness_log = layout.logs_dir / "harness.log"

    logger = HarnessLogger(harness_log)
    status = RunStatus(
        run_id=layout.run_id,
        run_dir=str(layout.run_dir),
        breakpoint=task_config.breakpoint,
        dry_run=dry_run,
        logs={
            "qemu": str(qemu_log),
            "gdb": str(gdb_log),
            "harness": str(harness_log),
        },
    )
    status.write(layout.run_dir)

    qemu_proc: ManagedProcess | None = None

    try:
        status.set_phase("validate")
        logger.log(status.phase, "staging task inputs")
        staged_inputs = stage_task_inputs(layout, task_config)
        status.copied_inputs = staged_inputs.as_dict()

        wrapper_path = write_wrapper_script(layout, task_config, staged_inputs)
        status.add_note(f"wrapper_script={wrapper_path}")
        status.write(layout.run_dir)

        if dry_run:
            logger.log("dry_run", "skipping QEMU and GDB execution")
            status.set_phase("dry_run")
            status.finish(ok=True)
            status.write(layout.run_dir)
            return status

        execution_started_at = time.time()

        status.set_phase("launch_qemu")
        status.write(layout.run_dir)
        logger.log(status.phase, "starting make gdb-start")
        qemu_proc = start_logged_process(
            name="qemu",
            command=["make", "-C", str(layout.repo_root), f"GDBPORT={task_config.gdb_port}", "gdb-start"],
            cwd=layout.repo_root,
            log_path=qemu_log,
        )
        status.add_note(f"qemu_pid={qemu_proc.pid}")

        status.set_phase("wait_stub")
        status.write(layout.run_dir)
        logger.log(status.phase, f"waiting for GDB stub on port {task_config.gdb_port}")
        wait_for_tcp_port(
            host="127.0.0.1",
            port=task_config.gdb_port,
            timeout_sec=task_config.stub_timeout_sec,
            process=qemu_proc,
        )

        status.set_phase("run_gdb")
        status.write(layout.run_dir)
        logger.log(status.phase, "running batch GDB")
        gdb_result = run_logged_command(
            name="gdb",
            command=["gdb", "-batch", "-x", str(wrapper_path)],
            cwd=layout.repo_root,
            log_path=gdb_log,
            timeout_sec=task_config.gdb_timeout_sec,
        )
        status.gdb_exit_code = gdb_result.exit_code
        status.timed_out = gdb_result.timed_out

        markers = parse_gdb_markers(gdb_log)
        status.breakpoint_hit = markers.get("breakpoint_hit", False)
        if not markers.get("script_completed", False):
            status.add_note("agent script did not reach the end marker")
        if task_config.run_vplot and not markers.get("vplot_completed", False):
            status.add_note("vplot did not reach the end marker")
        if not markers.get("done", False):
            status.add_note("wrapper did not reach the final done marker")

        status.set_phase("collect")
        status.write(layout.run_dir)
        logger.log(status.phase, "collecting exported artifacts")
        artifacts = collect_artifacts(
            repo_root=layout.repo_root,
            export_dir=layout.export_dir,
            perf_dir=layout.perf_dir,
            started_at_epoch=execution_started_at,
        )
        status.exports = artifacts.exports
        status.perf_artifacts = artifacts.perf_artifacts
        status.export_count = len(artifacts.exports)

        ok = (
            not status.timed_out
            and status.gdb_exit_code == 0
            and status.breakpoint_hit
            and (not task_config.run_vplot or status.export_count > 0)
        )
        status.set_phase("done")
        status.finish(ok=ok)
        return status

    except Exception as exc:  # noqa: BLE001
        logger.log(status.phase, f"failure: {exc}")
        status.fail(status.phase, str(exc))
        status.finish(ok=False)
        return status

    finally:
        if qemu_proc is not None:
            logger.log("cleanup", "terminating QEMU process group")
            terminate_process_group(
                qemu_proc,
                term_grace_sec=task_config.term_grace_sec,
                kill_grace_sec=task_config.kill_grace_sec,
            )
            status.qemu_exit_code = qemu_proc.poll()
        status.write(layout.run_dir)
        logger.close()
