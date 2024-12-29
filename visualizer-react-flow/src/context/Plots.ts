import { Plot } from '@app/visual/type';

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
        this.data.push(plot);
        this.dataIndex.set(plotKey, this.data.length - 1);
        this.currIndex = this.data.length - 1;
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
    current() {
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
