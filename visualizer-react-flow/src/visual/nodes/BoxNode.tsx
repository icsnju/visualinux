import { useMemo } from "react";
import { BoxNodeData, type BoxNode } from "@app/visual/types";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const cssBgColor = (depth: number) => 
    depth == 0 ? 'bg-[#FFFFFF]' :
    depth == 1 ? 'bg-[#ECECEC]' :
    depth == 2 ? 'bg-[#D5D5D5]' :
    'bg-[#B7B7B7]';

export default function BoxNode({ id, data }: NodeProps<BoxNode>) {
    return (
        <BoxField id={id} data={data} depth={0}/>
    )
}

function BoxField({ id, data, depth }: { id: string, data: BoxNodeData, depth: number }) {
    const members = useMemo(() => Object.entries(data.members).map(([label, member]) => {
        switch (member.class) {
            case 'box':
                return (
                    <div key={label} className="w-full p-1">
                        <BoxField id={member.object} data={member.data} depth={depth + 1}/>
                    </div>
                );
            case 'text':
                return <PrimitiveField key={label} depth={depth} label={label} value={member.value} isValueEmoji={member.size == -1}/>;
            case 'link':
                const value = member.target ? member.target.split(':', 1)[0] : 'null';
                return <PrimitiveField key={label} depth={depth} label={label} value={value} edgeSource={`${id}.${label}`}/>;
            default:
                return null;
        }
    }), [data.members]);
    const cssBorder = depth > 0 ? 'border-2 border-black' : '';
    const cssAnim = 'transition-all duration-200 ease-in-out';
    return (
        <div className={`relative flex flex-col items-center rounded-md ${cssBorder} ${cssBgColor(depth)} ${cssAnim}`}>
            <div className="w-full ml-1 flex justify-begin items-center">
                <button 
                    className="w-4 h-4 mr-1 flex items-center justify-center border border-black rounded"
                    onClick={() => {
                        if (data.notifier) data.notifier(id);
                    }}
                >
                    {data.collapsed ? '+' : '-'}
                </button>
                <p className="h-6 text-base">{data.label}</p>
            </div>
            <div className={`w-full overflow-hidden ${cssAnim} ${data.collapsed ? 'max-h-0' : ''}`}>
                <div className="border-y border-black">
                    {members}
                </div>
                <div className="w-full flex justify-end">
                    <p className="text-sm mr-1">{data.addr}</p>
                </div>
            </div>
            <Handle 
                key={`handle#${id}`}
                id={id}
                type="target" 
                position={Position.Left} 
                style={{
                    width: '5px', height: '5px',
                    left: '0'
                }}
            />
        </div>
    );
}

function PrimitiveField({ depth, label, value, isValueEmoji, edgeSource }: { depth: number, label: string, value: string, isValueEmoji?: boolean, edgeSource?: string }) {
    const labelWidth = 96 - 5 * depth;
    return (
        <div className="relative w-full flex items-center border-y border-black h-5">
            <div className="w-full flex text-sm">
                <p style={{width: `${labelWidth}px`}} className="px-1 border-r-2 border-black truncate">{label}</p>
                {isValueEmoji ?
                    <p className="flex-1 px-1 text-center truncate" dangerouslySetInnerHTML={{__html: value}} />
                :
                    <p className="flex-1 px-1 text-center truncate">{value}</p>
                }
            </div>
            {edgeSource ? <Handle 
                key={`handle#${edgeSource}`}
                id={edgeSource}
                type="source" 
                position={Position.Right} 
                style={{
                    width: '5px', height: '5px',
                    right: '0'
                }}
            /> : <></>}
        </div>
    );
}
