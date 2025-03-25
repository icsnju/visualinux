import { BoxNodeData, LinkMember, TextMember, type BoxNode } from "@app/visual/types";
import { Handle, HandleType, Position, type NodeProps } from "@xyflow/react";

import * as sc from "@app/visual/nodes/styleconf";

export default function BoxNode({ id, data }: NodeProps<BoxNode>) {
    return (
        <BoxField
            id={id} data={data} depth={0} parentCollapsed={data.parentCollapsed}
            notifier={(innerId: string, updType: string) => data.notifier?.(innerId, id, updType)}
        />
    )
}

function BoxField({
    id, data, depth, parentCollapsed,
    notifier
}: {
    id: string, data: BoxNodeData, depth: number, parentCollapsed?: boolean
    notifier: (id: string, type: string) => void
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
                        parentCollapsed={parentCollapsed || data.collapsed}
                        edgeSource={`${id}.${label}`} notifier={notifier}
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
                <FlipButton onClick={() => notifier(id, 'collapsed')} condition={data.collapsed} extraClassName={`mr-1 border-[${color}] text-[${color}]`}/>
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
    label, member, depth, parentCollapsed
}: {
    label: string, member: TextMember, depth: number, parentCollapsed?: boolean
}) {
    if (parentCollapsed) return <></>;
    // data conversion and style config
    const value = member.value;
    const diffOldValue = member.diffOldValue;
    const {
        labelDelta, labelLines, valueLines, oldvlLines
    } = sc.TextFieldAdaption(label, value, diffOldValue, depth);
    const labelWidth = 100 - 4 * depth + 16 * Math.ceil(labelDelta / 2);
    const color = diffOldValue === undefined ? "black" : sc.TextColorMod();
    const isValueEmoji = (value: string) => value.startsWith('&#') && value.endsWith(';');
    // label node
    const labelNode = (
        <div style={{width: `${labelWidth}px`}} className="px-1 flex items-center border-r-2 border-black">
            <TextLine lines={labelLines} textClassName={`text-[${color}]`} />
        </div>
    );
    // value node
    const valueNode = (
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
    );
    // return
    return (
        <PrimitiveField label={labelNode} value={valueNode}/>
    );
}

function LinkField({
    label, member, depth, parentCollapsed,
    edgeSource, notifier
}: {
    label: string, member: LinkMember, depth: number, parentCollapsed?: boolean,
    edgeSource: string, notifier: (id: string, type: string) => void
}) {
    // edge handle
    const edgeHandle = <GenHandle id={edgeSource} type="source" position={Position.Right} />;
    if (parentCollapsed) return <>{edgeHandle}</>;
    // data conversion and style config
    const targetToValue = (target: string | null) => target ? target.split(':', 1)[0] : "null";
    const value = targetToValue(member.target);
    const diffOldValue = member.diffOldTarget === undefined ? undefined : targetToValue(member.diffOldTarget);
    const color = diffOldValue === undefined ? "#000000" : sc.TextColorMod();
    const {
        labelDelta, labelLines, valueLines, oldvlLines
    } = sc.TextFieldAdaption(label, value, diffOldValue, depth);
    const labelWidth = 100 - 4 * depth + 16 * Math.ceil(labelDelta / 2);
    // label node
    const labelNode = (
        <div style={{width: `${labelWidth}px`}} className="px-1 flex items-center border-r-2 border-black">
            <TextLine lines={labelLines} textClassName={`text-[${color}]`} />
        </div>
    );
    // value node
    const valueNode = (
        <div className="flex-1 flex items-center px-1 py-0.5 truncate">
            <div className="flex flex-col w-full">
                {diffOldValue !== undefined && 
                    <div className="flex flex-row w-full">
                        <TextLine lines={oldvlLines} textClassName={`text-center text-[${color}] line-through`} />
                        {diffOldValue != "null" && 
                            <FlipButton onClick={() => {console.log("diffclicked")}} condition={false} extraClassName={`border-[${color}] text-[${color}] opacity-0`} />
                        }
                    </div>
                }
                <div className="flex flex-row w-full">
                    <TextLine lines={valueLines} textClassName={`text-center text-[${color}]`} />
                    {value != "null" &&
                        <FlipButton onClick={() => {
                            if (member.target) {
                                // member.isTargetTrimmed = !member.isTargetTrimmed;
                                // console.log('LINKFIELD', member.target, member.isTargetTrimmed);
                                notifier(member.target, 'trimmed');
                            }
                        }} condition={member.isTargetTrimmed} extraClassName={`border-[${color}] text-[${color}]`} />
                    }
                </div>
            </div>
        </div>
    );
    // return
    return (
        <PrimitiveField label={labelNode} value={valueNode} edgeHandle={edgeHandle}/>
    );
}

function PrimitiveField({
    label, value, edgeHandle
}: {
    label: React.JSX.Element, value: React.JSX.Element, edgeHandle?: React.JSX.Element
}) {
    return (
        <div className={`relative w-full border-y border-black`}>
            <div className="w-full flex items-stretch leading-none">
                {label}
                {value}
            </div>
            {edgeHandle}
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
            className={`w-4 h-4 text-sm flex items-center justify-center rounded border ${extraClassName}`}
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
