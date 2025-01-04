import { Plot } from "@app/visual/types";

export default class Plots {
    data: Plot[]
    dataIndex: Map<string, number>
    currIndex: number
    constructor(data: Plot[] = [], currIndex: number = -1) {
        this.data = data;
        this.dataIndex = new Map();
        this.currIndex = currIndex;
    }
    //
    // context APIs
    //
    plot(plotKey: string, plot: Plot) {
        // preprocess
        // preprocess(plot.views);
        let orderedViews = Object.keys(plot.views).sort().reduce((obj: any, key) => { 
            obj[key] = plot.views[key]; 
            return obj;
        }, {});
        plot.views = orderedViews;
        // store
        this.data.push(plot);
        this.dataIndex.set(plotKey, this.data.length - 1);
        this.currIndex = this.data.length - 1;
    }
    //
    //
    //
    getView(viewname: string | undefined) {
        if (viewname === undefined) {
            return null;
        }
        const plot = this.getCurrent();
        if (plot === null) {
            return null;
        }
        return plot.views[viewname];
    }
    getViewnameList(): string[] {
        const plot = this.getCurrent();
        if (plot === null) {
            return [];
        }
        return Object.keys(plot.views);
    }
    //
    // utilities
    //
    isEmpty() {
        return this.data.length === 0 || this.currIndex === -1;
    }
    get(plotKey: string) {
        const index = this.dataIndex.get(plotKey);
        if (index === undefined) {
            return null;
        }
        return this.data[index];
    }
    getCurrent() {
        if (this.isEmpty()) {
            return null;
        }
        return this.data[this.currIndex];
    }
    use(plotKey: string) {
        const index = this.dataIndex.get(plotKey);
        if (index === undefined) {
            this.currIndex = -1;
            return;
        }
        this.currIndex = index;
    }
}
