from visualinux.viewcl.model.containers.array import *
from visualinux.viewcl.model.containers.linkedlist import *
from visualinux.viewcl.model.containers.hlist import *
from visualinux.viewcl.model.containers.rbtree import *
from visualinux.viewcl.model.containers.xarray import *
from visualinux.viewcl.model.containers.unordered_set import *

def get_basic_container_shape(name: str) -> Type[Container]:
    match name:
        case 'Array':  return Array
        case 'List':   return List
        case 'HList':  return HList
        case 'RBTree': return RBTree
        case 'XArray': return XArray
        case 'UnorderedSet': return UnorderedSet
        case _: raise fuck_exc(AssertionError, f'undefined container type {name = }')
