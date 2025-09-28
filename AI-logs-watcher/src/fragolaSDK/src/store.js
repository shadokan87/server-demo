/**
 * A simple container for storing and updating any value.
 * Use this to keep track of information that your agent or tools need to remember or share.
 * You can get the current value, replace it, or update it based on the previous value.
 */
export class Store {
    #value;
    #storeChangeCallbacks = [];
    constructor(value) {
        this.#value = value;
    }
    /**
     * Get current store value.
     */
    get value() {
        return this.#value;
    }
    /**
     * Registers a callback function to be invoked whenever the store changes.
     *
     * @param callback - The function to call when the store changes. Receives the updated store as an argument.
     * @returns The current instance for method chaining.
     */
    onChange(callback) {
        this.#storeChangeCallbacks.push(callback);
        return this;
    }
    /**
     * Change the stored value based on what it was before.
     * Useful if you want to update part of the information without replacing everything.
     */
    update(callback) {
        this.#value = callback(this.#value);
        this.#storeChangeCallbacks.map(_callback => _callback(this.#value));
        return this;
    }
    /**
     * Replace the stored value with something new.
     */
    set(data) {
        this.#value = data;
        this.#storeChangeCallbacks.map(_callback => _callback(this.#value));
        return this;
    }
}
