import type { AilogwTypes } from "../";
export type PrepareCallContext = { namespace: string, githubRepositoryUrl?: string } & Record<string, string>;
/**
 * Abstract base class for voice providers in the Ailogw system.
 * Provides a standardized interface for making voice calls with alert messages.
 */
export abstract class AilogwVoiceProvider {
  protected credentials: AilogwTypes.VoiceProvider["credentials"];
  protected provider: AilogwTypes.VoiceProvider["provider"];

  /**
   * Creates a new voice provider instance.
   * 
   * @param config - Voice provider configuration from Ailogw options
   */
  constructor(config: AilogwTypes.VoiceProvider) {
    this.provider = config.provider;
    this.credentials = config.credentials;
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
  abstract prepareCall(alertMessage: string, toNumber: string,context: PrepareCallContext): Promise<() => Promise<{
    success: boolean;
    callId?: string;
    message?: string;
    error?: string;
  }>>;

  /**
   * Gets the provider type.
   * 
   * @returns The voice provider type
   */
  getProvider(): AilogwTypes.VoiceProvider["provider"] {
    return this.provider;
  }

  /**
   * Gets the credentials (without exposing sensitive data).
   * 
   * @returns Partial credentials object for debugging/logging
   */
  getCredentialsInfo(): Partial<AilogwTypes.VoiceProvider["credentials"]> {
    return {
      apiKey: this.credentials.apiKey ? `${this.credentials.apiKey.slice(0, 8)}...` : undefined
    };
  }
}
