import { type ContainerNode } from "@app/visual/types";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export default function ContainerNode({ id, data, parentId }: NodeProps<ContainerNode>) {
    // TODO: calculate the size and position of the container according to its children
    return (
        <div className="react-flow__node-default bg-transparent w-[500px] h-[500px]">
            <div className="p-2 text-sm text-gray-700">ContainerTest</div>
            <div className="p-2 text-sm text-gray-700">{data.label}</div>
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
