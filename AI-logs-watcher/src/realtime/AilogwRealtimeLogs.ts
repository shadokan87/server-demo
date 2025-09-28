export type RealtimeLogsEntryCallback<TEntry> = (data: TEntry) => void;


export abstract class AilogwRealtimeLogs<TOptions, TEntry> {
    constructor(protected options: TOptions) { }
    abstract onEntry(callback: RealtimeLogsEntryCallback<TEntry>): void;

}