define KObject as Box<kobject> {
    :default [
        Text<string> name
        Text<raw_ptr> kset, ktype
    ]
    :default => :parent [
        Link parent -> @parent
    ]
} where {
    parent = KObject(@this.parent)
}
