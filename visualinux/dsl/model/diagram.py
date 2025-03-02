from visualinux import *
from visualinux.term import *
from visualinux.dsl.model.shape import *
from visualinux.dsl.parser.viewql_units import *
from visualinux.snapshot import *
from visualinux.evaluation import *

PlotTarget = Box | Container

@dataclass
class Diagram:
    plot_targets: list[PlotTarget]
    init_viewql: ViewQLCode

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
            if diagram.init_viewql:
                ss += f' with {{\n'
                ss += diagram.init_viewql.format_string(2)
                ss += f'  }}'
        return ss

    def sync(self) -> Snapshot:
        snapshot = Snapshot()
        evaluation_result: OrderedDict[str, EvaluationCounter] = OrderedDict()
        for name, diagram in self.diagrams.items():
            try:
                try:
                    evaluation_counter.reset()
                    # state.substates[name] = show_time_usage(name, lambda: self.sync_sub(name, targets))
                    snapshot.add_view(self.sync_sub(name, diagram))
                    # evaluation_show(name)
                    evaluation_result[name] = evaluation_counter.clone()
                except Exception as e:
                    raise fuck_exc(Exception, 'vl_sync() unhandled exception')
            except Exception as e:
                print(f'subdiag {name} sync() error: ' + str(e))
                snapshot.add_view(StateView(name, error=True))
        for name, result in evaluation_result.items():
            pass
        return snapshot

    def sync_sub(self, name: str, diagram: Diagram):
        view = StateView(name)
        for shape in diagram.plot_targets:
            if vl_debug_on(): printd(f'diag eval shape = {shape.format_string_head()}')
            ent = shape.evaluate_on(view.pool)
            if ent.key.startswith('0x0:'):
                continue
            view.add_plot(ent.key)
        view.do_postprocess()
        view.intp_viewql(diagram.init_viewql)
        return view
