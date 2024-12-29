import { ReactNode } from 'react';

export const borderColor = 'border-[#5755d9]';

export type ButtonDef = {
    onClick: () => void
    ifEnabled: boolean
    icon: ReactNode
    desc: string
}

export function ButtonWrapper({ buttonDef }: { buttonDef: ButtonDef }) {
    let hoverStyles = buttonDef.ifEnabled ? '' : 'opacity-50 cursor-not-allowed';
    return (
        <div>
            <button 
                className={`w-[30px] h-[30px] flex items-center justify-center border-2 ${borderColor} rounded ${hoverStyles}`}
                onClick={buttonDef.onClick}
                disabled={!buttonDef.ifEnabled}
            >
                {buttonDef.icon}
            </button>
            <div className="invisible group-hover:visible absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full z-10">
                <div className="bg-white border border-gray-200 rounded shadow-lg mt-1">
                    <div className="px-3 py-1 text-sm text-center text-gray-700">
                        {buttonDef.desc}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ButtonsWrapper({ children, direction, width }: {
    children?: Iterable<ReactNode>,
    direction: "left" | "right",
    width?: number | string
}) {
    let paddingStyles = (direction == "left" ? "pl-1 pr-0" : "pl-0 pr-1");
    if (!width) width = 'auto';
    return (
        <div className={`flex flex-row items-center float-${direction}`}>
            {children ? [...children].map((child, i) => 
                <div className={`column col-auto ${paddingStyles} py-1`} key={i}>
                    {child}
                </div>
            ) : ''}
        </div>
    );
}
