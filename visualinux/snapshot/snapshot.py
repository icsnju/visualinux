from visualinux import *
from visualinux.runtime import entity

class Pool:

    def __init__(self) -> None:
        self.__pool_box: dict[str, entity.Box] = {}
        self.__pool_container: dict[str, entity.Container | entity.ContainerConv] = {}
        self.__xkey: int = 0

    def boxes(self): return self.__pool_box.items()
    def containers(self): return self.__pool_container.items()

    def add_box(self, ent: entity.Box) -> None:
        self.__add_check(ent)
        if vl_debug_on(): printd(f'pool.add_box({ent.key})')
        self.__pool_box[ent.key] = ent

    def add_container(self, ent: entity.Container | entity.ContainerConv) -> None:
        self.__add_check(ent)
        if vl_debug_on(): printd(f'pool.add_container({ent.key})')
        self.__pool_container[ent.key] = ent

    def __add_check(self, ent: entity.NotPrimitive) -> None:
        if ent.key in self.__pool_box:
            raise fuck_exc(AssertionError, f'duplicated key {ent.key} in pool.boxes: {ent = !s}, existed: {self.__pool_box[ent.key]!s}')
        if ent.key in self.__pool_container:
            raise fuck_exc(AssertionError, f'duplicated key {ent.key} in pool.containers: {ent = !s}, existed: {self.__pool_container[ent.key]!s}')

    def find(self, key: str | None) -> entity.NotPrimitive | None:
        if key is None:
            return None
        if key in self.__pool_box:
            return self.__pool_box[key]
        if key in self.__pool_container:
            return self.__pool_container[key]
        return None

    def find_box(self, key: str | None) -> entity.Box | None:
        if key is None:
            return None
        if key in self.__pool_container:
            raise fuck_exc(AssertionError, f'try to find_box {key = } but found in {self.__pool_container = !s}')
        if key in self.__pool_box:
            return self.__pool_box[key]
        return None

    def find_container(self, key: str | None) -> entity.Container | None:
        if key is None:
            return None
        if key in self.__pool_box:
            raise fuck_exc(AssertionError, f'try to find_container {key = } but found in {self.__pool_box = !s}')
        if key in self.__pool_container:
            ent = self.__pool_container[key]
            if not isinstance(ent, entity.Container):
                raise fuck_exc(AssertionError, f'find_container {key = } but not an ent.Container: {ent = !s}')
            return ent
        return None

    def find_container_conv(self, key: str) -> entity.ContainerConv | None:
        if key in self.__pool_box:
            raise fuck_exc(AssertionError, f'try to find_container {key = } but found in {self.__pool_box = !s}')
        if key in self.__pool_container:
            ent = self.__pool_container[key]
            if not isinstance(ent, entity.ContainerConv):
                raise fuck_exc(AssertionError, f'find_container {key = } but not an ent.ContainerConv: {ent = !s}')
            return ent
        return None

    def gen_key_for_xbox(self) -> int:
        '''Generate a unique key for Box with root=None.
        '''
        self.__xkey += 1
        return self.__xkey

    def to_json(self) -> dict[str, dict]:
        return {
            'boxes':
                dict((key, ent.to_json()) for key, ent in self.__pool_box.items()),
            'containers':
                dict((key, ent.to_json()) for key, ent in self.__pool_container.items())
        }

class StateView:

    def __init__(self, name: str, init_vql: str, error: bool = True) -> None:
        self.name = name
        self.pool = Pool()
        self.plot: list[str] = []
        self.init_vql: str = init_vql
        self.error = error

    def add_plot(self, key: str) -> None:
        self.plot.append(key)

    def do_postprocess(self) -> None:
        for key, ent in self.pool.boxes():
            ent.parent = None
        for key, ent in self.pool.containers():
            ent.parent = None
        for key, ent in self.pool.boxes():
            for view in ent.views.values():
                for member in view.members.values():
                    if isinstance(member, entity.BoxMember):
                        if member.object_key is None:
                            continue
                        ent_child = self.pool.find(member.object_key)
                        if not ent_child:
                            raise fuck_exc(AssertionError, f'entity not found for boxmember {member!s} of box {key}')
                        ent_child.parent = key
                        if vl_debug_on(): printd(f':{view.name} set_parent {ent_child.key=} .parent= {key=}')
        for key, ent in self.pool.containers():
            if isinstance(ent, entity.ContainerConv):
                continue
            for member in ent.members:
                if member.key is None:
                    continue
                ent_child = self.pool.find(member.key)
                if not ent_child:
                    raise fuck_exc(AssertionError, f'entity not found for {member.key = } of container {key}')
                ent_child.parent = key
                if vl_debug_on(): printd(f'container set_parent {ent_child.key=} .parent= {key=}')

    def to_json(self) -> dict:
        return {
            'name': self.name,
            'pool': self.pool.to_json(),
            'plot': self.plot,
            'init_vql': self.init_vql,
            'stat': int(self.error),
        }

class Snapshot:

    def __init__(self) -> None:
        self.views: list[StateView] = []

    def add_view(self, view: StateView):
        self.views.append(view)

    def to_json(self) -> dict:
        return dict((view.name, view.to_json()) for view in self.views)
