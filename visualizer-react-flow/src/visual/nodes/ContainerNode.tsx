import { type ContainerNode } from "@app/visual/types";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export default function ContainerNode({ id, data, parentId }: NodeProps<ContainerNode>) {
    // TODO: calculate the size and position of the container according to its children
    // const type = data.key.split(':', 2)[1]; //container.type,
    // switch (type) {
    //     case 'array':
    //         return <ArrayNode id={id} data={data} parentId={parentId} type={"container"} dragging={false} zIndex={0} isConnectable={false} positionAbsoluteX={0} positionAbsoluteY={0} />;
    // }
    const cssAnim = 'transition-all duration-200 ease-in-out';
    return (
        <div className={`${cssAnim}`}>
            <div className="w-full ml-2 flex justify-begin items-center">
                <button 
                    className="w-4 h-4 mr-1 flex items-center justify-center border border-black rounded"
                    onClick={() => {
                        if (data.notifier) data.notifier(id);
                    }}
                >
                    {data.collapsed ? '+' : '-'}
                </button>
                <p className="h-8 text-lg">{data.label}</p>
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
