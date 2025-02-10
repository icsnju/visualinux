import { type ContainerNode } from "@app/visual/types";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const cssBgColorDiff = (isDiffAdd: boolean | undefined) => {
    if (isDiffAdd === undefined) {
        return 'bg-[#FFFFFF]';
    }
    if (isDiffAdd) {
        return 'bg-[#FCFFFC]';
    } else {
        return 'bg-[#FFFCFC]';
    }
};

export default function ContainerNode({ id, data }: NodeProps<ContainerNode>) {
    const cssAnim = 'transition-all duration-200 ease-in-out';
    const colorDiff = 
        data.isDiffAdd === undefined ? 'black' :
        data.isDiffAdd ? '[#228B22]' : '[#DC143C]';
    return (
        <div className={`container-node h-full rounded-md border-2 border-dashed border-${colorDiff} ${cssBgColorDiff(data.isDiffAdd)} ${cssAnim}`}>
            <div className="w-full ml-2 flex justify-begin items-center">
                <button 
                    className={`w-4 h-4 mr-1 flex items-center justify-center rounded border border-${colorDiff} text-${colorDiff}`}
                    onClick={() => {
                        if (data.notifier) data.notifier(id);
                    }}
                >
                    {data.collapsed ? '+' : '-'}
                </button>
                <p className={`h-8 text-lg text-${colorDiff}`}>{data.label}</p>
            </div>
            {/* <div className="w-full flex justify-end absolute bottom-0 right-0">
                <p className={`mr-1 text-sm text-${colorDiff}`}>{data.key.split(':', 1)[0]}</p>
            </div> */}
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
