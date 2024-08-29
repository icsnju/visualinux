import * as go from "gojs";

// gojs diagram model

export type goViewData = {
    [name: string]: goModelData
}

export class goModelData {
    // nodes: {[key: string]: go.ObjectData}
    // links: go.ObjectData[]
    nodes: {[key: string]: goGroupData | goNodeData}
    links: goLinkData[]
    constructor() {
        this.nodes = {}
        this.links = []
    }
    // addNodeData(data: goNodeData) {
    //     this.nodes[data.key] = data;
    // }
    // addLinkData(data: goLinkData) {
    //     this.links.push(data);
    // }
    onUse(): [go.ObjectData[], go.ObjectData[]] {
        return [Object.values(this.nodes), this.links]
    }
}
export type goGroupData = {
    key:          string,
    group:        string | undefined,
    category:     string,
    label:        string,
    value:        string,
    isGroup:      boolean,
    isCollapsed:  boolean,
    isShrinked:   boolean,
    direction:    boolean,
    outTargets:   string[]
}
export type goNodeData = {
    key:          string,
    group:        string | undefined,
    category:     string,
    label:        string,
    value:        string,
    isGroup:      boolean,
    isShrinked?:  boolean,
}
export type goLinkData = {
    from:     string,
    to:       string,
    category: string,
    label?:   string
}

// gojs diagram configurations

export class goTemplateSet {
    groupTmplMap: go.Map<string, go.Group>
    nodeTmplMap:  go.Map<string, go.Node>
    linkTmplMap:  go.Map<string, go.Link>
    constructor() {
        this.groupTmplMap = new go.Map();
        this.nodeTmplMap  = new go.Map();
        this.linkTmplMap  = new go.Map();
    }
    applyOn(diagram: go.Diagram) {
        diagram.groupTemplateMap = this.groupTmplMap;
        diagram.nodeTemplateMap  = this.nodeTmplMap;
        diagram.linkTemplateMap  = this.linkTmplMap;
    }
}

export type goSelectionListener = ((e: go.ChangedEvent) => void)
export type goButtonClick = ((e: go.InputEvent, button: go.GraphObject) => void)
