import { isSkipEvent } from "../../utils";
export const defaultHandleAiMessage = (message) => message;
export function createHandleAiMessage(events, getContext) {
    const callback = async (message, isPartial) => {
        let callbackResult;
        let result = undefined;
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            callbackResult = await event.callback(!result ? message : result, isPartial, getContext());
            if (isSkipEvent(callbackResult))
                continue;
            result = callbackResult;
        }
        // It is possible that every events returns skip, in this case the aiMessage should be assigned to the default value
        if (!result)
            result = await defaultHandleAiMessage(message, isPartial);
        return result;
    };
    return callback;
}
