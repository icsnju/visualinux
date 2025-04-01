# ViewQL Documentation

**ViewQL** (the View Query Language) is a domain-specific language (DSL) that helps developers flexibly customize the simplified *views*.
This documentation has a tutorial with easy-to-learn examples.

## Tutorial

**ViewQL** has a simple, SQL-like syntax that is very easy to learn with basic knowledge of database query languages.
It only supports two types of statements.
Specifically, given a **ViewCL**-extracted object graph $G(V,\ E)$ (a.k.a. a view):

- *SELECT*: identifies a subset of vertices (**Box**es) in $V$ under the given filtering condition(s). Nested queries are disallowed.

- *UPDATE*: assigns attributes to a specific set of **Box**es. Attributes determine how each **Box** is displayed.

Due to the simplicity of **ViewQL**, we belive that the following examples are enough to help you learn it :)
More detailed docs are under construction.

Example 1: select all cfs_rq boxes and change their views to sched_tree.

```viewql
a = SELECT cfs_rq FROM *
UPDATE a WITH view: sched_tree
```

Example 2: select all task_struct whose ppid is 2, and change their views to show_mm. Then, collapse other task_struct whose ppid is not equals to 2.

```viewql
child_2 = SELECT task_struct
    FROM *
    WHERE ppid == 2
UPDATE child_2 WITH view: show_mm
all = SELECT task_struct
    FROM *
UPDATE all \ child_2 WITH collapsed: true
```

Example 3: shrink all file except the one whose address is equal to 0xaabbccdd. Note that "AS f" aliases each box with type file, and the alias is used in WHERE condition.

```viewql
files_except = SELECT file
    FROM b AS f
    WHERE f != 0xaabbccdd
UPDATE files_except WITH shrinked: true
```

Example 4: for each slab, show the view full if its field inuse > 1; otherwise, collapse it.

```viewql
all = SELECT slab
    FROM *
shared = SELECT slab
    FROM *
    WHERE inuse > 1
UPDATE shared WITH view: full
UPDATE all \ shared WITH shrinked: true
```

Example 5: only show the read-only vm_area_structs.

```viewql
non_writable_vmas = SELECT vm_area_struct
    FROM *
    WHERE is_writable != true
UPDATE non_writable_vmas WITH shrinked: true
```

### Supported Attributes

| Attribute | Value | Default | Description |
| :-- | :-- | :-- | :-- |
| view      | string  | default    | the current displayed view of this box |
| collapsed | boolean | false      | whether this shape itself is collapsed |
| shrinked  | boolean | false      | whether the entire subgraph rooted at this shape is trimmed |
| direction | string  | horizontal | should be `horizontal` or `vertical`, specifiying this container's growing direction on the screen |

Note that `view`, `collapsed` and `shrinked` are applicable for both **Box** and **Container** (a.k.a. **Shape**), while `direction` is only applicable for **Container**.
