'use client'

import { useState } from "react";
import { testGPT } from "./openai";

export default function AskLLM() {
    let [msg, setMsg] = useState<string>('');
    let fuckIt = async () => {
        let m = await testGPT();
        setMsg(m);
    };
    return (
        <div>
            {msg}
            <button onClick={() => fuckIt()}>AskLLM</button>
        </div>
    )
}
