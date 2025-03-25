import { useContext, useState } from "react";
import SplitPane, { Pane } from "split-pane-react";
import { GlobalStateContext } from "@app/context/Context";
import { PrimaryArea, PrimaryPanel, SecondaryPanel, isPrimaryPanel } from "@app/context/Panels";
import PrimaryPane from "@app/panes/PrimaryPane";
import SecondaryPane from "@app/panes/SecondaryPane";
import SnapshotList from "@app/panes/SnapshotList";

import "@app/panes/style.css";

export default function MainPane() {
    const { state } = useContext(GlobalStateContext);
    const [sizes, setSizes] = useState<(number | string)[]>(['auto', 160]);
    return (
        <div id="popup-root" className="h-full">
            {/* @ts-ignore */}
            <SplitPane split="vertical" sizes={sizes} onChange={(sizes) => setSizes(sizes)}>
                <div className="h-full">
                    <PrimaryPanes node={state.panels.root}/>
                    <SecondaryPanes nodes={[]}/>
                </div>
                <Pane minSize={100} maxSize={192} className="border-2 border-l border-[#5755d9]">
                    <SnapshotList/>
                </Pane>
            </SplitPane>
        </div>
    );
}

const minPrimaryPaneSize = 64;

function PrimaryPanes({ node }: { node: PrimaryArea | PrimaryPanel }) {
    const [sizes, setSizes] = useState<(number | string)[]>(['auto']);
    if (isPrimaryPanel(node)) {
        return (
            <Pane key={node.key} minSize={minPrimaryPaneSize} className="h-full">
                <PrimaryPane pKey={node.key}/>
            </Pane>
        );
    }
    return (
        // @ts-ignore
        <SplitPane split={node.propSplit} sizes={sizes} onChange={(sizes) => setSizes(sizes)}>
            { node.children.map(child => <PrimaryPanes key={child.key} node={child}/>) }
        </SplitPane>
    );
}

function SecondaryPanes({ nodes }: { nodes: (SecondaryPanel | undefined)[] }) {
    return nodes.map((node, index) => node ? <SecondaryPane key={index} node={node}/> : null);
}
