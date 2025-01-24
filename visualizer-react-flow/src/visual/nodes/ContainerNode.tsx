import { type ContainerNode } from "@app/visual/types";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const cssBorderColor = (isDiffAdd: boolean | undefined) => 
    isDiffAdd === undefined ? 'border-black' :
    isDiffAdd ? 'border-[#32CD32]' : 'border-[#FF6B6B]';

export default function ContainerNode({ id, data }: NodeProps<ContainerNode>) {
    const cssAnim = 'transition-all duration-200 ease-in-out';
    return (
        <div className={`container-node h-full rounded-md border-2 border-dashed ${cssBorderColor(data.isDiffAdd)} ${cssAnim}`}>
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
