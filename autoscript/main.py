#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import replace
from pathlib import Path
import sys

from autoscript_lib.config import TaskConfig, create_layout
from autoscript_lib.supervisor import run_once


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Headless autoscript runner for Visualinux.")
    autoscript_root = Path(__file__).resolve().parent
    repo_root = autoscript_root.parent

    parser.add_argument("--repo-root", default=str(repo_root), help="Repository root path.")
    parser.add_argument("--task-dir", default=str(autoscript_root / "tasks"), help="Task input directory.")
    parser.add_argument("--runs-dir", default=str(autoscript_root / "runs"), help="Run output directory.")
    parser.add_argument("--run-id", default=None, help="Optional explicit run id.")
    parser.add_argument("--dry-run", action="store_true", help="Only validate inputs and generate wrapper.gdb.")
    parser.add_argument("--breakpoint", default=None, help="Override BREAKPOINT from task.env.")
    parser.add_argument("--gdb-port", type=int, default=None, help="Override GDB port.")
    parser.add_argument("--stub-timeout-sec", type=int, default=None, help="Override stub wait timeout.")
    parser.add_argument("--gdb-timeout-sec", type=int, default=None, help="Override batch GDB timeout.")
    parser.add_argument("--no-vplot", action="store_true", help="Skip the post-script vplot step.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    repo_root = Path(args.repo_root).resolve()
    autoscript_root = Path(__file__).resolve().parent
    task_dir = Path(args.task_dir).resolve()
    runs_dir = Path(args.runs_dir).resolve()

    task_config = TaskConfig.from_task_dir(task_dir)
    if args.breakpoint is not None:
        task_config = replace(task_config, breakpoint=args.breakpoint)
    if args.gdb_port is not None:
        task_config = replace(task_config, gdb_port=args.gdb_port)
    if args.stub_timeout_sec is not None:
        task_config = replace(task_config, stub_timeout_sec=args.stub_timeout_sec)
    if args.gdb_timeout_sec is not None:
        task_config = replace(task_config, gdb_timeout_sec=args.gdb_timeout_sec)
    if args.no_vplot:
        task_config = replace(task_config, run_vplot=False)

    layout = create_layout(
        repo_root=repo_root,
        autoscript_root=autoscript_root,
        task_dir=task_dir,
        runs_dir=runs_dir,
        run_id=args.run_id,
    )

    status = run_once(layout=layout, task_config=task_config, dry_run=args.dry_run)
    print(layout.run_dir / "status.json")
    return 0 if status.ok else 1


if __name__ == "__main__":
    sys.exit(main())
