import { rimrafSync } from 'rimraf';
import fs from 'fs-extra';

export default () => {
    // Clean
    console.log('Cleaning ./build')
    rimrafSync('./build');

    // Prepare
    console.log('Preparing ./build seeded from ./public')
    fs.mkdirSync('./build');
    fs.copySync('./public', './build', { overwrite: true }, (err) => {
        if (err) {
            console.error(err);
            process.exit(-1);
        } else {
            console.log("success!");
        }
    });
} 