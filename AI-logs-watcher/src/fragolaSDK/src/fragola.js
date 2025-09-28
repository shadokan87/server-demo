import { Agent } from "./agent";
import OpenAI from "openai/index.js";
export const tool = (params) => params;
export function stripMeta(data) {
    const _strip = (message) => {
        const { meta, ...messageWithoutMeta } = message;
        void meta;
        return messageWithoutMeta;
    };
    if (Array.isArray(data))
        return data.map(msg => _strip(msg));
    return _strip(data);
}
export const stripConversationMeta = (conversation) => stripMeta(conversation);
export const stripAiMessageMeta = (aiMessage) => stripMeta(aiMessage);
export const stripUserMessageMeta = (userMessage) => stripMeta(userMessage);
export const stripToolMessageMeta = (toolMessage) => stripMeta(toolMessage);
export class Fragola {
    globalStore;
    openai;
    constructor(clientOptions, globalStore = undefined) {
        this.globalStore = globalStore;
        this.openai = clientOptions ? new OpenAI(clientOptions) : new OpenAI();
    }
    agent(opts) {
        return new Agent(opts, this.globalStore, this.openai);
    }
}
