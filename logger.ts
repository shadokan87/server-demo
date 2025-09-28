import { Ailogw } from "./AI-logs-watcher/src";
import { ElevenLabsVoiceProvider, PrepareCallContext } from "./AI-logs-watcher/src";
const voiceProvider = new ElevenLabsVoiceProvider({
    credentials: {
        apiKey: process.env["ELEVENLABS_API_KEY"]!
    }
});
const originalConsole = console;
export const ailogwatch = new Ailogw({
    name: "log override demo",
    log: true,
    twilio: {
        numberFrom: process.env["AILOGW_DEMO_NUMBER_FROM"]   // Using Twilio test number for "from"
    },
    voice: voiceProvider,
    polling: {
        delay: "1000:ms",
        tailAmount: 10
    },
    events: {
        async alert({ options, logs, diagnostic, sendSms, voice }) {
            void options, logs;
            const numberTo = process.env["AILOGW_DEMO_NUMBER_TO"]!;
            switch (diagnostic.raw.status) {
                case "warning":
                case "normal": {
                    originalConsole.log("!normal", diagnostic.formatted);
                    // await sendSms(numberTo, diagnostic.formatted);
                    return;
                }
                case "critical": {
                    if (voice && voice instanceof ElevenLabsVoiceProvider) {
                        const context: PrepareCallContext = {
                            githubRepositoryUrl: "https://github.com/shadokan87/server-demo",
                            namespace: options.name,
                            "the current nodejs version": "20.0.1",
                            "the database": "sqlite",
                            "emergency contact": "Richard Rizk, CTO at blackbox.ai, phone number +14427523429"
                        };
                        const call = await voice.prepareCall(diagnostic.formatted, numberTo, context);
                        console.log("context: ", JSON.stringify(context, null, 2));
                        await call();
                        process.exit(0);
                    }
                    // await sendSms(numberTo, diagnostic.formatted);
                    return;
                }
            }
        }
    }
});

// Custom console implementation
const customConsole = {
    ...originalConsole,
    log: (...args: any[]) => {
        const complete = [new Date().toISOString(), ...args];
        ailogwatch.feedLog(JSON.stringify(complete));
        originalConsole.log(...complete);
        },
        error: (...args: any[]) => {
        const complete = ['[ERROR]', new Date().toISOString(), ...args];
        ailogwatch.feedLog(JSON.stringify(complete));
        originalConsole.error(...complete);
        },
        warn: (...args: any[]) => {
        const complete = ['[WARN]', new Date().toISOString(), ...args];
        ailogwatch.feedLog(JSON.stringify(complete));
        originalConsole.warn(...complete);
        },
        info: (...args: any[]) => {
        const complete = ['[INFO]', new Date().toISOString(), ...args];
        ailogwatch.feedLog(JSON.stringify(complete));
        originalConsole.info(...complete);
        },
        debug: (...args: any[]) => {
        const complete = ['[DEBUG]', new Date().toISOString(), ...args];
        ailogwatch.feedLog(JSON.stringify(complete));
        originalConsole.debug(...complete);
        }
    };
export default customConsole;
