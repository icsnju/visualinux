# ViewCL Documentation

**ViewCL** (the View Construction Language) is a domain-specific language (DSL) that helps developers simplify and create *views* of the kernel state.
This documentation has a tutorial with easy-to-learn examples, and the full language specification, including design principles, grammar rules and other special features.

## Tutorial

### Quick Start

#### Hello, Visualinux

In **ViewCL**, we declare *what we need* for each type of object, and instantiate the objects to create plots.
As the hellow-world example, to plot the basic information of the current thread:

```viewcl
define Task as Box<task_struct> [
    Text pid, comm
]
curr = ${per_cpu_current_task(current_cpu())}
plot Task(@curr)
```

In lines 1-3, we declare a **Box** for objects of type `task_struct`, indicating that we want to display fields `pid` and `comm` of a given `task_struct` object.
In line 4, we assign to a variable with a `${...}`, which can evaluate a *mixed expression* containing C expressions, GDB macros, or **Visualinux** GDB Python functions. In this example, `per_cpu_current_task()` and `current_cpu()` are **Visualinux** functions which hides low-level details (see `visualinux/runtime/linux/common.py`).
In line 5, we use `plot` to instantiate the `Task` Box and create a naive object graph, which only contains one object (i.e., the current thread), since `Task` did not define any pointers or nested objects.

You can copy the above **ViewCL** code to a new file (e.g., `viewcl/hello.vcl`), and use the `vplot` GDB command to plot it during debugging, as the README says.

- `vplot -f hello.vcl`

#### Examples arround the Process

Now we will introduce how to plot more about a process, including the per-process metadata (files, signals, etc.), the parent tree, and the scheduling info. We will also browse the basic syntax of **ViewCL** while going through the examples.

In line X, we use `plot` to *create an object graph with a given root object*. That is, XXX.

#### b

## Specification

### Design Principles

The key design principle of **ViewCL** is to *declare an object graph*, where nodes are objects and edges are pointers.

### Box Declaration

### Special Language Features

