import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {validateEntry} from '../shared/diary-validation.mjs';
export {MOODS,validateEntry} from '../shared/diary-validation.mjs';
export function createDiaryStore(file){
 mkdirSync(dirname(file),{recursive:true});const db=new DatabaseSync(file);chmodSync(file,0o600);
 db.exec(`PRAGMA journal_mode = WAL;
 CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY,entryDate TEXT NOT NULL,title TEXT NOT NULL,content TEXT NOT NULL,mood TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL,deletedAt TEXT);
 CREATE INDEX IF NOT EXISTS entries_by_date ON entries(deletedAt,entryDate DESC,createdAt DESC);`);
 const get=id=>db.prepare('SELECT * FROM entries WHERE id=?').get(id)||null;
 return {db,get,
 list({month='',q='',trashed=false}={}){
  if(month&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('조회할 월을 확인해 주세요.');
  if(typeof q!=='string'||q.length>200)throw new Error('검색어는 200자 이내로 입력해 주세요.');
  return db.prepare(`SELECT id,entryDate,title,mood,substr(content,1,90) AS preview,version,updatedAt,deletedAt FROM entries WHERE ${trashed?'deletedAt IS NOT NULL':'deletedAt IS NULL'} AND (?='' OR substr(entryDate,1,7)=?) AND (?='' OR instr(lower(title||char(10)||content),lower(?))>0) ORDER BY entryDate DESC,createdAt DESC`).all(month,month,q,q);
 },
 create(input){const data=validateEntry(input),id=randomUUID(),now=new Date().toISOString();db.prepare('INSERT INTO entries(id,entryDate,title,content,mood,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)').run(id,data.entryDate,data.title,data.content,data.mood,now,now);return get(id);},
 update(id,input){const data=validateEntry(input);if(!Number.isSafeInteger(input.version)||input.version<1)throw new Error('일기를 다시 열고 수정해 주세요.');const result=db.prepare('UPDATE entries SET entryDate=?,title=?,content=?,mood=?,updatedAt=?,version=version+1 WHERE id=? AND version=? AND deletedAt IS NULL').run(data.entryDate,data.title,data.content,data.mood,new Date().toISOString(),id,input.version);return result.changes?get(id):null;},
 trash(id,version,restore=false){if(!Number.isSafeInteger(version)||version<1)throw new Error('일기를 다시 열고 시도해 주세요.');const now=new Date().toISOString();const result=db.prepare(`UPDATE entries SET deletedAt=?,updatedAt=?,version=version+1 WHERE id=? AND version=? AND deletedAt IS ${restore?'NOT NULL':'NULL'}`).run(restore?null:now,now,id,version);return result.changes?get(id):null;},
 close(){db.close();}
 };
}
