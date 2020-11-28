import { pluginReplace } from "fuse-box";
import { IPublicConfig } from 'fuse-box/config/IConfig';
import { pluginCSS } from "fuse-box"

//const tsConfig = join(__dirname, "./src/tsconfig.json");
export const config: IPublicConfig = {
    target: 'browser',
    entry: '../src/index.ts',
    webIndex: { template: '../src/index.html' },
    plugins: [
        pluginCSS("*.css"),
        // temporarily fix a bug
        pluginReplace({"typeof require": `"function"`})
    ],
    compilerOptions: {
        tsConfig: "../tsconfig.json"
    },
}

