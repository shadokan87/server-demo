import type { AilogwTypes } from "../Ailogw";
import { AilogwVoiceProvider } from "./AilogwVoiceProvider";
import { ElevenLabsVoiceProvider } from "./elevenLabs/elevenLabsVoiceProvider";

/**
 * Creates a voice provider instance based on the configuration.
 * 
 * @param config - Voice provider configuration
 * @returns Voice provider instance
 * @throws Error if provider type is not supported
 */
function createVoiceProvider(config: AilogwTypes.VoiceProvider): AilogwVoiceProvider {
  switch (config.provider) {
    case "elevenLabs":
      return new ElevenLabsVoiceProvider(config);
    default:
      throw new Error(`Unsupported voice provider: ${config.provider}`);
  }
}


export * from "./elevenLabs";
export * from "./AilogwVoiceProvider";
export {
  createVoiceProvider
};