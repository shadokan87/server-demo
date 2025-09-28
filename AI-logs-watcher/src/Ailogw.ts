import { Fragola, tool } from "./fragolaSDK/src/fragola"
import type { Agent } from "./fragolaSDK/src/agent";
import z from "zod";
import { AilogwException, IncompleteConfig } from "./exceptions/AilogwException";
import twilio from "twilio";
import { AilogwVoiceProvider, ElevenLabsVoiceProvider } from "./voice";

const lineMarkerRegex = /^__LINE_\d+__$/;
export const LogDiagnosticSchema = z.object({
    status: z.enum(["critical", "warning", "normal"])
        .describe("Indicates the overall health status of the logs. Can be 'critical', 'warning', or 'normal'."),
    topErrors: z.array(z.string().regex(lineMarkerRegex))
        .max(3)
        .optional()
        .describe("Up to three line markers (an array index may not contain multiple line markers) (e.g., __LINE_2__) of the most critical log entries, corresponding to the __LINE_<number>__ markers in the provided logs. Only present if status is 'critical'.")
}).describe("Your final diagnostic, containing a status and optionally the top 3 critical error line markers from the __LINE_<number>__ markers.");

export type LogDiagnostic = z.infer<typeof LogDiagnosticSchema>;

export namespace AilogwTypes {
    export type logStatus = "normal" | "warning" | "critical";
    export type maybePromise<T> = Promise<T> | T;
    export type maybeArray<T> = T | T[];
    export type logType = string;
    export type alertSendSms = (numberFrom: string, customContent?: string) => Promise<boolean>;

    /**
     * Diagnostic information provided to alert event callbacks.
     * Contains both the raw AI analysis results and a formatted string representation.
     */
    export type alertDiagnostic = {
        /** Raw diagnostic data from the AI analysis, including status and error line markers */
        raw: LogDiagnostic,
        /** Human-readable formatted string containing the diagnostic information and error details */
        formatted: string
    }

    /**
     * Parameters passed to the alert event callback function.
     */
    export type alertEventParams = {
        /** Current Ailogw configuration options */
        options: AilogwTypes.options;
        /** All collected logs */
        logs: logType[];
        /** AI analysis results with formatted output */
        diagnostic: Readonly<alertDiagnostic>;
        /** Function to send SMS notifications */
        sendSms: alertSendSms;
        voice: AilogwVoiceProvider | undefined
    };

