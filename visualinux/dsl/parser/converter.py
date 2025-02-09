from visualinux import *
from visualinux.dsl.parser.utils import *
from visualinux.dsl.parser.units import *
from visualinux.dsl.parser.viewql_converter import ViewQLConverter

class Converter:

    def convert(self, parsetree: ParseTree) -> tuple[list[Instruction], dict[str, list[ShapeDesc]]]:

        self.parsetree = parsetree # temp for unknown bug
        self.typedefs: dict[str, BoxDecl | ContainerDecl] = {}
        self.in_typedef: str | None = None # an ad-hoc patch to handle recursion in typedefs

        insts: list[Instruction] = []
        for inst in self.scan_instructions(parsetree):
            insts.append(inst)
        if vl_debug_on(): printd('\n' + '='*60 + ' Final Insts: ' + '='*80)
        for inst in insts:
            if vl_debug_on(): printd(inst.format_string())
        if vl_debug_on(): printd('='*160)

        typemap_for_llm: dict[str, list[ShapeDesc]] = {}
        for name, decl in self.typedefs.items():
            if isinstance(decl, BoxDecl):
                typo = str(decl.term)
                typemap_for_llm.setdefault(typo, [])
                for view in decl.body:
                    if view.annotation:
                        annotation = view.annotation
                    else:
                        annotation = 'basic identity information' if view.name == 'default' else view.name
                    typemap_for_llm[typo].append(ShapeDesc(name, view.name, annotation))

        return insts, typemap_for_llm

    def scan_instructions(self, parsetree: ParseTree) -> Generator[Instruction, None, None]:
        for node in parsetree.children:
            assert isinstance(node, Tree) and node.data == 'instruction'
            inst = child_as_tree(node, 0)
            match inst.data:
                case 'assignment':
                    yield self.parse_assignment(inst)
                case 'typedef':
                    self.parse_typedef(inst)
                case 'diagdef':
                    yield self.parse_diagdef(inst)
                case 'comment':
                    # yield self.parse_comment(inst)
                    pass
                case _:
                    raise fuck_exc(UnexpectedTokenError, inst)

    # ======================================================================
    # handle the core instruction: assignment
    # ======================================================================

    def parse_assignment(self, inst: Tree[Token]) -> Assignment:

        assert inst.data == 'assignment'
        lhs   = serialize(inst.children[0])
        rnode = child_as_tree(inst, 1)

        rhs = None
        match rnode.data:
            # [Example] cpu_rq = ${cpu_rq(0)}.cfs
            case 'expr':
                rhs = self.get_term_from(rnode)
            # [Example] box_xx = Box<type>(@expr) [...]
            case 'assignment_rhs':
                rhs = self.parse_assignment_rhs(rnode)
            # [Example] maroot = switch ${is_single} { case true: Box(...) case false: MapleTreeNode(...) }
            case 'assignment_swc':
                rhs = self.parse_assignment_swc(rnode)
            case _:
                raise fuck_exc(UnexpectedTokenError, rnode)
        assert rhs
        assignment = Assignment(lhs=lhs, rhs=rhs)
        if vl_debug_on(): printd(assignment.format_string())
        return assignment

    def parse_assignment_rhs(self, inst: Tree[Token]) -> BoxDef | ContainerDef | ContainerConvDef:
        assert inst.data == 'assignment_rhs'
        rnode = child_as_tree(inst, 0)
        match rnode.data:
            case 'shape_definition':
                rhs = self.parse_shape_def(rnode)
            case 'box_definition':
                rhs = self.parse_box_def(rnode)
            case 'container_definition':
                rhs = self.parse_container_def(rnode)
            case 'container_conversion':
                rhs = self.parse_container_conv(rnode)
            case _:
                raise fuck_exc(UnexpectedTokenError, rnode)
        return rhs

    def parse_assignment_swc(self, inst: Tree[Token]) -> SwitchCaseDef:
        assert inst.data == 'assignment_swc'
        switch_expr = self.get_term_from(child_as_tree(inst, 0))
        cases: list[CaseDef] = []
        otherwise: BoxDef | ContainerDef | ContainerConvDef | SwitchCaseDef | None = None
        def parse_inner(item: Tree[Token]):
            if item.data == 'assignment_rhs':
                return self.parse_assignment_rhs(item)
            else:
                return self.parse_assignment_swc(item)
        for casedef in scan_children_as_tree(inst, skip=1):
            if casedef.data == 'case_stmt':
                case_exprs = []
                case_rhs = None
                for item in scan_children_as_tree(casedef):
                    if item.data == 'expr':
                        case_exprs.append(self.get_term_from(item))
                    else:
                        assert case_rhs is None
                        case_rhs = parse_inner(item)
                assert case_exprs
                assert case_rhs
                cases.append(CaseDef(case_exprs, case_rhs))
            elif casedef.data == 'otherwise_stmt':
                otherwise = parse_inner(child_as_tree(casedef, 0))

        return SwitchCaseDef(switch_expr, cases, otherwise)

    # ======================================================================
    # handle the comment
    # ======================================================================

    def parse_comment(self, inst: Tree[Token]):
        assert inst.data == 'comment'
        return '// ' + serialize(inst).removeprefix(' ')

    # ======================================================================
    # handle the top-level instruction: typedef
    # ======================================================================

    def parse_typedef(self, inst: Tree[Token]) -> None:

        assert inst.data == 'typedef'
        name  = serialize(inst.children[0])
        rnode = child_as_tree(inst, 1)

        self.in_typedef = name
        match rnode.data:
            case 'box_declaration':
                self.parse_box_decl(name, rnode)
            case 'container_declaration':
                if vl_debug_on(): printd(f'parse container_decl {name} = {rnode}')
                self.parse_container_decl(name, rnode)
            case _:
                raise fuck_exc(UnexpectedTokenError, rnode)
        self.in_typedef = None

    def add_typedef_box(self, name: str, typedef: BoxDecl) -> BoxDecl:
        if name in self.typedefs:
            al_typedef = self.get_typedef_box(name)
            for viewdef in typedef.body:
                for al_viewdef in al_typedef.body:
                    if viewdef.name == al_viewdef.name:
                        raise fuck_exc(KeyError, f'duplicated {viewdef.name = } for typedef {name}: {typedef}')
                al_typedef.body.append(viewdef)
            return al_typedef
        else:
            self.typedefs[name] = typedef
            return typedef

    def add_typedef_container(self, name: str, typedef: ContainerDecl) -> ContainerDecl:
        if name in self.typedefs:
            raise fuck_exc(KeyError, f'duplicated typedef {name}: {typedef}')
        self.typedefs[name] = typedef
        return typedef

    def get_typedef(self, name: str) -> BoxDecl | ContainerDecl:
        if name not in self.typedefs:
            print(f'all loaded typedefs:')
            for ii, typedef in self.typedefs.items():
                print(f'>>>> {ii}: {typedef}')
            raise fuck_exc(KeyError, f'failed to find typedef {name}')
        return self.typedefs[name]

    def get_typedef_box(self, name: str) -> BoxDecl:
        typedef = self.get_typedef(name)
        if not isinstance(typedef, BoxDecl):
            raise fuck_exc(KeyError, f'get_typedef_box({name}) but: {typedef}')
        return typedef

    def get_typedef_container(self, name: str) -> ContainerDecl:
        typedef = self.get_typedef(name)
        if not isinstance(typedef, ContainerDecl):
            raise fuck_exc(KeyError, f'get_typedef_contianer({name}) but: {typedef}')
        return typedef

    # ======================================================================
    # handle the top-level instruction: diagdef
    # ======================================================================

    def parse_diagdef(self, inst: Tree[Token]) -> DiagramDef:
        assert inst.data == 'diagdef'
        node_body = child_as_tree(inst, 0)
        node_viewql = child_as_tree_safe(child_as_tree_safe(inst, 1), 0)
        init_viewql = ViewQLConverter.convert(node_viewql)
        name = serialize(node_body.children[0])
        diagdef = DiagramDef(name, [], init_viewql)
        for item in scan_children_as_tree(node_body, skip=1):
            match item.data:
                case 'plot': diagdef.plots.append(self.parse_plot(item))
                case 'comment': pass
                case _: raise fuck_exc(UnexpectedTokenError, item)
        return diagdef

    def parse_plot(self, inst: Tree[Token]) -> PlotTargetDef:
        assert inst.data == 'plot'
        node = child_as_tree(child_as_tree(inst, 0), 0)
        match node.data:
            case 'access_variable_as_shape':
                target = self.get_term_as_shape_from(node)
            case 'assignment_rhs':
                target = self.parse_assignment_rhs(node)
            case 'assignment_switch_case':
                target = self.parse_assignment_swc(node)
            case _:
                raise fuck_exc(UnexpectedTokenError, node)
        if vl_debug_on(): printd(f'plot {target!s}')
        return target

    # ======================================================================
    # handle the term
    # ======================================================================

    def get_term_from(self, node: Tree[Token]) -> Term:

        head = child_as_tree(node, 0)
        headstr = serialize(head)
        match head.data:
            case 'access_this':
                category = TermType.Variable
            case 'access_variable':
                category = TermType.Variable
            case 'access_cexpr':
                category = TermType.CExpr
            case 'typename':
                category = TermType.Type
            case 'field_def':
                category = TermType.Field
            case _:
                raise fuck_exc(UnexpectedTokenError, head)

        field_seq: list[str] = []
        for item in scan_children_as_tree(node, skip=1):
            field_seq.append(serialize(item))

        if category == TermType.Field:
            field_seq.insert(0, headstr)
            return Term(category, '', field_seq)
        else:
            return Term(category, headstr, field_seq)

    def get_term_as_shape_from(self, node: Tree[Token]) -> TermAsShape:
        assert node.data == 'access_variable_as_shape' and child_as_tree(node, 0).data == 'access_variable'
        return TermAsShape.Variable(serialize(child_as_tree(node, 0)))

    # ======================================================================
    # handle the shape
    # ======================================================================

    def parse_shape_def(self, node: Tree[Token]) -> BoxDef | ContainerDef:
        assert node.data == 'shape_definition'
        node_id   = child_as_tree(node, 0)
        name      = serialize(node_id)
        node_typo = child_as_tree(node, 1)
        typo      = self.get_term_from(node_typo) if node_typo else None
        # root      = self.get_term_from(child_as_tree(node, 2))
        root, label = self.parse_shape_instantiation(child_as_tree(node, 2))
        typedef   = self.get_typedef(name)
        if isinstance(typedef, BoxDecl):
            return BoxDef.creat(root, typo, label, typedef, (self.in_typedef == name))
        elif isinstance(typedef, ContainerDecl):
            return ContainerDef.creat(root, label, typedef)
        else:
            raise fuck_exc(AssertionError, f'illegal {typedef = }')

    def parse_shape_def_field(self, node: Tree[Token]) -> BoxDef | ContainerDef:
        assert node.data == 'shape_definition_field'
        node_id = child_as_tree(node, 0)
        name    = serialize(node_id)
        root = self.get_term_from(child_as_tree(node, 1))
        label = str(root)
        typedef = self.get_typedef(name)
        if isinstance(typedef, BoxDecl):
            return BoxDef.creat(root, None, label, typedef, (self.in_typedef == name))
        elif isinstance(typedef, ContainerDecl):
            return ContainerDef.creat(root, label, typedef)
        else:
            raise fuck_exc(AssertionError, f'illegal {typedef = }')

    def parse_shape_instantiation(self, node: Tree[Token]) -> tuple[Term, str]:
        assert node.data == 'shape_instantiation'
        root = self.get_term_from(child_as_tree(node, 1))
        label = serialize(child_as_tree(node, 0))
        return (root, label)

    # ======================================================================
    # handle the box
    # ======================================================================

    def parse_box_decl(self, typename: str, node: Tree[Token]) -> BoxDecl:
        assert node.data == 'box_declaration'
        node_id   = child_as_tree(node, 0)
        node_typo = child_as_tree(node_id, 0)
        typo  = self.get_term_from(node_typo) if node_typo else None
        views = self.parse_view_decl_body(child_as_tree(node, 1))
        node_where = child_as_tree(node, 2)
        decl = BoxDecl.creat_in_typedef(typename, typo, views)
        decl = self.add_typedef_box(typename, decl)
        if node_where:
            decl.where = self.parse_where_block(node_where)
        return decl

    def parse_box_def(self, node: Tree[Token]) -> BoxDef:
        assert node.data in ['box_definition', 'box_definition_field']
        node_id   = child_as_tree(node, 0)
        if node_id.data == 'box_null':
            return BoxDef.creat_in_place(Term.CExpr('NULL'), None, '', [], None)
        node_typo = child_as_tree(node_id, 0)
        typo  = self.get_term_from(node_typo) if node_typo else None
        node_root = child_as_tree(node, 1)
        root, label = self.parse_box_instantiation(node_root) if node_root else (None, '')
        view  = self.parse_view_def_body(child_as_tree(node, 2))
        node_where = child_as_tree(node, 3)
        where = self.parse_where_block(node_where) if node_where else None
        return BoxDef.creat_in_place(root, typo, label, [view], where)

    def parse_box_def_field(self, node: Tree[Token]) -> BoxDef:
        assert node.data == 'box_definition_field'
        return self.parse_box_def(node)

    def parse_box_instantiation(self, node: Tree[Token]) -> tuple[Term | None, str]:
        assert node.data in ['box_instantiation', 'box_instantiation_field']
        if len(node.children) == 1:
            return (None, serialize(child_as_tree(node, 0)))
        root = self.get_term_from(child_as_tree(node, 1))
        label = serialize(child_as_tree(node, 0))
        return (root, label)

    # ======================================================================
    # handle the view inside box
    # ======================================================================

    def parse_view_decl_body(self, body: Tree[Token]) -> list[ViewDef]:
        assert body.data == 'view_decl_body'
        if child_as_tree(body, 0).data == 'view_def_body':
            return [self.parse_view_def_body(child_as_tree(body, 0))]
        viewractions = []
        for view in scan_children_as_tree(body):
            if view.data == 'comment': continue
            assert view.data == 'view_definition'
            viewractions.append(self.parse_view_def(view))
        return viewractions

    def parse_view_def(self, view: Tree[Token]) -> ViewDef:

        assert view.data == 'view_definition'

        view_anno = child_as_tree(view, 0)
        view_id   = child_as_tree(view, 1)
        view_body = child_as_tree(view, 2)

        view_def  = self.parse_view_def_body(view_body)
        view_def.annotation = serialize(view_anno).strip().rstrip()
        if view_id.data == 'view_identifier':
            view_def.name   = serialize(child_as_tree(view_id, 0))
        else:
            view_def.parent = serialize(child_as_tree(view_id, 0))
            view_def.name   = serialize(child_as_tree(view_id, 1))

        return view_def

    def parse_view_def_body(self, body: Tree[Token]) -> ViewDef:

        assert body.data == 'view_def_body'
        view_def = ViewDef('default', None, [], '')

        node_insts = child_as_tree(body, 0)
        for node in scan_children_as_tree(node_insts):
            assert node.data == 'view_def_inst'
            view_def.insts += self.parse_view_inst_seq(node)

        return view_def

    def parse_view_inst_seq(self, node: Tree[Token]) -> list[ViewInst]:
        assert node.data == 'view_def_inst'
        inst = child_as_tree(node, 0)
        insts: list[ViewInst] = []
        match inst.data:
            case 'prim_definition':
                for prim_def in self.scan_prim_def(inst):
                    insts.append(prim_def)
            case 'box_definition_field':
                insts.append(self.parse_box_def_field(inst))
            case 'shape_definition_field':
                insts.append(self.parse_shape_def_field(inst))
            case 'shape_definition_inner':
                insts.append(self.parse_shape_def_inner(inst))
            case 'view_operation':
                insts.append(self.parse_view_opt(inst))
            case 'comment':
                pass
            case _:
                raise fuck_exc(UnexpectedTokenError, inst)
        return insts

    def parse_view_opt(self, inst: Tree[Token]) -> ViewOpt:
        assert inst.data == 'view_operation'
        op = serialize(inst.children[0])
        opt = ViewOpt(op)
        return opt

    # ======================================================================
    # handle the where block for box
    # ======================================================================

    def parse_where_block(self, block: Tree[Token]) -> WhereBlock:
        assert block.data == 'where_block'
        inst_seq: list[Assignment] = []
        for node in scan_children_as_tree(block):
            inst = child_as_tree(node, 0)
            match inst.data:
                case 'assignment':
                    inst_seq.append(self.parse_assignment(inst))
                case 'comment':
                    pass
                case _:
                    raise fuck_exc(UnexpectedTokenError, inst)
        return WhereBlock(inst_seq)

    # ======================================================================
    # handle the container
    # ======================================================================

    def parse_container_decl(self, typename: str, node: Tree[Token]) -> ContainerDecl:
        assert node.data == 'container_declaration'
        node_id = child_as_tree(node, 0)
        name = serialize(child_as_tree(node_id, 0))
        node_typo = child_as_tree(node_id, 1)
        typo = self.get_term_from(node_typo) if node_typo else None
        body = self.parse_container_def_loop(child_as_tree(node, 1))
        decl = ContainerDecl.creat_in_typedef(name, typo, body)
        decl = self.add_typedef_container(typename, decl)
        return decl

    def parse_container_def(self, node: Tree[Token]) -> ContainerDef:
        assert node.data == 'container_definition'
        node_id = child_as_tree(node, 0)
        name = serialize(child_as_tree(node_id, 0))
        node_typo = child_as_tree(node_id, 1)
        typo = self.get_term_from(node_typo) if node_typo else None
        # root = self.get_term_from(child_as_tree(node, 1))
        root, label = self.parse_container_instantiation(child_as_tree(node, 1))
        label = label or str(root).removeprefix('@this.')
        body = self.parse_container_def_loop(child_as_tree(node, 2))
        return ContainerDef.creat_in_place(root, name, typo, label, body)

    def parse_container_instantiation(self, node: Tree[Token]) -> tuple[Term, str]:
        assert node.data == 'container_instantiation'
        root = self.get_term_from(child_as_tree(node, 1))
        label = serialize(child_as_tree(node, 0))
        return (root, label)

    def parse_container_def_loop(self, node: Tree[Token]) -> ContainerLoop:
        assert node.data == 'container_def_loop'
        item = serialize(child_as_tree(node, 0))
        body = child_as_tree(node, 1)
        loop = ContainerLoop(item, [])
        for node in scan_children_as_tree(body):
            inst = child_as_tree(node, 0)
            match inst.data:
                case 'yield_target':
                    loop.inst_seq.append(self.parse_yield_opt(inst))
                case 'assignment':
                    loop.inst_seq.append(self.parse_assignment(inst))
                case 'comment':
                    pass
                case _:
                    raise fuck_exc(UnexpectedTokenError, inst)
        return loop

    def parse_yield_opt(self, inst: Tree[Token]) -> YieldOpt:

        assert inst.data == 'yield_target'

        item = child_as_tree(inst, 0)
        match item.data:
            case 'access_variable_as_shape':
                return YieldOpt(self.get_term_as_shape_from(item))
            case 'shape_definition':
                return YieldOpt(self.parse_shape_def(item))
            case 'box_definition':
                return YieldOpt(self.parse_box_def(item))
            case 'container_definition':
                return YieldOpt(self.parse_container_def(item))
            case _:
                raise fuck_exc(UnexpectedTokenError, item)

    # ======================================================================
    # handle the container converter
    # ======================================================================

    def parse_container_conv(self, node: Tree[Token]) -> ContainerConvDef:
        name = serialize(child_as_tree(node, 0))
        node_root = child_as_tree(node, 1)
        root = self.get_term_as_shape_from(child_as_tree(node_root, 0))
        distill = serialize(child_as_tree(node_root, 1))
        return ContainerConvDef(name, root, distill)

    # ======================================================================
    # handle the primitive
    # ======================================================================

    def parse_shape_def_inner(self, node: Tree[Token]) -> InnerShapeDef:
        assert node.data == 'shape_definition_inner'
        label = serialize(child_as_tree(node, 0))
        root  = self.get_term_from(child_as_tree(node, 1))
        return InnerShapeDef(root, label)

    def scan_prim_def(self, node: Tree[Token]) -> Generator[TextDef | LinkDef, None, None]:
        '''Currently a primitive shape is either Text or Link.
           - text_definition: "Text" ["<" text_format ">"] field_terms
                              "Text" ["<" text_format ">"] label ":" (field_term | expr)
           - link_definition: "Link" label "->" link_target
           -                  "Link" label "~>" link_target
        '''
        assert node.data == 'prim_definition'
        inst = child_as_tree(node, 0)
        match inst.data:
            case 'text_definition':
                yield from self.scan_text_def(inst)
            case 'link_definition':
                yield self.parse_link_def(inst)
            case _:
                raise fuck_exc(UnexpectedTokenError, inst)

    def scan_text_def(self, node: Tree[Token]) -> Generator[TextDef, None, None]:
        typo = self.parse_text_fmt(child_as_tree(node, 0))
        child1 = child_as_tree(node, 1)
        if child1 and child1.data == 'field_terms':
            fields = child1
            for field in scan_children_as_tree(fields):
                root = self.get_term_from(field)
                yield TextDef(root, str(root), typo)
        else:
            label = serialize(child1)
            root  = self.get_term_from(child_as_tree(node, 2))
            yield TextDef(root, label, typo)

    def parse_text_fmt(self, node: Tree[Token] | None) -> TextFormat:
        if not node:
            return TextFormat.gen_default()
        item = child_as_tree(node, 0)
        desc = serialize(item)
        match item.data:
            case 'int_format':
                if desc != 'raw_ptr' and desc.find(':') == -1: desc += ':d'
                return TextFormat(TFType.INT, desc)
            case 'enum_format': return TextFormat(TFType.ENUM, desc)
            case 'bool_format': return TextFormat(TFType.BOOL, desc)
            case 'char_format': return TextFormat(TFType.CHAR, desc)
            case 'str_format':  return TextFormat(TFType.STR,  desc)
            case 'ptr_format':  return TextFormat(TFType.PTR,  desc)
            case 'fptr_format': return TextFormat(TFType.FPTR, desc)
            case 'flag_format':
                if desc.find(':') == -1: desc += ':'
                return TextFormat(TFType.FLAG, desc)
            case 'emoji_format':
                if desc.find(':') == -1: desc += ':'
                return TextFormat(TFType.EMOJI, desc)
            case _:
                raise fuck_exc(AssertionError, f'parse_text_fmt unknown {item.data = }')

    def parse_link_def(self, node: Tree[Token]) -> LinkDef:
        label = serialize(child_as_tree(node, 0))
        link_type = LinkType.gen_from(serialize(child_as_tree(node, 1)))
        node_target = child_as_tree(child_as_tree(node, 2), 0)
        match node_target.data:
            case 'placeholder':
                target = None
            case 'access_variable_as_shape':
                target = self.get_term_as_shape_from(node_target)
            case _:
                raise fuck_exc(UnexpectedTokenError, node_target)
        return LinkDef(target, label, link_type)
