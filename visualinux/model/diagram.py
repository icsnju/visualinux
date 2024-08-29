from visualinux import *
from visualinux.term import *
from visualinux.model.shape import *
from visualinux.runtime.state import *

from visualinux.evaluation import *

PlotTarget = Box | Container

@dataclass
class Diagram:
    plot_targets: list[PlotTarget]
    init_vql: str

class DiagramSet:

    def __init__(self) -> None:
        self.globl = Box(name='Box', label='$', root=Term.CExpr('NULL'), type=None, views=OrderedDict(), parent=None)
        self.diagrams: dict[str, Diagram] = {}
        self.typemap_for_llm: dict[str, list[ShapeDesc]] = {}

    def __str__(self) -> str:
        ss = 'DiagramSet:\n'
        for name, diagram in self.diagrams.items():
            ss += f'  {name} {{\n'
            for target in diagram.plot_targets:
                ss += f'    plot {target!s}\n'
            ss += '  }}'
            if diagram.init_vql:
                ss += f' with {{\n'
                ss += diagram.init_vql
                ss += f'  }}'
        return ss

    def sync(self) -> State:
        state = State()
        evaluation_result: OrderedDict[str, EvaluationCounter] = OrderedDict()
        for name, diagram in self.diagrams.items():
            try:
                evaluation_counter.reset()
                # state.substates[name] = show_time_usage(name, lambda: self.sync_sub(name, targets))
                state.substates[name] = self.sync_sub(name, diagram)
                # evaluation_show(name)
                evaluation_result[name] = evaluation_counter.clone()
            except Exception as e:
                print(f'subdiag {name} sync() error: ' + str(e))
                state.substates[name] = Substate(name, diagram.init_vql, error=True)
        for name, result in evaluation_result.items():
            pass
        return state

    def sync_sub(self, name: str, diagram: Diagram):
        substate = Substate(name, diagram.init_vql)
        for shape in diagram.plot_targets:
            if vl_debug_on(): printd(f'diag eval shape = {shape.format_string_head()}')
            ent = shape.evaluate_on(substate.pool)
            if ent.key.startswith('0x0:'):
                continue
            substate.add_plot(ent.key)
        substate.do_postprocess()
        return substate
