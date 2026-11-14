import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {holidays,grades,getLesson,scoreAnswers} from '../src/content.mjs';
import {DEFAULT_PROGRAMS} from '../shared/programs.mjs';
import {Script} from 'node:vm';
import {createApp} from '../server/app.mjs';
import {createStore,validateProgram} from '../server/store.mjs';
test('12개 학습의 표현·문항·정답이 유효하고 채점이 정확하다',()=>{
 for(const grade of grades)for(const holiday of holidays){const lesson=getLesson(holiday.id,grade);assert.equal(lesson.expressions.length,3);assert.equal(lesson.questions.length,5);for(const q of lesson.questions){assert.equal(q.options.length,3);assert.equal(new Set(q.options).size,3);assert.ok(q.answerIndex>=0&&q.answerIndex<3);assert.ok(q.explanation.length>0);}assert.equal(scoreAnswers(lesson.questions,lesson.questions.map(q=>q.answerIndex)),5);assert.equal(scoreAnswers(lesson.questions,lesson.questions.map(q=>(q.answerIndex+1)%3)),0);assert.equal(scoreAnswers(lesson.questions,[]),0);}
 assert.equal(getLesson('wrong',3),null);assert.equal(getLesson('christmas',2),null);
});
test('학년별 본문·영어 표현·문화 문항이 다르다',()=>{for(const h of holidays){assert.equal(new Set(grades.map(g=>getLesson(h.id,g).paragraphs.join(''))).size,4);assert.equal(new Set(grades.map(g=>getLesson(h.id,g).expressions.map(e=>e.english).join(''))).size,4);assert.equal(new Set(grades.map(g=>getLesson(h.id,g).questions[0].prompt)).size,4);}});
test('주소 검증은 실행 URL·인증 정보·내부 경로 변조를 거부한다',()=>{for(const url of ['javascript:alert(1)','data:text/html,test','http://example.com','https://name:secret@example.com','//example.com','/teacher'])assert.throws(()=>validateProgram({title:'앱',description:'설명',url}));assert.equal(validateProgram({title:' 앱 ',description:' 설명 ',url:'https://example.com'}).title,'앱');assert.throws(()=>validateProgram({title:' ',description:'설명',url:'https://example.com'}));});
test('공용 저장소는 재시작 후 목록·비밀번호를 유지하고 삭제한 기본 앱을 다시 만들지 않는다',()=>{const dir=mkdtempSync(join(tmpdir(),'culture-store-'));try{let store=createStore(join(dir,'db.sqlite'));store.setup('test-only-password-123');assert.ok(store.verify('test-only-password-123'));assert.equal(store.verify('wrong'),false);store.remove('culture');store.close();store=createStore(join(dir,'db.sqlite'));assert.equal(store.list().length,DEFAULT_PROGRAMS.length-1);assert.ok(store.hasTeacher());store.close();}finally{rmSync(dir,{recursive:true,force:true});}});
test('서버 인증·CSRF·공용 CRUD·로그아웃·초기화 제한',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'culture-api-'));const {server}=createApp({dbPath:join(dir,'db.sqlite')});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;let cookie='';
 const request=(path,method='GET',data={},extra={})=>fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',Origin:base,...(cookie?{Cookie:cookie}:{}),...extra},...(method==='GET'?{}:{body:JSON.stringify(data)})});
 try{
  let r=await request('/programs','POST',{title:'x',description:'y',url:'https://example.com'});assert.equal(r.status,401);
  r=await request('/setup','POST',{password:'short'});assert.equal(r.status,400);
  r=await request('/setup','POST',{password:'test-only-password-123'},{Origin:'https://evil.example'});assert.equal(r.status,403);
  r=await request('/setup','POST',{password:'test-only-password-123'},{'X-Forwarded-For':'8.8.8.8'});assert.equal(r.status,403);
  r=await request('/setup','POST',{password:'test-only-password-123'});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];
  assert.ok(r.headers.get('set-cookie').includes('HttpOnly'));assert.equal((await(await request('/session')).json()).authenticated,true);
  r=await request('/setup','POST',{password:'another-password-123'});assert.equal(r.status,409);
  r=await request('/programs','POST',{title:'공유 프로그램',description:'설명',url:'https://example.com'});assert.equal(r.status,201);
  const publicList=await(await fetch(base+'/api/programs')).json();assert.equal(publicList.programs.length,DEFAULT_PROGRAMS.length+1);const id=publicList.programs.find(p=>p.title==='공유 프로그램').id;
  r=await request('/programs/'+id,'PUT',{title:'수정함',description:'소개',url:'https://example.org'});assert.equal(r.status,200);
  r=await request('/programs/'+id,'PUT',{title:'변조',description:'소개',url:'javascript:alert(1)'});assert.equal(r.status,400);
  r=await request('/programs/'+id,'DELETE');assert.equal(r.status,200);
  r=await request('/logout','POST');assert.equal(r.status,200);
  r=await request('/programs/culture','DELETE');assert.equal(r.status,401);
  cookie='';r=await request('/login','POST',{password:'wrong'});assert.equal(r.status,401);
  r=await request('/login','POST',{password:'test-only-password-123'});assert.equal(r.status,200);
 }finally{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});}
});

test('추가 목록은 기존 편집을 덮어쓰거나 삭제 후 다시 생기지 않는다',()=>{
 const dir=mkdtempSync(join(tmpdir(),'culture-migration-'));try{
 let store=createStore(join(dir,'db.sqlite'));assert.equal(store.list().length,DEFAULT_PROGRAMS.length);
 store.save({title:'내가 수정한 제목',description:'수정 내용',url:'https://example.com'},'english-town');store.remove('classroom');store.close();
 store=createStore(join(dir,'db.sqlite'));assert.equal(store.list().length,DEFAULT_PROGRAMS.length-1);assert.equal(store.list().find(p=>p.id==='english-town').title,'내가 수정한 제목');assert.ok(!store.list().some(p=>p.id==='classroom'));store.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('내장 위젯 경로는 해당 카드에만 허용한다',()=>{
 const p={title:'교실',description:'수업 도구',url:'/widgets/english-classroom.html'};
 assert.equal(validateProgram(p,'classroom').url,p.url);assert.throws(()=>validateProgram(p,'random'));
});
test('위젯의 초기 명단은 번호이고 백업은 비어 있으며 스크립트 문법이 유효하다',()=>{
 const html=readFileSync(new URL('../public/widgets/english-classroom.html',import.meta.url),'utf8');
 const classes=JSON.parse(html.match(/const INITIAL_CLASSES = (.*);/)[1]);
 assert.equal(classes.length,9);for(const c of classes){assert.equal(c.names.length,24);assert.ok(c.names.every(n=>/^\d+번$/.test(n)));}
 assert.ok(html.includes('const EMBEDDED_BACKUP = {};'));
 for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new Script(match[1]);
});
