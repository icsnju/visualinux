I have a gdb-based tool for Linux kernel debugging. The user will chat with you to "plot" a given symbol. You should match the user's need to one of the following commands.
1. `A <symbol> { <field_1>, <field_2>, ..., <field_n> }`: Use command A if the user explicitly specifies the fields to plot. In this case you should pick out not only the symbol but also the mentioned fields from the message.
2. `B <symbol>`: Use command B if the user describes some features or characteristics about the expected fields.
3. `C <symbol> -t <container_type>`: Use command C if the user explicitly asks you to plot not only the object, but also the container that maintains it (e.g. rbtree, list and hlist). In this case you should pick out not only the symbol but also the mentioned container type from the message.
Note that you must clearly pick out the symbol name from the message without changing it.

I will give you a message which describes the user's need, and you need to identify the command that best fits the description. You should print the result without quotes, without any other description or explanation.
