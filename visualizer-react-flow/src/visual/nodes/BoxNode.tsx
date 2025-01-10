import { useMemo } from "react";
import { type BoxNode } from "@app/visual/types";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export default function BoxNode({ id, data, parentId }: NodeProps<BoxNode>) {
    // const [expanded, setExpanded] = useState(true);
    // const cssWidth = expanded ? 'max-w-[232px]' : 'max-w-[128px]';
    const cssBgColor = 
        data.depth == 0 ? 'bg-[#FFFFFF]' :
        data.depth == 1 ? 'bg-[#ECECEC]' :
        data.depth == 2 ? 'bg-[#D5D5D5]' :
        'bg-[#B7B7B7]';
    const cssAnim = 'transition-all duration-200 ease-in-out';
    const members = useMemo(() => Object.entries(data.members).map(([label, member]) => {
        switch (member.class) {
            case 'box':
                const spacing = data.heightMembers?.[member.object] ?? 0;
                return <div key={label} className={`w-full ${cssAnim}`} style={{height: `${spacing}px`}}/>;
            case 'text':
                return <Field key={label} depth={data.depth} label={label} value={member.value} isLink={false}/>;
            case 'link':
                const value = member.target ? member.target.split(':', 1)[0] : 'null';
                return <Field key={label} depth={data.depth} label={label} value={value} isLink={true}/>;
            default:
                return null;
        }
    }), [data.members]);
    return (
        <div className={`rounded-md ${cssBgColor} flex flex-col items-center ${cssAnim}`}>
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
            <div className={`w-full overflow-hidden ${cssAnim} ${data.collapsed ? 'max-h-0' : 'max-h-[500px]'}`}>
                <div className="border-y border-black">
                    {members}
                </div>
                <div className="w-full flex justify-end">
                    <p className="text-sm mr-1">{data.addr}</p>
                </div>
            </div>
            <Handle 
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

function Field({ depth, label, value, isLink }: { depth: number, label: string, value: string, isLink: boolean }) {
    const labelWidth = 96 - 5 * depth;
    return (
        <div className="relative w-full flex items-center border-y border-black h-5">
            <div className="w-full flex text-sm">
                <p style={{width: `${labelWidth}px`}} className="px-1 border-r-2 border-black truncate">{label}</p>
                <p className="flex-1 px-1 text-center truncate">{value}</p>
            </div>
            {isLink ? <Handle 
                id={label}
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
