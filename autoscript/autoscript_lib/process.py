from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
import signal
import socket
import subprocess
import time


@dataclass
class ManagedProcess:
    name: str
    command: list[str]
    popen: subprocess.Popen
    log_path: Path
    _log_file: object

    @property
    def pid(self) -> int:
        return self.popen.pid

    def poll(self) -> int | None:
        return self.popen.poll()

    def wait(self, timeout: float | None = None) -> int:
        return self.popen.wait(timeout=timeout)

    def close(self) -> None:
        if self._log_file and not self._log_file.closed:
            self._log_file.close()


@dataclass
class CommandResult:
    exit_code: int | None
    timed_out: bool


def start_logged_process(
    name: str,
    command: list[str],
    cwd: Path,
    log_path: Path,
    env: dict[str, str] | None = None,
) -> ManagedProcess:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_file = log_path.open("w", encoding="utf-8")
    popen = subprocess.Popen(
        command,
        cwd=str(cwd),
        env=env,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        text=True,
        start_new_session=True,
    )
    return ManagedProcess(name=name, command=command, popen=popen, log_path=log_path, _log_file=log_file)


def run_logged_command(
    name: str,
    command: list[str],
    cwd: Path,
    log_path: Path,
    timeout_sec: int,
    env: dict[str, str] | None = None,
) -> CommandResult:
    proc = start_logged_process(name=name, command=command, cwd=cwd, log_path=log_path, env=env)
    try:
        proc.wait(timeout=timeout_sec)
        return CommandResult(exit_code=proc.poll(), timed_out=False)
    except subprocess.TimeoutExpired:
        terminate_process_group(proc)
        return CommandResult(exit_code=proc.poll(), timed_out=True)
    finally:
        proc.close()


def wait_for_tcp_port(
    host: str,
    port: int,
    timeout_sec: int,
    process: ManagedProcess | None = None,
    interval_sec: float = 0.5,
) -> None:
    deadline = time.monotonic() + timeout_sec
    last_error: str | None = None

    while time.monotonic() < deadline:
        if process is not None and process.poll() is not None:
            raise RuntimeError(f"{process.name} exited before port {port} became ready")
        try:
            with socket.create_connection((host, port), timeout=1):
                return
        except OSError as exc:
            last_error = str(exc)
            time.sleep(interval_sec)

    raise TimeoutError(f"timed out waiting for {host}:{port} ({last_error})")


def terminate_process_group(proc: ManagedProcess, term_grace_sec: int = 3, kill_grace_sec: int = 1) -> None:
    if proc.poll() is not None:
        proc.close()
        return

    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        proc.close()
        return

    try:
        proc.wait(timeout=term_grace_sec)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        try:
            proc.wait(timeout=kill_grace_sec)
        except subprocess.TimeoutExpired:
            pass
    finally:
        proc.close()
