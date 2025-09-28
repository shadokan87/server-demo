export const checkEnvs = (keys: string[]): string | undefined => {
    if (keys.length == 0)
        return undefined;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (process.env[key!] != undefined)
            continue ;
        else
            return key;
    }
    return undefined;
}