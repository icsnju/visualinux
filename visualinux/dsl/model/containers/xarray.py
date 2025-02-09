from visualinux import *
from visualinux.term import *
from visualinux.dsl.model.shape import *
from visualinux.runtime import utils

class XArray(Container):

    def __init__(self, label: str, root: Term, type: Term, parent: 'NotPrimitive | None' = None) -> None:

        root = Term.Field(type.field_seq) if type and type.field_seq else root
        if vl_debug_on(): printd(f'creat XArray {root = !s}')

        super().__init__('XArray', label, root, type, parent)
        self.type: Term
        self.parent: 'NotPrimitive'

    def clone_to(self, parent: 'NotPrimitive') -> 'XArray':
        xarray = XArray(self.label, self.root, self.type, parent)
        xarray.scope = self.scope.clone_to(xarray)
        xarray.member_shape = self.member_shape.clone_to(xarray)
        return xarray

    def evaluate_on(self, pool: Pool, iroot: KValue | None = None) -> entity.Container:
        super().evaluate_on(pool, iroot)
        assert self.root

        if vl_debug_on(): printd(f'{self.name} evaluate_on {self.root = !s}, {iroot = !s}')
        root = iroot if iroot else self.parent.scope.evaluate_term(self.root)

        if vl_debug_on(): printd(f'{self.name} evaluate_on {root = !s}')
        self.scope.root_value = root.cast(self.type)

        ent_container = entity.Container(self, root, self.label)
        if ent_existed := pool.find_container(ent_container.key):
            if vl_debug_on(): printd(f'{self.name} evaluate_on {root = !s} duplicated;')
            return ent_existed
        if vl_debug_on(): printd(f'{self.name} {ent_container = !s}')

        entry = root.eval_field('xa_head')
        index = 0
        if self.xa_check('xa_is_node', entry):
            node = self.xa_convert('xa_to_node', entry)
            shift = self.xa_node_shift(node) + utils.XA_CHUNK_SHIFT
        else:
            node = 'undefined'
            shift = 0
        if vl_debug_on(): printd(f'{self.name} __evaluate_dfs before {entry!s}, {node = !s}, {index = }, {shift = }')
        self.__evaluate_dfs(pool, ent_container, entry, index, shift)

        pool.add_container(ent_container)
        return ent_container

    def __evaluate_dfs(self, pool: Pool, ent_container: entity.Container, entry: KValue, index: int, shift: int) -> None:

        if entry.value == KValue_NULL.value:
            return

        if vl_debug_on(): printd(f'{self.name} __evaluate_dfs {entry!s}, {index = }, {shift = }')
        ent_spec = entity.Box(None, KValueXBox(pool.gen_key_for_xbox()), '', OrderedDict({'default': entity.View('default', None, OrderedDict())}))
        ent_spec.parent = ent_container.key
        use_spec = True
        if self.xa_check('xa_is_node', entry):
            if shift == 0:
                ent_spec.add_member('default', 
                    'entry_node', entity.Text(entry, TextFormat.gen_default()))
            else:
                node = self.xa_convert('xa_to_node', entry)
                slots = node.eval_field('slots').decompose_array()
                if vl_debug_on(): printd(f'xarray {node = !s} => {slots = !s}')
                for i, slot in enumerate(slots):
                    nshift = self.xa_node_shift(node)
                    nindex = index + (i << nshift)
                    if vl_debug_on(): printd(f'{self.name} __evaluate_dfs before {entry!s}, {slot = !s}, {nindex = }, {nshift = }')
                    self.__evaluate_dfs(pool, ent_container, slot, nindex, nshift)
                use_spec = False
        elif self.xa_check('xa_is_value', entry):
            ent_spec.add_member('default', 
                'entry_value',    entity.Text(self.xa_convert('xa_to_value',    entry), TextFormat.gen_default()))
        elif not self.xa_check('xa_is_internal', entry):
            ent_curr = self.evaluate_member(pool, entry)
            ent_container.add_member(ent_curr.key)
            use_spec = False
        elif self.xa_check('xa_is_retry', entry):
            ent_spec.add_member('default', 
                'entry_internal', entity.Text(self.xa_convert('xa_to_internal', entry), TextFormat.gen_default()))
        elif self.xa_check('xa_is_sibling', entry):
            ent_spec.add_member('default',
                'entry_sibling',  entity.Text(self.xa_convert('xa_to_sibling',  entry), TextFormat.gen_default()))
        elif self.xa_check('xa_is_zero', entry):
            ent_spec.add_member('default', 
                'entry_zero',     entity.Text(self.xa_convert('xa_to_internal', entry), TextFormat.gen_default()))
        else:
            ent_spec.add_member('default', 
                'entry_error',    entity.Text(entry, TextFormat.gen_default()))

        if use_spec:
            ent_container.add_member(ent_spec.key)
            pool.add_box(ent_spec)

    def xa_check(self, function: str, entry: KValue) -> bool:
        value = self.xa_convert(function, entry)
        return value.value == 1

    def xa_convert(self, function: str, entry: KValue) -> KValue:
        fake_scope = SymTable(entry=Term.ItemVar('entry'))
        return fake_scope.evaluate_term(Term.CExpr(f'{function}(@entry)'), item_value=entry)

    def xa_node_shift(self, node: KValue) -> int:
        shift = node.eval_field('shift').cast(Term.Type('uint8_t'), as_pointer=True).dereference()
        return shift.value

    def evaluate_member(self, pool: Pool, member: KValue) -> entity.NotPrimitive:

        if isinstance(self.member_shape, SwitchCase):
            member_shape = self.member_shape.evaluate_on(pool, member)
        elif isinstance(self.member_shape, BoxRecursion):
            member_shape = self.member_shape.expand_to(self)
        else:
            member_shape = self.member_shape.clone_to(self)

        if not isinstance(member_shape, Box | Container):
            raise fuck_exc(AssertionError, f'{self.name} member_shape must be Box or Container but {member_shape = !s}')

        return member_shape.evaluate_on(pool, member)
