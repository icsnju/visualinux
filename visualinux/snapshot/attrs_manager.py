from visualinux import *
from visualinux.dsl.parser.viewql_units import *
from visualinux.runtime.entity import *
from tinydb import TinyDB, Query,where
from tinydb.storages import MemoryStorage

Typemap = dict[str, str] # field name -> field type
Scope   = dict[str, set[str]]

class ViewAttrsManager:

    def __init__(self) -> None:
        # the memdb is used separately:
        # - the default table is used for update
        # - the type-specific tables are used for query
        self.memdb = TinyDB(storage=MemoryStorage)
        self.typemaps: dict[str, Typemap] = {}

    def insert_box(self, box: Box) -> None:
        typemap = self.typemaps.setdefault(box.type, {})
        members: dict[str, Any] = {}
        reachable: list[str] = []
        for view in box.views.values():
            for label, member in view.members.items():
                if label in members:
                    raise fuck_exc(KeyError, f'duplicate member {label} in box {box!s}')
                if isinstance(member, Text):
                    members[label] = member.real_value
                elif isinstance(member, Link):
                    members[label] = member.target_key
                    if member.target_key:
                        reachable.append(member.target_key)
                        typemap[label] = member.target_type
                elif isinstance(member, BoxMember):
                    members[label] = member.object_key
                    if member.object_key:
                        reachable.append(member.object_key)
                        typemap[label] = member.object_type
                else:
                    raise fuck_exc(TypeError, f'unknown member type {member!s}')
        entry = {
            '$key': box.key, '$addr': box.addr, '$type': box.type, '$parent': box.parent,
            '^view': 'default'
        } | members
        entry['$reachable'] = reachable
        self.memdb.insert(entry)
        self.memdb.table(box.type).insert(entry)

    def insert_container(self, container: Container | ContainerConv) -> None:
        entry = {
            '$key': container.key, '$addr': container.addr, '$type': '$' + container.type, '$parent': container.parent,
            '$members': [member.key for member in container.members if member.key is not None],
            '^direction': 'horizontal',
        }
        entry['$reachable'] = entry['$members']
        self.memdb.insert(entry)
        self.memdb.table(entry['$type']).insert(entry)

    def intp_viewql(self, viewql: ViewQLCode) -> None:
        scope: Scope = {}
        for stmt in viewql.stmts:
            if isinstance(stmt, Select):
                self.intp_select(stmt, scope)
            elif isinstance(stmt, Update):
                self.intp_update(stmt, scope)
            else:
                raise fuck_exc(TypeError, f'unknown stmt type {stmt!s}')

    def intp_select(self, stmt: Select, scope: Scope) -> None:
        print(f'--intp {stmt!s}')
        # find the table of the specified object type
        if stmt.selector.head == '*':
            table = self.memdb
            scope_query = Query()
        else:
            table = self.memdb.table(stmt.selector.head)
            # start from the specified object set
            if stmt.scope == '*':
                object_keys = None
            else:
                object_keys = self.__eval_set_expr(scope, stmt.scope)
            # iterate to filter objects
            for suffix in stmt.selector.suffix:
                field_name = suffix.identifier
                field_type = self.__get_field_type_of(table.name, field_name)
                if field_type is None:
                    return # no satisfied objects
                if object_keys is not None:
                    objects = table.search(where('$key').one_of(list(object_keys)))
                else:
                    objects = table.all()
                object_keys = {obj[field_name] for obj in objects}
                print(f'~~ {suffix.identifier}: {object_keys!s}')
                table = self.memdb.table(field_type)
            #
            scope_query = where('$key').one_of(list(object_keys)) if object_keys else Query()

        print(f'~~ {table.name=!s} {scope_query=!s}')
        cond_query = self.__eval_cond_expr(scope, stmt.condition, stmt.alias) if stmt.condition else Query()
        try:
            result = table.search(scope_query & cond_query)
        except:
            result = table.all()
        result_keys = {obj['$key'] for obj in result}
        scope[stmt.object_set] = result_keys
        print(f'! scope[{stmt.object_set}] = {result_keys!s}')

    def intp_update(self, stmt: Update, scope: Scope) -> None:
        print(f'--intp {stmt!s}')
        object_keys = self.__eval_set_expr(scope, stmt.set_expr)
        print(f'--intp on {object_keys=!s}')
        print('1',self.memdb.search(where('$key').one_of(list(object_keys))))
        self.memdb.update({f'^{stmt.attr_name}': stmt.attr_value, '^?': True}, where('$key').one_of(list(object_keys)))
        print('2',self.memdb.search(where('^?').exists()))

    def __get_field_type_of(self, object_type: str, field_name: str) -> str | None:
        if typemap := self.typemaps.get(object_type):
            return typemap.get(field_name)
        return None

    def __eval_set_expr(self, scope: Scope, setopt: str | SetOpt) -> set[str]:
        if isinstance(setopt, str):
            return scope[setopt]
        # calculate children
        lhs = set(self.__eval_set_expr(scope, setopt.lhs))
        rhs = set(self.__eval_set_expr(scope, setopt.rhs))
        # evaluate set operation
        if setopt.opt == '^':
            return lhs.intersection(rhs)
        if setopt.opt == '|':
            return lhs.union(rhs)
        if setopt.opt == '\\':
            return lhs.difference(rhs)
        raise fuck_exc(ValueError, f'unknown setopt {setopt!s}')

    def __eval_cond_expr(self, scope: Scope, cond: CondOpt | Filter, alias: str | None):
        # for primitive cond expr synthesize a tinydb query
        if isinstance(cond, Filter):
            print(f'?filter {cond.lhs=!s} {cond.rhs=!s} {cond.opt=!s}')
            if cond.lhs.head == alias:
                if not cond.lhs.suffix:
                    lhs_query = where('$addr')
                else:
                    lhs_query = Query()
            else:
                lhs_query = where(cond.lhs.head)
            for suffix in cond.lhs.suffix:
                lhs_query = lhs_query[suffix.identifier]
            if cond.opt == '>':  return lhs_query > str(cond.rhs)
            if cond.opt == '<':  return lhs_query < str(cond.rhs)
            if cond.opt == '>=': return lhs_query >= str(cond.rhs)
            if cond.opt == '<=': return lhs_query <= str(cond.rhs)
            if cond.opt == '==': return lhs_query == str(cond.rhs)
            if cond.opt == '!=': return lhs_query != str(cond.rhs)
            if cond.opt == 'IN': return lhs_query.one_of(list(scope[str(cond.rhs)]))
            raise fuck_exc(TypeError, f'illegal cond expr {cond!s}')
        if not isinstance(cond.lhs, CondOpt | Filter) or not isinstance(cond.rhs, CondOpt | Filter):
            raise fuck_exc(TypeError, f'illegal cond expr {cond!s}')
        # synthesize children
        lhs = self.__eval_cond_expr(scope, cond.lhs, alias)
        rhs = self.__eval_cond_expr(scope, cond.rhs, alias)
        # evaluate logical operation
        if cond.opt == 'AND':
            return lhs & rhs
        if cond.opt == 'OR':
            return lhs | rhs
        raise fuck_exc(ValueError, f'unknown cond opt {cond.opt!s}')

    def to_json(self) -> dict:
        objects_with_attrs = self.memdb.search(where('^?').exists())
        print(f'{objects_with_attrs=!s}')
        return {obj['$key']: {
            attr[1:]: obj[attr] for attr in obj.keys() if attr.startswith('^') and attr != '^?'
        } for obj in objects_with_attrs}
