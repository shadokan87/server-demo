// Base exception class
export class FragolaError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FragolaError';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, FragolaError);
        }
    }
}
export class MaxStepHitError extends FragolaError {
    constructor(message) {
        super(message);
        this.name = "MaxStepHitError";
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MaxStepHitError);
        }
    }
}
export class BadUsage extends FragolaError {
    constructor(message) {
        super(message);
        this.name = "BadUsage";
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, BadUsage);
        }
    }
}
export class GuardRailConstrain extends FragolaError {
    constructor(message, agent) {
        void agent; //TODO:
        super(message);
        this.name = "GuardRailConstrain";
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, BadUsage);
        }
    }
}
