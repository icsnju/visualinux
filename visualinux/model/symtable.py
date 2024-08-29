from visualinux import *
from visualinux.term import *
from visualinux.runtime.kvalue import *
from visualinux.runtime.utils import *

if TYPE_CHECKING:
    from visualinux.model.shape import Shape, Box, Container, SwitchCase, ContainerConv, NotPrimitive

class UndefinedSymbolError(Exception):
    def __init__(self, symbol: str, *args) -> None:
        super().__init__(*args)
        self.symbol = symbol
    def __str__(self) -> str:
        return f'undefined symbol {self.symbol}'

REGEX_PATTERN_DEMIX = r'(@[\w_]+(?:\.[\w_]+)*)'

class SymTable:

    def __init__(self, this: 'NotPrimitive | None' = None, **init_vardefs) -> None:
        self.this = this
        self.data: dict[str, 'Term | NotPrimitive | ContainerConv'] = {}
        if self.this:
            self['this'] = self.this
        for key, value in init_vardefs.items():
            self[key] = value
        self.root_value: KValue | None = None

    @property
    def parent(self) -> 'SymTable | None':
        return self.this.parent.scope if self.this and self.this.parent else None

    def __contains__(self, key: str): return self.data.__contains__(key)
    def __getitem__(self, key: str): return self.data.__getitem__(key)
    def __setitem__(self, key: str, value: 'Term | NotPrimitive | ContainerConv'): self.data.__setitem__(key, value)
    def items(self): return self.data.items()

    def __str__(self) -> str:
        return self.format_string()

    def format_string(self, depth: int = 0) -> str:
        # maxlen = max([len(name) for name in self.data.keys()]) if self.data else 0
        lines: list[str] = []
        for name, value in self.items():
            if name == 'this':
                continue
            rhs = value.format_string_head()
            lines.append(padding(depth) + f'{name} = {rhs}')
            if not isinstance(value, Term) and value.scope:
                lines.append(value.scope.format_string(depth + 1))
        return '\n'.join(lines)

    def find_symbol(self, name: str) -> 'Term | Shape | SwitchCase | ContainerConv':
        return self.find_symbol_scope(name)[name]

    def find_symbol_scope(self, name: str):
        if self.this:
            if vl_debug_on(): printd(f'>>>> find_symbol {name=!s} in scope of {self.this.format_string_head()}')
        else:
            if vl_debug_on(): printd(f'>>>> find_symbol {name=!s} in :Recursion')
        name = name.split(':')[0]

        scope = self
        while scope and name not in scope:
            if vl_debug_on(): printd(f'     ,,,not in scope of {scope.this.format_string_head() if scope.this else 233}')
            scope = scope.parent
        if not scope:
            raise fuck_exc(UndefinedSymbolError, name)

        if vl_debug_on(): printd(f'>>>>>> found {scope[name].format_string_head()} in scope of {scope.this.format_string_head() if scope.this else 233}')
        return scope

    def demix_typo(self, term: Term, item_value: KValue | None = None) -> Term:
        if not term.is_type():
            raise AssertionError(f'try demix_typo on {term = !r}')
        if vl_debug_on(): printd(f'<demix_typo> {term}')
            
        demix_typo_repl = lambda field: re.sub(
            r'\[' + REGEX_PATTERN_DEMIX + r'\]', 
            lambda match: '[' + str(self.__demix_term(list(match.groups()), item_value).value) + ']', 
            field)
        demixed = Term.Type(demix_typo_repl(term.head)).extend([demix_typo_repl(field) for field in term.field_seq])
        if vl_debug_on(): printd(f'<demix_typo> {term} => {demixed}')
        return demixed

    def __demix_term(self, matches: list[str], item_value: KValue | None = None) -> KValue:
        printd(f'__demix_term {matches=!s} {item_value=}')
        demixed = self.evaluate_term(Term.Variable(matches[0][1 :]).extend(list(matches)[1 :]), None, item_value)
        printd(f'__demix_term {matches=!s} {item_value=} => {demixed = }')
        return demixed

    def demix_label(self, label: str, item_value: KValue | None = None) -> str:
        try:
            def repl_0(match: re.Match[str]) -> str:
                return self.evaluate_term(Term.CExpr(match.group()[2 : -1]), None, item_value).value_string()
            label = re.sub(r'\$\{[^\{\}]+\}', repl_0, label)
            def repl(match: re.Match[str]) -> str:
                expr = match.group()[1 : -1]
                if expr.startswith('@'):
                    term = Term.Variable(expr[1 :])
                    text = self.evaluate_term(term, None, item_value).value_string()
                else:
                    term = Term.Field(expr)
                    text = self.evaluate_term(term, None, item_value).dereference().value_string()
                return text
            label = re.sub(r'\{[^\{\}]+\}', repl, label)
            if vl_debug_on(): printd(f'  => {label = !s}')
        except Exception as e:
            raise fuck_exc(e.__class__, str(e))
        return label

    __cexpr_eval_cache: dict[tuple[Term, Term | None], 'KValue'] = {}
    @classmethod
    def reset(cls):
        cls.__cexpr_eval_cache.clear()
        cls.__cexpr_eval_cache[(Term.CExpr('true'), None)]  = KValue(GDBType.basic('bool'), 1)
        cls.__cexpr_eval_cache[(Term.CExpr('false'), None)] = KValue(GDBType.basic('bool'), 0)

    def evaluate_term(self, term: Term, cast: Term | None = None, item_value: KValue | None = None) -> KValue:

        if term is None:
            return KValue_NULL
        if vl_debug_on(): printd(f'[DEBUG] evaluate_term {term!s} ({term.category}) ({cast=!s}) ({item_value = !s}) in-scope-of {self.this.format_string_head() if self.this else "??"}')

        if cast: cast = self.demix_typo(cast, item_value)

        try:
            match term.category:
                case TermType.Type:
                    raise fuck_exc(AssertionError, f'try to evaluate as-type {term = }')
                case TermType.CExpr:
                    matches: list[str] = re.findall(REGEX_PATTERN_DEMIX, term.head)
                    local = {
                        'data': {
                            match: self.__demix_term(match.split('.'), item_value)
                            for match in matches
                        }
                    }
                    demixed_head = term.head
                    for demkey, demval in local['data'].items():
                        demixed_head = demixed_head.replace(demkey, str(demval))
                    demixed = Term.CExpr(demixed_head).extend(term.field_seq)
                    if (demixed, cast) in self.__cexpr_eval_cache:
                        return self.__cexpr_eval_cache[(demixed, cast)]
                    try:
                        assert re.match(r'[\w_]+\(.*\)', term.head)
                        if vl_debug_on(): printd(f'<demix_py_eval> {term=!s}: {matches=!s}')
                        head_replaced = re.sub(REGEX_PATTERN_DEMIX, 
                            lambda match: f'data[\'{match.group()}\']', term.head)
                        if vl_debug_on(): printd(f'<demix_py_eval> {term=!s}: {head_replaced=!s}, {local=!s}')
                        py_evaled: KValue = eval(head_replaced, globals(), local)
                        if vl_debug_on(): printd(f'<demix_py_eval> {term=!s} => {py_evaled = !s}')
                        if not isinstance(py_evaled, KValue):
                            raise fuck_exc(AssertionError, f'py_eval retval is not a KValue: {py_evaled!s}')
                        evaled = py_evaled
                    except Exception as e:
                        if vl_debug_on(): printd(f'<demix_py_eval> {term=!s} failed: ' + str(e))
                        evaled = KValue.eval(demixed, cast)
                    self.__cexpr_eval_cache[(demixed, cast)] = evaled
                    return evaled
                case TermType.ItemVar:
                    if not item_value:
                        raise fuck_exc(AssertionError, 'scope.eval itemVar but item_value not provided')
                    if vl_debug_on(): printd(f'[DEBUG] evaluate_term {term!s} as_itemvar {item_value = !s}')
                    return item_value
                case TermType.Variable:
                    if term.head == 'this':
                        if self.root_value is None:
                            raise fuck_exc(AssertionError, f'scope.eval {term!s} but {self.root_value = }')
                        return self.root_value.eval_fields(term.field_seq).cast(cast)
                    vterm_scope = self.find_symbol_scope(term.head)
                    vterm = vterm_scope[term.head]
                    if isinstance(vterm, Term):
                        if vl_debug_on(): printd(f'[DEBUG] evaluate_term var as itemvar: {term!s} => {vterm!s}')
                        value = vterm_scope.evaluate_term(vterm, None, item_value)
                    # else:
                    elif isinstance(vterm, ContainerConv):
                        # try:
                            value = vterm_scope.evaluate_term(vterm.source.root, vterm.source.type, item_value)
                            if vl_debug_on(): printd(f'[DEBUG] evaluate_term var as container_conv: {term!s} => {vterm.format_string_head()}')
                    else:
                        # except:
                            if vl_debug_on(): printd(f'[DEBUG] evaluate_term var as shape: {term!s} => {vterm.format_string_head()}')
                            if not vterm.root:
                                return KValue_Undefined
                            if vterm_scope == self:
                                vterm_scope = self.parent
                            if not vterm_scope:
                                return KValue_NULL
                            # if vl_debug_on(): printd(f'[DEBUG] in-var-is-shape: scope-of- {vterm_scope.this.format_string_head()}')
                            value = vterm_scope.evaluate_term(vterm.root, vterm.type, item_value)
                    if vl_debug_on(): printd(f'[DEBUG] evaluate_term var {value = }, before {cast = }')
                    xxx = value.eval_fields(term.field_seq).cast(cast)
                    if vl_debug_on(): printd(f'[DEBUG] evaluate_term var => {xxx = }')
                    return xxx
                case TermType.Field:
                    if self.this:
                        if vl_debug_on(): printd(f'[DEBUG] evaluate_term field {term = }, {self.root_value = !s}')
                        if self.root_value is None:
                            raise fuck_exc(AssertionError, f'scope.eval as_field {term!s} but {self.root_value = }')
                        root = self.root_value
                        if vl_debug_on(): printd(f'[DEBUG] evaluate_term field {root = }')
                        if vl_debug_on(): printd(f'[DEBUG] evaluate_term field {root = }, before {cast = }')
                        return root.eval_fields(term.field_seq).cast(cast)
                    else:
                        return KValue_NULL
        except Exception as e:
            raise fuck_exc(UndefinedSymbolError, f'failed scope.eval {term!s} ({item_value = !s}) in {self.this.format_string_head() if self.this else "??"}: {e!s}')

    def clone_to(self, this: 'NotPrimitive | None' = None) -> 'SymTable':
        new_scope = SymTable(this)
        for key, value in self.data.items():
            if key != 'this':
                new_scope[key] = value
        return new_scope
