from visualinux import *
from visualinux.term import *
from visualinux.dsl.model.decorators import *
from visualinux.dsl.model.symtable import SymTable
from visualinux.runtime import entity
from visualinux.runtime.kvalue import *
from visualinux.snapshot import Pool

from visualinux.evaluation import evaluation_counter

class Shape(metaclass=ABCMeta):

    def __init__(self, name: str, label: str, root: Term | None, type: Term | None) -> None:
        self.name  = name
        self.label = label
        self.root  = root
        self.type  = type

    def __str__(self) -> str:
        return self.format_string()

    def __repr__(self) -> str:
        return self.__str__()

    def format_string_head(self) -> str:
        return f'{self.name}<{self.type}>({self.label}: {self.root})'

    @abstractmethod
    def format_string(self, depth: int = 0) -> str:
        pass

class PrimitiveShape(Shape):

    def __init__(self, name: str, label: str, root: Term, type: Term | None, parent_view: 'View') -> None:
        super().__init__(name, label, root, type)
        self.parent_view = parent_view

    @property
    def parent_box(self) -> 'Box':
        return self.parent_view.parent_box
    @property
    def parent_box_scope(self) -> SymTable:
        return self.parent_box.scope

    def format_string(self, depth: int = 0) -> str:
        return padding(depth) + self.format_string_head()

    @abstractmethod
    def clone_to(self, parent_view: 'View') -> 'PrimitiveShape':
        pass

    @abstractmethod
    def evaluate_on(self, pool: Pool, item_value: KValue | None = None) -> entity.RuntimePrimitive:
        pass

class Text(PrimitiveShape):

    def __init__(self, label: str, root: Term, typo: TextFormat, parent_view: 'View') -> None:
        super().__init__('Text', label, root, None, parent_view)
        self.typo = typo
        self.root: Term

    def clone_to(self, parent_view: 'View') -> 'Text':
        return Text(self.label, self.root, self.typo, parent_view)

    def evaluate_on(self, pool: Pool, item_value: KValue | None = None) -> entity.Text:
        evaluation_counter.fields += 1
        if self.typo.type != TFType.AUTO:
            value = self.parent_box_scope.evaluate_term(self.root, item_value=item_value)
        else:
            value = self.parent_box_scope.evaluate_term(self.root, item_value=item_value)
        match self.typo.type:
            case TFType.FLAG:
                return entity.Flag(value, self.typo)
            case TFType.EMOJI:
                return entity.EMOJI(value, self.typo)
            case _:
                return entity.Text(value, self.typo)

class Link(PrimitiveShape):

    def __init__(self, label: str, parent_view: 'View', link_type: LinkType,
                 target: 'PrimitiveShape | Box | Container | SwitchCase | ContainerConv | None' = None) -> None:
        super().__init__('Link', label, Term.CExpr('NULL'), None, parent_view)
        self.link_type   = link_type
        self.target      = target

    def format_string_head(self) -> str:
        target = self.target.format_string_head() if self.target else '?'
        return f'{self.name} {self.label} {self.link_type} {target}'

    def clone_to(self, parent_view: 'View') -> 'Link':
        if self.target is not None:
            if vl_debug_on(): printd(f'[DEBUG] Link clone_to parent={parent_view.parent_box.format_string_head()}')
            assert isinstance(self.target, NotPrimitive | ContainerConv)
            new_target = self.target.clone_to(parent_view.parent_box)
        else:
            new_target = None
        return Link(self.label, parent_view, self.link_type, new_target)

    def evaluate_on(self, pool: Pool, item_value: KValue | None = None) -> entity.Link:
        evaluation_counter.fields += 1
        if self.target is not None:
            if vl_debug_on(): printd(f'[DEBUG] Link evaluate_on {self.target.format_string_head()}, {item_value = !s}')
            # transfrom special cases to normal box/container cases
            if isinstance(self.target, BoxRecursion):
                if vl_debug_on(): printd(f'=============[DEBUG] Link expand')
                target = self.target.expand_to(self.parent_box)
                if vl_debug_on(): printd(f'=============[DEBUG] Link expand to {target = !s}')
            else:
                target = self.target
                while isinstance(target, SwitchCase):
                    target = target.evaluate_on(pool, item_value)
            #
            if vl_debug_on(): printd(f'[DEBUG] Link => {target.format_string_head() = }, {item_value = !s}')
            if isinstance(target, Box):
                target_key = target.evaluate_on(pool, item_value).key
            elif isinstance(target, Container):
                target_key = target.evaluate_on(pool, None).key
            elif isinstance(target, ContainerConv):
                target_key = target.evaluate_on(pool).key
            else:
                raise fuck_exc(AssertionError, f'unsupported link target = {self.target!s}')
            if vl_debug_on(): printd(f'[DEBUG] Link => {target_key = }')
            target_type = target.type
        else:
            target_key  = None
            target_type = None
        return entity.Link(self.link_type, target_key, target_type)

