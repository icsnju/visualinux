import { Plot } from "@app/visual/types";

export function convert(plot: Plot) {
    for (const view of Object.values(plot.views)) {
        for (const key in view.pool.boxes) {
            const box = view.pool.boxes[key];
            // ...
        }
    }
}
