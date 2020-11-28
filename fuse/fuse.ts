import { config } from './fuse-config';
import { fusebox } from 'fuse-box';
import { dirname } from 'path';

const doBuild = process.argv.some(a => a === "build");

const fuse = fusebox({
    ...config,
    ... (doBuild ? undefined :{
        // dev-only
        watcher: {
            root: [
                dirname(dirname(__dirname)),
            ],
        },
        devServer: {
            proxy: [
                {
                    path: '/api',
                    options: {
                        target: 'http://localhost:8888',
                        changeOrigin: true,
                        pathRewrite: {
                            '^/api': '/',
                        },
                    },
                },
            ],
            hmrServer: {
                enabled: true,
                port: 4445,
                connectionURL: 'ws://127.0.0.1:4445/'
            }      
        },
        hmr: true,
    }),
});

fuse.runDev();
