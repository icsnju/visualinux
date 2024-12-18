import * as go from "gojs";
var $ = go.GraphObject.make;

import { styleset } from "./styleset";
import { getGroupTemplateList, getGroupTemplateTree, getGroupTemplateSet } from "./containers";
import { updateExpansion } from "./buttons";

const defaultMaxLevel = 7;

export function getGroupTemplateMap(maxLevel: number = defaultMaxLevel) {
    const tmap = new go.Map<string, go.Group>();
    for (let level = 0; level < maxLevel; level ++) {
        tmap.add(`${level}`,        getGroupTemplate(level));
        tmap.add(`${level}:Array`,  getGroupTemplate(level));
        tmap.add(`${level}:List`,   getGroupTemplateList(level));
        tmap.add(`${level}:HList`,  getGroupTemplateList(level));
        tmap.add(`${level}:RBTree`, getGroupTemplateTree(level));
        tmap.add(`${level}:XArray`, getGroupTemplate(level));
        tmap.add(`${level}:UnorderedSet`, getGroupTemplateSet(level));
        //
        tmap.add(`${level}:Array(cloned)`, getGroupTemplate(level));
        tmap.add(`${level}:UnorderedSet(cloned)`, getGroupTemplateSet(level));
    }
    return tmap;
}

export function getNodeTemplateMap(maxLevel: number = defaultMaxLevel) {
    const tmap = new go.Map<string, go.Node>();
    for (let level = 0; level < maxLevel; level ++) {
        for (let val_length = -1; val_length <= 8; val_length ++) {
            tmap.add(`${level}:${val_length}!`, getNodeTemplate(level, val_length, true,  0));
            tmap.add(`${level}:${val_length}`,  getNodeTemplate(level, val_length, false, 0));
        }
    }
    return tmap;
}

export function getLinkTemplateMap() {
    const tmap = new go.Map<string, go.Link>();
    tmap.add("normal", getLinkTemplate());
    tmap.add("invis",  getLinkTemplate(false));
    tmap.add("", tmap.get("normal") as go.Link);
    return tmap;
}

function getGroupTemplate(level: number) {
    const width = styleset.layout.width - 8 * level;
    const isOuter = (level == 0);
    level = Math.min(level, styleset.box.length - 1);
    const ss = styleset.box[level];
    const tmpl = $(go.Group,
        {
            movable: isOuter,
            background: null,
            isShadowed: isOuter, shadowOffset: new go.Point(4, 4),
            // Groups containing Nodes lay out their members vertically
            layout: $(go.GridLayout, {
                wrappingColumn: 1,
                alignment: go.GridLayout.Position,
                cellSize: new go.Size(1, 1),
                spacing: new go.Size(0, 0),
            }),
            selectionAdornmentTemplate: $(go.Adornment, "Auto",
                $(go.Shape, "Rectangle", { width: width, fill: null, stroke: styleset.selection.color, strokeWidth: 2 }),
                $(go.Placeholder)
            ),
        },
        new go.Binding("visible", "isShrinked", isShrinked => !isShrinked),
        new go.Binding("isSubGraphExpanded", "isCollapsed", isCollapsed => !isCollapsed),
        $(go.Panel, "Auto",
            {
                margin: new go.Margin(1, 4, 1, 4)
            },
            $(go.Shape, "RoundedRectangle", {
                width: width,
                fill: ss.color.bg_inner,
                stroke: ss.color.frame,
                strokeWidth: (isOuter ? 2 : 1)
            }),
            $(go.Panel, go.Panel.Vertical, // title above Placeholder
                $(go.Panel, go.Panel.Horizontal, // button next to TextBlock
                    {
                        stretch: go.GraphObject.Horizontal,
                        width: width - 2,
                        background: ss.color.bg_title,
                        margin: 1
                    },
                    $("SubGraphExpanderButton", {
                        alignment: go.Spot.Right,
                        margin: new go.Margin(2, 4, 2, 4)
                    }),
                    $(go.TextBlock, {
                        alignment: go.Spot.Left,
                        margin: 0,
                        font: ss.font,
                        stroke: ss.color.font
                    }, new go.Binding("text", "label"))
                ), // end Horizontal Panel
                $(go.Placeholder, { padding: 1, alignment: go.Spot.TopLeft }),
                (true || isOuter ? $(go.TextBlock, {
                    editable: true,
                    alignment: go.Spot.Right,
                    margin: new go.Margin(4, 0, 0, 0),
                    font: styleset.primitive[0].font,
                    stroke: ss.color.font
                }, new go.Binding("text", "value")) : '')
            ) // end Vertical Panel
        ),
        $(go.Panel, "Auto",
            { margin: new go.Margin(1, 4, 1, 4) },
            $(go.Shape, "RoundedRectangle", {
                width: width,
                height: 28,
                fill: null,
                stroke: "transparent",
                // stroke: ss.color.frame,
                // strokeWidth: (isOuter ? 2 : 1),
                shadowVisible: false
            })
        ),
    );
    return tmpl;
}

