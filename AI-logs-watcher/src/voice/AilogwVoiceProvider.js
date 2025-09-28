/**
 * Abstract base class for voice providers in the Ailogw system.
 * Provides a standardized interface for making voice calls with alert messages.
 */
export class AilogwVoiceProvider {
    credentials;
    provider;
    /**
     * Creates a new voice provider instance.
     *
     * @param config - Voice provider configuration from Ailogw options
     */
    constructor(config) {
        this.provider = config.provider;
        this.credentials = config.credentials;
    }
    /**
     * Gets the provider type.
     *
     * @returns The voice provider type
     */
    getProvider() {
        return this.provider;
    }
    /**
     * Gets the credentials (without exposing sensitive data).
     *
     * @returns Partial credentials object for debugging/logging
     */
    getCredentialsInfo() {
        return {
            apiKey: this.credentials.apiKey ? `${this.credentials.apiKey.slice(0, 8)}...` : undefined
        };
    }
}
