import { ReactNode } from "react"

export type ButtonDef = {
    onClick: () => void
    ifEnabled: boolean
    icon: string
    desc: string
}

export function ButtonWrapper({ buttonDef }: { buttonDef: ButtonDef }) {
    return (
        <div className="popover popover-bottom">
            <button className={`btn btn-sm btn-primary ${buttonDef.ifEnabled ? '' : 'disabled'}`}
                    onClick={buttonDef.onClick}>
                <i className={`icon icon-${buttonDef.icon}`}></i>
            </button>
            <div className="popover-container" style={{width: "auto"}}>
                <div className="card">
                    <div className="card-header text-center text-tiny px-2 py-1">
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
        <div className={`column col-${width} columns float-${direction}`}>
            {children ? [...children].map((child, i) => 
                <div className={`column col-auto ${paddingStyles} py-1`} key={i}>
                    {child}
                </div>
            ) : ''}
        </div>
    );
}
