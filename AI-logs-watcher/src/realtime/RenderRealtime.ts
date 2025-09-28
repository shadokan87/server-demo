import WebSocket from "ws";
import { AilogwRealtimeLogs, type RealtimeLogsEntryCallback } from "./AilogwRealtimeLogs";
import { RealtimeConnectionFailed } from "../exceptions";
import { nanoid } from "nanoid";

export interface RenderLogEntry {
    /** Unique identifier for the log entry */
    id: string,
    /** Array of key-value pair labels containing metadata like resource, instance, level, and type */
    labels: {
        /** The name/key of the label (e.g., "resource", "instance", "level", "type") */
        name: string,
        /** The value associated with the label name */
        value: string
    }[],
    /** The actual log message content */
    message: string,
    /** ISO 8601 formatted timestamp indicating when the log entry was created */
    timestamp: string
}
/** Type alias representing a single label from the Entry labels array */
export type Label = RenderLogEntry["labels"][0];
export interface RenderRealtimeOptions {
    /** API key from your render account setting*/
    apiKey: string,
    /** Unique identifier of the workspace */
    ownerId: string,
    /** Resource identifier e.g your web service*/
    resource: string,
}

/**
 * Real-time log streaming client for Render.com services.
 * Connects to Render's WebSocket API to receive live log entries from your deployed services.
 * 
 * @example
 * ```typescript
 * const renderLogs = new RenderRealtime({
 *   apiKey: "rnd_your_api_key",
 *   ownerId: "usr-12345",
 *   resource: "srv-abcdef"
 * });
 * 
 * // Listen for new log entries
 * const unsubscribe = renderLogs.onEntry((logEntry) => {
 *   console.log(`[${logEntry.timestamp}] ${logEntry.message}`);
 * });
 * 
 * // Later, stop listening
 * unsubscribe();
 * ```
 */
export class RenderRealtime extends AilogwRealtimeLogs<RenderRealtimeOptions, RenderLogEntry> {
    /** Private WebSocket connection to Render's log streaming API */
    #ws: WebSocket;
    #entryCallback: { id: string, callback: RealtimeLogsEntryCallback<RenderLogEntry> }[] = [];
    
    /**
     * Creates a new RenderRealtime instance and establishes WebSocket connection.
     * 
     * @param options - Configuration options for connecting to Render's API
     * @param entryCallback - Array of callback functions to handle incoming log entries
     * 
     * @example
     * ```typescript
     * 
     * const renderLogs = new RenderRealtime({
     *   apiKey: "rnd_your_api_key",
     *   ownerId: "usr-12345",
     *   resource: "srv-abcdef"
     * });
     * ```
     */
    constructor(options: RenderRealtimeOptions) {
        super(options);
        this.#ws = this.initWS();
        this.#ws.on('message', (data: Buffer) => {
            try {
                const logData = JSON.parse(data.toString());
                for (let i = 0; i < this.#entryCallback.length; i++) {
                    this.#entryCallback[i]?.callback(logData);
                }
            } catch (error) {
                console.log(`Failed to parse log entry`);
            }
        });
        return this;
    }

    /**
     * Initializes the WebSocket connection to Render's log streaming API.
     * Configures the connection with proper authentication and query parameters.
     * 
     * @returns Configured WebSocket instance
     * @throws {RealtimeConnectionFailed} When WebSocket connection cannot be established
     */
    private initWS() {
        const url = new URL('wss://api.render.com/v1/logs/subscribe');
        url.searchParams.set('ownerId', this.options.ownerId);
        url.searchParams.set('direction', 'forward');
        url.searchParams.set('resource', this.options.resource);
        url.searchParams.set('limit', '20');

        try {
            const ws = new WebSocket(url.toString(), {
                headers: {
                    'authorization': `Bearer ${this.options.apiKey}`
                }
            });
            return ws;
        } catch (e) {
            const _e = e as { message?: string } | undefined;
            throw new RealtimeConnectionFailed(_e?.message)
        }
    }

    /**
     * Gets the underlying WebSocket connection instance.
     * Useful for accessing WebSocket events or connection state.
     * 
     * @returns The WebSocket instance used for log streaming
     * 
     * @example
     * ```typescript
     * const renderLogs = new RenderRealtime(options);
     * 
     * // Check connection state
     * console.log('WebSocket state:', renderLogs.ws.readyState);
     * 
     * // Listen to connection events
     * renderLogs.ws.on('open', () => console.log('Connected to Render logs'));
     * renderLogs.ws.on('close', () => console.log('Disconnected from Render logs'));
     * ```
     */
    get ws() {
        return this.#ws;
    }

    /**
     * Registers a callback function to handle incoming log entries.
     * Returns a function that can be called to unregister the callback.
     * 
     * @param callback - Function to call when a new log entry is received
     * @returns Function to remove this callback from the list of handlers
     * 
     * @example
     * ```typescript
     * const renderLogs = new RenderRealtime(options);
     * 
     * // Register a callback
     * const unsubscribe = renderLogs.onEntry((logEntry) => {
     *   console.log(`[${logEntry.timestamp}] ${logEntry.message}`);
     *   
     *   // Access log metadata
     *   const level = logEntry.labels.find(l => l.name === 'level')?.value;
     *   if (level === 'error') {
     *     console.error('Error detected:', logEntry.message);
     *   }
     * });
     * 
     * // Later, stop listening
     * unsubscribe();
     * ```
     */
    onEntry(callback: RealtimeLogsEntryCallback<RenderLogEntry>): () => void {
        const id = nanoid();
        this.#entryCallback = [...this.#entryCallback, { id, callback }];
        const remove = () => {
            this.#entryCallback = this.#entryCallback.filter(c => c.id != id);
        }
        return remove;
    }
}