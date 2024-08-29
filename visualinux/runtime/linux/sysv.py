from visualinux import *
from visualinux.runtime.kvalue import *

def sysv_msg_get_text(msg_msg: KValue) -> KValue:
    ptr = msg_msg.address + msg_msg.gtype.target_size()
    return KValue(GDBType.basic('char').pointer(), ptr)
