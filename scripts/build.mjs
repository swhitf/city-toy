import prepare from './prepare.mjs';
import esbuild from 'esbuild';
import fs from 'fs';
import proc from 'child_process';
import esbuildConf from '../esbuild.conf.js';
import envs from '../env.conf.js';

// Write the version.ts file
const version = JSON.parse(fs.readFileSync(`./package.json`, 'utf-8')).version;
const commit = proc.execSync('git rev-parse HEAD').toString().trim();
const code = `
    export const BuildCommit = '${commit}';
    export const BuildVersion = '${version}';
`;
fs.writeFileSync('./src/version.ts', code, 'utf-8');
console.log('Wrote version.ts with', version, '/', commit);

// Read env
const nodeEnv = (fs.existsSync('./BUILD_ENV') ? fs.readFileSync('./BUILD_ENV', 'utf-8') : process.env.NODE_ENV)?.trim();
const { cdn, optimize } = envs[nodeEnv] || {};
const basePath = !!cdn ? `https://${cdn}/${version}` : null;

// Prepare
prepare();

// Build
console.log('Building with');
console.log('  basePath:', basePath);
console.log('  optimize:', optimize ? true : false);

esbuild.buildSync(esbuildConf(false, optimize, basePath));

console.log('Complete!') 