class View:

    def __init__(self, name: str, parent: str | None,
                 members: OrderedDict[str, 'PrimitiveShape | Box | Container | ContainerConv | SwitchCase'],
                 parent_box: 'Box') -> None:
        self.name = name
        self.parent = parent
        self.members = members or {}
        self.parent_box = parent_box

    def __contains__(self, key: str): return self.members.__contains__(key)
    def __getitem__(self, key: str): return self.members.__getitem__(key)
    def __setitem__(self, key: str, value: 'PrimitiveShape | Box | Container'): self.members.__setitem__(key, value)
    def items(self): return self.members.items()

    def __str__(self) -> str:
        return self.format_string()

    def __repr__(self) -> str:
        return self.__str__()

    def format_string(self, depth: int = 0) -> str:
        if self.parent:
            head = f':{self.parent} => :{self.name}'
        else:
            head = f':{self.name}'
        lines = [padding(depth) + head]
        for name, member in self.members.items():
            lines.append(padding(depth + 1) + f'{name} = ' + member.format_string(depth + 1).removeprefix(padding(depth + 1)))
        return '\n'.join(lines)

    def clone_to(self, parent_box: 'Box') -> 'View':
        new_view = View(self.name, self.parent, OrderedDict(), parent_box)
        for label, member in self.members.items():
            if isinstance(member, PrimitiveShape):
                new_member = member.clone_to(new_view)
            else:
                assert isinstance(member, NotPrimitive)
                new_member = member.clone_to(new_view.parent_box)
            new_view.members[label] = new_member
        return new_view

    def evaluate_on(self, pool: Pool, item_value: KValue | None = None) -> entity.View:

        members = OrderedDict()
        if vl_debug_on(): printd(f'view {self.name} eval {item_value = !s}')
        for sub, member in self.members.items():
            if vl_debug_on(): printd(f'view {self.name} _eval {sub}: {member.format_string_head()} of {self.parent_box.format_string_head()}')

            while isinstance(member, SwitchCase):
                member = member.evaluate_on(pool, item_value)

            label = self.parent_box.scope.demix_label(member.label)

            if label in members:
                raise fuck_exc(AssertionError, f'duplicated {member.label = } in {members = }')

            if isinstance(member, PrimitiveShape):
                members[label] = member.evaluate_on(pool, item_value)
            elif isinstance(member, Box | Container):
                if isinstance(member, BoxRecursion):
                    member = member.expand_to(self.parent_box)
                ent = member.evaluate_on(pool, None)
                members[label] = entity.BoxMember(ent.key)
            elif isinstance(member, ContainerConv):
                members[label] = member.evaluate_on(pool, None)
            else:
                raise fuck_exc(AssertionError, f'box.eval illegal {member = !s}')

        return entity.View(self.name, self.parent, members)

