# Autoscript

`autoscript/` is a self-contained, headless runner for the existing Visualinux QEMU/GDB workflow.
It does not patch anything outside this directory. Instead, it:

- reads task inputs from `autoscript/tasks/`
- reuses the repo's existing `make gdb-start` and `scripts/gdb/config.gdb`
- writes all run outputs under `autoscript/runs/<run-id>/`
- copies exported artifacts back into `autoscript/`
- always owns timeout and cleanup

## Public entrypoints

- `python3 autoscript/main.py`
- `./autoscript/run.sh`

Both commands print the final `status.json` path on stdout.

## Directory layout

- `main.py`: main Python entrypoint
- `run.sh`: thin shell wrapper
- `autoscript_lib/`: internal Python modules
- `tasks/`: task inputs from the external agent
- `runs/`: immutable run outputs

## Required task inputs

Place these files in `autoscript/tasks/` before running:

- `script.gdb`: agent-generated GDB commands
- `viewcl.vcl`: agent-generated ViewCL file
- `task.env`: optional runtime settings

## task.env keys

Supported keys:

- `BREAKPOINT=mount_block_root`
- `GDB_PORT=26001`
- `STUB_TIMEOUT_SEC=60`
- `GDB_TIMEOUT_SEC=180`
- `TERM_GRACE_SEC=3`
- `KILL_GRACE_SEC=1`
- `RUN_VPLOT=1`
- `VPLOT_DEBUG=0`
- `VPLOT_PERF=0`
- `SCRIPT_NAME=script.gdb`
- `VIEWCL_NAME=viewcl.vcl`

## Example usage

```sh
python3 autoscript/main.py --dry-run
python3 autoscript/main.py
./autoscript/run.sh --gdb-timeout-sec 240
```

## Run output contract

Each run is stored in `autoscript/runs/<run-id>/`:

- `status.json`: machine-readable status
- `summary.txt`: short human-readable summary
- `logs/qemu.log`: QEMU output
- `logs/gdb.log`: batch GDB output
- `logs/harness.log`: orchestration log
- `inputs/`: copied input files used for the run
- `artifacts/export/`: copied Visualinux exports from repo `out/`
- `artifacts/perf/`: copied perf dump from repo `tmp/`

`autoscript/runs/latest` always points to the newest run directory.

## Headless validation contract

This harness is intentionally headless. It is reliable for:

- checking whether the breakpoint is reachable
- checking whether normal GDB commands execute successfully
- checking whether `vplot -f ... --export` produces exported JSON files
- collecting GDB errors from `gdb.log`

This harness does not fully validate:

- browser rendering correctness
- `vctrl` pane layout behavior
- SSE or UI-side errors

If the agent emits `vctrl` commands, the GDB side may still run them, but correctness is limited to command execution logs.

## Agent script constraints

`script.gdb` is sourced by the generated wrapper script.
To keep the harness deterministic, `script.gdb` should avoid:

- `quit`
- `kill`
- `detach`

Long-running `continue` loops can cause the harness to time out, which will be reported in `status.json`.

## Notes about exported artifacts

Visualinux still writes exports to the repo-level `out/` and `tmp/` directories.
The harness copies newly updated artifacts into the run directory after execution so the external agent only needs to inspect `autoscript/runs/latest/`.
