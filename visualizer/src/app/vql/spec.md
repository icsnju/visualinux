# Specification of VQL

---

## Supported Attributes

| Attribute | Value | Default | Description |
| :-- | :-- | :-- | :-- |
| abst | string | default | the current displayed abstraction. illegal value will be redirected to 'default' |
| collapsed | boolean | false | whether the box is collapsed |
| shrinked | boolean | false | if true, all reachable object from the box will be hidden |
| direction | string | horizontal | should be either 'horizontal' or 'vertical'; it only works for Container (except for Array) |

---
