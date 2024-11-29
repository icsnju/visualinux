// array

define TextArray as Array().forEach |item| {
    yield Box [ Text item: @item ]
}

// list

define ListHead as Box<list_head> [
    Link next -> ?
    Link prev -> ?
]

// hlist

define HListNode as Box<hlist_node> [
	// struct hlist_node *next, **pprev;
    Link next -> ?
    // Link pprev -> ?
    Text pprev
]

define HListHead as Box<hlist_head> [
	Link first -> ?
]

// rbtree

define RBNode as Box<rb_node> [
    Link rb_left -> ?
    Link rb_right -> ?
    Text parent_color: __rb_parent_color
]
