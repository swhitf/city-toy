import prepare from './prepare.mjs';
import esbuild from 'esbuild';
import esbuildConf from '../esbuild.conf.js';
import { exec, fork, spawn } from 'child_process';

const serve = () => exec(`./node_modules/.bin/lite-server --entry-file=./build/index.html`, { stdio: 'ignore' });
const compile = () => fork(`node_modules/.bin/tsc`, ['--pretty', '-w', '--noEmit']);
const build = () => esbuild.build(esbuildConf(true, false, 'http://localhost:3000'));

prepare();
build();
serve();
compile();
