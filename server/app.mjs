import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {createDiaryStore} from './diary-store.mjs';
import {randomBytes} from 'node:crypto';
import {createStore,validateProgram} from './store.mjs';
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon'};
export function createApp({dbPath=resolve('data/culture.sqlite'),diaryDbPath=resolve(dirname(dbPath),'diary.sqlite'),dist=resolve('dist')}={}){
 const diary=createDiaryStore(diaryDbPath);
 const store=createStore(dbPath),sessions=new Map(),attempts=new Map();
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const server=createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
 const path=new URL(req.url,'http://localhost').pathname;
 const loopback=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
 const host=req.headers.host||'';const localHost=/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
 const canSetup=loopback&&localHost&&!req.headers['x-forwarded-for'];
 const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('culture_session='))?.slice(16);
 const session=token?sessions.get(token):null;const authenticated=!!session&&session>Date.now();if(token&&session&&!authenticated)sessions.delete(token);
 function openSession(){const token=randomBytes(32).toString('hex');sessions.set(token,Date.now()+8*60*60*1000);res.setHeader('Set-Cookie',`culture_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${req.socket.encrypted?'; Secure':''}`);}
 if(path.startsWith('/api/')){
  try{
   if(req.method==='GET'&&path==='/api/programs')return json(res,200,{programs:store.list()});
   if(req.method==='GET'&&path==='/api/session')return json(res,200,{authenticated,setupRequired:!store.hasTeacher(),canSetup});
   const diaryPath=path==='/api/diary'||path.startsWith('/api/diary/');
   if(diaryPath&&!authenticated)return json(res,401,{error:'일기를 보려면 교사 비밀번호로 로그인해 주세요.'});
   if(diaryPath&&req.method==='GET'){
    if(path==='/api/diary'){const params=new URL(req.url,'http://localhost').searchParams;return json(res,200,{entries:diary.list({month:params.get('month')||'',q:params.get('q')||'',trashed:params.get('trashed')==='true'})});}
    const id=path.match(/^\/api\/diary\/([a-f0-9-]+)$/)?.[1];const entry=id?diary.get(id):null;return json(res,entry?200:404,entry?{entry}:{error:'일기를 찾지 못했어요.'});
   }
   if(!['POST','PUT','DELETE'].includes(req.method))return json(res,404,{error:'요청한 기능을 찾을 수 없어요.'});
   const origin=req.headers.origin;
   if(!origin||new URL(origin).host!==host)return json(res,403,{error:'접속 주소를 확인하고 다시 시도해 주세요.'});
   if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'JSON 요청만 사용할 수 있어요.'});
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>(diaryPath?150000:12000))return json(res,413,{error:'입력 내용이 너무 길어요.'});chunks.push(chunk);}
   let data;try{const body=Buffer.concat(chunks).toString('utf8');data=body?JSON.parse(body):{};}catch{return json(res,400,{error:'입력 형식이 올바르지 않아요.'});}
   if(path==='/api/setup'&&req.method==='POST'){
    if(!canSetup)return json(res,403,{error:'서버 컴퓨터의 localhost 주소에서 비밀번호를 설정해 주세요.'});
    if(store.hasTeacher())return json(res,409,{error:'이미 교사 비밀번호가 설정되어 있어요.'});
    if(typeof data.password!=='string'||data.password.length<12||data.password.length>128)return json(res,400,{error:'비밀번호는 12~128자로 정해 주세요.'});
    store.setup(data.password);openSession();return json(res,200,{ok:true});
   }
   if(path==='/api/login'&&req.method==='POST'){
    const key=req.socket.remoteAddress;let attempt=attempts.get(key);if(!attempt||attempt.until<Date.now()){attempt={count:0,until:Date.now()+15*60*1000};attempts.set(key,attempt);}
    if(attempt.count>=10)return json(res,429,{error:'로그인을 여러 번 시도했어요. 15분 후 다시 시도해 주세요.'});
    if(typeof data.password!=='string'||data.password.length>128||!store.verify(data.password)){attempt.count++;return json(res,401,{error:'비밀번호를 확인해 주세요.'});}
    attempts.delete(key);openSession();return json(res,200,{ok:true});
   }
   if(path==='/api/logout'&&req.method==='POST'){if(token)sessions.delete(token);res.setHeader('Set-Cookie','culture_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
   if(!authenticated)return json(res,401,{error:'교사 로그인이 필요해요.'});
   if(diaryPath){
    if(path==='/api/diary'&&req.method==='POST')return json(res,201,{entry:diary.create(data)});
    const match=path.match(/^\/api\/diary\/([a-f0-9-]+)(?:\/(trash|restore))?$/);
    if(!match)return json(res,404,{error:'요청한 일기 기능을 찾지 못했어요.'});
    const existing=diary.get(match[1]);if(!existing)return json(res,404,{error:'일기를 찾지 못했어요.'});
    let entry;
    if(!match[2]&&req.method==='PUT')entry=diary.update(match[1],data);
    else if(match[2]&&req.method==='POST')entry=diary.trash(match[1],data.version,match[2]==='restore');
    else return json(res,405,{error:'허용하지 않는 요청이에요.'});
    return json(res,entry?200:409,entry?{entry}:{error:'다른 창에서 이 일기가 바뀌었어요. 목록에서 다시 열어 확인해 주세요.'});
   }
   if(path==='/api/programs'&&req.method==='POST'){store.save(validateProgram(data));return json(res,201,{ok:true});}
   const match=path.match(/^\/api\/programs\/([a-zA-Z0-9-]+)$/);
   if(match&&req.method==='PUT'){const ok=store.save(validateProgram(data,match[1]),match[1]);return json(res,ok?200:404,ok?{ok:true}:{error:'프로그램을 찾지 못했어요.'});}
   if(match&&req.method==='DELETE'){const ok=store.remove(match[1]);return json(res,ok?200:404,ok?{ok:true}:{error:'프로그램을 찾지 못했어요.'});}
   return json(res,404,{error:'요청한 기능을 찾을 수 없어요.'});
  }catch(error){const system=!!error.code||error.message?.startsWith('SQLITE');return json(res,system?500:400,{error:system?'요청을 처리하지 못했어요. 다시 시도해 주세요.':error.message||'요청을 처리하지 못했어요.'});}
 }
 if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'허용하지 않는 요청이에요.'});
 try{let file=resolve(dist,'.'+decodeURIComponent(path));if(!file.startsWith(dist+'/')&&file!==dist)return json(res,403,{error:'접근할 수 없어요.'});
 if(path==='/'||path==='/culture'||path==='/teacher'||path==='/diary')file=resolve(dist,'index.html');
 const info=await stat(file);if(!info.isFile())throw new Error('not found');const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':file.includes('/assets/')?'public, max-age=31536000, immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch{json(res,404,{error:'페이지를 찾지 못했어요. 먼저 npm run build를 실행해 주세요.'});}
 });
 const cleanup=setInterval(()=>{const now=Date.now();for(const [k,v] of sessions)if(v<now)sessions.delete(k);for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);},60000);cleanup.unref();
 server.on('close',()=>{clearInterval(cleanup);store.close();diary.close();});return {server,store};
}