function getNodeTemplate(level: number, val_length: number, controllable: boolean, oe: number) {
    const width = styleset.layout.width + 6 - 8 * level;
    const width_value = 20 * Math.abs(val_length);
    const countHeight = (value: string) => {
        let lineno = Array.from(value).reduce((count: number, currentChar: string) => (currentChar === '\n' ? count + 1 : count), 0);
        return 16 + 10 * lineno;
        // return 20 + 10 * lineno;
    };
    oe = Math.min(oe, styleset.primitive.length - 1);
    const ss = styleset.primitive[oe];
    const tmpl = $(go.Node,
        {
            movable: false,
            selectionAdornmentTemplate: $(go.Adornment, "Auto",
                $(go.Shape, "Rectangle", { width: width, fill: null, stroke: styleset.selection.color, strokeWidth: 3 }),
                $(go.Placeholder)
            ),
            // TODO: shrink/expand too-long values on hover
            mouseHover: (e, obj) => {
                let node = obj.part;
                // console.log('mouseHover', node?.key);
            },
            mouseLeave: (e, obj) => {
                let node = obj.part;
                // console.log('mouseLeave', node?.key);
            }
        },
        // new go.Binding("isTreeExpanded", "distilled").makeTwoWay(),
        new go.Binding("isTreeExpanded", "isShrinked", isShrinked => !isShrinked),
        $(go.Panel, "Horizontal",
            {
                margin: new go.Margin(0, 0, 0, 0)
            },
            $(go.Panel, "Auto",
                $(go.Shape, "Rectangle", {
                    width: width - width_value,
                    height: 1,
                    fill: ss.color.bg_label,
                    stroke: ss.color.frame,
                    strokeWidth: 1
                }, new go.Binding("height", "value", (value: string) => countHeight(value))),
                $(go.TextBlock, {
                    alignment: go.Spot.Left,
                    margin: new go.Margin(5, 0, 1, 5),
                    spacingAbove: 0,
                    spacingBelow: 0,
                    font: ss.font,
                    stroke: ss.color.font_label
                }, new go.Binding("text", "label")),
                // $("TreeExpanderButton", {
                //     visible: controllable,
                //     alignment: go.Spot.Right
                // })
                // a replacement for "TreeExpanderButton" that works for non-tree-structured graphs
                $("Button",
                    {
                        visible: controllable,
                        alignment: go.Spot.Right,
                        click: (e, button) => {
                            e.diagram.startTransaction();
                            let node = button.part as go.Node | null;
                            if (node != null) {
                                updateExpansion(node);
                            }
                            e.diagram.commitTransaction("toggled visibility of dependencies");
                        }
                    },
                    $(go.Shape,
                        {
                            name: "ButtonIcon",
                            figure: "PlusLine",
                            desiredSize: new go.Size(7, 7)
                        },
                        new go.Binding("figure", "isShrinked",
                            (shrinked: boolean) => (shrinked ? "PlusLine" : "MinusLine"))
                    )
                )
            ),
            $(go.Panel, "Auto",
                $(go.Shape, "Rectangle", {
                    width: width_value,
                    fill: ss.color.bg_value,
                    stroke: ss.color.frame,
                    strokeWidth: 1
                }, new go.Binding("fill", "isPointer", flag => flag ? ss.color.bg_linkdot : ss.color.bg_value),
                   new go.Binding("height", "value", (value: string) => countHeight(value))),
                (val_length >= 0 ? 
                    $(go.TextBlock, {
                        editable: true,
                        alignment: go.Spot.Center,
                        margin: new go.Margin(5, 5, 1, 5),
                        spacingAbove: -3, spacingBelow: -1,
                        // spacingAbove: 1, spacingBelow: 1,
                        font: ss.font,
                        stroke: ss.color.font_value
                    }, new go.Binding("text", "value"))
                :
                    $(go.Picture, {
                        width: width_value,
                        height: 18,
                        margin: 0,
                        imageStretch: go.GraphObject.None
                    }, new go.Binding("element", "value", convertHtmlToImg))
                )
            )
        ),
    );
    return tmpl;
}

function getLinkTemplate(visible: boolean = true) {
    const color    = visible ? styleset.link.color : "transparent";
    const colorSel = visible ? styleset.selection.color : "transparent";
    const tmpl = $(go.Link,
        {
            routing: go.Link.Normal,
            // routing: go.Link.AvoidsNodes,
            curve: go.Link.JumpOver,
            toShortLength: 3,
            // TODO: calculate through layout_depth
            fromEndSegmentLength: 16,
            toEndSegmentLength: 24,
            selectionAdornmentTemplate: $(go.Adornment,
                $(go.Shape, { stroke: colorSel, strokeWidth: 3, isPanelMain: true }),
                $(go.Shape, { stroke: colorSel, fill: colorSel, toArrow: "Standard", scale: 1.4 })
            ),
        },
        // new go.Binding("fromSpot"),
        // new go.Binding("toSpot"),
        // new go.Binding("fromEndSegmentLength"),
        // new go.Binding("toEndSegmentLength"),
        $(go.Shape, { stroke: color, strokeWidth: 2 }),
        $(go.Shape, { stroke: color, fill: color, toArrow: "Standard", scale: 1.4 }),
        $(go.TextBlock, "label",
            {
                // segmentIndex: 0, segmentOffset: new go.Point(NaN, NaN),
                // segmentOrientation: go.Link.OrientUpright
            },
            new go.Binding("text", "label")
        )
    );
    return tmpl;
}

function convertHtmlToImg(text: string, pic: any) {
    let html = `<span style='font: 13px sans-serif'>${text}</span>`
    console.log(html);
    if (!pic.element) {
        pic.element = new Image();
        pic.element.onload = () => pic.redraw();
    }
    let width = pic.width;
    let height = pic.height;
    if (isNaN(width)  || !isFinite(width))  width = 100;
    if (isNaN(height) || !isFinite(height)) height = 20;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'><foreignObject x='1' y='-2' width='${width}' height='${height}'><div xmlns='http://www.w3.org/1999/xhtml'>${html}</div></foreignObject></svg>`;
    pic.element.src = `data:image/svg+xml;base64,${btoa(svg)}`;
    return pic.element;
}