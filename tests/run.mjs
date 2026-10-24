// Uses the esbuild dependency already supplied by Vite. Creates labeled test data.
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'bridgehome-test-'));
try {
 const outfile=join(dir,'integration.mjs');
 await build({entryPoints:['tests/integration.ts'],bundle:true,platform:'node',format:'esm',outfile});
 const result=spawnSync(process.execPath,[outfile],{stdio:'inherit',timeout:60000});
 process.exitCode=result.status??1;
}finally{await rm(dir,{recursive:true,force:true});}
