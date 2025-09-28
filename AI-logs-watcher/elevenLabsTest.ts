import * as dotenv from "dotenv";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AILOGW_TWILIO_ACCOUNT_SID = process.env.AILOGW_TWILIO_ACCOUNT_SID;
const AILOGW_TWILIO_AUTH_TOKEN = process.env.AILOGW_TWILIO_AUTH_TOKEN;
const AILOGW_DEMO_NUMBER_FROM = process.env.AILOGW_DEMO_NUMBER_FROM;
const AILOGW_DEMO_NUMBER_TO = process.env.AILOGW_DEMO_NUMBER_TO;

// Initialize ElevenLabs SDK client
const client = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });

export type CallAndSayAlertResult = {
  agentId: string;
  agentPhoneNumberId: string;
  conversationId?: string;
  callSid?: string;
  success: boolean;
  message?: string;
};

/**
 * Places an outbound phone call using ElevenLabs Agent Platform with Twilio credentials
 * and speaks the provided alert message.
 */
export async function callAndSayAlert(alert: string): Promise<CallAndSayAlertResult> {
  if (!ELEVENLABS_API_KEY) throw new Error("Missing ELEVENLABS_API_KEY in environment");
  if (!AILOGW_TWILIO_ACCOUNT_SID) throw new Error("Missing AILOGW_TWILIO_ACCOUNT_SID in environment");
  if (!AILOGW_TWILIO_AUTH_TOKEN) throw new Error("Missing AILOGW_TWILIO_AUTH_TOKEN in environment");
  if (!AILOGW_DEMO_NUMBER_FROM) throw new Error("Missing AILOGW_DEMO_NUMBER_FROM in environment");
  if (!AILOGW_DEMO_NUMBER_TO) throw new Error("Missing AILOGW_DEMO_NUMBER_TO in environment");

  // 1) Create an agent configured to read alerts
  const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel (public)
  const agentName = `AilogwAlertAgent-${Date.now()}`;

  const agentRes = await client.conversationalAi.agents.create({
    conversationConfig: {
      tts: { voiceId },
      agent: {
        firstMessage: alert,
        language: "en",
        prompt: {
          prompt:
            "You are an on-call alert assistant. Read the provided alert message clearly and concisely, then end the call.",
        },
      },
    },
  });
  const agentId = agentRes.agentId;

  // 2) Import Twilio phone number into ElevenLabs and get its phoneNumberId
  const phoneRes = await client.conversationalAi.phoneNumbers.create({
    provider: "twilio",
    phoneNumber: AILOGW_DEMO_NUMBER_FROM,
    sid: AILOGW_TWILIO_ACCOUNT_SID,
    token: AILOGW_TWILIO_AUTH_TOKEN,
    label: "Ailogw Demo From",
  });
  const agentPhoneNumberId = phoneRes.phoneNumberId;

  // 3) Place outbound call via native Twilio integration
  const callRes = await client.conversationalAi.twilio.outboundCall({
    agentId,
    agentPhoneNumberId,
    toNumber: AILOGW_DEMO_NUMBER_TO,
  });

  return {
    agentId,
    agentPhoneNumberId,
    conversationId: callRes.conversationId,
    callSid: callRes.callSid,
    success: callRes.success,
    message: callRes.message,
  };
}

// Run directly: npx ts-node elevenLabsTest.ts
if (require.main === module) {
  const randomAlert = `Random Alert ${new Date().toISOString()} (#${Math.random().toString(36).slice(2, 8)})`;
  callAndSayAlert(randomAlert)
    .then((res) => {
      console.log("Outbound call initiated:", res);
      process.exit(res.success ? 0 : 1);
    })
    .catch((err) => {
      console.error("Failed to place call:", err);
      process.exit(1);
    });
}
