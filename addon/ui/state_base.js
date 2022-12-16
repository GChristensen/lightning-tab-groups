export class UIStateMachine {
    #state;

    constructor() {
    }

    setState(state) {
        this.#state = state;
        state.stateMachine = this;
    }

    onKeyDown(key) {
        this.#state.onKeyDown(key);
    }
}

export class UIState {
    #stateMachine;

    get stateMachine() {
        return this.#stateMachine.deref();
    }

    set stateMachine(v) {
        return this.#stateMachine = new WeakRef(v);
    }
}

export const uiState = new UIStateMachine();