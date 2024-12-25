import { ISplitProps } from 'split-pane-react/esm/types';

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
    private find(key: number) {
        // since there are at most a few dozen windows, brute-force dfs is enough.
        return this.root.find(key);
    }
    //
    // TODO: pass these functions downstream; a (unnecessary) global dispatcher is strange.
    //
    setViewDisplayed(key: number, viewDisplayed: string | undefined) {
        let node = this.find(key);
        if (node === undefined) {
            throw new Error(`setViewDisplayed #${key}: window not found`);
        }
        node.viewDisplayed = viewDisplayed;
    }
    getViewDisplayed(key: number): string | undefined {
        return this.find(key)?.viewDisplayed;
    }
    getObjectSelected(key: number, isPrimary: boolean = true): string | undefined {
        // we assume that diagram.maxSelected == 1.
        // return this.getDiagramRef(key, isPrimary)?.current?.getDiagram()?.selection.first()?.data.key;
        return undefined;
    }
    setConsoleText(key: number, text: string) {
        if (text.length > 10) {
            text = text.substring(0, 10) + '...';
        }
        this.find(key)?.setConsoleText(text);
    }
    getConsoleText(key: number): string {
        let node = this.find(key);
        if (node === undefined) {
            return '';
        }
        return node.consoleText;
    }
    isRemovable(key: number) {
        let node = this.find(key);
        if (node === undefined) {
            throw new Error(`window.remove(): failed to find window with key=${key}.`);
        }
        return this.isNodeRemovable(node);
    }
    private isNodeRemovable(node: PrimaryPanel) {
        let parent = node.parent;
        if (parent.parent == null && parent.children.length == 1) {
            // removing the last node is not allowed
            return false;
        }
        return true;
    }
    split(key: number, direction: SplitDirection) {
        // TODO: only keep two buttons for lu or rd, and copy the diagram state while splitting
        // direction (l/r/u/d) => splitDirection (v/h), splitForward (T:lu/F:rd)
        // let splitDirection = Math.floor(direction / 2);
        // let splitDirection = (direction == Direction.left || direction == Direction.right ?
        //     SplitDirection.vertical : SplitDirection.horizontal);
        // let splitIsForward = (direction % 2 == 0);
        let node = this.find(key);
        if (node === undefined) {
            throw new Error(`window.split(): failed to find window with key=${key}.`);
        }
        node.split(direction);
    }
    remove(key: number) {
        let node = this.find(key);
        if (node === undefined) {
            throw new Error(`window.remove(): failed to find window with key=${key}.`);
        }
        if (!this.isNodeRemovable(node)) {
            return;
        }
        let parent = node.parent;
        parent.removeChild(key);
        if (parent.children.length == 0) {
            throw new Error(`window.remove(): empty children.`);
        }
        let p: PrimaryArea | PrimaryPanel = parent;
        while (p.parent != null) {
            if (p.children.length == 1) {
                p.parent.replaceChild(p, p.children[0]);
            }
            p = p.parent;
        }
    }
    pick(wKey: number, objectKey: string) {
        let viewDisplayed = this.getViewDisplayed(wKey);
        if (viewDisplayed === undefined) {
            return;
        }
        let follower = new SecondaryPanel(viewDisplayed, objectKey);
        let index = this.secondaries.findIndex(node => !node);
        if (index == -1) {
            this.secondaries.push(follower);
        } else {
            this.secondaries[index] = follower;
        }
    }
    erase(wKey: number) {
        this.secondaries = this.secondaries.map(node => node && node.key == wKey ? undefined : node);
    }
    focus(objectKey: string) {
        this.root.focus(objectKey);
    }
    clone() {
        return new Panels(this.root, this.secondaries);
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
            splitted.viewDisplayed = child.viewDisplayed;
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

// it is preferred not to use a static field in the class, since it will trigger an hydration warning,
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
    public consoleText: string
    public viewDisplayed?: string
    constructor(parent: PrimaryArea) {
        super();
        this.key = PanelNextKey ++;
        this.parent = parent;
        this.consoleText = '';
    }
    public toString() {
        return `W(${this.key})`
    }
    public split(direction: SplitDirection) {
        this.parent.split(this.key, direction);
    }
    public focus(objectKey: string) {
        if (!this.viewDisplayed) {
            return;
        }
        return super.focus(objectKey);
    }
    public setConsoleText(text: string) {
        this.consoleText = text;
    }
}
export class SecondaryPanel extends Panel {
    public readonly key: number
    public readonly viewDisplayed: string
    public readonly objectKey: string
    constructor(viewDisplayed: string, objectKey: string) {
        super();
        this.key = PanelNextKey ++;
        this.viewDisplayed = viewDisplayed;
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
    return Number.isInteger((node as PrimaryPanel).key);
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
