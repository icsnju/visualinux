import { ViewAttrs } from "@app/visual/types";
import { ISplitProps } from "split-pane-react/esm/types";

export default class Panels {
    /**
     * The paneling model is a tree of PrimaryArea. Its root node is always a PrimaryArea.
     * Each PrimaryArea has a list of PrimaryPanel.
     * Each PrimaryPanel has a list of connected SecondaryPanel.
     */
    root: PrimaryArea
    secondaries: (SecondaryPanel | undefined)[]
    constructor(root?: PrimaryArea, secondaries?: (SecondaryPanel | undefined)[]) {
        if (root === undefined) {
            root = new PrimaryArea(null, []);
            root.children.push(new PrimaryPanel(root));
        }
        this.root = root;
        this.secondaries = secondaries || [];
    }
    toString() {
        return this.root.toString() + ', ' + this.secondaries.toString();
    }
    //
    // panel actions
    //
    split(pKey: number, direction: SplitDirection) {
        // direction (l/r/u/d) => splitDirection (v/h), splitForward (T:lu/F:rd)
        // let splitDirection = Math.floor(direction / 2);
        // let splitDirection = (direction == Direction.left || direction == Direction.right ?
        //     SplitDirection.vertical : SplitDirection.horizontal);
        // let splitIsForward = (direction % 2 == 0);
        let node = this.find(pKey);
        if (node === undefined) {
            throw new Error(`panels.split(): failed to find panel #${pKey}.`);
        }
        node.split(direction);
    }
    pick(pKey: number, objectKey: string) {
        let viewname = this.getViewname(pKey);
        if (viewname === undefined) {
            throw new Error(`panels.pick(): viewname is not set on panel #${pKey}.`);
        }
        let panel = new SecondaryPanel(viewname, objectKey);
        let index = this.secondaries.findIndex(node => !node);
        if (index == -1) {
            this.secondaries.push(panel);
        } else {
            this.secondaries[index] = panel;
        }
    }
    switch(pKey: number, viewname: string | undefined) {
        let node = this.find(pKey);
        if (node === undefined) {
            throw new Error(`panels.switch(): failed to find panel #${pKey}.`);
        }
        node.viewname = viewname;
    }
    update(pKey: number, attrs: ViewAttrs) {
        // TODO: merge find functions
        let node = this.find(pKey);
        if (node === undefined) {
            throw new Error(`panels.update(): failed to find panel #${pKey}.`);
        }
        if (node.viewname === undefined) {
            throw new Error(`panels.update(): viewname is not set on panel #${pKey}.`);
        }
        node.viewAttrs[node.viewname] = {
            ...node.viewAttrs[node.viewname] || {},
            ...attrs
        };
    }
    reset(pKey: number) {
        let node = this.find(pKey);
        if (node === undefined) {
            throw new Error(`panels.update(): failed to find panel #${pKey}.`);
        }
        if (node.viewname === undefined) {
            throw new Error(`panels.update(): viewname is not set on panel #${pKey}.`);
        }
        node.viewAttrs[node.viewname] = {};
    }
    focus(objectKey: string) {
        this.root.focus(objectKey);
    }
    remove(pKey: number) {
        let node = this.find(pKey);
        if (node === undefined) {
            this.secondaries = this.secondaries.map(node => node && node.key == pKey ? undefined : node);
            return;
        }
        if (!this.isNodeRemovable(node)) {
            throw new Error(`panels.remove(): panel #${pKey} is not removable.`);
        }
        let parent = node.parent;
        parent.removeChild(pKey);
        if (parent.children.length == 0) {
            throw new Error(`panels.remove(): empty children.`);
        }
        let p: PrimaryArea | PrimaryPanel = parent;
        while (p.parent != null) {
            if (p.children.length == 1) {
                p.parent.replaceChild(p, p.children[0]);
            }
            p = p.parent;
        }
    }
    //
    // other APIs
    //
    setViewname(pKey: number, viewname: string | undefined) {
        let node = this.find(pKey);
        if (node === undefined) {
            throw new Error(`panels.setViewname(): panel #${pKey} not found`);
        }
        node.viewname = viewname;
    }
    getViewname(pKey: number): string | undefined {
        return this.find(pKey)?.viewname;
    }
    setViewAttrs(pKey: number, attrs: ViewAttrs) {
        let node = this.find(pKey);
        if (node === undefined) {
            throw new Error(`panels.setViewname(): panel #${pKey} not found`);
        }
        if (node.viewname) {
            node.viewAttrs[node.viewname] = attrs;
        }
    }
    getViewAttrs(pKey: number): ViewAttrs {
        let node = this.find(pKey);
        return node && node.viewname ? node.viewAttrs[node.viewname] : {};
    }
    getObjectSelected(pKey: number, isPrimary: boolean = true): string | undefined {
        // we assume that diagram.maxSelected == 1.
        // return this.getDiagramRef(key, isPrimary)?.current?.getDiagram()?.selection.first()?.data.key;
        return undefined;
    }
    isRemovable(pKey: number) {
        let node = this.find(pKey);
        if (node === undefined) {
            throw new Error(`panels.isRemovable(): failed to find panel with key=${pKey}.`);
        }
        return this.isNodeRemovable(node);
    }
    //
    // private utils
    //
    private find(pKey: number) {
        // find the primary panel with the given key
        // Since there are at most a few dozen windows, a brute-force DFS is sufficient.
        return this.root.find(pKey);
    }
    private isNodeRemovable(node: PrimaryPanel) {
        let parent = node.parent;
        if (parent.parent == null && parent.children.length == 1) {
            // removing the last node is not allowed
            return false;
        }
        return true;
    }
}

