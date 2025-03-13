import { BoxNodeData, LinkMember, TextMember, type BoxNode } from "@app/visual/types";
import { Handle, HandleType, Position, type NodeProps } from "@xyflow/react";

import * as sc from "@app/visual/nodes/styleconf";

export default function BoxNode({ id, data }: NodeProps<BoxNode>) {
    return (
        <BoxField
            id={id} data={data} depth={0}
            notifier={(innerId: string) => data.notifier?.(innerId, id)} parentCollapsed={data.parentCollapsed}
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
    const members = Object.entries(data.members).map(([label, member]) => {
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
                    <TextField
                        key={label} label={label} member={member} depth={depth}
                        parentCollapsed={parentCollapsed || data.collapsed}
                    />
                );
            case 'link':
                return (
                    <LinkField
                        key={label} label={label} member={member} depth={depth}
                        parentCollapsed={parentCollapsed || data.collapsed} edgeSource={`${id}.${label}`}
                    />
                );
            default:
                return null;
        }
    });
    // reactflow edge handles
    const handles = (<>
        <GenHandle id={id} type="target" position={Position.Left} />
        <GenHandle id={id + "#T"} type="target" position={Position.Top} />
        <GenHandle id={id + "#B"} type="source" position={Position.Bottom} offset={parentCollapsed || data.collapsed ? 0 : 20} />
    </>);
    // hide the component when the parent is collapsed
    if (data.trimmed) {
        return (
            <div className="absolute top-0 left-0 w-full h-0 opacity-0">
                {members}
                {handles}
            </div>
        )
    }
    if (parentCollapsed) {
        return (
            <div className="absolute top-0 left-0 w-full h-6">
                {members}
                <div className="opacity-0">{handles}</div>
            </div>
        )
    }
    // component definition
    const color = sc.TextColor(data.isDiffAdd);
    const bgColor = sc.BgColor(depth, data.isDiffAdd);
    return (
        <div className={`box-node relative flex flex-col items-center rounded-md border-2 border-[${color}] bg-[${bgColor}]`}>
            <div className="w-full ml-2 flex justify-begin items-center z-10">
                <FlipButton onClick={() => notifier(id)} condition={data.collapsed} extraClassName={`border-[${color}] text-[${color}]`}/>
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
            {handles}
        </div>
    );
}

function TextField({
    label, member, depth,
    parentCollapsed
}: {
    label: string, member: TextMember, depth: number, parentCollapsed?: boolean
}) {
    return (
        <PrimitiveField
            key={label} depth={depth} label={label} value={member.value}
            parentCollapsed={parentCollapsed} diffOldValue={member.diffOldValue}
        />
    )
}

function LinkField({
    label, member, depth,
    parentCollapsed, edgeSource
}: {
    label: string, member: LinkMember, depth: number, parentCollapsed?: boolean,
    edgeSource: string
}) {
    const targetToValue = (target: string | null) => target ? target.split(':', 1)[0] : "null";
    const value = targetToValue(member.target);
    const diffOldValue =  member.diffOldTarget === undefined ? undefined : targetToValue(member.diffOldTarget);
    return (
        <PrimitiveField
            key={label} depth={depth} label={label} value={value} edgeSource={edgeSource}
            parentCollapsed={parentCollapsed} diffOldValue={diffOldValue}
        />
    );
}

function PrimitiveField({
    depth, label, value, edgeSource,
    parentCollapsed, diffOldValue
}: {
    depth: number, label: string, value: string, edgeSource?: string,
    parentCollapsed?: boolean, diffOldValue?: string
}) {
    const color = diffOldValue === undefined ? "black" : sc.TextColorMod();
    const labelHandle = edgeSource ? <GenHandle id={edgeSource} type="source" position={Position.Right} /> : <></>;
    if (parentCollapsed) {
        return (
            <>{labelHandle}</>
        );
    }
    const {
        labelDelta, labelLines, valueLines, oldvlLines
    } = sc.TextFieldAdaption(label, value, diffOldValue, depth);
    const labelWidth = 100 - 4 * depth + 16 * Math.ceil(labelDelta / 2);
    const isValueEmoji = (value: string) => value.startsWith('&#') && value.endsWith(';');
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
                        {isValueEmoji(value) ?
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

function FlipButton({ onClick, condition, extraClassName = "" }: { onClick: () => void, condition: boolean, extraClassName?: string }) {
    return (
        <button 
            className={`w-4 h-4 mr-1 flex items-center justify-center rounded border ${extraClassName}`}
            onClick={onClick}
        >
            {condition ? '+' : '-'}
        </button>
    )
}

function GenHandle({ id, type, position, offset = 0 }: { id: string, type: HandleType, position: Position, offset?: number }) {
    const stylePosition = {
        [Position.Left]:   { left: `${offset}px` },
        [Position.Right]:  { right: `${offset}px` },
        [Position.Top]:    { top: `${offset}px` },
        [Position.Bottom]: { bottom: `${offset}px` },
    }[position];
    return (
        <Handle 
            id={id} type={type} position={position} 
            style={{ width: '5px', height: '5px', ...stylePosition }}
        />
    )
}
