import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import { type MyNode } from './types';

// <div className="react-flow__node-default">

export function MyNode({
    data,
}: NodeProps<MyNode>) {
    const [expanded, setExpanded] = useState(true);
    const cssAnim = 'transition-all duration-200 ease-in-out';
    return (
        <div className={`border-2 border-black rounded-md bg-slate-50 flex flex-col items-center ${cssAnim} ${expanded ? 'max-w-[232px]' : 'max-w-[128px]'}`}>
            <div className="w-full ml-1 flex justify-begin items-center">
                <button 
                    className="w-4 h-4 mr-1 flex items-center justify-center border border-black rounded"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? '-' : '+'}
                </button>
                <p className="text-sm">{data.label}</p>
            </div>
            <div className={`w-full pt-0.5 overflow-hidden ${cssAnim} ${expanded ? 'max-h-[500px]' : 'max-h-0'}`}>
                {data.members.map((member) => (
                    <Field key={member} label={member} value={member}/>
                ))}
                <div className="w-full flex justify-end">
                    <p className="text-xs mr-1">0xaaabbccd</p>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value }: { label: string, value: string }) {
    value = '0xaabbccddeeff1122' // test
    let width = 232;
    let valueWidth = value.length * 7;
    let labelWidth = width - valueWidth;
    return (
        <div className="relative w-full flex items-center border-y border-black mt-[-1px]">
            <div className="w-full flex text-xs">
                <p style={{width: `${labelWidth}px`}} className="w-24 px-1 border-r border-black truncate">{label}</p>
                <p style={{width: `${valueWidth}px`}} className="px-1 truncate">{value}</p>
            </div>
            <Handle 
                type="source" 
                position={Position.Right} 
                style={{
                    width: '5px', height: '5px',
                    right: '0'
                }}
            />
        </div>
    );
}
