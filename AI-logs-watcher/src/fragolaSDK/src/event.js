export const SKIP_EVENT = Symbol('skip_event');
/**
 * When returned from an event handler, the event will be ignored.
 *
 * @returns An object with the SKIP_EVENT symbol that signals the event system to skip this event
 */
export const skip = () => ({ [SKIP_EVENT]: true });
