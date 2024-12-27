import { Plot } from '@app/visual/type';

export default class Plots {
    data: Plot[]
    currIndex: number
    constructor(data: Plot[] = [], currIndex: number = -1) {
        this.data = data;
        this.currIndex = currIndex;
    }
    //
    // context APIs
    //
    plot(plotKey: string, plot: Plot) {
        this.data.push(plot);
        this.currIndex = this.data.length - 1;
    }
    //
    // utilities
    //
    isEmpty() {
        return this.data.length === 0 || this.currIndex === -1;
    }
    current() {
        if (this.isEmpty()) {
            return null;
        }
        return this.data[this.currIndex];
    }
}
