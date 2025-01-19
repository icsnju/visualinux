from visualinux import *
from visualinux.term import *
from visualinux.viewcl.model.shape import *

class RBTree(Container):

    def __init__(self, label: str, root: Term, type: Term, parent: 'NotPrimitive | None' = None) -> None:

        root = Term.Field(type.field_seq) if type and type.field_seq else root
        if vl_debug_on(): printd(f'creat RBTree {root = !s}')

        super().__init__('RBTree', label, root, type, parent)
        self.type: Term
        self.parent: 'NotPrimitive'

    def clone_to(self, parent: 'NotPrimitive') -> 'RBTree':
        rbtree = RBTree(self.label, self.root, self.type, parent)
        rbtree.scope = self.scope.clone_to(rbtree)
        rbtree.member_shape = self.member_shape.clone_to(rbtree)
        return rbtree

    def evaluate_on(self, pool: Pool, iroot: KValue | None = None) -> entity.Container:
        super().evaluate_on(pool, iroot)
        assert self.root

        if vl_debug_on(): printd(f'{self.name} evaluate_on {self.root = !s}, {iroot = !s}')
        root = iroot if iroot else self.parent.scope.evaluate_term(self.root)
        # root_value = gdb.parse_and_eval(f'rb_entry_task({self.expr})')
        # root_value = gdb.parse_and_eval(f'({self.base.type})({int(root_node) - self.offset:#x})')
        if vl_debug_on(): printd(f'___ fuuuc_ {root = !s}')
        if root.gtype.tag == 'rb_root_cached':
            root = root.eval_field('rb_root')
        if vl_debug_on(): printd(f'___ final_ {root = !s}')

        if vl_debug_on(): printd(f'{self.name} evaluate_on {root = !s}')
        self.scope.root_value = root.cast(self.type)

        ent_container = entity.Container(self, root, self.label)
        if ent_existed := pool.find_container(ent_container.key):
            if vl_debug_on(): printd(f'{self.name} evaluate_on {root = !s} duplicated;')
            return ent_existed
        if vl_debug_on(): printd(f'{self.name} {ent_container = !s}')

        if vl_debug_on(): printd(f'!!! RBTREE __evaluate_dfs {pool = } {ent_container = } {root.eval_field("rb_node") = }')
        self.__evaluate_dfs(pool, ent_container, root.eval_field('rb_node'))

        pool.add_container(ent_container)
        return ent_container

    def __evaluate_dfs(self, pool: Pool, ent_container: entity.Container, node_addr: KValue) -> entity.NotPrimitive:

        if vl_debug_on(): printd(f'??? RBTREE __evaluate_dfs {pool = } {ent_container = } {node_addr = }')
        if node_addr.value == KValue_NULL.value:
            return entity.Box(None, KValue_NULL, '', OrderedDict())

        if vl_debug_on(): printd(f'RBTree __evaluate_dfs {node_addr = }')
        ent_curr = self.evaluate_member(pool, node_addr)
        if vl_debug_on(): printd(f'    RBTree __evaluate_dfs {ent_curr.key = !s}')

        ent_left  = self.__evaluate_dfs(pool, ent_container, node_addr.eval_field('rb_left'))

        ent_container.add_member(ent_curr.key)

        ent_right = self.__evaluate_dfs(pool, ent_container, node_addr.eval_field('rb_right'))

        # ent_container.add_member(ent_curr.key, view, left=ent_left.key, right=ent_right.key)
        ent_container.add_link_to_member(ent_curr.key, left=ent_left.key, right=ent_right.key)

        if vl_debug_on(): printd(f'    RBTree __evaluate_dfs {ent_curr.key = }, {ent_left.key = }, {ent_right.key = }')
        return ent_curr
