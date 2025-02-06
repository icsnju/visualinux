from visualinux import *
from visualinux.viewql.memdb import MemDB

class ViewAttrsManager:

    def __init__(self, init_viewql: str = '') -> None:
        self.__db = MemDB()
