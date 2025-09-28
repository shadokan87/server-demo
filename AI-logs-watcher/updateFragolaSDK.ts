import { $ } from "bun";
const clone = await $`rm -rf src/fragolaSDK ; \
git clone git@github.com:shadokan87/fragolaSDK.git src/fragolaSDK && \
rm -rf src/fragolaSDK/.git
`.nothrow();

if (clone.exitCode != 0) {
    process.exit(clone.exitCode);
}

const ignoreTsError = [
    "src/fragolaSDK/src/agent.ts",
    "src/fragolaSDK/src/utils.ts"
];

ignoreTsError.forEach(async path => {
    await $`sed -i '1i//@ts-nocheck' ${path}`.nothrow();
});

const packageJSON = require("./src/fragolaSDK/package.json");
type _ignore = {
    value: string,
    exact?: boolean
}
const depsToIgnore: _ignore[] = [
    {value: "eslint"},
];
const deps  = Object.entries(packageJSON["dependencies"]).filter(entry => {
    for (let i = 0; i < depsToIgnore.length; i ++) {
        if (depsToIgnore[i]?.exact) {
            // For exact matches, only ignore if it's an exact match
            if (depsToIgnore[i]?.value == entry[0])
                return false;
        } else {
            // For non-exact matches, ignore if it contains the value
            if (entry[0].includes(depsToIgnore[i]?.value!))
                return false;
        }
    }
    return true;
});
await $`rm -rf src/fragolaSDK/package.json src/fragolaSDK/build.ts src/fragolaSDK/tsconfig.build.json src/fragolaSDK/tsconfig.json`.quiet().nothrow();
console.log(`✅ fragola SDK updated, add these dependencies to your root package.json:
${JSON.stringify(Object.fromEntries(deps), null, 2)}
then run 'bun run build'`);