import { View, SubView, Box, Container, ContainerConv, ShapeKey, Member } from "./type";
import { isMemberText, isMemberLink, isMemberBox, isContainerConv, shouldCompress } from "./type";
import { ViewStorage } from "@app/vql/storage";

export type Attrs = {[attr: string]: any}

export function genGoModelData(viewStorage: ViewStorage, subviewName: string, plots?: string[]): goModelData {
    console.log('genModelData', subviewName, viewStorage.getSubviewStorage(subviewName));
    const creator = new ModelDataGenerator(viewStorage, subviewName, plots && plots.length > 0);
    return creator.create(plots);
}

class ModelDataGenerator {
    viewStorage: ViewStorage
    subviewName: string
    modelData:   goModelData
    isFocus:     boolean
    constructor(viewStorage: ViewStorage, subviewName: string, isFocus: boolean = false) {
        this.viewStorage = viewStorage;
        this.subviewName = subviewName;
        this.modelData   = new goModelData();
        this.isFocus     = isFocus;
    }
    public get subview() {
        return this.viewStorage.data[this.subviewName];
    }
    public create(plots?: string[]): goModelData {
        if (plots) {
            for (const plot of plots) {
                this.creatShape(plot);
            }
        } else {
            for (const plot of this.subview.plot) {
                this.creatShape(plot);
            }
        }
        return this.modelData;
    }
    private creatShape(key: ShapeKey, shouldShrink: boolean = false) {
        if (key == null) {
            return;
        } else if (key in this.subview.pool.boxes) {
            this.creatBox(key, shouldShrink);
        } else if (key in this.subview.pool.containers) {
            this.creatContainer(key, shouldShrink);
        } else {
            console.log(`ERROR in creatPlot: fail to find ${key} in ${this.subview}`)
        }
    }
    private creatBox(key: ShapeKey, shouldShrink: boolean = false) {
        // deduplication
        if (key == null || key in this.modelData.nodes) {
            return;
        }
        if (!(key in this.subview.pool.boxes)) {
            console.log(`ERR: ${key} not in pool.boxes`);
        }
        // init
        const box   = this.subview.pool.boxes[key];
        const type  = box.type;
        const abst  = this.getAbst(key);
        const depth = box.depth as number;
        // console.log('creatBox', key, abst, shape);
        // parse abst
        shouldShrink = shouldShrink || this.isShrinked(key);
        if (shouldCompress(box)) {
            this.parseAbstCompressed(box, abst, shouldShrink);
        } else {
            let label = (box.label == '' ? type : box.label);
            this.modelData.nodes[key] = this.genGroupData(key, box.parent, `${depth}`, label, shouldShrink);
            this.parseAbst(box, abst, shouldShrink);
        }
        // perform a backward traverse to support container_of()
        if (box.parent != null && !this.isFocus) {
            this.creatShape(box.parent, shouldShrink);
        }
    }
    private parseAbst(box: Box, abstname: string, shouldShrink: boolean = false) {
        // init
        if (!(abstname in box.absts)) {
            console.log(`ERROR: cannot find abst ${abstname} in shape`, box);
            return;
        }
        const abst = box.absts[abstname];
        // parse parent if exists (in parent-first order)
        if (abst.parent != null) {
            this.parseAbst(box, abst.parent, shouldShrink);
        }
        // traverse fields
        const members = abst.members;
        for (let label in members) {
            this.parseAbstMember(box, label, members[label], shouldShrink);
        }
    }
    private parseAbstMember(parentShape: Box, label: string, member: Member, shouldShrink: boolean = false,
            parentKey: ShapeKey = parentShape.key, memberKey: ShapeKey = `${parentKey}.${label}`,
            depth: number = (parentShape.depth as number) + 1) {
        // Text
        if (isMemberText(member)) {
            let size = Math.min(member.size, 8);
            let category = `${depth}:${size}`;
            let node = this.genNodeData(memberKey, parentKey, category, label, member.value, shouldShrink);
            this.modelData.nodes[node.key] = node;
        // Link
        } else if (isMemberLink(member)) {
            const isDirectLink = (member.type == 'DIRECT');
            const isContainerEmpty =
                member.target != null &&
                member.target in this.subview.pool.containers &&
                this.subview.pool.containers[member.target].members.length == 0;
            if (!(memberKey in this.modelData.nodes)) {
                let category = `${depth}:8` + (isDirectLink && member.target ? '!' : '');
                let value = (member.target ? member.target.split(':', 1)[0] : 'NULL');
                if (isContainerEmpty) {
                    if (category.endsWith('!')) category = category.slice(0, -1);
                    value = '(empty)';
                }
                let node = this.genNodeData(memberKey, parentKey, category, label, value, shouldShrink);
                this.modelData.nodes[node.key] = node;
            }
            if (member.target != null && !isContainerEmpty) {
                let link: goLinkData = {
                    from: memberKey,
                    to: member.target,
                    category: (isDirectLink ? 'normal' : 'invis'),
                    label: ''
                };
                this.modelData.links.push(link);
                (this.modelData.nodes[parentKey] as goGroupData).outTargets.push(memberKey, member.target);
                this.creatShape(member.target, shouldShrink);
            }
        // Embedded Box
        } else if (isMemberBox(member)) {
            if (member.object != null) {
                (this.modelData.nodes[parentKey] as goGroupData).outTargets.push(member.object);
                this.creatShape(member.object, shouldShrink);
                if (member.object in this.modelData.nodes && (this.modelData.nodes[member.object] as goNodeData).isGroup) {
                    (this.modelData.nodes[member.object] as goNodeData).label = label;
                }
            }
        // Otherwise
        } else {
            console.log('parseMember unknown', parentKey, parentShape);
        }
    }
    private parseAbstCompressed(box: Box, abstname: string, shouldShrink: boolean = false) {
        // init
        if (!(abstname in box.absts)) {
            console.log(`ERROR: cannot find abst ${abstname} in shape`, box);
        }
        const abst  = box.absts[abstname];
        const depth = box.depth as number;
        // parse parent if exists (in parent-first order)
        if (abst.parent != null) {
            this.parseAbstCompressed(box, abst.parent, shouldShrink);
        }
        // traverse fields
        const members = abst.members;
        for (let label in members) {
            this.parseAbstMember(box, this.getLabelCompressed(box, label), members[label], shouldShrink,
                box.parent as string, box.key, box.depth as number);
        }
    }
    private getLabelCompressed(shape: Box, label: string) {
        // console.log('getLabelCompressed', label, shape.label, shape.type);
        if (shape.label == '') {
            if (shape.type == 'void') {
                return label;
            }
            return `${shape.type}.${label}`;
        }
        return `${shape.label}.${label}`;
    }
    private creatContainer(key: ShapeKey, shouldShrink: boolean = false) {
        // deduplication
        if (key == null || key in this.modelData.nodes) {
            return;
        }
        // invariant check
        if (!(key in this.subview.pool.containers)) {
            console.log(`ERR: ${key} not in pool.containers`);
            return;
        }
        const container = this.subview.pool.containers[key];
        const depth = container.depth as number;
        shouldShrink = shouldShrink || this.isShrinked(key);
        // for container_conversion
        if (isContainerConv(container)) {
            return this.creatContainerConversion(container, shouldShrink);
        }
        // init
        const addr = key.split(':', 2)[0];
        const type = key.split(':', 2)[1];
        // console.log('creatContainer', key, addr, type, attrs, direction);
        this.modelData.nodes[key] = this.genGroupData(key, container.parent, `${depth}:${type}`, container.label, shouldShrink);
        // parse members
        for (let i in container.members) {
            const member = container.members[i];
            (this.modelData.nodes[key] as goGroupData).outTargets.push(member.key);
            this.creatShape(member.key, shouldShrink);
            if (Object.keys(member.links).length == 0) {
                continue;
            }
            // set the link point
            // TODO: polish the link point, not as a normal field, or it will be strange
            let link_point_label = Object.keys(member.links).join('/');
            let link_point_key = `${member.key}.${type}:${link_point_label}`;
            let link_point: goNodeData = {
                key: link_point_key,
                group: member.key,
                category: `${depth + 1}:0!`,
                label: link_point_label,
                value: '',
                isGroup: false,
                isShrinked: false,
            };
            this.modelData.nodes[link_point.key] = link_point;
            // links
            let link_all_null = true;
            for (let label in member.links) {
                let targetKey = member.links[label];
                if (targetKey != null) {
                    let link = {
                        category: 'normal',
                        from: link_point.key,
                        to: targetKey,
                        label: label
                    };
                    this.modelData.links.push(link);
                    (this.modelData.nodes[member.key] as goGroupData).outTargets.push(link_point.key, targetKey);
                    link_all_null = false;
                }
            }
            if (link_all_null) {
                link_point.category = `${depth + 1}:4`;
                link_point.value = 'NULL';
            }
        }
        // judge distilled? at last or the init_abst hasn't been initialized
        if (!(this.modelData.nodes[key] as goGroupData).isCollapsed) {
            (this.modelData.nodes[key] as goGroupData).isCollapsed = this.isContainerCollapsed(key);
        }
    }
    private creatContainerConversion(conv: ContainerConv, shouldShrink: boolean = false) {
        // init
        const key = conv.key;
        shouldShrink = shouldShrink || this.isShrinked(key);
        const addr = key.split(':', 2)[0];
        const type = key.split(':', 2)[1];
        this.modelData.nodes[key] = this.genGroupData(key, conv.parent, `${conv.depth}:${type}`, addr, shouldShrink);
        // parse members
        for (let member of conv.members) {
            let shape: Box | Container | ContainerConv;
            if (member.key in this.subview.pool.boxes) {
                shape = this.subview.pool.boxes[member.key];
            } else if (member.key in this.subview.pool.containers) {
                shape = this.subview.pool.containers[member.key];
            } else {
                console.log(`ERR: creat_conv: member.key ${member.key} not in pool`);
                return;
            }
            shape.parent = key;
            (this.modelData.nodes[key] as goGroupData).outTargets.push(member.key);
            this.creatShape(member.key, shouldShrink);
        }
    }
    private isContainerCollapsed(key: ShapeKey | null): boolean {
        if (key == null) {
            return true;
        }
        if (key in this.subview.pool.boxes) {
            const abst = this.getAbst(key);
            return this.isCollapsed(key) || !this.subview.pool.boxes[key].absts[abst].distilled;
        }
        const container = this.subview.pool.containers[key];
        for (let member of container.members) {
            if (!this.isContainerCollapsed(member.key)) {
                return false;
            }
        }
        return true;
    }
    private genGroupData(key: string, parentKey: string | null, category: string, label: string, shouldShrink: boolean): goGroupData {
        return {
            key: key,
            group: (parentKey != null ? parentKey : undefined),
            category: category,
            label: label,
            value: key.split(':', 1)[0],
            isGroup: true,
            isCollapsed: this.isCollapsed(key),
            isShrinked: shouldShrink,
            direction: this.getDirection(key),
            outTargets: []
        };
    }
    private genNodeData(key: string, parentKey: string, category: string, label: string, value: string, shouldShrink: boolean): goNodeData {
        return {
            key: key,
            group: parentKey,
            category: category,
            label: label,
            value: value,
            isGroup: false,
            isShrinked: shouldShrink,
        };
    }
    private getAttr(key: string, attrName: string): any {
        return this.viewStorage.getAttrs(this.subviewName, key)[attrName];
    }
    private getAbst(key: string): string {
        return this.getAttr(key, 'abst');
    }
    private isCollapsed(key: string): boolean {
        return this.getAttr(key, 'collapsed');
    }
    private isShrinked(key: string): boolean {
        return this.getAttr(key, 'shrinked');
    }
    private getDirection(key: string): boolean {
        return this.getAttr(key, 'direction');
    }
}