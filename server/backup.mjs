import {DatabaseSync} from 'node:sqlite';
import {existsSync,mkdirSync,chmodSync} from 'node:fs';
import {resolve} from 'node:path';
const sources=['culture','diary'].filter(name=>existsSync(resolve('data',name+'.sqlite')));
if(!sources.length){console.error('저장소가 아직 없어요. 앱을 먼저 실행해 주세요.');process.exit(1);}
const folder=resolve('data/backups',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(folder,{recursive:true,mode:0o700});
for(const name of sources){const target=resolve(folder,name+'.sqlite');const db=new DatabaseSync(resolve('data',name+'.sqlite'));db.prepare('VACUUM INTO ?').run(target);db.close();chmodSync(target,0o600);}
console.log(`백업 저장: ${folder}`);
