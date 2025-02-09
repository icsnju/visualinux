from visualinux import *
from visualinux.term import *
from visualinux.dsl.model.shape import *

class UnorderedSet(Container):
    
    def __init__(self, label: str, root: Term, type: Term | None, parent: 'NotPrimitive') -> None:
        super().__init__('UnorderedSet', label, root, type, parent)
        self.parent: 'NotPrimitive'

    def clone_to(self, parent: 'NotPrimitive') -> 'UnorderedSet':
        array = UnorderedSet(self.label, self.root, self.type, parent)
        array.scope = self.scope.clone_to(array)
        array.member_shape = self.member_shape.clone_to(array)
        return array

    def evaluate_on(self, pool: Pool, iroot: KValue | None = None) -> entity.Container:
        super().evaluate_on(pool, iroot)
        assert self.root

        if vl_debug_on(): printd(f'{self.name} evaluate_on {self.root = !s} {iroot=!s}')
        root = iroot if iroot else self.parent.scope.evaluate_term(self.root, cast=self.type)

        ent_container = entity.Container(self, root, self.label)
        if ent_existed := pool.find_container(ent_container.key):
            if vl_debug_on(): printd(f'{self.name} evaluate_on {root = !s} duplicated;')
            return ent_existed
        if vl_debug_on(): printd(f'{self.name} {ent_container = !s}')
        if root.address == KValue_NULL.value:
            return ent_container

        if vl_debug_on(): printd(f'    {root = !s}')
        if vl_debug_on(): printd(f'    {self.member_shape.format_string_head() = !s}')

        # TODO: allow dsl to set label for Box/Container
        # the following modification will crash the pool key searching
        # if outbox.root.type.stat_name == 'void':
        #     outbox.root = root.address_of()

        if not root.gtype.target().is_array():
            raise fuck_exc(AssertionError, f'{self.name} {root = !s} should be of array type')
        arr = root.decompose_array()

        for i, member_value in enumerate(arr):
            if vl_debug_on(): printd(f'{self.name} __evaluate_member {i = }, {member_value = !s}')
            ent = self.evaluate_member(pool, member_value)
            if vl_debug_on(): printd(f'+ {member_value = !s}, {ent.key = !s}')
            ent_container.add_member(ent.key)

        pool.add_container(ent_container)
        return ent_container

    def evaluate_member(self, pool: Pool, member: KValue) -> entity.NotPrimitive:

        member_shape = self.member_shape
        while isinstance(member_shape, SwitchCase):
            member_shape = member_shape.evaluate_on(pool, member)

        if isinstance(member_shape, BoxRecursion):
            member_shape = member_shape.expand_to(self)
        else:
            member_shape = member_shape.clone_to(self)

        if not isinstance(member_shape, Box | Container):
            raise fuck_exc(AssertionError, f'{self.name} member_shape must be Box or Container but {member_shape = !s}')

        if vl_debug_on(): printd(f'{self.name} eval_member {member!s}')
        if vl_debug_on(): printd(f'    {self.name} {member_shape.format_string_head() = !s}')

        return member_shape.evaluate_on(pool, member)
