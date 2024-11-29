# Source Code Organization

We start from the root directory and explain each part of the repository step by step.

`visualinux-gdb.py` is the entry file of the gdb extension. Other source code is stored in `visualinux/`, which is treated as a python package.

`visualizer/` stores the visualizer, which is a full-stack node.js application.

`viewcl/` stores the ViewCL source code. By default, it is defined as the root directory of v-command invokation, e.g. `vplot -f evaluation.vcl` actually picks the file `viewcl/evaluation.vcl`.

`scripts/` includes scripts for various usages:

- `build/`, `dev/` and `initenv*.sh` are used for project default initialization. `test/` stores some miscellaneous testing scripts.

- `gdb/` stores useful gdb scripts that can aid in kernel debugging. By default, `gdb/config.gdb` is the entry script that will be automatically loaded at the beginning of a debugging session. `gdb/macros.gdb` re-defines useful kernel macros for Visualinux to ease visualized debugging.

- `kgdb/` stores useful tools for kgdb debugging.

- `prompts/` stores LLM prompts used in v-commands to support chat APIs. You may need to fine-tune these prompts since the responses from online LLM applications such as ChatGPT are often unstable.

`kernel/` and `workload/` can be initialized both automatically through `scripts/initenv*.sh` and manually.

`page/` stores the unified public web page, which is also a full-stack node.js application.