class Box(Shape):

    nextid = 0

    def __init__(self, name: str, label: str, root: Term | None, type: Term | None,
                 views: OrderedDict[str, View], parent: 'NotPrimitive') -> None:
        super().__init__(name, label, root, type)
        self.views  = views
        self.parent = parent
        self.scope  = SymTable(this=self)
        self.fuck = Box.nextid
        Box.nextid += 1

    def __contains__(self, key: str): return self.views.__contains__(key)
    def __getitem__(self, key: str): return self.views.__getitem__(key)
    def __setitem__(self, key: str, value: View): self.views.__setitem__(key, value)

    def format_string_head(self) -> str:
        return super().format_string_head() + f'({self.fuck = })'

    def format_string(self, depth: int = 0) -> str:
        lines = [padding(depth) + self.format_string_head()]
        for view in self.views.values():
            lines.append(view.format_string(depth + 1))
        return '\n'.join(lines)

    def evaluate_on(self, pool: Pool, item_value: KValue | None = None) -> entity.Box:
        '''
        The end interface to real evaluation.
        All other evaluate_on() will finally call Box.evaluate_on(), and then call KValue.eval().
        '''
        evaluation_counter.objects += 1

        # evaluate the root value
        if not self.root:
            root = KValueVBox(pool.gen_vbox_addr())
        elif self.root.is_item_variable():
            if not item_value:
                raise fuck_exc(AssertionError, f'Box evaluate_on itemVar but item_value not provided')
            root = item_value
            item_value = None
        elif not self.scope.parent or not self.scope.parent.this:
            if vl_debug_on(): printd(f'    for this, parent is NULL, {self.parent = !s} and {self.scope = !s}')
            root = KValue_NULL
        else:
            if vl_debug_on(): printd(f'    for this, parent is {self.scope.parent.this.format_string_head()}')
            # if self.root.is_cexpr():
            #     demixed = self.scope.parent.demix(self.root)
            # else: # self.root.is_variable() or self.root.is_field():
            #     demixed = self.root
            if vl_debug_on(): printd(f'Box fuckroot = eval_on_parent: {self.root}, cast = {self.type}, {item_value = }')
            root = self.scope.parent.evaluate_term(self.root, cast=self.type, item_value=item_value)
            if vl_debug_on(): printd(f'Box fuckroot = {root!s}')
        if vl_debug_on(): printd(f'Box evaluate_on {root = !s}')
        self.scope.root_value = root

        if ent_existed := pool.find_box(root.json_data_key):
            if vl_debug_on(): printd(f'Box evaluate_on {root = !s} duplicated;')
            return ent_existed

        if not root.gtype.is_pointer():
            raise fuck_exc(AssertionError, f'Box evaluate_on root is not a pointer: {root!s}')
        if root.value == KValue_NULL.value:
            if vl_debug_on(): printd(f'    !KValue_NULL {root = !s}')
            return entity.Box(self, root, self.label, OrderedDict({'default': entity.View('default', None, OrderedDict())}))

        label = self.scope.demix_label(self.label)
        ent = entity.Box(self, root, label, OrderedDict())
        pool.add_box(ent)

        if vl_debug_on(): printd(f'Box evaluate_on {root=!s} {self.views=!s}')
        if isinstance(root, KValueVBox):
            if vl_debug_on(): printd(f' --is VBox {self=!s}')
        for view in self.views.values():
            ent.views[view.name] = view.evaluate_on(pool, item_value)

        if vl_debug_on(): printd(f'Box evaluate_on {root = !s} OK return {ent.key = }')
        return ent

    def clone_to(self, parent: 'NotPrimitive') -> 'Box':
        if vl_debug_on(): printd(f'[DEBUG] Box {self.format_string_head()} clone_to parent={parent.format_string_head() if parent else None}')
        new_box = Box(self.name, self.label, self.root, self.type, OrderedDict(), parent)
        new_box.scope = self.scope.clone_to(new_box)
        for name, view in self.views.items():
            new_box[name] = view.clone_to(new_box)
        return new_box

    def find_member_of(self, field_seq: list[str]) -> 'PrimitiveShape | Box | Container | SwitchCase | ContainerConv':
        if vl_debug_on(): printd(f'find_member_of {field_seq=!s}')
        member = self
        for field in field_seq:
            if not isinstance(member, Box):
                raise fuck_exc(AssertionError, f'Box find_member({field_seq}) error on next_`{field = }, {member = }')
            for view in member.views.values():
                if field in view.members:
                    member = view[field]
                    break
        return member

