import evaluation.textbook.14-15_kobject

define kernfs_NodeX as Box<kernfs_node> [
    Text count: count.counter
    Text active: active.counter
    Text<string> name
    Text<string> parent.name
    Link kobject -> @kobject
] where {
    kobject = KObject(@this.priv)
}
define kernfs_Node as Box<kernfs_node> [
    Text count: count.counter
    Text active: active.counter
    Text<string> name
    Text<string> parent.name
    // Link parent ~> @parent
    Link kobject -> @kobject
    Link children -> @children_list
] where {
    // parent = kernfs_Node(@this.parent)
    kobject = KObject(@this.priv)
    children = RBTree<kernfs_node.dir.children>(@this.dir.children).forEach |node| {
        yield kernfs_Node<kernfs_node.rb>(@node)
    }
    children_list = UnorderedSet.convFrom(@children)
}

define kernfs_SyscallOps as Box<kernfs_syscall_ops> [
    Text<fptr> show_options, mkdir, rmdir, rename, show_path
]
define kernfs_Root as Box<kernfs_root> [
    Link kn -> @kn
    Link syscall_ops -> @syscall_ops
] where {
    kn = kernfs_Node(@this.kn)
    syscall_ops = kernfs_SyscallOps(@this.syscall_ops)
}

// kernfs_root = kernfs_Root(${sysfs_root})
// vl_find_kn and vl_kn_name_dev are C hackings inside Linux kernel source code
kn_name_dev = ${vl_find_kn(sysfs_root.kn, vl_kn_name_dev, NULL)}
// kn_name_dev = ${sysfs_root.kn}
kernfs_root = kernfs_Node(@kn_name_dev)
diag textbook_14_kernfs_example {
    plot @kernfs_root
} with {
    kobjects = SELECT kobject FROM *
    UPDATE kobjects WITH abst: parent
}
