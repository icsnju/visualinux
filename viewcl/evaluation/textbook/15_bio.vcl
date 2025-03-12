import evaluation.textbook.14-15_kobject

define BIOVec as Box<bio_vec> [
    Text bv_page
    Text bv_len
    Text bv_offset
]

define BIO as Box<bio> [
    Link bi_next -> @bi_next
    Text bi_bdev: bi_bdev.bd_dev
    Link first_vec -> @bi_io_vec
] where {
    bi_next = BIO(@this.bi_next)
    bi_io_vec = BIOVec(@this.bi_io_vec)
}

define Device as Box<device> [
    KObject kobj
    Link parent -> @parent
    Text<string> name: type.name
    Text id
    Text<enum:device_removable> removable
] where {
    parent = Device(@this.parent)
}

define Request as Box<request> [
    Link bio -> @bio
    Link bio_tail -> @bio_tail
] where {
    bio = BIO(@this.bio)
    bio_tail = BIO(@this.bio_tail)
}

define RequestQueue as Box<request_queue> [
    KObject kobj
    Link requeue_list -> @requeue_list
    Link last_merge -> @last_merge
] where {
    requeue_list = List<request_queue.requeue_list>(@this.requeue_list).forEach |item| {
        yield Request<request.queuelist>(@item)
    }
    last_merge = Request(@this.last_merge)
}

define GenDisk as Box<gendisk> [
    Text<string> disk_name
    Text major, first_minor, minors
    Link queue -> @queue
] where {
    queue = RequestQueue(@this.queue)
}

define BlockDevice as Box<block_device> [
    Text bd_dev
    Text bd_start_sect, bd_nr_sectors
    Text<bool> bd_read_only
    Text bd_partno
    Text bd_openers: bd_openers.counter
    Text bd_holders
    Device bd_device
    Link bd_disk -> @disk
    Link bd_queue -> @request_queue
] where {
    disk = GenDisk(@this.bd_disk)
    request_queue = RequestQueue(@this.bd_queue)
}

define SuperblockWithDev as Box<super_block> [
    Text s_dev
    Text<string> s_type.name
    Text<string> s_id
    Link s_bdev -> @blockdev
] where {
    blockdev = BlockDevice(@this.s_bdev)
}

superblocks = List<list_head>(${&super_blocks}).forEach |node| {
    yield SuperblockWithDev<super_block.s_list>(@node)
}

diag textbook_15_bio_example {
    plot @superblocks
} with {
    super_blocks = SELECT [List] FROM *
    UPDATE super_blocks WITH direction: vertical

    sb_no_bio = SELECT super_block
        FROM *
        WHERE s_bdev == NULL
    UPDATE sb_no_bio WITH trimmed: true
}
