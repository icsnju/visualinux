import { useContext } from "react";
import { GlobalStateContext } from "@app/context/Context";
import { Snapshot } from "@app/visual/types";

export default function SnapshotList() {
    const { state, stateDispatch } = useContext(GlobalStateContext);
    const snapshots = state.snapshots.data;
    return (
        <div className="h-full">
            <div className="h-10 border-b-2 border-[#5755d9] flex items-center pl-2 text-lg text-[#5755d9]">
                Snapshots
            </div>
            <ul className="py-1">
                {snapshots.map((snapshot) => {
                    return (
                        <li 
                            key={snapshot.key} 
                            className="px-2 whitespace-nowrap overflow-x-hidden text-ellipsis cursor-pointer hover:bg-gray-200"
                            onClick={() => stateDispatch({ command: 'USE', snKey: snapshot.key })}
                        >
                            {snapshotTitle(snapshot)}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function snapshotTitle(snapshot: Snapshot) {
    if (snapshot.timestamp != 0) {
        return `${snapshot.key} (${timestampToDate(snapshot.timestamp)})`;
    }
    return snapshot.key;
}

function timestampToDate(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleString(undefined, {
        // month: 'numeric',
        // day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    });
}
