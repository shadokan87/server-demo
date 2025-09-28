import { readFileSync } from "fs";
import path from "path";

/**
 * Represents a record of variables used for string interpolation in prompts.
 * Each key in the record is a variable name to interpolate in the prompt template,
 * and its value can be any type (object, array, number, string, etc.) which will replace the placeholder.
 */
export type Variables = Record<string, any>;

export class MissingVariablesError extends Error {
    constructor(public variables: string[], prompt: string) {
        super(`Missing variables: ${variables.map(v => `'${v}'`).join(', ')}. For prompt: ${prompt}`);
        this.name = 'MissingVariablesError';
    }
}

export class NamespaceUndefinedError extends Error {
    constructor(public namespace: string) {
        super(`Tried to acess undefined namespace when using load() function: '${namespace}' does not exist`)
        this.name = "NamespaceUndefinedError";
    }
}

export class LoadFileReadError extends Error {
    constructor(public filePath: string, public originalError: Error) {
        super(`Failed to load prompt from ${filePath}: ${originalError.message}`);
        this.name = "LoadFileReadError";
    }
}

export type Load = { load: true, relativePath: string };

/**
 * Creates a Load object to specify a prompt file location.
 * This function is used when the prompt is located in a file system.
 * The process working directory (PWD) is used as the base path by default.
 * Path aliases can be used to reduce path overhead.
 * 
 * @param {string} relativePath - The relative path to the prompt file. Can include path aliases.
 * @returns {Load} An object containing the load flag and the relative path to the prompt file
 * 
 * @example
 * // Using relative path
 * load('./prompts/myPrompt.txt')
 * 
 * @example
 * // Using path alias
 * load('prompts:myPrompt.txt')
 */
export const load = (relativePath: string): Load => ({ load: true, relativePath });

export default class Prompt {
    private static defaultVariableRegex = /\{\{(\s*[\w.]+\s*)\}\}/g;
    /**
     * A map of aliases to file paths for use with the {@link load} function.
     * Allows defining shortcuts for commonly used prompt file paths.
     * 
     * @example
     * ```typescript
     * Prompt.pathAlias = {
     *   browse: "prompts",      // Maps "@browse" to "prompts/"
     *   refund: "prompts/refund" // Maps "@refund" to "prompts/refund/"
     * }
     * 
     * // Usage with load():
     * load("@refund/shopRefund.md") // Resolves to "prompts/refund/shopRefund.md"
     * ```
     * @see {@link load}
     */
    public static pathAlias: Record<string, string> = {};

    #originalPrompt: string = "";
    #value: string = "";
    #variableRegex: RegExp = Prompt.defaultVariableRegex;
    #variables: Variables = {};
    #basePath = process.env["PWD"];

    constructor(prompt: string | Load, variables: Variables = {}) {
        if (!process.env["PWD"])
            console.warn("PWD env variable not set");
        if (typeof prompt == 'string') {
            this.#originalPrompt = prompt;
            this.#value = prompt;
        } else {
            this.#originalPrompt = this.#load(prompt.relativePath);
            this.#value = this.#originalPrompt;
        }
        this.setVariables(variables);
    }

    #stringify(value: any) {
        switch (typeof value) {
            case "object":
                return JSON.stringify(value);
            default:
                return value;
        }
    }

    #isInsideCodeBlock(index: number, text: string): boolean {
        const codeBlockRegex = /```[\s\S]*?```/g;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;

            if (index >= start && index < end) {
                return true;
            }
        }

        return false;
    }

    /**
     * Updates the variables used for string interpolation and re-processes the prompt template.
     * 
     * @param variables - Your new variables
     * @throws {MissingVariablesError} When required variables are not provided in the variables object
     */
    setVariables(variables: Variables) {
        this.#variables = variables;
        const allMatch = Array.from(this.#originalPrompt.matchAll(this.#variableRegex))
            .filter(match => !this.#isInsideCodeBlock(match.index!, this.#originalPrompt))
            .map(match => {
                return {
                    placeholder: match[0],
                    index: match.index
                }
            });

        const getVariableNameFromPlaceholder = (placeholder: string) => {
            return placeholder.replaceAll(/[{}]/g, "").trim();
        }

        let missingVariables: string[] = [];
        let applyReplace: (() => {})[] = [];

        allMatch.forEach(match => {
            const variableName = getVariableNameFromPlaceholder(match.placeholder);
            if (variableName in variables)
                applyReplace.push(() => this.#value = this.#value.replace(match.placeholder, this.#stringify(this.#variables[variableName])));
            else
                missingVariables.push(variableName);
        });

        if (missingVariables.length)
            throw new MissingVariablesError(missingVariables, this.#originalPrompt);
        applyReplace.forEach(replace => replace());
    }

    #load(relativePath: string): string {
        let _relativePath = ((): string => {
            const split = relativePath.split("/");
            if (split.length > 1) {
                const namespace = split[0].trim();
                if (namespace[0] == "@") {
                    const name = split[0].slice(1);
                    if (name in Prompt.pathAlias) {
                        return path.join(Prompt.pathAlias[name], split[1]);
                    } else
                        throw new NamespaceUndefinedError(namespace);
                }
            }
            return relativePath;
        })();

        let fullPath = path.join(this.#basePath || "./", _relativePath);
        if (!fullPath.split("/").at(-1)?.includes("."))
            fullPath = `${fullPath}.md`;
        try {
            const content = readFileSync(fullPath, 'utf-8');
            return content;
        } catch (error) {
            if (error instanceof Error) {
                throw new LoadFileReadError(fullPath, error);
            }
            throw error;
        }
    }

    /**
     * Gets the original prompt string used for this instance. Before any processing
     * @returns {string} The original prompt string
     */
    get promptString() {
        return this.#originalPrompt;
    }

    /**
     * Gets the variables currently in use for this prompt.
     * @returns {Map<string, any>} A map containing the prompt variables and their values.
     */
    get variables() {
        return this.#variables;
    }

    /**
     * Gets the interpolated value of the prompt.
     * @returns {string} The resulting string after all variable interpolation has been applied.
     */
    get value() {
        return this.#value;
    }
}