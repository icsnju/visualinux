import * as go from "gojs";
var $ = go.GraphObject.make;

import { styleset } from "./styleset";

export function getGroupTemplateList(level: number) {
    const width = styleset.layout.width - 8 * (level - 1);
    const isOuter = (level == 0);
    level = Math.min(level, styleset.box.length - 1);
    const ss = styleset.box[level];
    const tmpl = $(go.Group,
        {
            movable: isOuter,
            selectionAdornmentTemplate: $(go.Adornment, "Auto",
                $(go.Shape, "Rectangle", { fill: null, stroke: styleset.selection.color, strokeWidth: 2 }),
                $(go.Placeholder, { padding: new go.Margin(0, 0) })
            ),
            layout: $(go.TreeLayout)
        },
        new go.Binding("visible", "isShrinked", isShrinked => !isShrinked),
        new go.Binding("isSubGraphExpanded", "isCollapsed", isCollapsed => !isCollapsed),
        new go.Binding("layout", "direction", (direction: string) => $(go.TreeLayout, {
            angle: (direction == 'horizontal' ? 0 : 90)
        })),
        $(go.Panel, "Auto",
            {
                margin: new go.Margin(1, 4, 1, 4)
            },
            $(go.Shape, "Rectangle", {
                // width: width,
                fill: ss.color.bg_inner,
                stroke: "gray",
                strokeWidth: 1,
                strokeDashArray: [4]
            }),
            $(go.Panel, "Vertical",
                { defaultAlignment: go.Spot.Left, margin: 4 },
                $(go.Panel, "Horizontal",
                    { defaultAlignment: go.Spot.Top },
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
                ),
                $(go.Placeholder, { padding: new go.Margin(0, 0) })
            )
        )
    );
    return tmpl;
}

export function getGroupTemplateTree(level: number) {
    const isOuter = (level == 0);
    level = Math.min(level, styleset.box.length - 1);
    const ss = styleset.box[level];
    const tmpl = $(go.Group,
        {
            movable: isOuter,
            selectionAdornmentTemplate: $(go.Adornment, "Auto",
                $(go.Shape, "Rectangle", { fill: null, stroke: styleset.selection.color, strokeWidth: 2 }),
                $(go.Placeholder)
            ),
            layout: $(go.TreeLayout, { layerSpacing: 60 })
        },
        new go.Binding("visible", "isShrinked", isShrinked => !isShrinked),
        new go.Binding("isSubGraphExpanded", "isCollapsed", isCollapsed => !isCollapsed),
        new go.Binding("layout", "direction", (direction: string) => $(go.TreeLayout, {
            angle: (direction == 'horizontal' ? 0 : 90),
            layerSpacing: 60
        })),
        $(go.Panel, "Auto",
            $(go.Shape, "Rectangle", {
                fill: ss.color.bg_inner,
                stroke: "gray",
                strokeWidth: 1,
                strokeDashArray: [4]
            }),
            $(go.Panel, "Vertical",
                { defaultAlignment: go.Spot.Left, margin: 4 },
                $(go.Panel, "Horizontal",
                    { defaultAlignment: go.Spot.Top },
                    $("SubGraphExpanderButton", {
                        alignment: go.Spot.Right,
                        margin: new go.Margin(4, 4, 4, 4)
                    }),
                    $(go.TextBlock, {
                        alignment: go.Spot.Left,
                        margin: 0,
                        font: ss.font,
                        stroke: ss.color.font
                    }, new go.Binding("text", "label"))
                ),
                $(go.Placeholder, { padding: new go.Margin(0, 0) })
            )
        )
    );
    return tmpl;
}

export function getGroupTemplateSet(level: number) {
    const isOuter = (level == 0);
    level = Math.min(level, styleset.box.length - 1);
    const ss = styleset.box[level];
    const tmpl = $(go.Group,
        {
            movable: isOuter,
            selectionAdornmentTemplate: $(go.Adornment, "Auto",
                $(go.Shape, "Rectangle", { fill: null, stroke: styleset.selection.color, strokeWidth: 2 }),
                $(go.Placeholder, { padding: new go.Margin(0, 0) })
            ),
            layout: $(go.GridLayout)
        },
        new go.Binding("visible", "isShrinked", isShrinked => !isShrinked),
        new go.Binding("isSubGraphExpanded", "isCollapsed", isCollapsed => !isCollapsed),
        $(go.Panel, "Auto",
            {
                margin: new go.Margin(1, 4, 1, 4)
            },
            $(go.Shape, "Rectangle", {
                // width: width,
                fill: ss.color.bg_inner,
                stroke: "gray",
                strokeWidth: 1,
                strokeDashArray: [4]
            }),
            $(go.Panel, "Vertical",
                { defaultAlignment: go.Spot.Left, margin: 4 },
                $(go.Panel, "Horizontal",
                    { defaultAlignment: go.Spot.Top },
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
                ),
                $(go.Placeholder, { padding: new go.Margin(0, 0) })
            )
        )
    );
    return tmpl;
}