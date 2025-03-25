import { type ContainerNode } from "@app/visual/types";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import * as sc from "@app/visual/nodes/styleconf";

export default function ContainerNode({ id, data }: NodeProps<ContainerNode>) {
    const cssHeight = data.collapsed ? 'h-8' : 'h-full';
    const color   = sc.TextColor(data.isDiffAdd);
    const bgColor = sc.BgColorContainer(data.isDiffAdd);
    if (data.trimmed) {
        return (
            <div className="absolute top-0 left-0 w-full h-0 opacity-0">
            </div>
        )
    }
    return (
        <div className={`container-node ${cssHeight} rounded-md border-2 border-dashed border-[${color}] bg-[${bgColor}]`}>
            <div className="w-full h-7 ml-2 flex justify-begin items-center z-10">
                <button 
                    className={`w-4 h-4 mr-1 flex items-center justify-center rounded border border-[${color}] text-[${color}]`}
                    onClick={() => {
                        console.log('container node notifier', data.notifier);
                        if (data.notifier) data.notifier(id, id, 'collapsed');
                    }}
                >
                    {data.collapsed ? '+' : '-'}
                </button>
                <p className={`h-6 text-base text-[${color}]`}>{data.label}</p>
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
