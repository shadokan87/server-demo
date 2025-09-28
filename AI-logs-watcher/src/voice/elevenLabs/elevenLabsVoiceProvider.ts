import { AilogwVoiceProvider } from "../AilogwVoiceProvider";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { GetAgentResponseModel } from "@elevenlabs/elevenlabs-js/api";
import * as dotenv from "dotenv";
import type { AilogwTypes, PrepareCallContext } from "../../";
import { checkEnvs } from "../../utils";
import { AilogwException, IncompleteConfig } from "../../exceptions";

dotenv.config();

/**
 * ElevenLabs voice provider implementation for Ailogw.
 * Handles outbound voice calls using ElevenLabs Agent Platform with Twilio integration.
 */
export class ElevenLabsVoiceProvider extends AilogwVoiceProvider {
  private client: ElevenLabsClient;
  private agents: Record<"alert", GetAgentResponseModel> | undefined = undefined;

  constructor(config: Omit<AilogwTypes.VoiceProvider, "provider">) {
    const missingEnv = checkEnvs(
      [
        "ELEVENLABS_API_KEY",
        "AILOGW_TWILIO_ACCOUNT_SID",
        "AILOGW_TWILIO_AUTH_TOKEN",
        "AILOGW_DEMO_NUMBER_FROM",
        "AILOGW_ALERT_AGENT_ID",
        "AILOGW_ALERT_AGENT_ID"
      ]);
    if (missingEnv)
      throw new IncompleteConfig(`Missing ${missingEnv} in environment`);
    super({ ...config, provider: "elevenLabs" });
    this.client = new ElevenLabsClient({ apiKey: this.credentials.apiKey });
  }

  /** here we declare a method to fetch the pre-configured agents from eleven labs,
   * the response will be later cached (in prepareCall method) for this class instance
   * @throws `AilogwException` - if we failed to get a response
  */
  async fetchAgents() {
    const agentIds = [process.env.AILOGW_ALERT_AGENT_ID] as string[];

    try {
      const response = await Promise.all(
        agentIds.map(id => this.client.conversationalAi.agents.get(id))
      );
      return { "alert": response[0]! }
    } catch (e) {
      throw new AilogwException(`Failed to fetch ${agentIds.length} agents`);
    }
  }

  /**
   * Prepares a voice call with the provided alert message and target number.
   * Returns a function that can be called to execute the prepared call.
   * 
   * @param alertMessage - The alert message to be spoken during the call
   * @param toNumber - The phone number to call (should include country code)
   * @param context - Optional context information to provide to the agent. If provided, the agent will be informed that this is all available information.
   * @returns Function that executes the prepared call
   */
  async prepareCall(alertMessage: string, toNumber: string, context: PrepareCallContext): Promise<() => Promise<{
    success: boolean;
    callId?: string;
    message?: string;
    error?: string;
  }>> {
    // Preparation phase - validate credentials and prepare resources

    // const ELEVENLABS_API_KEY = this.credentials.apiKey!;
    const AILOGW_TWILIO_ACCOUNT_SID = process.env.AILOGW_TWILIO_ACCOUNT_SID!;
    const AILOGW_TWILIO_AUTH_TOKEN = process.env.AILOGW_TWILIO_AUTH_TOKEN!;
    const AILOGW_DEMO_NUMBER_FROM = process.env.AILOGW_DEMO_NUMBER_FROM!;
    // const AILOGW_ALERT_AGENT_ID = process.env.AILOGW_ALERT_AGENT_ID!;

    // Prepare agent and phone number during preparation phase
    let agentPhoneNumberId: string;

    const prepareResources = async () => {
      if (!this.agents) {
        this.agents = await this.fetchAgents();
      }
      // Import Twilio phone number into ElevenLabs and get its phoneNumberId
      const phoneRes = await this.client.conversationalAi.phoneNumbers.create({
        provider: "twilio",
        phoneNumber: AILOGW_DEMO_NUMBER_FROM,
        sid: AILOGW_TWILIO_ACCOUNT_SID,
        token: AILOGW_TWILIO_AUTH_TOKEN,
        label: "Ailogw Demo From",
      });
      agentPhoneNumberId = phoneRes.phoneNumberId;
      return {
        diagnostic: `Alert log: ${alertMessage}\n\n`,
        namespace: context?.namespace || '(namespace details unavailable)',
        context: (() => {
          // we remove namespace from context because it is redundant
          const { namespace, ...rest } = context;
          return rest;
        })()
      }
    };

    // Prepare resources during the prepareCall phase. And retrieve dynamic variables
    const { namespace, diagnostic, context: preparedContext } = await prepareResources();
    if (!this.agents)
      throw new AilogwException(`Unexpected error: agents undefined`);
    const serializedContext = Object.keys(preparedContext).length != 0 ? JSON.stringify(preparedContext, null, 2).slice(1, -1) : "(no extra context available at this moment)";
    const agentId: string = this.agents.alert.agentId;
    // Return the call function that only handles the actual outbound call
    return async () => {
      try {
        // Place outbound call via native Twilio integration.
        const outboundCallBody: Parameters<typeof this.client.conversationalAi.twilio.outboundCall>[0] = {
          agentId,
          agentPhoneNumberId,
          toNumber: toNumber,
          // We pass the dynamic variables we prepared earlier
          conversationInitiationClientData: {
            dynamicVariables: {
              namespace,
              diagnostic,
              context: serializedContext
            }
          }
        };
        const callRes = await this.client.conversationalAi.twilio.outboundCall(outboundCallBody);

        return {
          success: callRes.success,
          callId: callRes.callSid || callRes.conversationId,
          message: callRes.message || `Call initiated successfully. Agent: ${agentId}, Phone: ${agentPhoneNumberId}`
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    };
  }
}