import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const files = ['js', 'tests', 'tools'].flatMap(dir => fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => path.join(dir,f)));
for (const file of files) execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
console.log(`Syntax OK: ${files.length} JavaScript files.`);
