export class AilogwException extends Error {
    constructor(message) {
        super(message);
        this.name = 'AilogwException';
        // Set the prototype explicitly for instanceof to work when targeting ES5
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class IncompleteConfig extends AilogwException {
    constructor(message = 'Incomplete configuration for Ailogw') {
        super(message);
        this.name = 'IncompleteConfig';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class RealtimeConnectionFailed extends AilogwException {
    constructor(message = 'Websocket connection failed') {
        super(message);
        this.name = 'RealtimeConnectionFailed';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
