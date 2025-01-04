import { Handle, Position, type NodeProps } from '@xyflow/react';

import { type BoxNode } from './types';
import { BoxMember } from '@app/visual/types';

// <div className="react-flow__node-default">

export default function BoxNode({ id, data, parentId }: NodeProps<BoxNode>) {
    // const [expanded, setExpanded] = useState(true);
    // const cssWidth = expanded ? 'max-w-[232px]' : 'max-w-[128px]';
    const cssAnim = 'transition-all duration-200 ease-in-out';
    const width = 232 - 8 * data.depth;
    const cssWidth = `w-[${width}px]`;
    const members = Object.entries(data.absts['default'].members).map(([label, member]) => {
        switch (member.class) {
            case 'box':
                const mm = 32 + 18 + 16*1; // read from view storage: if collapsed or not
                return <div key={label} className={`w-full ${cssAnim}`} style={{height: `${mm}px`}}/>;
            case 'text':
                return <Field key={label} width={width} label={label} value={member.value} size={member.size}/>;
            default:
                return null;
        }
    });
    return (
        <div className={`rounded-md bg-slate-50 flex flex-col items-center ${cssAnim} ${cssWidth}`}>
            <div className="w-full ml-1 flex justify-begin items-center">
                <button 
                    className="w-4 h-4 mr-1 flex items-center justify-center border border-black rounded"
                    onClick={() => {
                        if (data.notifier) data.notifier(id);
                    }}
                >
                    {data.collapsed ? '+' : '-'}
                </button>
                <p className="text-sm">{data.label}</p>
            </div>
            <div className={`w-full pt-0.5 overflow-hidden ${cssAnim} ${data.collapsed ? 'max-h-0' : 'max-h-[500px]'}`}>
                {members}
                <div className="w-full flex justify-end">
                    <p className="text-xs mr-1">{data.addr}</p>
                </div>
            </div>
        </div>
    );
}

function Field({ width, label, value, size }: { width: number, label: string, value: string, size: number }) {
    size = 16;
    let valueWidth = 8 + size * 8;
    let labelWidth = width - valueWidth;
    return (
        <div className="relative w-full flex items-center border-y border-black mt-[-1px]">
            <div className="w-full flex text-xs">
                <p style={{width: `${labelWidth}px`}} className="w-24 px-1 border-r border-black truncate">{label}</p>
                <p style={{width: `${valueWidth}px`}} className="px-1 text-center truncate">{value}</p>
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
