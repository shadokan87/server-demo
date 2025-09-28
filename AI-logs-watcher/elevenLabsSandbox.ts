import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js"

if (!process.env["ELEVENLABS_API_KEY"])
    throw new Error("ELEVENLABS_API_KEY missing");

const eleven = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! });
const clearAgentsByName = async (name: string) => {
    const toClear = (await eleven.conversationalAi.agents.list({
        pageSize: 100
    })).agents.filter(agent => agent.name == name);
    // console.log(JSON.stringify(toClear, null, 2));
    toClear.forEach(async agent => {
        console.log(await eleven.conversationalAi.agents.delete(agent.agentId));
    });
}

await clearAgentsByName("Agent agent");