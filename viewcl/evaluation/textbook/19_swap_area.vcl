import evaluation.textbook.15_bio
import evaluation.textbook.12_proc_and_vfs

define SwapInfoStruct as Box<swap_info_struct> [
    Text<flag:swap_info> flags
    Text pages, inuse_pages
    Link bdev -> @bdev
	Link swap_file -> @swap_file
] where {
    bdev = BlockDevice(@this.bdev)
    swap_file = File(@this.swap_file)
}

swap_info = Array(${&swap_info}).forEach |node| {
    yield [ Link swapinfo -> @si ] where { si = SwapInfoStruct(@node) }
}
diag textbook_19_swap_area {
    plot @swap_info
}
