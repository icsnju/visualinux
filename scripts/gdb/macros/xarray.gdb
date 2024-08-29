shell echo "+ source macros/xarray.gdb"

### xarray entry

# define XA_CHUNK_SHIFT (CONFIG_BASE_SMALL ? 4 : 6)
macro define XA_CHUNK_SHIFT 6
macro define XA_CHUNK_SIZE (1UL << XA_CHUNK_SHIFT)
macro define XA_CHUNK_MASK (XA_CHUNK_SIZE - 1)

macro define xa_is_node(entry)     (xa_is_internal(entry) && (unsigned long)entry > 4096)
macro define xa_is_value(entry)    ((unsigned long)entry & 1)
macro define xa_is_internal(entry) (((unsigned long)entry & 3) == 2)

macro define xa_to_node(entry)     ((struct xa_node *)((unsigned long)entry - 2))
macro define xa_to_value(entry)    ((unsigned long)entry >> 1)
macro define xa_to_internal(entry) ((unsigned long)entry >> 2)

macro define xa_mk_internal(v)     ((void *)((v << 2) | 2))

macro define xa_is_retry(entry)    (entry == XA_RETRY_ENTRY)
macro define XA_RETRY_ENTRY		   xa_mk_internal(256)
macro define xa_is_zero(entry)     (entry == XA_ZERO_ENTRY)
macro define XA_ZERO_ENTRY		   xa_mk_internal(257)

# define xa_is_sibling(entry) IS_ENABLED(CONFIG_XARRAY_MULTI) && ...
macro define xa_is_sibling(entry)  (xa_is_internal(entry) && (entry < xa_mk_sibling(XA_CHUNK_SIZE - 1)))
macro define xa_mk_sibling(offset) xa_mk_internal(offset)
macro define xa_to_sibling(entry)  xa_to_internal(entry)
