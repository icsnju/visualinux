import { State } from '@app/visual/type';

export default class KernSnapshots {
    states: State[];
    constructor(states: State[]) {
        this.states = states;
    }
}
