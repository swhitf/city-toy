/**
 * npkg <dir> <name> --tool --entity --mechanics --store
 * 
 */

import fs from 'fs';
import rmrf from 'rimraf';
import read from 'readline-sync';
import { camelCase} from 'change-case';

const commands = () => `
import { defineCommand } from '../../../concepts/commands/CommandDefinition';
import { inCommands } from '../../../concepts/commands/CommandRegistry';

export const example = defineCommand(
    '${o.name}',
    '${o.name}...',
    (r) => {
        // Do something...
    }
);

export const in${o.Name}Commands = () => inCommands(
    example,
);

`;

const mechanics = () => `
import { ActiveObject, resolve } from '../../Container';

export class ${o.Name}Mechanics extends ActiveObject {

    @resolve(Service) service!: Service;

    public start(): void {
        // this.burden(            
        // );
    }
}
`;

const store = () => `
import { CoolReadStore } from '../voting/VotingViewState';

const initialState = {
    
};

export class ${o.Name}Store extends CoolReadStore(initialState) {

}
`;

const tool = () => `
import { defineToolWithCommonBehaviors } from '../../canvas/tooling/Definitions';

export const ${o.name}Tool = defineToolWithCommonBehaviors({
    id: '${o.name}Tool',
    label: '${o.Name} Tool',
    // category: '',
    // icon: '',
    // weight: 102,
    // shortcut: 'C',
    behaviors: [
    ]
});
`;

const o = {};

o.Name = read.question('Enter package name: ');
o.name = camelCase(o.Name);
o.dir = camelCase(o.Name);
o.mechanics = read.question('Add mechanics? [Y/n] ') !== 'n';
o.store = read.question('Add store? [y/N] ') === 'y';
o.tool = read.question('Add tool? [y/N] ') === 'y';
o.force = read.question('Overwrite [y/N] ') === 'y';

const p4ckage = () => {

    const i = [];
    const c = [];

    if (o.mechanics) {
        i.push(`import { ${o.Name}Mechanics } from './${o.Name}Mechanics';`)
        c.push(`.register(${o.Name}Mechanics, 'singleton')`);
    }

    if (o.store) {
        i.push(`import { ${o.Name}Store } from './${o.Name}Store';`)
        c.push(`.register(${o.Name}Store, 'singleton')`);
    }

    c.push(`.plug(in${o.Name}Commands())`);

    if (o.tool) {
        i.push(`import { inTool } from '../../canvas/tooling/ToolManager';`);
        i.push(`import { ${o.name}Tool } from './${o.Name}Tool';`);
        c.push(`.plug(inTool(${o.name}Tool))`);
    }

    if (o.mechanics) {
        c.push(`.start(${o.Name}Mechanics)`);
    }

    return `import { in${o.Name}Commands } from './${o.Name}Commands';
import { Package, PackageHost } from '../../Container';
${i.join('\n')}

export class ${o.Name}Package implements Package {

    public install = (host: PackageHost) => host
        ${c.join('\n        ')}
    ;
}`
};

const packagePath = `./src/app/packages/${o.dir}`;

if (o.force) {
    rmrf.sync(packagePath);
}

if (fs.existsSync(packagePath)) {
    throw new Error(packagePath + ' exists!');
}

fs.mkdirSync(packagePath);

if (o.mechanics) {
    fs.writeFileSync(`${packagePath}/${o.Name}Mechanics.ts`, mechanics(o), 'utf8');
}
if (o.store) {
    fs.writeFileSync(`${packagePath}/${o.Name}Store.ts`, store(o), 'utf8');
}
if (o.tool) {
    fs.writeFileSync(`${packagePath}/${o.Name}Tool.ts`, tool(o), 'utf8');
}

fs.writeFileSync(`${packagePath}/${o.Name}Commands.ts`, commands(o), 'utf8');
fs.writeFileSync(`${packagePath}/${o.Name}Package.ts`, p4ckage(o), 'utf8');