export class PrimaryArea {
    public direction: SplitDirection
    public parent: PrimaryArea | null
    public children: (PrimaryArea | PrimaryPanel)[]
    constructor(parent: PrimaryArea | null, children: PrimaryPanel[], direction: SplitDirection = SplitDirection.undefined) {
        this.direction = direction;
        this.parent    = parent;
        this.children  = children;
        for (let child of this.children) {
            child.parent = this;
        }
    }
    public get key(): string {
        return '#(' + this.children.map(child => child.key).join('') + ')';
    }
    public get propSplit(): ISplitProps['split'] {
        if (this.direction == SplitDirection.undefined) {
            return undefined;
        }
        // @ts-ignore
        return SplitDirection[this.direction];
    }
    public toString() {
        return `A(${this.children.toString()})`;
    }
    public find(key: number): PrimaryPanel | undefined {
        for (let child of this.children) {
            if (isPrimaryPanel(child)) {
                if (child.key == key) {
                    return child;
                }
            } else {
                let found = child.find(key);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }
    public split(key: number, direction: SplitDirection) {
        if (this.children.length == 0) {
            throw new Error(`PrimaryArea.split(): children is empty.`);
        }
        // find the window to split
        let index = this.children.findIndex(node => isPrimaryPanel(node) && node.key == key);
        let child = this.children[index] as PrimaryPanel;
        if (index == -1) {
            throw new Error(`PrimaryArea.split(): failed to find window with key=${key}.`);
        }
        // check the direction
        if (this.direction == SplitDirection.undefined) {
            if (this.children.length > 1) {
                throw new Error(`PrimaryArea.split(): has been splitted but direction unset.`);
            }
            this.direction = direction;
        }
        // if split in the same direction, then directly push the new children;
        // otherwise, a new area is created to replace the splitted window.
        if (this.direction == direction) {
            let splitted = new PrimaryPanel(this);
            splitted.viewname = child.viewname;
            // this.children.splice(isForward ? index : index + 1, 0, splitted);
            this.children.splice(index + 1, 0, splitted);
        } else {
            let splitted = new PrimaryArea(this, [child]);
            this.children[index] = splitted;
            child.split(direction);
        }
    }
    public focus(objectKey: string) {
        for (let child of this.children) {
            child.focus(objectKey);
        }
    }
    public removeChild(key: number) {
        this.children = this.children.filter(node => node.key != key);
    }
    public replaceChild(replacedNode: PrimaryArea | PrimaryPanel, newNode: PrimaryArea | PrimaryPanel) {
        this.children = this.children.map(child => child.key == replacedNode.key ? newNode : child);
        newNode.parent = this;
    }
}

// it is preferred not to use a static field in the class, since it may trigger an hydration warning,
// and it might take much more progress to eliminate the warning.
let PanelNextKey = 0;

abstract class Panel {
    public diagramRef?: null
    public focus(objectKey: string) {
        if (!this.diagramRef) {
            return;
        }
        let diagram = this.diagramRef?.current?.getDiagram();
        if (diagram) {
            let node = diagram.findNodeForKey(objectKey);
            if (node) {
                diagram.selectCollection([node]);
                diagram.centerRect(node.actualBounds);
            }
        }
    }
}

export class PrimaryPanel extends Panel {
    public readonly key: number
    public parent: PrimaryArea
    public viewname?: string
    public viewAttrs: {
        [viewName: string]: ViewAttrs
    }
    constructor(parent: PrimaryArea) {
        super();
        this.key = PanelNextKey ++;
        this.parent = parent;
        this.viewAttrs = {};
    }
    public toString() {
        return `W(${this.key})`
    }
    public split(direction: SplitDirection) {
        this.parent.split(this.key, direction);
    }
    public focus(objectKey: string) {
        if (!this.viewname) {
            return;
        }
        super.focus(objectKey);
    }
}

export class SecondaryPanel extends Panel {
    public readonly key: number
    public readonly viewname: string
    public readonly objectKey: string
    constructor(viewname: string, objectKey: string) {
        super();
        this.key = PanelNextKey ++;
        this.viewname = viewname;
        this.objectKey = objectKey;
    }
    toString() {
        return `<${this.key}>`
    }
}

export function isPrimaryArea(node: PrimaryArea | PrimaryPanel): node is PrimaryArea {
    return (node as PrimaryArea).direction !== undefined;
}

export function isPrimaryPanel(node: PrimaryArea | PrimaryPanel): node is PrimaryPanel {
    return !isPrimaryArea(node);
}

export enum Direction {
    left,
    up,
    down,
    right,
}

export enum SplitDirection {
    undefined,
    vertical,
    horizontal,
}
