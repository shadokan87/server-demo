import { Ailogw } from "./src/Ailogw";
import { fakeLogs } from "./mocks/fakeLogs";
import { IncompleteConfig } from "./src/exceptions/AilogwException";
import { ElevenLabsVoiceProvider, type PrepareCallContext } from "./src/voice";
import "dotenv/config";
import { RenderRealtime } from "./src/realtime/RenderRealtime";
import { checkEnvs } from "./src/utils";

async function main() {
    const missingEnv = checkEnvs(["AILOGW_DEMO_NUMBER_TO", "AILOGW_DEMO_NUMBER_FROM"]);
    if (missingEnv)
        throw new IncompleteConfig(`Env variable '${missingEnv}' is required to launch the demo`);

    const voiceProvider = new ElevenLabsVoiceProvider({
        credentials: {
            apiKey: process.env["ELEVENLABS_API_KEY"]!
        }
    });

    const ailogwatch = new Ailogw({
        name: "vercel",
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

    // ailogwatch.feedLog("2024-09-15 08:01:20 ERROR Database query timeout: SELECT * FROM large_table");
    let logIndex = 0;

    // Feed 4 logs every 3 seconds
    setInterval(() => {
        if (logIndex < fakeLogs.length) {
            const logsToFeed = fakeLogs.slice(logIndex, logIndex + 15);
            ailogwatch.feedLog(logsToFeed);
            logIndex += logsToFeed.length;
        } else {
            console.log("All logs have been fed");
        }
    }, 3000);

}

main();