import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createDiaryStore,validateEntry} from '../server/diary-store.mjs';
import {createApp} from '../server/app.mjs';
const sample={entryDate:'2026-11-14',title:'작은 기쁨',content:'오늘은 함께 책을 읽었다.\n조금 더 용기가 생겼다. ☺',mood:'happy'};
test('일기 저장·재시작 영속성·수정 버전·휴지통 복원',()=>{
 const dir=mkdtempSync(join(tmpdir(),'diary-store-'));try{
 let store=createDiaryStore(join(dir,'diary.sqlite'));let entry=store.create(sample);const id=entry.id;assert.equal(entry.version,1);assert.equal(entry.content,sample.content);assert.equal(statSync(join(dir,'diary.sqlite')).mode&0o777,0o600);
 store.close();store=createDiaryStore(join(dir,'diary.sqlite'));assert.equal(store.get(id).content,sample.content);
 entry=store.update(id,{...sample,title:'다시 쓴 제목',version:1});assert.equal(entry.version,2);assert.equal(store.update(id,{...sample,version:1}),null);assert.equal(store.get(id).title,'다시 쓴 제목');
 entry=store.trash(id,2);assert.ok(entry.deletedAt);assert.equal(store.list().length,0);assert.equal(store.list({trashed:true}).length,1);assert.equal(store.update(id,{...sample,version:3}),null);
 entry=store.trash(id,3,true);assert.equal(entry.deletedAt,null);assert.equal(entry.version,4);assert.equal(store.list().length,1);store.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('일기 날짜·분량·기분 검증과 월별·검색 필터',()=>{
 for(const data of [{...sample,entryDate:'2026-02-30'},{...sample,entryDate:'2026-13-01'},{...sample,title:' '},{...sample,title:'a'.repeat(121)},{...sample,content:' '},{...sample,content:'a'.repeat(20001)},{...sample,mood:'unknown'}])assert.throws(()=>validateEntry(data));
 assert.equal(validateEntry({...sample,entryDate:'2024-02-29'}).entryDate,'2024-02-29');
 const dir=mkdtempSync(join(tmpdir(),'diary-filter-'));try{const store=createDiaryStore(join(dir,'db.sqlite'));store.create(sample);store.create({...sample,entryDate:'2026-10-31',title:'A Halloween day',content:'Another story'});
 assert.equal(store.list({month:'2026-11'}).length,1);assert.equal(store.list({q:'용기'}).length,1);assert.equal(store.list({q:'hALLoWeen'}).length,1);assert.equal(store.list({q:"' OR 1=1 --"}).length,0);assert.equal(store.list({q:'%'}).length,0);assert.throws(()=>store.list({month:'2026-99'}));assert.ok(!Object.hasOwn(store.list()[0],'content'));store.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('일기 API는 미인증 조회·수정을 차단하고 CRUD·충돌·한글 본문을 처리한다',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'diary-api-'));const {server}=createApp({dbPath:join(dir,'culture.sqlite')});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;let cookie='';
 const call=(path,method='GET',body={},headers={})=>fetch(base+'/api'+path,{method,headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...headers},...(method==='GET'?{}:{body:JSON.stringify(body)})});
 try{
 for(const [path,method]of [['/diary','GET'],['/diary/nonexistent','GET'],['/diary','POST']])assert.equal((await call(path,method,sample)).status,401);
 let res=await call('/setup','POST',{password:'test-only-diary-password'});assert.equal(res.status,200);cookie=res.headers.get('set-cookie').split(';')[0];
 const content='한글 문장과 이모지 🌼\n'.repeat(700);res=await call('/diary','POST',{...sample,content});assert.equal(res.status,201);let entry=(await res.json()).entry;const id=entry.id;
 assert.equal((await(await call('/diary/'+id)).json()).entry.content,content.trim());
 res=await call('/diary?month=2026-11&q='+encodeURIComponent('한글'));let list=(await res.json()).entries;assert.equal(list.length,1);assert.equal(list[0].id,id);assert.ok(!Object.hasOwn(list[0],'content'));
 res=await call('/diary/'+id,'PUT',{...sample,title:'고친 제목',version:1});assert.equal(res.status,200);entry=(await res.json()).entry;assert.equal(entry.version,2);
 assert.equal((await call('/diary/'+id,'PUT',{...sample,version:1})).status,409);
 assert.equal((await call('/diary/'+id+'/trash','POST',{version:2},{Origin:'https://other.example'})).status,403);
 res=await call('/diary/'+id+'/trash','POST',{version:2});assert.equal(res.status,200);assert.equal((await(await call('/diary')).json()).entries.length,0);
 assert.equal((await(await call('/diary?trashed=true')).json()).entries.length,1);
 assert.equal((await call('/diary/'+id+'/restore','POST',{version:2})).status,409);
 assert.equal((await call('/diary/'+id+'/restore','POST',{version:3})).status,200);
 res=await call('/programs');assert.ok(!JSON.stringify(await res.json()).includes(sample.content));
 assert.equal((await call('/diary','POST',{...sample,entryDate:'2026-02-30'})).status,400);
 await call('/logout','POST');assert.equal((await call('/diary/'+id)).status,401);assert.equal((await call('/diary/'+id+'/trash','POST',{version:4})).status,401);
 }finally{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});}
});
