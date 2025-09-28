//@ts-nocheck
import { Store } from "./store";
import { stripUserMessageMeta } from "./fragola";
import { zodToJsonSchema } from "openai/_vendor/zod-to-json-schema/zodToJsonSchema.mjs";
import { streamChunkToMessage, isAsyncFunction, isSkipEvent, skipEventFallback } from "./utils";
import { BadUsage, FragolaError, MaxStepHitError } from "./exceptions";
import OpenAI from "openai/index.js";
import { nanoid } from "nanoid";
import { EventMap } from "./extendedJS/events/EventMap";
export const createStore = (data) => new Store(data);
/**
 * @typescript The default values for {@link StepOptions}.
 *
 * @property maxStep - Default: 10. The maximum number of steps to execute in one call.
 * @property unansweredToolBehaviour - Default: "answer". Determines how to handle unanswered tool calls.
 * @property skipToolString - Default: "(generation has been canceled, you may ignore this tool output)". The string to use when skipping a tool call.
 */
export const defaultStepOptions = {
    maxStep: 10,
    resetStepCountAfterUserMessage: true,
    unansweredToolBehaviour: "answer",
    skipToolString: "Info: this too execution has been canceled. Do not assume it has been processed and inform the user that you are aware of it."
};
const AGENT_FRIEND = Symbol('AgentAccess');
/**
 * Context of the agent which triggered the event or tool.
 */
