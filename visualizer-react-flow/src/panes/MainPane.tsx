import { useContext, useState } from 'react';
import SplitPane, { Pane } from 'split-pane-react';
import { PanelsContext } from '@app/panes/model/Context';
import { PrimaryArea, PrimaryPanel, SecondaryPanel, isPrimaryPanel } from '@app/panes/model/state';
import PrimaryPane from '@app/panes/PrimaryPane';
import SecondaryPane from '@app/panes/SecondaryPane';

import '@app/panes/style.css';

export default function MainPane() {
    const { state } = useContext(PanelsContext);
    return (
        <div id="popup-root" className="h-full">
            <PrimaryPanes node={state.root}/>
            {/* <SecondaryPanes nodes={state.followers}/> */}
        </div>
    );
}

const minPrimaryPaneSize = 64;

function PrimaryPanes({ node }: { node: PrimaryArea | PrimaryPanel }) {
    const [sizes, setSizes] = useState<(number | string)[]>(['auto']);
    if (isPrimaryPanel(node)) {
        return (
            <Pane key={node.key} minSize={minPrimaryPaneSize} style={{height: '100%'}}>
                <PrimaryPane wKey={node.key}/>
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