class BoxRecursion(Box):

    def __init__(self, origin_shape: Box, label: str, root: Term | None, type: Term | None) -> None:
        self.origin_shape = origin_shape
        self.label = label
        self.root  = root
        self.type  = type if type else self.origin_shape.type
        self.scope = SymTable(this=None)

    @property
    def name(self):
        return self.origin_shape.name

    def format_string_head(self) -> str:
        return f'Recursion:{self.name}<{self.type}>({self.root})'

    def format_string(self, depth: int = 0) -> str:
        lines = [padding(depth) + self.format_string_head()]
        return '\n'.join(lines)

    def expand_to(self, parent_shape: 'NotPrimitive') -> Box:
        if vl_debug_on(): printd(f'{self.format_string_head()} expand_to {parent_shape.format_string_head()}')
        if vl_debug_on(): printd(f'{self.origin_shape.format_string_head() = !s}')

        new_box = Box(self.name, self.label, self.root, self.type, OrderedDict(), parent_shape)
        if vl_debug_on(): printd(f'    clone scope of {self.origin_shape.format_string_head()} to {new_box.format_string_head()}')
        new_box.scope = self.origin_shape.scope.clone_to(new_box)

        for name, view in self.origin_shape.views.items():
            if vl_debug_on(): printd(f'    clone view {name}')
            new_box[name] = view.clone_to(new_box)

        # if VL_DEBUG_ON: printd(f'-- after expand,')
        # if VL_DEBUG_ON: printd(f'   {new_box = !s},')
        # if VL_DEBUG_ON: printd(f'   {new_box.parent = !s},')

        return new_box

    def clone_to(self, parent: 'NotPrimitive') -> 'BoxRecursion':
        return BoxRecursion(self.origin_shape, self.label, self.root, self.type)

class Container(Shape):

    def __init__(self, name: str, label: str, root: Term, type: Term | None,
                 parent: 'NotPrimitive | None' = None) -> None:
        super().__init__(name, label, None, type)
        self.root   = root
        self.parent = parent
        self.scope = SymTable(this=self)

    def format_string(self, depth: int = 0) -> str:
        return padding(depth) + self.format_string_head()

    @property
    def member_shape(self) -> 'NotPrimitive':
        return self._member_shape

    @member_shape.setter
    def member_shape(self, member_shape: 'NotPrimitive') -> None:
        self._member_shape = member_shape.clone_to(self)

    @abstractmethod
    def clone_to(self, parent: 'NotPrimitive') -> 'Container':
        pass

    @abstractmethod
    def evaluate_on(self, pool: Pool, iroot: KValue | None = None) -> entity.Container:
        evaluation_counter.objects += 1

    def evaluate_member(self, pool: Pool, member: KValue) -> entity.NotPrimitive:

        if isinstance(self.member_shape, SwitchCase):
            member_shape = self.member_shape.evaluate_on(pool, member)
        elif isinstance(self.member_shape, BoxRecursion):
            member_shape = self.member_shape.expand_to(self)
        else:
            member_shape = self.member_shape.clone_to(self)

        if not isinstance(member_shape, Box | Container):
            raise fuck_exc(AssertionError, f'{self.name} member_shape must be Box or Container but {member_shape = !s}')

        if isinstance(member_shape, Box) and not member_shape.type:
            raise fuck_exc(AssertionError, f'{self.name} {member_shape.type = } should not be None')

        return member_shape.evaluate_on(pool, member)

