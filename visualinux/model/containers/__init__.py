from visualinux.model.containers.array import *
from visualinux.model.containers.linkedlist import *
from visualinux.model.containers.hlist import *
from visualinux.model.containers.rbtree import *
from visualinux.model.containers.xarray import *
from visualinux.model.containers.unordered_set import *

def get_basic_container_shape(name: str) -> Type[Container]:
    match name:
        case 'Array':  return Array
        case 'List':   return List
        case 'HList':  return HList
        case 'RBTree': return RBTree
        case 'XArray': return XArray
        case 'UnorderedSet': return UnorderedSet
        case _: raise fuck_exc(AssertionError, f'undefined container type {name = }')
