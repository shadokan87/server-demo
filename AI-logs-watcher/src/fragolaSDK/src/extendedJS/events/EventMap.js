import { createHandleAiMessage, defaultHandleAiMessage } from "./aiMessage";
import { createHandleUserMessage } from "./userMessage";
export class EventMap extends globalThis.Map {
    getContext;
    #handleAiMessage = defaultHandleAiMessage;
    #handleUserMessage = undefined;
    constructor(getContext, ...args) {
        super(...args);
        this.getContext = getContext;
    }
    get handleAiMessage() {
        return this.#handleAiMessage;
    }
    get handleUserMessage() {
        return this.#handleUserMessage;
    }
    set(key, value) {
        super.set(key, value);
        switch (key) {
            case "aiMessage": {
                this.#handleAiMessage = createHandleAiMessage(value, this.getContext);
                break;
            }
            case "userMessage": {
                this.#handleUserMessage = createHandleUserMessage(value, this.getContext);
                break;
            }
            default: {
                break;
            }
        }
        return this;
    }
    delete(key) {
        const res = super.delete(key);
        if (res) {
            switch (key) {
                case "aiMessage": {
                    this.#handleAiMessage = defaultHandleAiMessage;
                    break;
                }
                case "userMessage": {
                    this.#handleUserMessage = undefined;
                    break;
                }
                default: {
                    break;
                }
            }
        }
        return res;
    }
}