class ContainerConv:

    def __init__(self, label: str, source: Box | Container, target_type: Type[Container], distill: str,
                 parent: 'NotPrimitive | None' = None) -> None:
        self.label = label
        self.source = source
        self.target_type = target_type
        self.type = None
        self.distill = distill
        self.parent = parent
        self.scope = None

    def __str__(self) -> str:
        return self.format_string()

    def __repr__(self) -> str:
        return self.__str__()

    def format_string(self, depth: int = 0) -> str:
        return padding(depth) + self.format_string_head()

    def format_string_head(self) -> str:
        return f'{self.label}: {self.target_type.__name__}.convFrom({self.source!s})'

    @property
    def name(self) -> str:
        return self.target_type.__name__

    def is_member_distilled(self, pool: Pool, member_key: str | None) -> bool:
        if vl_debug_on(): printd(f'is_member_distilled {member_key = }')
        if not self.distill:
            return True
        box = pool.find(member_key)
        res = isinstance(box, entity.Box) and box.type == self.distill
        if vl_debug_on(): printd(f'is_member_distilled {member_key = } => {res}')
        return res

    def evaluate_on(self, pool: Pool, iroot: KValue | None = None) -> entity.ContainerConv:
        if vl_debug_on(): printd(f'Conv {self.format_string_head()} evaluate_on {iroot = !s}')

        ent_source = self.source.evaluate_on(pool, iroot)
        if vl_debug_on(): printd(f'Conv {self.format_string_head()} => {ent_source.key = !s}')

        if not self.target_type.__name__ in ['Array', 'UnorderedSet']:
            raise fuck_exc(AssertionError, f'currently container_conv only support Array and UnorderedSet but {self.target_type = !s}')

        ent_converted = entity.ContainerConv(self, ent_source)
        if ent_existed := pool.find_container_conv(ent_converted.key):
            return ent_existed

        if isinstance(ent_source, entity.Box):
            searched: set[str] = set()
            def search_reachable(ent: entity.NotPrimitive | None, distill: str | None):
                if ent is None or ent.key in searched:
                    return
                if vl_debug_on(): printd(f'  search_reachable {ent.key = }, {distill = }')
                searched.add(ent.key)
                if isinstance(ent, entity.Container | entity.ContainerConv):
                    for member in ent.members:
                        search_reachable(pool.find(member.key), distill)
                else:
                    if self.is_member_distilled(pool, ent.key):
                        ent_converted.add_member(ent.key)
                    for view in ent.views.values():
                        for member in view.members.values():
                            if isinstance(member, entity.Link):
                                search_reachable(pool.find(member.target_key), distill)
                            elif isinstance(member, entity.BoxMember):
                                search_reachable(pool.find(member.object_key), distill)
            search_reachable(ent_source, self.distill)
        else: # entity.Container
            for member in ent_source.members:
                if self.is_member_distilled(pool, member.key):
                    ent_converted.add_member(member.key)
            if vl_debug_on(): printd(f'Conv {self!s} => {ent_converted = !s}')

        pool.add_container(ent_converted)
        return ent_converted

    def clone_to(self, parent: 'NotPrimitive') -> 'ContainerConv':
        new_conv = ContainerConv(self.label, self.source.clone_to(parent), self.target_type, self.distill, parent)
        return new_conv

@dataclass
class Case:

    case_exprs: list[Term]
    shape: 'Box | Container | ContainerConv | SwitchCase'

    def format_string(self, depth: int = 0) -> str:
        case_exprs = ', '.join([expr.format_string() for expr in self.case_exprs])
        lines = [
            padding(depth) + f'case {case_exprs}:',
            self.shape.format_string(depth + 1)
        ]
        return '\n'.join(lines)

