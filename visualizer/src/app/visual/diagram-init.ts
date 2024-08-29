import * as go from "gojs";
var $ = go.GraphObject.make;

import * as tmpl from "./templates/templates";

export function initDiagram(): go.Diagram {
    const diagram = $(go.Diagram, {
        // user interface configurations
        allowInsert: false, allowDelete: false, allowCopy: false, allowLink: false,
        // allowTextEdit: false,
        maxSelectionCount: 1,
        // other init configurations
        hoverDelay: 100,
        // initialAutoScale: go.Diagram.Uniform,
        // model
        model: new go.GraphLinksModel({
            linkKeyProperty: 'key' // IMPORTANT! must be defined for merges and data sync when using GraphLinksModel
        }),
        // layout
        layout: $(go.TreeLayout, { layerSpacing: 120 }),
        scrollMargin: 64,
    });
    diagram.groupTemplateMap = tmpl.getGroupTemplateMap();
    diagram.nodeTemplateMap  = tmpl.getNodeTemplateMap();
    diagram.linkTemplateMap  = tmpl.getLinkTemplateMap();
    return diagram;
}

export function downloadDiagram(diagram: go.Diagram, filename: string) {
    diagram.makeImageData({
        scale: 1, background: "white", maxSize: new go.Size(9999, 9999),
        returnType: "blob", callback: (blob) => {
            console.log(`download ${filename}`);
            let url = window.URL.createObjectURL(blob);
            let a: any = document.createElement("a");
            a.style = "display: none";
            a.href = url;
            a.download = `${filename}.png`;
            if ((window.navigator as any).msSaveBlob !== undefined) {
                (window.navigator as any).msSaveBlob(blob, filename);
                return;
            }
            document.body.appendChild(a);
            requestAnimationFrame(() => {
                a.click();
                window.URL.revokeObjectURL(url);
                // document.body.removeChild(a);
            });
            console.log(`download ${filename} OK`);
        }
    });
}