from visualinux.viewcl.parser.units import *
from visualinux.viewcl.parser.utils import *
from visualinux.viewcl.model import *

class Translator:

    def __init__(self) -> None:
        self.model = DiagramSet() # list of (shape, view)

    def translate(self, insts: list[Instruction]) -> DiagramSet:

        self.__init__()

        for inst in insts:
            if isinstance(inst, Assignment):
                self.interpret_assign(inst, self.model.globl)
            elif isinstance(inst, DiagramDef):
                self.interpret_diagdef(inst)
            else:
                raise fuck_exc(AssertionError, 'an inst must be either Assignment, FocusOpt or ViewDef')

        return self.model

    # ======================================================================
    # top-level translation (assignment/focus/diagdef)
    # ======================================================================

    def interpret_assign(self, inst: Assignment, parent_shape: Box | Container):
        if vl_debug_on(): printd(f'[DEBUG] interpret_assign {inst!s}')

        name, value = inst.lhs, inst.rhs

        if isinstance(value, Term):
            parent_shape.scope[name] = value
        elif isinstance(value, BoxDef):
            self.interpret_box(name, value, parent_shape)
        elif isinstance(value, ContainerDef | ContainerConvDef):
            self.interpret_container(name, value, parent_shape)
        elif isinstance(value, SwitchCaseDef):
            self.interpret_switch_case(name, value, parent_shape)
        else:
            raise fuck_exc(AssertionError, f'interpret_assign {inst = } illegal rhs')

    def interpret_diagdef(self, diagdef: DiagramDef):
        diagram = Diagram([], diagdef.init_viewql)
        for i, target in enumerate(diagdef.plots):
            name = f'{diagdef.name}.plot#{i}'
            diagram.plot_targets.append(self.interpret_plot(name, target))
        self.model.diagrams[diagdef.name] = diagram

    def interpret_plot(self, name: str, targetdef: PlotTargetDef) -> Box | Container:

        if not isinstance(targetdef, TermAsShape):
            self.interpret_assign(Assignment(lhs=name, rhs=targetdef), self.model.globl)
            return self.interpret_plot(name, TermAsShape.Variable(name))

        shape = self.interpret_term_as_shape(targetdef, self.model.globl.scope)
        if isinstance(shape, Box | Container):
            if shape.label == name:
                shape.label = str(shape.root).removeprefix('$')
            return shape
        # elif isinstance(shape, Container):
        #     return (shape, None)
        else:
            raise fuck_exc(UnexpectedSymbolError, str(targetdef), shape)

    # ======================================================================
    # shape translation
    # ======================================================================

    def interpret_box(self, varname: str, shapedef: BoxDef, parent_shape: Box | Container | SwitchCase) -> Box:
        if vl_debug_on(): printd(f'[DEBUG] interpret_box {varname=} {shapedef=!s}')

        name  = shapedef.name
        root  = shapedef.root
        label = shapedef.label or varname
        if vl_debug_on(): printd(f'[DEBUG] interpret_box label? {shapedef.label = }, {varname = }, {shapedef.decl.term = !s}, {root = !s}')
        if shapedef.decl.term and shapedef.decl.term.head:
            label = label or shapedef.decl.term.head
        elif root:
            label = label or str(root)
        else:
            label = ''

        if shapedef.recursion:
            if vl_debug_on(): printd(f'[DEBUG] interpret_box: recursion detected')
            sp = parent_shape
            while sp and sp.name != name:
                if vl_debug_on(): printd(f'{sp = !s}')
                sp = sp.parent
            if not sp or not isinstance(sp, Box):
                raise fuck_exc(AssertionError, f'shape recursion for {name} but failed to find the origin box')
            rbox = BoxRecursion(sp, label, root, shapedef.term)
            parent_shape.scope[varname] = rbox
            return rbox

        box = Box(name, label, root, shapedef.term, OrderedDict(), parent=parent_shape)
        parent_shape.scope[varname] = box

        if shapedef.where:
            for inst in shapedef.where.inst_seq:
                if isinstance(inst, Assignment):
                    self.interpret_assign(inst, box)
                else:
                    raise fuck_exc(AssertionError, 'an inst in where block must be either Assignment or FocusOpt')

        used_labels: set[str] = set()
        for viewdef in shapedef.body:
            view = View(viewdef.name, viewdef.parent, OrderedDict(), box)

            for inst in viewdef.insts:

                if vl_debug_on(): printd(f'----[DEDBUG] intp_box {label=} {viewdef.name=} {inst=!s}')
                if isinstance(inst, ViewOpt):
                    if vl_debug_on(): printd(f'>> view_opt not handleed now..')
                    continue # TODO. view impl view opt

                if isinstance(inst, TextDef):
                    assert inst.root
                    member = Text(inst.label, inst.root, inst.typo, view)
                elif isinstance(inst, LinkDef):
                    if vl_debug_on(): printd(f'--------[DEDBUG] intp_box link {inst=!s} {inst.target=!s}')
                    target = self.interpret_term_as_shape(inst.target, box.scope) if inst.target else None
                    member = Link(inst.label, view, inst.link_type, target)
                    if vl_debug_on(): printd(f'--------[DEDBUG] intp_box link {target=!s} OK')
                elif isinstance(inst, InnerShapeDef):
                    member = self.interpret_term_as_shape(inst.root, box.scope)
                    member.label = inst.label
                    if vl_debug_on(): printd(f'--------[DEDBUG] intp_box inner_box {member=!s} OK')
                elif isinstance(inst, BoxDef):
                    member = self.interpret_box(inst.label, inst, box)
                elif isinstance(inst, ContainerDef | ContainerConvDef):
                    member = self.interpret_container(inst.label, inst, box)
                else:
                    raise fuck_exc(AssertionError, f'interpret_box unknown {inst = } in {viewdef.name = }')

                if member.label in used_labels or member.label in view.members:
                    print(f'view.members[{member.label}] = {view.members[member.label]}')
                    raise fuck_exc(AssertionError, f'interpret_box duplicated key {member.label} in {shapedef.format_string_head()}')
                view.members[member.label] = member

            # we don't allow the same label appears in different views of the same box
            for label in view.members:
                used_labels.add(label)

            box[viewdef.name] = view

        return box

    def interpret_container(self, varname: str, shapedef: ContainerDef | ContainerConvDef,
                            parent_shape: Box | Container | SwitchCase) -> Container | ContainerConv:

        if isinstance(shapedef, ContainerConvDef):
            if vl_debug_on(): printd(f'[DEBUG] interpret_container_conv {varname=} {shapedef=!s}')
            container_type = get_basic_container_shape(shapedef.name)
            source = self.interpret_term_as_shape(shapedef.root, parent_shape.scope)
            if not isinstance(source, Box | Container):
                raise fuck_exc(AssertionError, f'container_conv source must be box/container but {source = !s}')
            container_conv = ContainerConv(varname, source, container_type, shapedef.distill, parent=parent_shape)
            if vl_debug_on(): printd(f'[DEBUG] interpret_container_conv {container_conv=!s}')
            parent_shape.scope[varname] = container_conv
            return container_conv

        if vl_debug_on(): printd(f'[DEBUG] interpret_container {varname=} {shapedef=!s}')

        root = shapedef.root or Term.CExpr('NULL')

        container_type = get_basic_container_shape(shapedef.name)
        if vl_debug_on(): printd(f'[DEBUG] interpret_container {root=!s} {container_type.__name__=!s}')
        container = container_type(shapedef.label, root, shapedef.term, parent=parent_shape) # type: ignore
        if vl_debug_on(): printd(f'[DEBUG] interpret_container {container=!s}')
        parent_shape.scope[varname] = container

        # TODO: as_item
        assert shapedef.body
        container.scope[shapedef.body.item] = Term(TermType.ItemVar, shapedef.body.item, [])

        member_shape: Shape | SwitchCase | ContainerConv | None = None
        for inst in shapedef.body.inst_seq:
            if isinstance(inst, Assignment):
                self.interpret_assign(inst, container)
            elif member_shape:
                raise fuck_exc(AssertionError, 'two yield_opt in one container body')
            else:
                # container.node_on = inst.node_on
                local_name = '' #varname + ':node'
                if vl_debug_on(): printd(f'    {varname=} fuck memsp')
                if isinstance(inst.item, TermAsShape):
                    member_shape = self.interpret_term_as_shape(inst.item, container.scope)
                elif isinstance(inst.item, BoxDef):
                    member_shape = self.interpret_box(local_name, inst.item, container)
                elif isinstance(inst.item, ContainerDef | ContainerConvDef):
                    member_shape = self.interpret_container(local_name, inst.item, container)
                else:
                    raise fuck_exc(AssertionError, f'yield unknown target {inst.item}')
                if vl_debug_on(): printd(f'    {varname=} fuck memsp {member_shape=!s}')

        if not member_shape:
            raise fuck_exc(AssertionError, 'no yield_opt found in container body')
        if not isinstance(member_shape, NotPrimitive):
            raise fuck_exc(AssertionError, f'container member unsupported {member_shape = !s}')

        container.member_shape = member_shape
        if vl_debug_on(): printd(f'    container.member_shape = {member_shape!s}')
        if vl_debug_on(): printd(f'    {container=!s} OK')
        return container

    # ======================================================================
    # switch-case translation
    # ======================================================================

    def interpret_switch_case(self, varname: str, swcdef: SwitchCaseDef, parent_shape: NotPrimitive) -> SwitchCase:
        if vl_debug_on(): printd(f'[DEBUG] interpret_switch_case {varname=} {swcdef=!s}')
        swc = SwitchCase(f'swc({swcdef.switch_expr})', swcdef.switch_expr, [], None, parent=parent_shape)
        parent_shape.scope[varname] = swc
        for i, case in enumerate(swcdef.cases):
            local_name = f'case#{i}'
            if isinstance(case.shapedef, BoxDef):
                shape = self.interpret_box(local_name, case.shapedef, swc.parent)
            elif isinstance(case.shapedef, ContainerDef | ContainerConvDef):
                shape = self.interpret_container(local_name, case.shapedef, swc.parent)
            else:
                shape = self.interpret_switch_case(local_name, case.shapedef, swc.parent)
            swc.cases.append(Case(case.case_exprs, shape))
        if swcdef.otherwise:
            local_name = f'case#oth'
            if isinstance(swcdef.otherwise, BoxDef):
                swc.otherwise = self.interpret_box(local_name, swcdef.otherwise, swc.parent)
            elif isinstance(swcdef.otherwise, ContainerDef | ContainerConvDef):
                swc.otherwise = self.interpret_container(local_name, swcdef.otherwise, swc.parent)
            else:
                swc.otherwise = self.interpret_switch_case(local_name, swcdef.otherwise, swc.parent)
        return swc

    # ======================================================================
    # term translation
    # ======================================================================

    def interpret_term_as_shape(self, term: Term | None, scope: SymTable) -> PrimitiveShape | Box | Container | SwitchCase | ContainerConv:

        if vl_debug_on(): printd(f'[DEBUG] interpret_term_as_shape {term}')
        if term is None:   raise fuck_exc(AssertionError, f'try to interpret term = None')
        if term.is_type(): raise fuck_exc(AssertionError, f'try to interpret as-type {term = }')

        if term.is_cexpr(): raise fuck_exc(UnexpectedSymbolError, str(term), term)

        if term.is_variable():
            shape = scope.find_symbol(term.head)
            if not isinstance(shape, PrimitiveShape | Box | Container | SwitchCase | ContainerConv):
                raise fuck_exc(UnexpectedSymbolError, str(term), shape)
        else:
            assert term.is_field()
            assert scope.this
            shape = scope.this

        if term.field_seq:
            assert isinstance(shape, Box)
            return shape.find_member_of(term.field_seq)
        return shape
