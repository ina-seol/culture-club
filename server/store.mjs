import {DEFAULT_PROGRAMS,isInternalProgram} from '../shared/programs.mjs';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {scryptSync,randomBytes,timingSafeEqual,randomUUID} from 'node:crypto';
export function createStore(file){
 mkdirSync(dirname(file),{recursive:true});const db=new DatabaseSync(file);
 db.exec('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS programs (id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL,url TEXT NOT NULL,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL)');
 if(!db.prepare('SELECT value FROM config WHERE key=?').get('seeded')){
  const p=DEFAULT_PROGRAMS[0],now=new Date().toISOString();
  db.prepare('INSERT INTO programs VALUES(?,?,?,?,?,?)').run(p.id,p.title,p.description,p.url,now,now);
  db.prepare('INSERT INTO config VALUES(?,?)').run('seeded','true');
 }
 const migration='programs-english-collection-v1';
 if(!db.prepare('SELECT value FROM config WHERE key=?').get(migration)){
  db.exec('BEGIN IMMEDIATE');
  try{
   const insert=db.prepare('INSERT OR IGNORE INTO programs VALUES(?,?,?,?,?,?)');
   for(const [i,p] of DEFAULT_PROGRAMS.slice(1).entries()){
    if(db.prepare('SELECT id FROM programs WHERE url=?').get(p.url))continue;
    const now=new Date(Date.now()+i).toISOString();insert.run(p.id,p.title,p.description,p.url,now,now);
   }
   db.prepare('INSERT INTO config VALUES(?,?)').run(migration,'true');db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
 }

 if(!db.prepare('SELECT value FROM config WHERE key=?').get('diary-card-v1')){
  const p=DEFAULT_PROGRAMS.find(p=>p.id==='diary'),now=new Date().toISOString();
  if(!db.prepare('SELECT id FROM programs WHERE url=?').get(p.url))db.prepare('INSERT OR IGNORE INTO programs VALUES(?,?,?,?,?,?)').run(p.id,p.title,p.description,p.url,now,now);
  db.prepare('INSERT INTO config VALUES(?,?)').run('diary-card-v1','true');
 }

 const list=()=>db.prepare('SELECT id,title,description,url,updatedAt FROM programs ORDER BY createdAt,id').all();
 return {db,list,hasTeacher:()=>!!db.prepare('SELECT value FROM config WHERE key=?').get('teacher'),
 setup(password){if(this.hasTeacher())throw new Error('이미 비밀번호가 설정되어 있어요.');const salt=randomBytes(32).toString('hex');const hash=scryptSync(password,salt,64).toString('hex');db.prepare('INSERT INTO config VALUES(?,?)').run('teacher',JSON.stringify({salt,hash}));},
 verify(password){const row=db.prepare('SELECT value FROM config WHERE key=?').get('teacher');if(!row)return false;const {salt,hash}=JSON.parse(row.value);return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hash,'hex'));},
 save(data,id){const now=new Date().toISOString();if(id){const r=db.prepare('UPDATE programs SET title=?,description=?,url=?,updatedAt=? WHERE id=?').run(data.title,data.description,data.url,now,id);return r.changes>0;}db.prepare('INSERT INTO programs VALUES(?,?,?,?,?,?)').run(randomUUID(),data.title,data.description,data.url,now,now);return true;},
 remove(id){return db.prepare('DELETE FROM programs WHERE id=?').run(id).changes>0;},close(){db.close();}};
}
export function validateProgram(data,id){
 if(!data||typeof data!=='object')throw new Error('프로그램 정보를 확인해 주세요.');
 const {title,description,url}=data;
 if(typeof title!=='string'||!title.trim()||title.trim().length>60)throw new Error('제목은 1~60자로 입력해 주세요.');
 if(typeof description!=='string'||!description.trim()||description.trim().length>200)throw new Error('소개는 1~200자로 입력해 주세요.');
 if(typeof url!=='string'||url.length>2000)throw new Error('올바른 주소를 입력해 주세요.');
 const clean=url.trim();if(!isInternalProgram(id,clean)){let u;try{u=new URL(clean);}catch{throw new Error('https://로 시작하는 주소를 입력해 주세요.');}if(u.protocol!=='https:'||u.username||u.password)throw new Error('로그인 정보가 없는 HTTPS 주소만 사용할 수 있어요.');}
 return {title:title.trim(),description:description.trim(),url:clean};
}
