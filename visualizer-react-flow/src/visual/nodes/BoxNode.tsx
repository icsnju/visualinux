import { useMemo } from "react";
import { BoxNodeData, type BoxNode } from "@app/visual/types";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import * as sc from "@app/visual/nodes/styleconf";

export default function BoxNode({ id, data }: NodeProps<BoxNode>) {
    return (
        <BoxField
            id={id} data={data} depth={0}
            notifier={(_id: string) => data.notifier?.(_id, id)} parentCollapsed={data.parentCollapsed}
        />
    )
}

function BoxField({
    id, data, depth,
    notifier, parentCollapsed
}: {
    id: string, data: BoxNodeData, depth: number,
    notifier: (id: string) => void, parentCollapsed?: boolean
}) {
    // members
    const members = useMemo(() => Object.entries(data.members).map(([label, member]) => {
        switch (member.class) {
            case 'box':
                return (
                    <div key={label} className="w-full p-1">
                        <BoxField
                            id={member.object} data={member.data} depth={depth + 1}
                            notifier={notifier} parentCollapsed={parentCollapsed || data.collapsed}
                        />
                    </div>
                );
            case 'text':
                return (
                    <PrimitiveField
                        key={label} depth={depth} label={label} value={member.value} isValueEmoji={member.size == -1}
                        parentCollapsed={parentCollapsed || data.collapsed} diffOldValue={member.diffOldValue}
                    />
                );
            case 'link':
                const targetToValue = (target: string | null) => target ? target.split(':', 1)[0] : "null";
                const value = targetToValue(member.target);
                const diffOldValue =  member.diffOldTarget === undefined ? undefined : targetToValue(member.diffOldTarget);
                return (
                    <PrimitiveField
                        key={label} depth={depth} label={label} value={value} edgeSource={`${id}.${label}`}
                        parentCollapsed={parentCollapsed || data.collapsed} diffOldValue={diffOldValue}
                    />
                );
            default:
                return null;
        }
    }), [data.members, parentCollapsed, data.collapsed]);
    // reactflow edge handle
    const handle = (
        <Handle 
            key={`handle#${id}`} id={id} type="target" position={Position.Left}
            style={{
                width: '5px', height: '5px',
                left: '0'
            }}
        />
    );
    // hide the component when the parent is collapsed
    if (parentCollapsed) {
        return (
            <div className="absolute top-0 left-0 w-full h-6">
                {members}
                <div className="opacity-0">{handle}</div>
            </div>
        )
    }
    // component definition
    const color = sc.TextColor(data.isDiffAdd);
    const bgColor = sc.BgColor(depth, data.isDiffAdd);
    return (
        <div className={`box-node relative flex flex-col items-center rounded-md border-2 border-[${color}] bg-[${bgColor}]`}>
            <div className="w-full ml-2 flex justify-begin items-center z-10">
                <button 
                    className={`w-4 h-4 mr-1 flex items-center justify-center rounded border border-[${color}] text-[${color}]`}
                    onClick={() => notifier(id)}
                >
                    {data.collapsed ? '+' : '-'}
                </button>
                <p className={`h-6 text-base text-[${color}]`}>{data.label}</p>
            </div>
            {/* even if collapsed, members are required for reactflow edge rendering */}
            {data.collapsed ? (
                <div className="absolute top-0 left-0 w-full h-6 opacity-0">
                    {members}
                </div>
            ) : (
                <div className="w-full overflow-hidden">
                    <div className="border-y border-black">
                        {members}
                    </div>
                    <div className="w-full flex justify-end">
                        <p className={`mr-1 text-sm text-[${color}]`}>{data.addr}</p>
                    </div>
                </div>
            )}
            {handle}
        </div>
    );
}

function PrimitiveField({
    depth, label, value, isValueEmoji, edgeSource,
    parentCollapsed, diffOldValue
}: {
    depth: number, label: string, value: string, isValueEmoji?: boolean, edgeSource?: string,
    parentCollapsed?: boolean, diffOldValue?: string
}) {
    const color = diffOldValue === undefined ? "black" : sc.TextColorMod();
    const labelHandle = edgeSource ? <LinkFieldHandle edgeSource={edgeSource} /> : <></>;
    if (parentCollapsed) {
        return (
            <>{labelHandle}</>
        );
    }
    const {
        labelDelta, labelLines, valueLines, oldvlLines
    } = sc.TextFieldAdaption(label, value, diffOldValue, depth);
    const labelWidth = 100 - 4 * depth + 16 * Math.ceil(labelDelta / 2);
    return (
        <div className={`relative w-full flex flex-col border-y border-black`}>
            <div className="w-full flex items-stretch leading-none">
                {/* label */}
                <div style={{width: `${labelWidth}px`}} className="px-1 flex items-center border-r-2 border-black">
                    <TextLine lines={labelLines} textClassName={`text-[${color}]`} />
                </div>
                {/* value */}
                <div className="flex-1 flex items-center px-1 py-0.5 truncate">
                    <div className="flex flex-col w-full">
                        {/* handle diff */}
                        {diffOldValue !== undefined &&
                            <TextLine lines={oldvlLines} textClassName={`text-center text-[${color}] line-through`} />
                        }
                        {/* handle emoji text */}
                        {isValueEmoji ?
                            <p className={`text-center truncate text-[${color}]`} dangerouslySetInnerHTML={{__html: value}} />
                        :
                            <TextLine lines={valueLines} textClassName={`text-center text-[${color}]`} />
                        }
                    </div>
                </div>
            </div>
            {labelHandle}
        </div>
    );
}

function TextLine({ lines, textClassName }: {lines: string[], textClassName?: string}) {
    return (
        <div className="flex flex-col w-full">
            {lines.map((line, i) => (
                <p key={i} className={textClassName}>{line}</p>
            ))}
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
