from visualinux import *
from lark import Lark, ParseTree, Token, Tree

class UnexpectedTokenError(Exception):
    def __init__(self, token: Tree[Token], *args) -> None:
        super().__init__(*args)
        self.token = token
    def __str__(self) -> str:
        return f'unexpected token {self.token.data}: {serialize(self.token)}'

class UnexpectedSymbolError(Exception):
    def __init__(self, name: str, value, *args) -> None:
        super().__init__(*args)
        self.name  = name
        self.value = value
    def __str__(self) -> str:
        return f'unexpected symbol {self.name} = {self.value}'

class SemanticsError(Exception):
    def __init__(self, msg: str) -> None:
        super().__init__()
        self.msg = msg
    def __str__(self) -> str:
        return self.msg

def serialize(node: Token | Tree[Token] | None, delim: str = '') -> str:
    if node is None:
        return ''
    if isinstance(node, Token):
        return node.value
    return delim.join([token.value for token in node.scan_values(lambda v: isinstance(v, Token))])

def child_as_token(node: Tree[Token], index: int) -> Token:
    try:
        return node.children[index] # type: ignore
    except Exception as e:
        raise fuck_exc(e.__class__, f'raise {e!s} in child_as_token[{index = }] for {node = }')

def child_as_tree(node: Tree[Token], index: int) -> Tree[Token]:
    try:
        return node.children[index] # type: ignore
    except Exception as e:
        raise fuck_exc(e.__class__, f'raise {e!s} in child_as_tree[{index = }] for {node = }')

def child_as_tree_safe(node: Tree[Token] | None, index: int) -> Tree[Token] | None:
    if node is None:
        return None
    try:
        return node.children[index] # type: ignore
    except IndexError:
        return None

def scan_children_as_tree(node: Tree[Token] | ParseTree, skip: int = 0) -> Generator[Tree[Token], None, None]:
    for child in node.children:
        if skip > 0:
            skip -= 1
            continue
        if isinstance(child, Tree):
            yield child
