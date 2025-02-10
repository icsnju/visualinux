import { useMemo } from "react";
import { BoxNodeData, type BoxNode } from "@app/visual/types";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const cssBgColor = (depth: number, isDiffAdd: boolean | undefined) => {
    if (isDiffAdd === undefined) {
        return depth <= 2 ? ['bg-[#FFFFFF]', 'bg-[#ECECEC]', 'bg-[#DCDCDC]'][depth] : 'bg-[#B7B7B7]';
    }
    if (isDiffAdd) {
        return depth <= 2 ? ['bg-[#FBFFFB]', 'bg-[#F0FFF0]', 'bg-[#ECFFEC]'][depth] : 'bg-[#ECFFEC]';
    } else {
        return depth <= 2 ? ['bg-[#FFFBFB]', 'bg-[#FFF0F0]', 'bg-[#FFECEC]'][depth] : 'bg-[#FFECEC]';
    }
};

export default function BoxNode({ id, data }: NodeProps<BoxNode>) {
    return (
        <BoxField id={id} data={data} depth={0}/>
    )
}

function BoxField({ id, data, depth, collapsed }: { id: string, data: BoxNodeData, depth: number, collapsed?: boolean }) {
    const members = useMemo(() => Object.entries(data.members).map(([label, member]) => {
        switch (member.class) {
            case 'box':
                return (
                    <div key={label} className="w-full p-1">
                        <BoxField id={member.object} data={member.data} depth={depth + 1} collapsed={collapsed || data.collapsed}/>
                    </div>
                );
            case 'text':
                return <PrimitiveField
                    key={label} depth={depth} label={label} value={member.value} isValueEmoji={member.size == -1}
                    collapsed={collapsed || data.collapsed} diffOldValue={member.diffOldValue}
                />;
            case 'link':
                const targetToValue = (target: string | null) => target ? target.split(':', 1)[0] : "null";
                const value = targetToValue(member.target);
                const diffOldValue =  member.diffOldTarget === undefined ? undefined : targetToValue(member.diffOldTarget);
                return <PrimitiveField
                    key={label} depth={depth} label={label} value={value} edgeSource={`${id}.${label}`}
                    collapsed={collapsed || data.collapsed} diffOldValue={diffOldValue}
                />;
            default:
                return null;
        }
    }), [data.members, collapsed, data.collapsed]);
    if (collapsed) {
        return (
            <div className="absolute top-0 left-0 w-full h-6 opacity-0">
                {members}
            </div>
        )
    }
    const cssAnim = 'transition-all duration-200 ease-in-out';
    const colorDiff = 
        data.isDiffAdd === undefined ? 'black' :
        data.isDiffAdd ? '[#228B22]' : '[#DC143C]';
    return (
        <div className={`box-node relative flex flex-col items-center rounded-md border-2 border-${colorDiff} ${cssBgColor(depth, data.isDiffAdd)} ${cssAnim}`}>
            <div className="w-full ml-2 flex justify-begin items-center z-10">
                <button 
                    className={`w-4 h-4 mr-1 flex items-center justify-center rounded border border-${colorDiff} text-${colorDiff}`}
                    onClick={() => {
                        if (data.notifier) data.notifier(id);
                    }}
                >
                    {data.collapsed ? '+' : '-'}
                </button>
                <p className={`h-6 text-base text-${colorDiff}`}>{data.label}</p>
            </div>
            {data.collapsed ? (
                <div className="absolute top-0 left-0 w-full h-6 opacity-0">
                    {members}
                </div>
            ) : (
                <div className={`w-full overflow-hidden ${cssAnim} ${data.collapsed ? 'max-h-0' : ''}`}>
                    <div className="border-y border-black">
                        {members}
                    </div>
                    <div className="w-full flex justify-end">
                        <p className={`mr-1 text-sm text-${colorDiff}`}>{data.addr}</p>
                    </div>
                </div>
            )}
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

function PrimitiveField({
    depth, label, value, isValueEmoji, edgeSource,
    collapsed, diffOldValue
}: {
    depth: number, label: string, value: string, isValueEmoji?: boolean, edgeSource?: string,
    collapsed?: boolean, diffOldValue?: string
}) {
    const labelWidth = 96 - 5 * depth;
    const cssTextDiff = diffOldValue === undefined ? "" : "text-[#2b2be6]";
    const labelHandle = edgeSource ? <LinkFieldHandle edgeSource={edgeSource} /> : <></>;
    if (collapsed) {
        return (
            <div className="absolute top-0 left-0 w-full h-6 opacity-0">
                {labelHandle}
            </div>
        );
    }
    return (
        <div className={`relative w-full flex flex-col border-y border-black`}>
            <div className="w-full flex items-stretch leading-none">
                {/* label */}
                <div style={{width: `${labelWidth}px`}} className="px-1 flex items-center border-r-2 border-black">
                    <p className="truncate">{label}</p>
                </div>
                {/* value */}
                <div className="flex-1 px-1 py-0.5 truncate">
                    {/* handle diff */}
                    {diffOldValue !== undefined &&
                        <p className={`text-center truncate ${cssTextDiff} line-through`}>{diffOldValue}</p>
                    }
                    {/* handle emoji text */}
                    {isValueEmoji ?
                        <p className={`text-center truncate ${cssTextDiff}`} dangerouslySetInnerHTML={{__html: value}} />
                    :
                        <div>
                            {value.split('\n').map((line, i) => (
                                <p key={i} className={`text-center truncate ${cssTextDiff}`}>{line}</p>
                            ))}
                        </div>
                    }
                </div>
            </div>
            {labelHandle}
        </div>
    );
}

function LinkFieldHandle({ edgeSource }: { edgeSource?: string }) {
    return (
        <Handle 
            id={edgeSource}
            type="source" 
            position={Position.Right} 
            style={{
                width: '5px', height: '5px',
                right: '0'
            }}
        />
    )
}