    export type alertEventCallback = (params: alertEventParams) => maybePromise<void>;
    export type VoiceProvider = {
        provider: "elevenLabs",
        credentials: {
            apiKey: string
        }
    }
    /**
     * Configuration options for creating an Ailogw instance.
     */
    export type options = {
        /**
         * Twilio configuration for SMS notifications.
         * Can be provided via options or environment variables.
         * 
         * @example
         * ```typescript
         * twilio: {
         *   accountSid: "ACxxxx",      // Or set AILOGW_TWILIO_ACCOUNT_SID env var
         *   authToken: "your-token",   // Or set AILOGW_TWILIO_AUTH_TOKEN env var
         *   numberFrom: "+17153645914" // Or set AILOGW_TWILIO_NUMBER_FROM env var
         * }
         * ```
         */
        twilio?: {
            /** Twilio Account SID */
            accountSid?: string,
            /** Twilio Auth Token */
            authToken?: string,
            /** Phone number purchased from Twilio (used as "from" number) */
            numberFrom?: string
        },

        voice?: VoiceProvider | AilogwVoiceProvider,

        /**
         * Unique identifier for this log watcher instance.
         * Used in alert messages and internal logging.
         * 
         * @example "vercel", "production-api", "database-logs"
         */
        name: string,

        /**
         * Whether to automatically start polling when instance is created.
         * @default true
         */
        activate?: boolean,

        /**
         * Whether to enable console logging for this instance.
         * @default false
         */
        log?: boolean,

        /**
         * Configuration for the AI client (Fragola).
         * @example
         * ```typescript
         * clientOptions: {
         *   baseURL: "https://api.blackbox.ai",
         *   apiKey: "sk-xxx"
         * }
         * ```
         */
        clientOptions?: ConstructorParameters<typeof Fragola>[0],

        /**
         * AI model settings for log analysis. 100% Openai compatible
         * @example
         * ```typescript
         * modelSettings: {
         *   model: "gpt-4",
         *   temperature: 0.1
         * }
         * ```
         */
        modelSettings?: Omit<ConstructorParameters<typeof Agent>[0]["modelSettings"], "tool_choice">,

        /**
         * Polling configuration for log analysis.
         */
        polling?: {
            /**
             * Interval between log analysis cycles.
             * @default "3:minutes"
             * @example "1000:ms", "30:seconds", "5:minutes", or 5000
             */
            delay: `${number}:${"minutes" | "seconds" | "ms"}` | number,

            /**
             * Number of recent log lines to analyze in each cycle.
             * @default 10
             * @example tailAmount: 20
             */
            tailAmount?: number
        },

        /**
         * Event handlers for different situations.
         */
        events: {
            /**
             * Called when an alert is triggered by the AI analysis.
             * 
             * @param params - Object containing alert event parameters
             * @param params.options - Current Ailogw configuration
             * @param params.logs - All collected logs
             * @param params.diagnostic - AI analysis results with formatted output
             * @param params.sendSms - Function to send SMS notifications
             * 
             * @example
             * ```typescript
             * alert: async ({ options, logs, diagnostic, sendSms }) => {
             *   if (diagnostic.raw.status === "critical") {
             *     await sendSms("+33728926138", diagnostic.formatted);
             *   }
             * }
             * ```
             */
            alert: alertEventCallback;
        }
    }
    export interface status {
        polling: "activated" | "paused",
        lastPollingLogIndex: number
    }
};
export type modelSettings = AilogwTypes.options["modelSettings"];
export type clientOptions = AilogwTypes.options["clientOptions"];
export const AILOGW_TWILIO_ACCOUNT_SID = "AILOGW_TWILIO_ACCOUNT_SID";
export const AILOGW_TWILIO_AUTH_TOKEN = "AILOGW_TWILIO_AUTH_TOKEN";
export const AILOGW_TWILIO_NUMBER_FROM = "AILOGW_TWILIO_NUMBER_FROM";
export const ELEVENLABS_API_KEY = "ELEVENLABS_API_KEY";

export const AilogwDefaultOptions: Omit<Required<AilogwTypes.options>, "events" | "name"> = {
    log: false,
    activate: true,
    twilio: {
        accountSid: process.env[AILOGW_TWILIO_ACCOUNT_SID],
        authToken: process.env[AILOGW_TWILIO_AUTH_TOKEN],
        numberFrom: process.env[AILOGW_TWILIO_NUMBER_FROM]
    },
    voice: {
        provider: "elevenLabs",
        credentials: {
            apiKey: process.env["ELEVENLABS_API_KEY"]!
        }
    },
    clientOptions: {
        baseURL: "https://api.blackbox.ai",
        apiKey: process.env["BLACKBOX_API_KEY"]
    },
    modelSettings: {
        model: "blackboxai/openai/gpt-4.1-mini",
        stream: true
    },
    polling: {
        delay: process.env["AILOGW_POLL_DELAY"] != undefined ? process.env["AILOGW_POLL_DELAY"] as any : "10:minutes",
        tailAmount: 10
    }
}

/**
 * AI-powered log monitoring and alerting system using Twilio for SMS notifications.
 * 
 * @example
 * ```typescript
 * const ailogwatch = new Ailogw({
 *   name: "vercel",
 *   log: true,
 *   twilio: {
 *     numberFrom: "+17153645914"
 *   },
 *   polling: {
 *     delay: "1000:ms",
 *     tailAmount: 10
 *   },
 *   events: {
 *     async alert(options, logs, diagnostic, sendSms) {
 *       await sendSms("+33625926138", `Alert: ${diagnostic.formatted}`);
 *     }
 *   }
 * });
 * 
 * // Feed logs to be analyzed
 * ailogwatch.feedLog("2024-09-16 ERROR Database connection failed");
 * ```
 */
