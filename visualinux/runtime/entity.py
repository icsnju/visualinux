from visualinux import *
from visualinux.term import *
from visualinux.viewcl.model.decorators import *
from visualinux.runtime.kvalue import *
from visualinux.runtime.text import *

if TYPE_CHECKING:
    from visualinux.viewcl.model import shape

class JSONRepr(metaclass=ABCMeta):

    def __str__(self) -> str:
        return self.to_json().__str__()

    def __repr__(self) -> str:
        return self.to_json().__repr__()

    @abstractmethod
    def to_json(self) -> dict:
        pass

class RuntimeShape(JSONRepr):

    def __init__(self, model: 'shape.Shape | shape.ContainerConv | None') -> None:
        self.model = model

    @property
    @abstractmethod
    def key(self) -> str:
        pass

class RuntimePrimitive(RuntimeShape):
    @property
    def key(self) -> str:
        raise fuck_exc(AssertionError, 'should not get key of entity.Primitive')

class Text(RuntimePrimitive):

    def __init__(self, value: KValue, typo: TextFormat) -> None:
        # robust handler of gvalues
        if value.gtype.is_pointer() and value.value != KValue_NULL.value and \
                not (typo.type == TFType.INT and typo.desc == 'raw_ptr'):
            self.value = value.dereference()
        else:
            self.value = value
        self.typo  = typo

    @property
    def real_value(self) -> str:
        return self.value.value_string(self.typo)

    def to_json(self) -> dict:
        return {
            'class': 'text',
            'type':  self.value.gtype.tag,
            'size':  self.value.value_size(self.typo),
            'value': self.real_value
        }

class Flag(Text):

    def __init__(self, value: KValue, typo: TextFormat) -> None:
        super().__init__(value, typo)

    @property
    def real_value(self) -> str:
        return FlagHandler.handle(self.typo.desc.split(':')[1], self.value.value)

class EMOJI(Text):

    def __init__(self, value: KValue, typo: TextFormat) -> None:
        super().__init__(value, typo)

    @property
    def real_value(self) -> str:
        return EMOJIHandler.handle(self.typo.desc.split(':')[1], self.value.value)

class Link(RuntimePrimitive):

    def __init__(self, link_type: LinkType, target_key: str | None, target_type: Term | None) -> None:
        self.link_type = link_type
        if target_key and target_key.startswith('0x0:'):
            self.target_key = None
        else:
            self.target_key = target_key

    def to_json(self) -> dict:
        return {
            'class':  'link',
            'type':   self.link_type.name,
            'target': self.target_key,
        }

class BoxMember(JSONRepr):

    def __init__(self, object_key: str) -> None:
        if object_key.startswith('0x0:'):
            self.object_key = None
        else:
            self.object_key = object_key

    def to_json(self) -> dict:
        return {
            'class':  'box',
            'object': self.object_key,
        }

ViewMember = RuntimePrimitive | BoxMember

@dataclass
class View(JSONRepr):

    name: str
    parent: str | None
    members: OrderedDict[str, ViewMember]

    def to_json(self) -> dict:
        return {
            'parent':  self.parent,
            'members': OrderedDict((label, member.to_json()) for label, member in self.members.items()),
        }

class Box(RuntimeShape):

    def __init__(self, model: 'shape.Box | None', root: KValue, label: str, views: OrderedDict[str, View]) -> None:
        super().__init__(model)
        self.model: 'shape.Box'
        self.root = root
        self.label = label
        self.views = views
        self.parent: str | None = None

    @property
    def key(self) -> str:
        return self.root.json_data_key

    @property
    def type(self) -> str:
        return self.root.gtype.tag

    def add_member(self, viewname: str, label: str, ent: 'RuntimePrimitive | Box') -> None:
        if viewname not in self.views:
            raise fuck_exc(KeyError, f'{viewname = } not found in box {self!s}')
        members = self.views[viewname].members
        if label in members:
            raise fuck_exc(KeyError, f'existed {label = } in view {self!s}')
        if isinstance(ent, RuntimePrimitive):
            members[label] = ent
        else:
            members[label] = BoxMember(ent.key)

    def find_box_member(self, label: str, viewname: str | None = None) -> str | None:
        if vl_debug_on(): printd(f'[entity] find_member {label = } in {viewname = }')
        # TODO: search all views if viewname=None
        view = self.views[viewname or 'default']
        if vl_debug_on(): printd(f'[entity] {view.members!s}')
        if label not in view.members:
            if not view.parent:
                return None
            return self.find_box_member(label, view.parent)
        member = view.members[label]
        if not isinstance(member, BoxMember):
            raise fuck_exc(AssertionError, f'entity member {member = } is not a BoxMember')
        return member.object_key

    def to_json(self) -> dict:
        return {
            'key':    self.root.json_data_key,
            'type':   self.type,
            'addr':   hex(self.root.address),
            'label':  self.label,
            'absts':  OrderedDict((name, view.to_json()) for name, view in self.views.items()),
            'parent': self.parent
        }

@dataclass
class ContainerMember(JSONRepr):

    key:   str | None
    links: dict[str, Link]

    def to_json(self) -> dict:
        return {
            'key':   self.key,
            'links': OrderedDict((label, link.to_json()) for label, link in self.links.items())
        }

class Container(RuntimeShape):

    def __init__(self, model: 'shape.Container', root: KValue, label: str) -> None:
        '''entity.Container must be constructed in shape.Container.evaluate_on()
        '''
        super().__init__(model)
        self.model: 'shape.Container'
        self.root = root
        self.label = label
        self.members: list[ContainerMember] = []
        self.parent: str | None = None

    @property
    def key(self) -> str:
        return f'{self.root.address:#x}:{self.model.name}'

    def add_member(self, key: str | None, **links: str | None) -> None:
        if key and key.startswith('0x0:'):
            key = None
        for label, target in links.items():
            if isinstance(target, str) and target.startswith('0x0:'):
                links[label] = None
        xlinks = {label: Link(LinkType.DIRECT, target, None) for label, target in links.items()}
        self.members.append(ContainerMember(key, xlinks))

    def add_link_to_member(self, key: str | None, **links: str | None) -> None:
        for label, target in links.items():
            if isinstance(target, str) and target.startswith('0x0:'):
                links[label] = None
        xlinks = {label: Link(LinkType.DIRECT, target, None) for label, target in links.items()}
        for member in self.members:
            if member.key == key:
                member.links |= xlinks

    def to_json(self) -> dict:
        return {
            'key':     self.key,
            'label':   self.label,
            'members': [member.to_json() for member in self.members],
            'parent':  self.parent
        }

class ContainerConv(JSONRepr):

    def __init__(self, model: 'shape.ContainerConv', source: Box | Container) -> None:
        self.model = model
        self.source = source
        self.members: list[ContainerMember] = []
        self.parent: str | None = None

    @property
    def key(self) -> str:
        return f'{self.source.root.address:#x}:{self.model.name}'

    def add_member(self, key: str | None, **links) -> None:
        if key and key.startswith('0x0:'):
            key = None
            # links = {}
        for label, target in links.items():
            if isinstance(target, str) and target.startswith('0x0:'):
                links[label] = None
        self.members.append(ContainerMember(key, {}))

    def to_json(self) -> dict:
        return {
            'source':  self.source.key,
            'key':     self.key,
            'members': [member.to_json() for member in self.members],
            'parent':  self.parent
        }

NotPrimitive = Box | Container | ContainerConv
