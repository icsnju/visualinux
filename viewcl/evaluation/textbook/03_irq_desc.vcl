import lib.concurrency

define IRQChip as Box<irq_chip> [
    Text<string> name
    Text<fptr> irq_startup, irq_shutdown, irq_enable, irq_disable
    Text<fptr> irq_ack, irq_mask, irq_mask_ack, irq_unmask, irq_eoi
    // Text<fptr> ...
]

define IRQDomainOps as Box<irq_domain_ops> [
    Text<fptr> match, select, map, unmap, xlate, alloc, free, activate, deactivate, translate
]
define IRQDomain as Box<irq_domain> [
    Text<string> name
    Link ops -> @ops
] where {
    ops = IRQDomainOps(@this.ops)
}

define IRQData as Box<irq_data> [
    Text irq, hwirq
    // Link chip -> @chip
    // Link domain -> @domain
    // Link parent_data -> @parent_data
    // Text chip_data
] where {
    chip = IRQChip(@this.chip)
    domain = IRQDomain(@this.domain)
    parent_data = IRQData(@this.parent_data)
}

define IRQAction as Box<irqaction> [
    Text<string> name
    Text<fptr> handler
    Text thread.pid
    Text<fptr> thread_fn
    // Text thread_flags
    Link next -> @next
    Link secondary -> @secondary
    Text irq
    Text<flag:irqaction> flags
] where {
    next = IRQAction(@this.next)
    secondary = IRQAction(@this.secondary)
}

define IRQDesc as Box<irq_desc> [
    Text<string> name
    IRQData irq_data
    Link action -> @action
    Text<fptr> handle_irq
    Text parent_irq
] where {
    action = IRQAction(@this.action)
}

idt = XArray(${&irq_desc_tree}).forEach |item| {
    yield [ Link "irq_desc #{@index}" -> @desc ] where {
        desc = IRQDesc(@item)
    }
}

diag textbook_03_idt {
    plot @idt
} with {
    irq_no_action = SELECT irq_desc
        FROM *
        WHERE action == NULL
    UPDATE irq_no_action WITH shrinked: true
}
