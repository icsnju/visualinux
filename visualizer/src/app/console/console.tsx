'use client'

import { useCollapse } from "react-collapsed";
import { useState } from "react";

import VqlEditor from "./editor";
import AskLLM from "./askllm";

import "@styles/console.css";

export default function Console({ wKey }: { wKey: number }) {
    const [isExpanded, setExpanded] = useState(false);
    const { getCollapseProps, getToggleProps } = useCollapse({ isExpanded });
    return (
        <div className="console-wrapper">
            <section className="console-header">
                <button {...getToggleProps({
                    onClick: () => setExpanded((prevExpanded) => !prevExpanded),
                })}>
                    VQL Editor
                </button>
            </section>
            <section className="console-body" {...getCollapseProps()}>
                <div className="console">
                    <VqlEditor wKey={wKey}/>
                    {/* <AskLLM/> */}
                </div>
            </section>
        </div>
    );
}