class SwitchCase:

    def __init__(self, label: str, switch_expr: Term, cases: list[Case],
                 otherwise: 'Box | Container | ContainerConv | SwitchCase | None',
                 parent: 'NotPrimitive') -> None:
        self.name = 'SwitchCase'
        self.label = label
        self.switch_expr = switch_expr
        self.cases = cases
        self.otherwise = otherwise
        self.parent = parent
        self.scope = SymTable(this=self)

    def __str__(self) -> str:
        return self.format_string()

    def __repr__(self) -> str:
        return self.__str__()

    def format_string_head(self) -> str:
        return f'switch {self.switch_expr.format_string()}'

    def format_string(self, depth: int = 0) -> str:
        lines = [padding(depth) + self.format_string_head() + ' {']
        for case in self.cases:
            lines.append(case.format_string(depth))
        return '\n'.join(lines)

    @property
    def root(self) -> Term:
        raise fuck_exc(AssertionError, 'root, auto transform to cexpr: not implemented yet')
    @property
    def type(self) -> Term:
        raise fuck_exc(AssertionError, 'type, auto transform to cexpr: not implemented yet')

    def evaluate_on(self, pool: Pool, item_value: KValue | None = None) -> 'Box | Container | ContainerConv | SwitchCase':

        if vl_debug_on(): printd(f'SwitchCase evaluate_on {self.switch_expr = !s}, {item_value = !s}')
        if self.scope.parent and self.scope.parent.this:
            if vl_debug_on(): printd(f'{self.scope.parent.this.format_string_head() = !s}')
        else:
            if vl_debug_on(): printd(f'{self.scope.parent = }')
        switch_value = self.scope.parent.evaluate_term(self.switch_expr, item_value=item_value) if self.scope.parent else KValue_NULL
        if vl_debug_on(): printd(f'{switch_value = !s}, {switch_value.gtype.name = !s}')

        matched_case = None
        for case in self.cases:
            def eval_case_expr(case_expr):
                case_value = self.scope.parent.evaluate_term(case_expr, item_value=item_value) if self.scope.parent else KValue_NULL
                if vl_debug_on(): printd(f'{case_expr = !s} => {case_value = !s}')
                if vl_debug_on(): printd(f'    will cast {switch_value.gtype = }, {switch_value.gtype.tag = }')
                return case_value.cast(Term.Type(switch_value.gtype.tag))
            if any(eval_case_expr(case_expr).value == switch_value.value for case_expr in case.case_exprs):
                matched_case = case
                break
        if matched_case:
            if vl_debug_on(): printd(f'matched_case {matched_case.case_exprs[0]!s} {matched_case.shape.format_string_head()}')
            # if VL_DEBUG_ON: printd(f'matched_case {matched_case.shape.parent = !s}')
            matched_shape = matched_case.shape
        elif self.otherwise:
            if vl_debug_on(): printd(f'no_matched, otherwise {self.otherwise.format_string_head()}')
            # if VL_DEBUG_ON: printd(f'no_matched, otherwise {self.otherwise.parent = !s}')
            matched_shape = self.otherwise
        else:
            raise fuck_exc(AssertionError, f'leaked switch-case branch: {self!s}')
        if isinstance(matched_shape, BoxRecursion):
            matched_shape = matched_shape.expand_to(self.parent)
            if vl_debug_on(): printd(f'{matched_shape = }')
        else:
            matched_shape = matched_shape.clone_to(self.parent)
        return matched_shape

    def clone_to(self, parent: 'NotPrimitive') -> 'SwitchCase':
        new_swc = SwitchCase(self.label, self.switch_expr, [], None, parent)
        new_swc.scope = self.scope.clone_to(new_swc)
        for case in self.cases:
            shape = case.shape.clone_to(parent)
            new_swc.cases.append(Case(case.case_exprs, shape))
        if self.otherwise:
            new_swc.otherwise = self.otherwise.clone_to(parent)
        return new_swc

NotPrimitive = Box | Container | SwitchCase