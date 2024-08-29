import { Direction } from "@app/window/model";

export default function Button4D({ onClickWrapper }: { onClickWrapper?: (direction: Direction) => void }) {
    let onClick = onClickWrapper ? onClickWrapper : () => {};
    return (
        <div className="directional-buttons">
            { [Direction.up, Direction.left, Direction.right, Direction.down].map(direction => 
                <button className={`direction-button ${Direction[direction]}`} key={direction}
                        onClick={() => onClick(direction)}>
                    <span className="visually-hidden">{Direction[direction]}</span>
                </button>
            )}
        </div>
    );
}
