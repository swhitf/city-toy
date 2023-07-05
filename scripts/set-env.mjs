import fs from 'fs';

const nodeEnv = process.argv.reverse()[0];

// Read the version from package json
const version = JSON.parse(fs.readFileSync(`./package.json`, 'utf-8')).version;

fs.writeFileSync('./BUILD_ENV', nodeEnv);
fs.writeFileSync('./BUILD_VER', version) ;