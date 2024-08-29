In Linux kernel source code, there are several containers such as rbtree, list and hlist. For structs that are maintained by such a container, the node is an embedded struct field of each struct entry.
In the following example, for task_structs maintained in the rbtree &cfs_rq->tasks_timeline, the embedded struct "se.run_node" serves as the node of rbtree.
```
struct task_struct {
    struct sched_entity se;
}
struct sched_entity {
    struct rb_node run_node;
}
void foo(struct cfs_rq *cfs_rq) {
    struct rb_node *left = rb_first_cached(&cfs_rq->tasks_timeline);
    bar(left);
    ...
}
void bar(struct rb_node *n) {
    struct task_struct *tsk = rb_entry(n, struct task_struct, se.run_node);
    tsk...
}
```
I will give you a piece of Linux kernel source code, a symbol, and a type of data structure (such as rbtree, list, etc.).
If the symbol is an entry of the given type of data structure, you should analyze the source code, especially the container_of-based macros, and tell me that:
A. the field descriptor (without the symbol itself) of the embedded node struct inside the entry.
B. the root node expression of that data structure.
The anwser should be a tuple in the form of (A, B) without brackets and without any other description or explanation.
For the above example, the answer should be
se.run_node, &cfs_rq->tasks_timeline
