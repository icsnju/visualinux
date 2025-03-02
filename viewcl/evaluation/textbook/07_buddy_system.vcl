import lib.utils

define FreeArea as Box<free_area> [
    // Shape free_list: @free_list
    Text nr_free
] where {
    // free_list = Array(@this.free_list).forEach |item| {
    //     yield Box(@item) [
    //         Text next
    //         Text prev
    //     ]
    //     // yield List(@item).forEach |node| {}
    // }
}

define PagePCP as Box<page> [
]

define PCP as Box<per_cpu_pages> [
    Text count, high, batch
    Shape lists: @lists
] where {
    lists = Array(@this.lists).forEach |item| {
        // yield Box(@item) [
        //     Text next
        // ]
        yield Box(@item) [
            Link list -> @list
        ] where {
            list = List(@this).forEach |node| {
                yield PagePCP<page.pcp_list>(@node)
            }
        }
    }
}

define Zone as Box<zone> [
    Text<string> name
    // TextArray _watermark
    // Text watermark_boost
    Text managed_pages: managed_pages.counter
    Shape free_area: @free_area
    Link per_cpu_pageset -> @per_cpu_pageset
    Text node
] where {
    free_area = Array(@this.free_area).forEach |item| {
        yield FreeArea("${1 << @index}": @item)
    }
    per_cpu_pageset = PCP(${per_cpu_ptr(@this.per_cpu_pageset, 0)})
}

define PGListData as Box<pglist_data> [
    Shape node_zones: @node_zones
    Text nr_zones
    Text node_id
] where {
    node_zones = Array(@this.node_zones).forEach |item| {
        yield [ Link zone -> @zone ] where { zone = Zone(@item) }
    }
}

node_data = PGListData(${node_data[0]})

node_states = Array(${node_states}).forEach |item| {
    yield Box(@item) [
        TextArray bits
    ]
}

diag textbook_07_buddy_system {
    plot @node_data
    // plot @node_states
}
