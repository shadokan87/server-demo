import { $ } from "bun";
const repo = "git@github.com:shadokan87/AI-logs-watcher.git";
const dest = "AI-logs-watcher";
const handleDeps: boolean = false;
const clone = await $`rm -rf ${dest} ; \
git clone ${repo} ${dest} && \
rm -rf ${dest}/.git
`.nothrow();

if (clone.exitCode != 0) {
    process.exit(clone.exitCode);
}

const ignoreTsError = [
];

ignoreTsError.forEach(async path => {
    await $`sed -i '1i//@ts-nocheck' ${path}`.nothrow();
});

const packageJSON = require(`${dest}/package.json`);
type _ignore = {
    value: string,
    exact?: boolean
}
const depsToIgnore: _ignore[] = [
    {value: "eslint"},
];
let deps: [string, unknown][] | undefined = undefined;
if (handleDeps)
    deps  = Object.entries(packageJSON["dependencies"]).filter(entry => {
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

const filesToDelete = ["tsconfig.json"];
if (filesToDelete.length > 0)
    await $`rm -rf ${dest}/${filesToDelete.join(' ')}`.nothrow();
if (deps) {
console.log(`✅ ${dest} updated, add these dependencies to your root package.json:
${JSON.stringify(Object.fromEntries(deps), null, 2)}
then run 'bun run build'`);
} else {
    console.log(`✅ ${dest} updated. You can now run 'bun run build'`);
}