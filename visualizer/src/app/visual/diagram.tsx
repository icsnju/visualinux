'use client'

import { goModelData } from "./gotype";
import { initDiagram } from "./diagram-init";

import { useEffect, CSSProperties } from "react";
import { ReactDiagram } from "gojs-react";
import * as go from "gojs";

interface GoJSProps {
    modelData: goModelData
    diagramRef?: React.RefObject<ReactDiagram>
    updateSelected?: (selected: string | undefined) => void
    style?: CSSProperties
}

export default function GoJSDiagram(props: GoJSProps) {
    let [nodeData, linkData] = props.modelData.onUse();
    useEffect(() => {
        const diagram = props.diagramRef?.current?.getDiagram();
        if (!(diagram instanceof go.Diagram)) return;
        let onChangedSelection = (e: go.DiagramEvent) => {
            let selected: string | undefined = diagram.selection.first()?.data.key;
            if (props.updateSelected) props.updateSelected(selected);
        };
        diagram.addDiagramListener('ChangedSelection', onChangedSelection);
        return () => {
            diagram.removeDiagramListener('ChangedSelection', onChangedSelection);
        };
    });
    return (
        <ReactDiagram divClassName='react-diagram' ref={props.diagramRef}
            initDiagram={initDiagram} nodeDataArray={nodeData} linkDataArray={linkData}
            style={props.style}
        />
    );
}
