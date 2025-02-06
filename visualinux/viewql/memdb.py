from tinydb import TinyDB, where
from tinydb.storages import MemoryStorage

class MemDB:

    def __init__(self) -> None:
        self.__db = TinyDB(storage=MemoryStorage)

    def test(self) -> None:
        foo = lambda key, value: where(key) == value
        self.__db.search(foo('name', 'John') & foo('age', 30))
