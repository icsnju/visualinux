# ViewCL Documentation

**ViewCL** (the View Construction Language) is a domain-specific language (DSL) that helps developers simplify and create *views* of the kernel state.
This documentation has a tutorial with easy-to-learn examples.
You can also refer to evaluation results in `viewcl/evaluation` for large **ViewCL** examples in plotting real kernel components.

## Tutorial

In this tutorial, we will browse the basic syntax of **ViewCL** while going through a series of examples around plotting the Linux process.

### Hello, Visualinux

In **ViewCL**, we declare *what we need* for each type of object, and instantiate the objects to create plots.
As the hello-world example, to plot the basic information of the current thread:

```viewcl
define Task as Box<task_struct> [
    Text pid, comm
]
curr = ${per_cpu_current_task(current_cpu())}
task = Task(@curr)
diag example {
    plot @task
}
```

In lines 1-3, we declare a **Box** for objects of type `task_struct`. The **Text** declared inside the **Box** indicate that we want to display fields `pid` and `comm` of a given `task_struct` object. Directly declare object fields is the most common usage of **Text**, and we will show other usages below.

In line 4, we assign to a variable with a `${...}`, which can evaluate a *mixed expression* containing C expressions, GDB macros, or **Visualinux** GDB Python functions. Here, `per_cpu_current_task()` and `current_cpu()` are **Visualinux** functions which hides low-level details (see `visualinux/runtime/linux/common.py`).

In line 5, we instantiate a `Task` **Box** and assign it to a variable.
To instantiate a **Box** in **ViewCL**, we should provide (1) an already declared **Box** type, and (2) the root address of the object.
Here, we instantiate a `Task` with `@curr` as its root address.

In line 6, we create a **Diagram** (i.e., an object graph) with a given name `example`.
In line 7, we `plot` with a Box instance as the root object to create an object graph from the kernel runtime. Here, the resulting graph should only contain one object (i.e., the current thread), since we did not define any pointers or nested objects in `Task`.
Also, we can `plot` from multiple root objects in one **Diagram**.

You can copy the above **ViewCL** code to a new file (e.g., `viewcl/hello.vcl`), and use the `vplot` GDB command to plot it during debugging, as the README says.

- `vplot -f hello.vcl`

### Object Graph Construction

#### Pointers as Links

To chain together multiple objects and create an object graph, we can define **Link** with the definition of a target object:

```viewcl
define Task as Box<task_struct> [
    Text pid, comm
    Link parent -> @parent
] where {
    parent = Task(@this.parent)
}
curr = ${per_cpu_current_task(current_cpu())}
@task = Task(@curr)
diag example {
    plot @task
}
```

In line 3, we define a **Link** with name `parent` and target to a variable, `@parent`, which should be locally defined in the scope of the **Box** declaration.
In lines 4-6, we declare a `where` clause for this **Box**, in which we can define local variables used in the **Box** declaration above (lines 2-3). Here, we define the variable `@parent` referenced by the **Link** `parent`.

In line 5, we instantiate a **Task** with `@this.parent` as its root address.
Note that `@this` is a special reference, which is always evaluated as the object that owns the current scope (here it belongs to the `Task` instantiated in line 8, i.e., `@this` will be evaluated as `@curr` in line 7).

**ViewCL** expression evaluation are protected and enhanced by several internal mechanisms of **Visualinux**. For example, we do not need to be nurvous about either we should use `.` or `->` in a expression (which is similar to GDB).
See below specification for how the evaluation works in detail.

#### Nested Boxes

We can also create nested **Box**es for nested struct types. The syntax is similar to **Link** declaration:

```viewcl
define Task as Box<task_struct> [
    Text pid, comm
    Box se [
        Text on_rq
        Text vruntime
    ]
]
```

You can also define another **Box** to achieve better code modularity for non-trivial situations:

```viewcl
define Sched as Box<sched_entity> [
    Text on_rq
    Text vruntime   
]
define Task as Box<task_struct> [
    Text pid, comm
    Box sched: @se
] where {
    se = Sched(@this.se)
}
```

In line 7 of the second code snippet, we use the *label* syntax. Specifically, `sched` is just the name for visualization, and is independent from the actual field name of the `task_struct` object.
See below for details of the label syntax.

