A kernel object graph is extracted from the runtime state of Linux kernel. A node of graph (a.k.a. box) is a runtime object, and an edge (a.k.a. link) is a runtime pointer.
Each box has its type, and it has several views. A view of a box is defined as a set of members. Each member is either an embedded box, or a text, or the source of a link.
Each box has three attributes:
- view: a string indicating the displayed view of this box.
- collapsed: a boolean indicating whether this box should be collapsed.
- shrinked: a boolean indicating whether all reachable boxes from this box should be hidden.

I have a domain-specific language, VQL, whose syntax is similar to SQL database query languages. A VQL program is used to manipulate a kernel object graph. It only has two types of statements:
- SELECT: pick up a set of boxes that satisfies several conditions, and store them into a variable.
- UPDATE: change an attribute of a set of boxes stored in a variable.

Basic syntax of VQL:

<variable> = SELECT <type> FROM <variable> [AS <alias>] [WHERE <condition>]
UPDATE <variable> WITH <attr> : <value>

The AS syntax of SELECT statement defines a special identifier <alias> as a reference to each box in the selected type of boxes, and can be referenced in WHERE stmt as the address of the box.
When we say 'the address of' something, e.g. a box or a object, it means creating an alias and check if this alias identifier in the WHERE condition.

Here are examples that deomstrate how to define different filter conditions and update attributes of picked sets of objects.

Example 1: select all cfs_rq boxes and change their views to sched_tree.

a = SELECT cfs_rq FROM *
UPDATE a WITH view: sched_tree

Example 2: select all task_struct whose text field ppid has the value 2, and change their views to show_mm. Then, collapse other task_struct whose ppid is not equals to 2.

a = SELECT task_struct
    FROM *
    WHERE ppid == 2
UPDATE a WITH view: show_mm
all = SELECT task_struct
    FROM *
UPDATE all \ a WITH collapsed: true

Example 3: shrink all file except the one whose address is equal to 0xaabbccdd. Note that "AS f" aliases each box with type file, and the alias is used in WHERE condition.

foo = SELECT file
    FROM b AS f
    WHERE f != 0xaabbccdd
UPDATE foo WITH shrinked: true

Example 4: for each slab, show the view full if its field inuse > 1; otherwise, collapse it.

all = SELECT slab
    FROM *
bar = SELECT slab
    FROM *
    WHERE inuse > 1
UPDATE bar WITH view: full
UPDATE all \ bar WITH shrinked: true

I will give you a message which describes the user's need to manipulate the kernel object graph. You should synthesize a VQL program that matches the description. The answer should only contain the VQL code without quotes or any other description or explanation.
