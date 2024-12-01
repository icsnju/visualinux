# Specification of ViewQL

## Supported Attributes

| Attribute | Value | Default | Description |
| :-- | :-- | :-- | :-- |
| abst      | string  | default | the current displayed abstraction. illegal value will be redirected to 'default' |
| collapsed | boolean | false   | whether this box itself is collapsed |
| shrinked  | boolean | false   | whether all links to this box are shrinked |
| direction | string  | horizontal | should be `horizontal` or `vertical`, specifiying the growing direction of a container |