export class AgentContext {
    _state;
    _options;
    _store;
    _globalStore;
    setInstructionsFn;
    setOptionsFn;
    stopFn;
    constructor(_state, _options, _store, _globalStore, setInstructionsFn, setOptionsFn, stopFn) {
        this._state = _state;
        this._options = _options;
        this._store = _store;
        this._globalStore = _globalStore;
        this.setInstructionsFn = setInstructionsFn;
        this.setOptionsFn = setOptionsFn;
        this.stopFn = stopFn;
    }
    [AGENT_FRIEND] = {
        setState: (newState) => {
            this._state = newState;
        },
        setOptions: (newOptions) => {
            this._options = newOptions;
        },
    };
    /** The current state of the agent. */
    get state() {
        return this._state;
    }
    /** The configuration options for the agent context. */
    get options() {
        return this._options;
    }
    /** Acess the agent's local store. */
    get store() {
        return this._store;
    }
    /** Returns the agent's local store casted as T. Recommanded when accessing the store from a tool */
    getStore() { return this._store ? this._store : undefined; }
    /** Access the global store shared across agents of the same Fragola instance. */
    get globalStore() {
        return this._globalStore;
    }
    /** Returns the global store casted as T. Recommanded when accessing the global store from a tool */
    getGlobalStore() { return this._store ? this._store : undefined; }
    /**
     * Sets the current instructions for the agent.
     * @param instructions - The new instructions as a string.
     */
    setInstructions(instructions) {
        this.setInstructionsFn(instructions);
    }
    /**
     * Updates the agent's options.
     * **note**: the `name` property is ommited
     * @param options - The new options to set, as a SetOptionsParams object.
     */
    setOptions(options) {
        this.setOptionsFn(options);
    }
    async stop() {
        return await this.stopFn();
    }
}
export class AgentRawContext extends AgentContext {
    rawMethods;
    constructor(_state, _options, _store, _globalStore, setInstructionsFn, setOptionsFn, stopFn, rawMethods) {
        super(_state, _options, _store, _globalStore, setInstructionsFn, setOptionsFn, stopFn);
        this.rawMethods = rawMethods;
    }
    get raw() {
        return this.rawMethods;
    }
}
export class Agent {
    opts;
    globalStore;
    state;
    static defaultAgentState = {
        conversation: [],
        stepCount: 0,
        status: "idle"
    };
    openai;
    paramsTools = [];
    registeredEvents = new EventMap(() => this.context);
    // private registeredEvents: Map<AgentEventId, registeredEvent<AgentEventId, TMetaData, TGlobalStore, TStore>[]> = new Map();
    abortController = undefined;
    stopRequested = false;
    context;
    constructor(opts, globalStore = undefined, openai, state = Agent.defaultAgentState) {
        this.opts = opts;
        this.globalStore = globalStore;
        this.state = state;
        this.context = this.createAgentContext();
        this.openai = openai;
        this.toolsToModelSettingsTools();
        if (opts.initialConversation != undefined)
            this.state.conversation = structuredClone(opts.initialConversation);
        if (!opts.stepOptions)
            this.opts["stepOptions"] = defaultStepOptions;
        else {
            this.opts["stepOptions"] = {
                ...defaultStepOptions,
                ...opts.stepOptions
            };
            this.validateStepOptions(this.opts.stepOptions);
        }
    }
    getState() { return this.state; }
    ;
    async raw(callback) {
        const rawContext = new AgentRawContext(this.state, this.opts, this.opts.store, this.globalStore, (instructions) => {
            this.opts["instructions"] = instructions;
        }, (options) => {
            this.opts = { ...options, name: this.opts.name, store: this.opts.store };
        }, async () => await this.stop(), {
            setGenerating: this.setGenerating,
            setIdle: this.setIdle,
            setWaiting: this.setWaiting,
            dispatchState: async (state) => {
                this.updateState(() => state);
            }
        });
        if (isAsyncFunction(callback)) {
            const newState = await callback(this.openai, rawContext);
            this.updateState(() => newState);
        }
        else {
            const newState = callback(this.openai, rawContext);
            this.updateState(() => newState);
        }
        return this.state;
    }
    toolsToModelSettingsTools() {
        const result = [];
        this.opts.tools?.forEach(tool => {
            result.push({
                type: "function",
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.schema ? zodToJsonSchema(tool.schema) : undefined
                }
            });
        });
        this.paramsTools = result;
    }
    async appendMessages(messages, replaceLast = false, reason) {
        await this.updateConversation((prev) => {
            if (replaceLast)
                return [...prev.slice(0, -1), ...messages];
            return [...prev, ...messages];
        }, reason);
    }
    async setIdle() { await this.updateState(prev => ({ ...prev, status: "idle" })); }
    async setGenerating() { await this.updateState(prev => ({ ...prev, status: "generating" })); }
    async setWaiting() { await this.updateState(prev => ({ ...prev, status: "waiting" })); }
    async updateState(callback) {
        this.state = callback(this.state);
        this.context[AGENT_FRIEND].setState(this.state);
        await this.applyEvents("after:stateUpdate", null);
    }
    async updateConversation(callback, reason) {
        await this.updateState((prev) => ({ ...prev, conversation: callback(this.state.conversation) }));
        await this.applyEvents("after:conversationUpdate", { reason });
    }
    /**
     * Updates the agent's options.
     * **Note**: Can only be called when agent status is "idle".
     * The `name` and `initialConversation` properties are omitted.
     *
     * @param options - The new options to set, as a SetOptionsParams object.
     * @throws {BadUsage} When called while agent is not idle (generating or waiting).
     */
    setOptions(options) {
        if (this.state.status !== "idle") {
            throw new BadUsage(`Cannot change options while agent is '${this.state.status}'. ` +
                `Options can only be changed when agent status is 'idle'.`);
        }
        this.opts = { ...this.opts, ...options };
        this.context[AGENT_FRIEND].setOptions({ ...this.context.options, ...options });
    }
    get options() { return this.opts; }
    stepOptions() { return this.opts.stepOptions; }
    validateStepOptions(stepOptions) {
        if (!stepOptions)
            return;
        const { maxStep } = stepOptions;
        if (maxStep != undefined) {
            if (maxStep <= 0)
                throw new BadUsage(`field 'maxStep' of 'StepOptions' cannot be less than or equal to 0. Received '${maxStep}'`);
        }
    }
    async step(stepParams) {
        let overrideStepOptions = undefined;
        if (stepParams) {
            const { by, ...rest } = stepParams;
            if (by != undefined && by <= 0)
                throw new BadUsage(`field 'by' of 'stepParams' cannot be less than or equal to 0. Received '${by}'`);
            if (!rest || Object.keys(rest).length != 0)
                overrideStepOptions = rest;
        }
        if (overrideStepOptions)
            this.validateStepOptions(overrideStepOptions);
        const stepOptions = overrideStepOptions ? { ...defaultStepOptions, ...overrideStepOptions } : this.stepOptions();
        if (this.state.conversation.length != 0)
            await this.recursiveAgent(stepOptions, () => {
                if (stepParams?.by != undefined)
                    return this.state.stepCount == (this.state.stepCount + stepParams.by);
                return false;
            }).finally(() => {
                this.abortController = undefined;
                this.stopRequested = false;
            });
        return this.state;
    }
    resetStepCount() {
        this.state.stepCount = 0;
    }
    reset(params = { initialConversation: [] }) {
        if (this.state.status != "idle") {
            throw new BadUsage(`Cannot reset while agent is '${this.state.status}'. ` +
                `Agent can only be reset when agent status is 'idle'.`);
        }
        this.updateState(() => ({
            status: "idle",
            conversation: params.initialConversation,
            stepCount: 0
        }));
    }
    /**
     * Stops the current agent execution.
     * This will abort any ongoing API calls and prevent further tool execution.
     */
    async stop() {
        this.stopRequested = true;
        if (this.abortController) {
            this.abortController.abort();
        }
    }
    lastAiMessage(conversation) {
        for (let i = conversation.length - 1; i >= 0; i--) {
            const msg = conversation[i];
            if (msg.role === "assistant") {
                return msg;
            }
        }
        return undefined;
    }
    createAgentContext() {
        return new AgentContext(this.state, this.opts, this.opts.store, this.globalStore, (instructions) => {
            this.opts["instructions"] = instructions;
        }, (options) => {
            this.opts = { ...options, name: this.opts.name, store: this.opts.store };
        }, async () => await this.stop());
    }
    setStepCount(value) {
        this.updateState((prev) => {
            return {
                ...prev,
                stepCount: value
            };
        });
    }
    async recursiveAgent(stepOptions, stop, iter = 0) {
        // Check if stop was requested
        if (this.stopRequested) {
            return;
        }
        if (stepOptions.resetStepCountAfterUserMessage) {
            if (this.state.conversation.at(-1)?.role == "user")
                this.setStepCount(0);
        }
        if (this.state.stepCount == stepOptions.maxStep)
            throw new MaxStepHitError(``);
        this.abortController = new AbortController();
        const lastMessage = this.state.conversation.at(-1);
        let aiMessage;
        let lastAiMessage = undefined;
        let toolCalls = [];
        const shouldGenerate = (() => {
            if (lastMessage?.role == "user")
                return true;
            if (lastMessage?.role == "tool") {
                lastAiMessage = this.lastAiMessage(this.state.conversation);
                if (!lastAiMessage)
                    throw new FragolaError("Invalid conversation, found 'tool' role without previous 'assistant' role.");
                if (!lastAiMessage.tool_calls)
                    throw new FragolaError("Invalid conversation, found 'tool' role but 'tool_calls' is empty in previous 'assistant' role.");
                // Some tool calls may be already answered, we filter them out
                toolCalls = lastAiMessage.tool_calls.filter(toolCall => {
                    return !this.state.conversation.some(message => message.role == "tool" && message.tool_call_id == toolCall.id);
                });
                // Generation can happen only if all tool_calls have been answered, if not the case, tool calls will be answered and the generation can happen in the next recursive turn
                return toolCalls.length == 0;
            }
            return false;
        })();
        if (shouldGenerate) {
            const EmodelInvocation = this.registeredEvents.get("modelInvocation");
            const defaultProcessChunck = (chunck) => chunck;
            const defaultModelSettings = this.opts.modelSettings;
            const callAPI = async (processChunck, modelSettings, clientOpts) => {
                const _processChunck = processChunck || defaultProcessChunck;
                const _modelSettings = modelSettings || defaultModelSettings;
                const openai = clientOpts ? new OpenAI(clientOpts) : this.openai;
                const role = this.opts.useDeveloperRole ? "developer" : "system";
                const requestBody = {
                    ..._modelSettings,
                    messages: [{ role, content: this.opts.instructions }, ...this.state.conversation]
                };
                if (this.paramsTools?.length)
                    requestBody["tools"] = this.paramsTools;
                this.setGenerating();
                const response = await openai.chat.completions.create(requestBody, { signal: this.abortController.signal });
                // Handle streaming vs non-streaming
                if (Symbol.asyncIterator in response) {
                    let partialMessage = {};
                    let replaceLast = false;
                    for await (const chunck of response) {
                        if (_processChunck.constructor.name == "AsyncFunction") {
                            const _chunck = await _processChunck(chunck, partialMessage);
                            partialMessage = streamChunkToMessage(_chunck, partialMessage);
                        }
                        else {
                            const _chunck = _processChunck(chunck, partialMessage);
                            partialMessage = streamChunkToMessage(_chunck, partialMessage);
                        }
                        const updateReason = !chunck.choices[0].finish_reason ? "partialAiMessage" : "AiMessage";
                        const partialMessageFinal = await this.registeredEvents.handleAiMessage(partialMessage, updateReason == "partialAiMessage");
                        await this.appendMessages([partialMessageFinal], replaceLast, updateReason);
                        if (!replaceLast)
                            this.setStepCount(this.state.stepCount + 1);
                        replaceLast = true;
                    }
                    this.abortController = undefined;
                    aiMessage = partialMessage;
                }
                else {
                    this.abortController = undefined;
                    aiMessage = response.choices[0].message;
                    await this.appendMessages([aiMessage], false, "AiMessage");
                    this.setStepCount(this.state.stepCount + 1);
                }
                if (aiMessage.role == "assistant" && aiMessage.tool_calls && aiMessage.tool_calls.length)
                    toolCalls = aiMessage.tool_calls;
                return aiMessage;
            };
            if (EmodelInvocation) {
                for (const event of EmodelInvocation) {
                    const params = [callAPI, this.context];
                    const callback = event.callback;
                    if (callback.constructor.name == "AsyncFunction")
                        aiMessage = skipEventFallback(await callback(...params), await callAPI());
                    else
                        aiMessage = skipEventFallback(callback(...params), await callAPI());
                }
            }
            else
                await callAPI();
        }
        else if (lastMessage?.role == "assistant" && lastMessage.tool_calls && lastMessage.tool_calls.length) { // Last message is 'assistant' role without generation required, assign tool calls if any
            toolCalls = lastMessage.tool_calls;
        }
        // Handle tool calls if present
        if (toolCalls.length > 0) {
            await this.setWaiting();
            for (const toolCall of toolCalls) {
                // Check if stop was requested before processing each tool
                if (this.stopRequested) {
                    break;
                }
                // Find tool in options that matches the tool requested by last ai message
                const tool = this.opts.tools?.find(tool => tool.name == toolCall.function.name);
                if (!tool)
                    throw new FragolaError(`Tool ${toolCall.function.name} missing`);
                let paramsParsed;
                if (tool.schema) {
                    paramsParsed = tool.schema.safeParse(JSON.parse(toolCall.function.arguments));
                    if (!paramsParsed.success) {
                        //TODO: implement retry system for bad arguments
                        throw new FragolaError("Tool arguments parsing fail");
                    }
                }
                const toolCallEvents = this.registeredEvents.get("toolCall");
                const content = await (async () => {
                    eventProcessing: {
                        if (!toolCallEvents) {
                            if (tool.handler == "dynamic")
                                throw new BadUsage(`Tools with dynamic handlers must have at least 1 'toolCall' event that produces a result.`);
                            break eventProcessing;
                        }
                        for (let i = 0; i < toolCallEvents.length; i++) {
                            const _event = toolCallEvents[i];
                            const result = isAsyncFunction(_event.callback) ? await _event.callback(paramsParsed?.data, tool, this.context)
                                : _event.callback(paramsParsed?.data, tool, this.context);
                            if (isSkipEvent(result)) {
                                continue;
                            }
                            return result;
                        }
                        if (tool.handler == "dynamic")
                            throw new BadUsage(`Tools with dynamic handlers must have at least 1 'toolCall' event that produces a result. (one or more events were found but returned 'skip')`);
                    }
                    // Default tool behavior (executed after breaking from eventProcessing)
                    return isAsyncFunction(tool.handler) ? await tool.handler(paramsParsed?.data, this.context) : tool.handler(paramsParsed?.data, this.context);
                })();
                const contentToString = (content) => {
                    switch (typeof content) {
                        case "string":
                            return content;
                        case "function":
                            return content.toString();
                        case "undefined":
                        case "number":
                        case "boolean":
                        case "bigint":
                            return String(content);
                        default:
                            return JSON.stringify(content);
                    }
                };
                const message = {
                    role: "tool",
                    content: contentToString(content),
                    tool_call_id: toolCall.id
                };
                await this.updateConversation((prev) => [...prev, message], "toolCall");
            }
            await this.setIdle();
            if (!stop())
                return await this.recursiveAgent(stepOptions, stop, iter + 1);
        }
        await this.setIdle();
    }
    async userMessage(query) {
        const { step, ...message } = query;
        void step;
        let _message;
        if (!this.registeredEvents.handleUserMessage)
            _message = message;
        else
            _message = await this.registeredEvents.handleUserMessage(message);
        await this.updateConversation((prev) => [...prev, stripUserMessageMeta({ role: "user", ..._message })], "userMessage");
        return await this.step(query.step);
    }
    async applyEvents(eventId, _params) {
        const events = this.registeredEvents.get(eventId);
        if (!events)
            return undefined;
        for (let i = 0; i < events.length; i++) {
            const callback = events[i].callback;
            const defaultParams = [this.createAgentContext()];
            switch (eventId) {
                case "after:stateUpdate": {
                    const params = defaultParams;
                    if (isAsyncFunction(callback)) {
                        return await callback(...params);
                    }
                    else {
                        return callback(...params);
                    }
                }
                case "after:conversationUpdate": {
                    const params = [_params.reason, ...defaultParams];
                    if (isAsyncFunction(callback)) {
                        return await callback(...params);
                    }
                    else {
                        return callback(...params);
                    }
                }
                default: {
                    throw new FragolaError(`Internal error: event with name '${eventId}' is unknown`);
                }
            }
        }
        return undefined;
    }
    /**
     * Register a handler for a given event id.
     * Returns an unsubscribe function that removes the registered handler.
     *
     * @example
     * // listen to userMessage events
     * const off = agent.on('userMessage', (message, context) => {
     *   // inspect or transform the message
     *   return { ...message, content: message.content.trim() };
     * });
     * // later
     * off();
     */
    on(eventId, callback) {
        const events = this.registeredEvents.get(eventId) || [];
        const id = nanoid();
        events.push({
            id,
            callback: callback
        });
        this.registeredEvents.set(eventId, events);
        return () => {
            let events = this.registeredEvents.get(eventId);
            if (!events)
                return;
            events = events.filter(event => event.id != id);
            if (!events.length)
                this.registeredEvents.delete(eventId);
            else
                this.registeredEvents.set(eventId, events);
        };
    }
    /**
     * Register a tool call event handler.
     *
     * This handler is invoked when the agent needs to execute a tool. Handlers may return a value
     * that will be used as the tool result.
     *
     * @example
     * // simple tool handler that returns an object as result
     * agent.onToolCall(async (params, tool, context) => {
     *   // dynamic tools do not have a handler function, so we skip them
     *   if (params.handler == "dynamic") return skip();
     *   // do something with params and tool
     *   try {
     *      const result = await tool.handler(params);
     *      return { sucess: true, result }
     * } catch(e) {
     *      if (e extends Error)
     *      return { error: e.message }
     * }
     * });
     */
    onToolCall(callback) { return this.on("toolCall", callback); }
    /**
     * Register a handler that runs after the conversation is updated.
     *
     * After-event handlers do not return a value. Use these to persist state, emit metrics or side-effects.
     *
     * @example
     * agent.onAfterConversationUpdate((reason, context) => {
     *   // persist conversation to a DB or telemetry
     *   console.log('conversation updated because of', reason);
     *   context.getStore()?.value.lastSaved = Date.now();
     * });
     */
    onAfterConversationUpdate(callback) { return this.on("after:conversationUpdate", callback); }
    /**
     * Register an AI message event handler.
     *
     * Called when an assistant message is generated or streaming. Handlers may return a modified
     * message which will replace the message in the conversation.
     *
     * @example
     * agent.onAiMessage((message, isPartial, context) => {
     *   if (!isPartial && message.content.includes('debug')) {
     *     // modify final assistant message
     *      message.content += '(edited)';
     *   }
     *   return message;
     * });
     */
    onAiMessage(callback) { return this.on("aiMessage", callback); }
    /**
     * Register a user message event handler.
     *
     * Called when a user message is appended to the conversation. Handlers may return a modified
     * user message which will be used instead of the original.
     *
     * @example
     * agent.onUserMessage((message, context) => {
     *   // enrich user message with metadata
     *   return { ...message, content: message.content.trim() };
     * });
     */
    onUserMessage(callback) { return this.on("userMessage", callback); }
    /**
     * Register a model invocation event handler.
     *
     * This handler wraps the model call. It receives a `callAPI` function to perform the request and
     * can return a modified assistant message. Handlers can also provide a `processChunk` function to
     * edit streaming chunks before they are applied to the partial assistant message.
     *
     * @example
     * // modify streaming chunks before they are applied
     * agent.onModelInvocation(async (callAPI, context) => {
     *   const processChunk: CallAPIProcessChuck = (chunk, partial) => {
     *     // e.g. redact sensitive tokens or append extra tokens
     *     chunck.choices[0].delta.content = '(modified)';
     *     // perform modifications on `modified` here
     *     return chunck;
     *   };
     *   // pass the processor to callAPI; it returns the final assistant message
     *   const aiMsg = await callAPI(processChunk);
     *   // post-process the final assistant message if needed
     *   return { ...aiMsg, content: aiMsg.content + '\n\n(checked)' };
     * });
     */
    onModelInvocation(callback) { return this.on("modelInvocation", callback); }
    /**
     * Register a handler that runs after the agent state is updated.
     *
     * After-state-update handlers do not return a value. Use these for side-effects such as metrics
     * or asynchronous persistence.
     *
     * @example
     * agent.onAfterStateUpdate((context) => {
     *   // e.g. emit metrics about step count
     *   console.log('stepCount', context.state.stepCount);
     * });
     */
    onAfterStateUpdate(callback) { return this.on("after:stateUpdate", callback); }
}