export class Ailogw {
    #options: Required<AilogwTypes.options>;
    #status: AilogwTypes.status = {
        polling: "paused",
        lastPollingLogIndex: 0
    }
    #logs: AilogwTypes.logType[] = [];
    #intervalId: number = -1;
    #fragola: Fragola;
    #internalLog: boolean = process.env["AILOGW_LOG"] != undefined;
    #twilio: ReturnType<typeof twilio>;
    #voiceProvider: AilogwVoiceProvider | undefined;

    /**
     * Creates a new Ailogw instance with the specified configuration.
     * 
     * @param options - Configuration options for the log watcher
     * @throws {IncompleteConfig} When required Twilio credentials are missing
     * 
     * @example
     * ```typescript
     * const watcher = new Ailogw({
     *   name: "my-app",
     *   twilio: {
     *     accountSid: "ACxxxx",
     *     authToken: "your-token",
     *     numberFrom: "+1234567890"
     *   },
     *   polling: {
     *     delay: "5:minutes",
     *     tailAmount: 20
     *   },
     *   events: {
     *     alert: async (options, logs, diagnostic, sendSms) => {
     *       if (diagnostic.raw.status === "critical") {
     *         await sendSms("+1987654321", diagnostic.formatted);
     *       }
     *     }
     *   }
     * });
     * ```
     */
    constructor(options: AilogwTypes.options) {
        const gettwilioOptions = (): Required<NonNullable<AilogwTypes.options["twilio"]>> => {
            const accountSid = options.twilio?.accountSid ?? AilogwDefaultOptions.twilio.accountSid;
            const authToken = options.twilio?.authToken ?? AilogwDefaultOptions.twilio.authToken;
            const numberFrom = options.twilio?.numberFrom ?? AilogwDefaultOptions.twilio.numberFrom;

            if (!accountSid)
                throw new IncompleteConfig(`twilio 'accountSid' required. can be set in twilio options or under '${AILOGW_TWILIO_ACCOUNT_SID}' environment variable`);
            if (!authToken)
                throw new IncompleteConfig(`twilio 'authToken' required. can be set in twilio options or under '${AILOGW_TWILIO_AUTH_TOKEN}' environment variable`);
            if (!numberFrom)
                throw new IncompleteConfig(`twilio 'numberFrom' required. can be set in twilio options or under '${AILOGW_TWILIO_NUMBER_FROM}' environment variable`);

            return { accountSid, authToken, numberFrom };
        }

        this.#options = {
            twilio: gettwilioOptions(),
            voice: options.voice ?? AilogwDefaultOptions.voice,
            name: options.name,
            log: options.log ?? AilogwDefaultOptions.log,
            activate: options.activate ?? AilogwDefaultOptions.activate,
            clientOptions: options.clientOptions ?? AilogwDefaultOptions.clientOptions,
            modelSettings: options.modelSettings ?? AilogwDefaultOptions.modelSettings,
            polling: options.polling ? { ...options.polling, tailAmount: options.polling.tailAmount ?? AilogwDefaultOptions.polling.tailAmount } : AilogwDefaultOptions.polling,
            events: options.events,
        };
        if (!this.#options.clientOptions["apiKey"]) {
            this.#options.clientOptions["apiKey"] = AilogwDefaultOptions.clientOptions.apiKey
        }
        this.#options.polling.delay = this.convertDelayToMs(this.#options.polling.delay);

        this.#fragola = new Fragola(this.#options.clientOptions);
        this.#twilio = twilio(this.#options.twilio.accountSid, this.#options.twilio.authToken);

        const voiceProvidersMap: Record<AilogwTypes.VoiceProvider["provider"], (data: any) => AilogwVoiceProvider> = {
            "elevenLabs": (data) => new ElevenLabsVoiceProvider(data)
        }

        this.#voiceProvider = (() => {
            if (this.#options.voice) {
                if (!(this.#options.voice instanceof AilogwVoiceProvider)) {
                    const instanciate = voiceProvidersMap[this.#options.voice.provider];
                    if (!instanciate)
                        throw new AilogwException(`Voice provider with name '${this.#options.name} does not exist.'`);
                    return instanciate(this.#options.voice);
                } else
                    return this.#options.voice;
            }
            return undefined;
        })();

        if (this.#options.activate)
            this.activatePolling();
    }

    private internalLog(level: Parameters<typeof this.log>[0] = "info", ...any: any[]) {
        if (!this.#internalLog)
            return;
        switch (level) {
            case "info": {
                console.log(...any);
                break;
            }
            case "error": {
                console.error(...any);
                break;
            }
            case "warn": {
                console.warn(...any);
                break;
            }
            default: { // no-op
            }
        }
    }

    private log(level: "info" | "error" | "warn", ...any: any[]) {
        if (!this.#options.log)
            return;
        switch (level) {
            case "info": {
                console.log(...any);
                break;
            }
            case "error": {
                console.error(...any);
                break;
            }
            case "warn": {
                console.warn(...any);
                break;
            }
            default: { // no-op
            }
        }
    }

    /**
     * Feeds log entries to the watcher for analysis.
     * Logs can be provided as a single string (will be split by newlines) or as an array of strings.
     * 
     * @param log - Log entry(ies) to be analyzed. Can be a string or array of strings.
     * 
     * @example
     * ```typescript
     * // Single log entry
     * ailogwatch.feedLog("2024-09-16 10:30:25 ERROR Database connection failed");
     * 
     * // Multiple log entries as string
     * ailogwatch.feedLog(`2024-09-16 10:30:25 INFO Starting server
     * 2024-09-16 10:30:26 ERROR Connection timeout
     * 2024-09-16 10:30:27 CRITICAL System overload`);
     * 
     * // Array of log entries
     * ailogwatch.feedLog([
     *   "2024-09-16 10:30:25 INFO Server started",
     *   "2024-09-16 10:30:26 WARN High memory usage"
     * ]);
     * ```
     */
    feedLog(log: AilogwTypes.maybeArray<AilogwTypes.logType>) {
        if (typeof log == "string")
            this.#logs = [...this.#logs, ...log.split("\n")];
        else
            this.#logs = [...this.#logs, ...log];
        // console.log(`Logs len: ${this.#logs.length}`);
    }

    /**
     * Sends an SMS notification using Twilio.
     * 
     * @param numberFrom - The recipient's phone number (must include country code)
     * @param customContent - Optional custom message content. If not provided, uses default alert message.
     * @returns Promise that resolves to true if SMS was sent successfully
     * 
     * @example
     * ```typescript
     * // Send with custom content
     * await sendSms("+33625926138", "Critical alert: Database down!");
     * 
     * // Send with default message
     * await sendSms("+33625926138");
     * ```
     */
    private async sendSms(numberFrom: string, customContent?: string): Promise<boolean> {
        const result = await this.#twilio.messages.create({
            from: this.#options.twilio.numberFrom,
            to: numberFrom,
            body: customContent || `An alert have been emitted by a Ailogw watcher with name '${this.#options.name}'`
        });
        console.log("Send sms: ", numberFrom, customContent);
        return true;
    }

    /**
     * Creates a formatted diagnostic object from AI analysis results.
     * 
     * @param params - Raw diagnostic data from AI analysis
     * @param logs - Complete log array for line number resolution
     * @returns Formatted diagnostic object with both raw and human-readable data
     */
    private createAlertDiagnostic(params: LogDiagnostic, logs: AilogwTypes.logType[]): Readonly<AilogwTypes.alertDiagnostic> {
        let formatted = `Status: ** ${params.status} **`;
        if (params.topErrors && params.topErrors.length > 0) {
            const errorLines = params.topErrors
                .map(marker => {
                    const match = marker.match(/^__LINE_(\d+)__$/);
                    if (match && match[1]) {
                        const lineNumber = parseInt(match[1], 10);
                        const idx = lineNumber - 1;
                        return logs[idx] !== undefined ? `${lineNumber}| ${logs[idx]}` : `${lineNumber}: (log not found)`;
                    }
                    return marker;
                })
                .join('\n');
            formatted += `\nTop Errors:\n${errorLines}`;
        }
        return {
            raw: params,
            formatted: `-- Diagnostic for namespace ${this.#options.name} --\n${formatted}`
        };
    }

    /**
     * Creates the main polling routine that analyzes logs at regular intervals.
     * Uses AI to analyze new log entries and trigger alerts based on severity.
     * 
     * @returns Async function that performs one polling cycle
     */
    private createPollingRoutine(): () => Promise<void> {
        return async () => {
            if (this.#status.lastPollingLogIndex == this.#logs.length) {
                this.log("info", "No logs fed, waiting ...");
                return;
            }
            const lastNlines = this.#logs.slice(this.#status.lastPollingLogIndex, this.#status.lastPollingLogIndex + this.#options.polling.tailAmount!);
            const formattedLogs = lastNlines.map((log, index) => `__LINE_${index + 1}__:${log}`).join('\n');
            this.#status["lastPollingLogIndex"] = this.#status.lastPollingLogIndex + lastNlines.length;
            const provideDiagnosticTool = tool({
                name: "provide_diagnostic", description: "provide your final and complete diagnostic with the informations provided and following the instructions", schema: LogDiagnosticSchema,
                handler: async (params, context) => {
                    this.#options.events.alert({
                        options: this.#options,
                        logs: lastNlines,
                        diagnostic: this.createAlertDiagnostic(params, lastNlines),
                        sendSms: this.sendSms.bind(this),
                        voice: this.#voiceProvider
                    });
                    await context.stop();
                    return "success";
                }
            });
            try {
                const watcherAgent = this.#fragola.agent({
                    name: "Log watcher",
                    tools: [provideDiagnosticTool],
                    instructions:
                        `# Log Analysis Instructions

## Your Task
Analyze the provided ${this.#options.polling.tailAmount} log lines and extract relevant diagnostic data by **focusing primarily on the actual message content**. The log level is only a hint - you must read and understand the actual message to determine severity.

## Log Format
Logs are formatted as \`__LINE_<line_number>__:<log_content>\` where each line has a unique marker.

**Example:**
\`\`\`
__LINE_1__:2024-09-15 10:30:22 INFO Starting application server
__LINE_2__:2024-09-15 10:30:25 ERROR Database connection failed: timeout after 30s
__LINE_3__:2024-09-15 10:30:26 CRITICAL System memory usage at 95%, triggering emergency cleanup
\`\`\`

## **CRITICAL: Focus on Message Content, Not Log Levels**

### 🔍 **Primary Analysis Method**
1. **READ THE ACTUAL LOG MESSAGE** - This is your primary source of truth
2. **Understand the context and impact** described in the message
3. **Assess the real-world severity** based on what the message describes
4. **Use log level as a secondary hint only** - it may be incorrect or misleading

### 📊 **Status Determination Priority**
**Base your status decision on MESSAGE CONTENT analysis:**

- **\`critical\`**: Messages describing actual system failures, data loss, security breaches, or service outages
- **\`warning\`**: Messages describing potential issues, degraded performance, or concerning trends
- **\`normal\`**: Messages describing routine operations, successful completions, or minor issues

### 🚨 **Critical Issue Indicators in Messages**
Look for these concepts in the **message text** (regardless of log level):

**System Failures:**
- Service crashes, unhandled exceptions, segmentation faults
- Database connection failures, transaction rollbacks
- Authentication/authorization failures, security breaches
- Memory exhaustion, disk space issues, resource starvation

**Data Issues:**
- Data corruption, data loss, backup failures
- Inconsistent state, failed migrations, schema errors

**Performance Degradation:**
- Timeouts, slow queries, high latency
- Resource exhaustion (CPU, memory, disk)
- Queue backlogs, connection pool exhaustion

**Infrastructure Problems:**
- Network connectivity issues, DNS resolution failures
- Load balancer failures, service discovery issues
- Container/pod crashes, deployment failures

### 📝 **Analysis Process**
1. **Read each log message carefully**
2. **Identify what actually happened** based on the message content
3. **Assess the business/technical impact** of what's described
4. **Determine if this represents a real problem** requiring immediate attention
5. **Use the log level as supporting context only**

### 🎯 **Output Requirements**
- **Status**: Choose based on the most severe issue found in the MESSAGE CONTENT
- **topErrors**: Only when status is "critical" - include up to 3 \`__LINE_<number>__\` markers following these **STRICT RULES**:

#### **CRITICAL topErrors Rules (MANDATORY):**
1. **Index 0 MUST contain the MOST SEVERE critical issue** - This is the primary critical log that caused the critical status
2. **NEVER include INFO or WARN level logs in topErrors** - Only include logs that represent actual critical system issues
3. **Order by severity**: Most critical at index 0, second most critical at index 1, third most critical at index 2
4. **Only include logs with critical impact**: System failures, data loss, security breaches, service outages, crashes, corruption
5. **If only 1 critical issue exists, topErrors should contain only 1 element**
6. **If no truly critical issues exist, do not set status to "critical"**

#### **Examples of what MUST be in topErrors when status is critical:**
- ✅ Database connection completely failed
- ✅ Service crashed with unhandled exception  
- ✅ Memory exhaustion causing system shutdown
- ✅ Security breach detected
- ✅ Data corruption identified

#### **Examples of what MUST NOT be in topErrors:**
- ❌ Routine operations or maintenance messages
- ❌ Performance warnings that don't indicate failure
- ❌ Non-critical errors that don't impact system operation

**Remember: The topErrors[0] element is the most important - it must contain the actual critical issue that justifies the critical status. A message saying "Database completely unavailable" with INFO level is still critical and MUST be at index 0.**`,
                    modelSettings: { ...this.#options.modelSettings, tool_choice: "required" },
                });
                await watcherAgent.userMessage({ content: `Provide your diagnostic for the following logs:\n${formattedLogs}` });
            } catch (e) {
                console.error(e);
                process.exit(1);
            }
        }
    }

    /**
     * Pauses the log polling process.
     * No new logs will be analyzed until polling is reactivated.
     * 
     * @example
     * ```typescript
     * ailogwatch.pausePolling();
     * console.log("Log monitoring paused");
     * ```
     */
    pausePolling() {
        if (this.#intervalId != -1) {
            clearInterval(this.#intervalId);
            this.#intervalId = -1;
        }
        this.#status.polling = "paused";
    }

    /**
     * Activates or resumes the log polling process.
     * Starts analyzing logs at the configured interval if not already active.
     * 
     * @example
     * ```typescript
     * ailogwatch.activatePolling();
     * console.log("Log monitoring activated");
     * ```
     */
    activatePolling() {
        if (this.#status.polling == "activated")
            return;
        // polling.delay is guaranteed to be a number because we parse the value inside the constructor
        this.#intervalId = Number(setInterval(async () => {
            await this.createPollingRoutine()()
        }
            , this.#options.polling.delay as unknown as number));
        this.#status.polling = "activated";
    }

    /**
     * Gets the current configuration options for this Ailogw instance.
     * 
     * @returns The complete configuration object
     */
    get options() {
        return this.#options;
    }

    /**
     * Converts a delay string or number to milliseconds.
     * 
     * @param delay - Delay value as number (ms) or string format "number:unit"
     * @returns Delay in milliseconds
     * @throws {Error} When an invalid time unit is provided
     * 
     * @example
     * ```typescript
     * convertDelayToMs(5000) // 5000
     * convertDelayToMs("30:seconds") // 30000
     * convertDelayToMs("5:minutes") // 300000
     * convertDelayToMs("500:ms") // 500
     * ```
     */
    private convertDelayToMs(delay: `${number}:${"minutes" | "seconds" | "ms"}` | number): number {
        if (typeof delay === 'number') {
            return delay;
        }

        const [valueStr, unit] = delay.split(':') as [string, "minutes" | "seconds" | "ms"];
        const value = parseInt(valueStr, 10);

        switch (unit) {
            case 'ms':
                return value;
            case 'seconds':
                return value * 1000;
            case 'minutes':
                return value * 60 * 1000;
            default:
                throw new Error(`Invalid time unit: ${unit}`);
        }
    }

}