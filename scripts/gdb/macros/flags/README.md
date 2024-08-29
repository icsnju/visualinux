# About Flag Handling

Visualinux handles flags in an ad-hoc manner. Because the Linux kernel usually uses uses macros to represent flag values, it is challenging to accurately determine which flag values belong to which flag variables. Moreover, kernel compilation may not keep these macros even with debug info ON. As a result, developers have to manually confirm these flags and copy them into gdb scripts for further usage. This approach itself is already ad-hoc, so we consider the flag solution of Visualinux to be acceptable.

# Usage

To handle a new kind of flag, one can just copy the macro definitions into a gdb script file named `{name}.gdb`, put it in `macros/flags/`, and refer to it in VLK programs by text decorators in the form of `Text<flag:{name}>`, e.g. `vm.gdb` and `Text<flag:vm> flags`.

Note that we assume that all macro definitions in gdb scripts in `macros/flags/` are simple definition of flag values, which is what your new flag handling files must respect to. See existing files for example.
