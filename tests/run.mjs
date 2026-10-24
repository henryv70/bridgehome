// Uses the esbuild dependency already supplied by Vite. Creates labeled test data.
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'bridgehome-test-'));
try {
 for (const name of ['integration','features']) {
  const outfile=join(dir,name+'.mjs');
  await build({entryPoints:['tests/'+name+'.ts'],bundle:true,platform:'node',format:'esm',outfile});
  const result=spawnSync(process.execPath,[outfile],{stdio:'inherit',timeout:60000});
  if (result.status!==0) { process.exitCode=result.status??1; break; }
 }
}finally{await rm(dir,{recursive:true,force:true});}
