import { isSkipEvent } from "../../utils";
export function createHandleUserMessage(events, getContext) {
    const callback = async (_message) => {
        let message = _message;
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const callbackResult = await event.callback(message, getContext());
            if (isSkipEvent(callbackResult))
                continue;
            message = callbackResult;
        }
        return message;
    };
    return callback;
}