#### Data Structures as Containers

**Visualinux** predefines common kernel data structures for ease of visualization, including `Array`, `List`, `HList`, `RBTree` and `XArray`.
Take the CFS scheduler run queue as an example:

```viewcl
root = ${cpu_rq(0)->cfs.tasks_timeline}
sched_tree = RBTree<cfs_rq.tasks_timeline>(@root).forEach |node| {
    yield Task<task_struct.se.run_node>(@node)
}
diag example {
    plot @sched_tree
}
```

We specify the offset chain of the nested objects (i.e., `<...>` in line 2 and line 3 for the root node and member nodes of the red-black tree, respectively) for **Visualinux/GDB** to evaluate the object address accurately.

#### Multiplexing

Multiplexing is common in the Linux kernel (e.g., the `void *private_data` of `file` structs).
**ViewCL** supports switch-case statements, with which we can dynamically decide the **Box** type of a target shape. For exmaple:

```viewcl
define File as Box<file> [
    Link private_data -> @priv_node
] where {
    i_mode = @this.f_inode.i_mode
    priv_data = @this.private_data
    priv_node = switch ${true} {
        case ${S_ISBLK(@i_mode)}:  BlockDev(@priv_data)
        case ${S_ISFIFO(@i_mode)}: Pipe(@priv_data)
        case ${S_ISSOCK(@i_mode)}: Socket(@priv_data)
        ...
        otherwise: Box [ Text unknown: @priv_data ]
    }
}
```

This is also useful for safe evaluation:

```viewcl
define SkBuffHead as Box<sk_buff_head> [
    Link next -> @next
    Text qlen
] where {
    next = switch ${*@this.next.len} {
        case ${0}: NULL
        otherwise: SkBuff(@this.next)
    }
}
```

### Object Graph Customization

#### Views of Objects

**ViewCL** allows us to define multiple **View**s for a single **Box** to support understanding a kernel object/component from multiple perspectives.
For example:

```viewcl
define Task as Box<task_struct> {
    :default [
        Text pid, comm
    ]
    :default => :sched [
        Box se [
            Text vruntime
        ]
    ]
}
```

We also allow **View** inheritance to avoid code redundancy. This is similar to the class inheritance in object-oriented programming.

Note that the `:default` view is specially kept and should always exist in each **Box** declaration.
Actually, all the code examples you have seen before have used a sugar. The two code snippets below are totally equal:

```viewcl
define Task as Box<task_struct> [
    ...
]
```

```viewcl
define Task as Box<task_struct> {
    :default [
        ...
    ]
}
```

#### Labels and Typos

In **Visualinux**, a **Text** is displayed as a name-value pair, and we can customize the display style of both the name and the value, with labels and typos, respectively.

#### Flatten

;;;

#### Distill

Currently we suuport `Array` and `UnorderedSet` for developers to **distill** a complex data structure to a compact form.
Take the CFS scheduler run queue as an example:

```viewcl
root = ${cpu_rq(0)->cfs.tasks_timeline}
sched_tree = RBTree<cfs_rq.tasks_timeline>(@root).forEach |node| {
    yield Task<task_struct.se.run_node>(@node)
}
sched_queue = Array.convFrom(@sched_tree)
plot @sched_queue
```

Note that we can also **distill** general kernel components but not only modeled data structures. Specifically, we can invoke `convFrom` with a root object **and a specific object type**. In this usage, the whole reachable subgraph from the given root object will be traversed, and all objects of the given object type will be distilled to construct a "new" compacted data structure. For example:

```viewcl
task_with_mm = Task(...)
task_addr_space = Array.convFrom(@task_with_mm, vm_area_struct)
```

#### Using Initial ViewQL

Sometimes we want to initially customize the **Diagrams**, e.g., let all threads show their sched information while plotting the process scheduler run queue.
We can add a `with` clause to the `diag` declaration, in which we can add **ViewQL** code snippets. For example:

```viewcl
diag example {
    plot Task(${&init_task})
} with {
    all_tasks = SELECT task_struct FROM *
    UPDATE all_tasks WITH view: sched_details
}
```
