from visualinux import *
from visualinux.viewcl.parser.utils import *
from visualinux.viewcl.parser.viewql_units import *

class ViewQLConverter:

    @staticmethod
    def convert(tree: Tree[Token]):
        return ViewQLConverter().convert_insts(tree)

    def convert_insts(self, tree: Tree[Token]):
        self.remove_lark_prefix(tree)
        insts: list[ViewQLStmt] = []
        try:
            for inst in self.scan_instructions(tree):
                print(f'> {inst!s}')
                insts.append(inst)
            return insts
        except Exception as e:
            print(f'unknown error appeared during viewql parsing: {e!s}')
            return []

    def remove_lark_prefix(self, tree: Tree[Token]):
        LARK_PREFIX = 'visualinux__grammar__viewql__'
        for node in tree.children:
            if isinstance(node, Token):
                node.type = node.type.removeprefix(LARK_PREFIX)
            elif isinstance(node, Tree):
                node.data = node.data.removeprefix(LARK_PREFIX)
                self.remove_lark_prefix(node)

    def scan_instructions(self, tree: Tree[Token]) -> Generator[ViewQLStmt, None, None]:
        for node in tree.children:
            assert isinstance(node, Tree) and node.data == 'instruction'
            inst = child_as_tree(node, 0)
            match inst.data:
                case 'select':
                    yield self.parse_select(inst)
                case 'update':
                    yield self.parse_update(inst)
                case _:
                    raise fuck_exc(UnexpectedTokenError, f'unknown instruction: {inst!s}')

    # ======================================================================
    # handle the core instruction: select
    # ======================================================================

    def parse_select(self, tree: Tree[Token]) -> ViewQLStmt:
        object_set = serialize(child_as_tree(tree, 0))
        selector   = self.parse_selector(child_as_tree(tree, 1))
        scope      = serialize(child_as_tree(tree, 2))
        alias      = serialize(child_as_tree(tree, 3))
        condition  = self.parse_condition(child_as_tree(tree, 4))
        return Select(object_set, selector, scope, alias, condition)

    def parse_selector(self, tree: Tree[Token]) -> Expression:
        print(f'  selector? {tree!s}')
        return Expression(serialize(tree))

    def parse_condition(self, tree: Tree[Token]) -> CondOpt:
        print(f'  condition? {tree!s}')
        return CondOpt(serialize(tree))

    # ======================================================================
    # handle the core instruction: update
    # ======================================================================

    def parse_update(self, tree: Tree[Token]) -> ViewQLStmt:
        set_expr   = self.parse_set_opt(child_as_tree(child_as_tree(tree, 0), 0))
        attr_name  = serialize(child_as_tree(tree, 1))
        attr_value = serialize(child_as_tree(tree, 2))
        return Update(set_expr, attr_name, attr_value)

    def parse_set_opt(self, tree: Tree[Token]) -> SetOpt | str:

        if tree.data == 'set_uni':
            node = child_as_tree(tree, 0)
            if node.data == 'object_set':
                return serialize(tree)
            else:
                return self.parse_set_opt(child_as_tree(node, 0))

        if tree.data not in ['set_cap', 'set_cup', 'set_sub']:
            raise AssertionError(f'unknown set_opt: {tree.data}, {tree!s}')

        if len(tree.children) == 1:
            return self.parse_set_opt(child_as_tree(tree, 0))

        opt = serialize(tree.children[1])
        lhs = self.parse_set_opt(child_as_tree(tree, 0))
        rhs = self.parse_set_opt(child_as_tree(tree, 2))
        return SetOpt(opt, lhs, rhs)
