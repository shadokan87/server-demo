//@ts-nocheck
import type OpenAI from "openai";
import { SKIP_EVENT } from "./event";

export function isAsyncFunction(fn: Function): boolean {
    return fn.constructor.name === 'AsyncFunction';
}

export const streamChunkToMessage = (chunk: OpenAI.Chat.Completions.ChatCompletionChunk, message: Partial<OpenAI.Chat.ChatCompletionMessageParam> = {} as Partial<OpenAI.Chat.ChatCompletionMessageParam>) => {
    const updatedMessage = structuredClone(message);

    // Handle role if present in delta
    if (chunk.choices[0].delta?.role) {
        updatedMessage.role = chunk.choices[0].delta.role;
    } else if (!message.role)
        updatedMessage.role = "assistant";

    // Handle content if present in delta
    if (chunk.choices[0].delta?.content) {
        updatedMessage.content = (message.content || '') + chunk.choices[0].delta.content;
    } else if (!message.content)
        updatedMessage.content = "";

    // Handle tool_calls if present in delta
    if (chunk.choices[0].delta?.tool_calls && updatedMessage.role === "assistant") {
        if (!updatedMessage.tool_calls)
            updatedMessage.tool_calls = [];
        const toolCall = chunk.choices[0].delta.tool_calls.at(-1);
        if (toolCall) {
            if (toolCall.id) {
                updatedMessage.tool_calls.push({
                    id: toolCall.id,
                    type: "function",
                    function: {
                        name: toolCall.function?.name || "",
                        arguments: toolCall.function?.arguments || ""
                    },
                })
            } else {
                const lastToolCallRef = updatedMessage.tool_calls.at(-1);
                if (lastToolCallRef && lastToolCallRef.function && toolCall.function?.arguments) {
                    lastToolCallRef.function = {
                        ...lastToolCallRef.function,
                        arguments: lastToolCallRef.function.arguments + toolCall.function.arguments
                    }
                }
            }
        }
    }

    return updatedMessage;
}

export const isSkipEvent = (data: any) => {
    return typeof data == "object" && (data as any)[SKIP_EVENT] == true
}
export const skipEventFallback = <T>(data: any, fallback: T): T => {
    if (isSkipEvent(data))
        return fallback as T;
    return data as T;
}