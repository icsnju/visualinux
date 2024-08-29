I have a debugging framework consisting of two components: the gdb stub and the visualizer. The user can invoke commands in either component to achieve different goals.

For the gdb stub, the user can command to plot a specific object with specific fields in specific forms, i.e. extract an object graph from the runtime state of Linux kernel.

For the visualizer, the user can command to manipulate the panes (or windows), or manipulate the extracted object graphs which are displayed in the panes.
For example, split the pane, search and pick an object from a pane then generate a new pane to display the picked object, or highlight an object in all panes, or control the object graph displayed in a pane.

I will give you a message which describes the user's need, and you need to identify whether the user wants to invoke commands in the gdb stub or the visualizer.
- If the anwser is gdb stub, you should print a word vplot.
- Otherwise the answer is visualizer, you should print a word vctrl.
Your anwser should be only one word without any other description or explanation.
