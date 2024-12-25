import { Plot } from '@app/visual/type';

export default class Plots {
    data: Plot[]
    currIndex: number
    constructor(data: Plot[] = [], currIndex: number = -1) {
        this.data = data;
        this.currIndex = currIndex;
    }
    // context APIs
    addplot(plot: Plot): Plots {
        this.data.push(plot);
        this.currIndex = this.data.length - 1;
        return this.clone();
    }
    update(pKey: string, viewName: string, attrs: any): Plots {
        let plot = this.data.find(plot => plot.key === pKey);
        if (plot == null) {
            console.error(`update(${pKey}, ${viewName}, ${attrs}): no plot data`);
            return this;
        }
        let view = plot.state[viewName];
        if (view === undefined) {
            console.error(`update(${pKey}, ${viewName}, ${attrs}): view not found`);
            return this;
        }
        view.attrs = {
            ...view.attrs,
            ...attrs
        };
        return this.clone();
    }
    // APIs provided for panels
    //
    // utilities
    isEmpty() {
        return this.data.length === 0 || this.currIndex === -1;
    }
    current() {
        if (this.isEmpty()) {
            return null;
        }
        return this.data[this.currIndex];
    }
    private clone() {
        // shadow copy to force react re-render
        return new Plots(this.data, this.currIndex);
    }
}
