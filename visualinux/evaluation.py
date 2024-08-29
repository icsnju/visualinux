from visualinux import *

class EvaluationCounter:

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.objects = 0
        self.fields = 0
        self.bytes = 0

    def clone(self) -> 'EvaluationCounter':
        cloned = EvaluationCounter()
        cloned.objects = self.objects
        cloned.fields = self.fields
        cloned.bytes = self.bytes
        return cloned

evaluation_counter = EvaluationCounter()

def evaluation_show(name: str):
    name = name.replace(' ', '_')
    print(f'{name} count_objects {evaluation_counter.objects}')
    print(f'{name} count_fields {evaluation_counter.fields}')
    print(f'{name} count_bytes {evaluation_counter.bytes}')
