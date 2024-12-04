import { Handle, Position, type NodeProps } from '@xyflow/react';

import { type MyNode } from './types';

// <div className="react-flow__node-default">

export function MyNode({
    data,
}: NodeProps<MyNode>) {
    return (
        <div className='border-2 border-black rounded-md bg-slate-50 flex flex-col items-center'>
            <p className="self-start text-xs mx-1 py-0.5">{data.label}</p>
            {data.members.map((member) => (
                <Field key={member} label={member} value={member}/>
            ))}
            {/* <Handle type="source" position={Position.Right} style={{ background: 'blue' }} /> */}
            <p className="text-xs self-end mr-1 mt-0.5">0xaaabbccd</p>
        </div>
    );
}

function Field({ label, value }: { label: string, value: string }) {
    let valueWidth = value.length * 8 + 4;
    return (
        <div className="relative w-full flex items-center border-y border-black mt-[-1px]">
            <div className="w-full flex text-xs">
                <p className="w-20 px-1 border-r border-black truncate">{label}</p>
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
