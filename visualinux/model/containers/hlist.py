from visualinux import *
from visualinux.term import *
from visualinux.model.shape import *

class HList(Container):

    def __init__(self, label: str, root: Term, type: Term, parent: 'NotPrimitive | None' = None) -> None:

        root = Term.Field(type.field_seq) if type and type.field_seq else root
        if vl_debug_on(): printd(f'creat HList {root = !s}')

        super().__init__('HList', label, root, type, parent)
        self.type: Term
        self.parent: 'NotPrimitive'

    def clone_to(self, parent: 'NotPrimitive') -> 'HList':
        hlist = HList(self.label, self.root, self.type, parent)
        hlist.scope = self.scope.clone_to(hlist)
        hlist.member_shape = self.member_shape.clone_to(hlist)
        return hlist

    def evaluate_on(self, pool: Pool, iroot: KValue | None = None, distillers: set[Distiller] | None = None) -> entity.Container:
        super().evaluate_on(pool, iroot, distillers)
        distillers = distillers or set()
        assert self.root

        if vl_debug_on(): printd(f'{self.name} evaluate_on {self.root = !s}, {iroot = !s}')
        root = iroot if iroot else self.parent.scope.evaluate_term(self.root)

        if vl_debug_on(): printd(f'{self.name} evaluate_on {root = !s} cast {self.type = !s}')
        self.scope.root_value = root.cast(self.type)

        ent_container = entity.Container(self, root, self.label)
        if ent_existed := pool.find_container(ent_container.key):
            if vl_debug_on(): printd(f'{self.name} evaluate_on {root = !s} duplicated;')
            return ent_existed
        if vl_debug_on(): printd(f'{self.name} {ent_container = !s}')

        curr = root.eval_field('first')
        members: list[entity.NotPrimitive] = []
        while curr.value != KValue_NULL.value:
            try:
                if vl_debug_on(): printd(f'{self.name} __evaluate_member {curr = !s}')
                ent = self.evaluate_member(pool, distillers, curr)
                if vl_debug_on(): printd(f'+ {curr = !s}, {root = !s}, {ent.key = !s}')
                members.append(ent)
                curr = curr.eval_field('next')
            except Exception as e:
                raise fuck_exc(e.__class__, str(e) + f' in {curr = !s}')

        for i in range(len(members)):
            next_key = members[i + 1].key if i < len(members) - 1 else None
            ent_container.add_member(members[i].key, next=next_key)

        pool.add_container(ent_container)
        return ent_container
