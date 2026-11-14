// Deployment adapter. Integration and emulator tests follow installation of the official SDK.
import {initializeApp} from 'firebase/app';
import {getAuth,onAuthStateChanged,browserSessionPersistence,setPersistence,GoogleAuthProvider,signInWithPopup,signOut,type User} from 'firebase/auth';
import {initializeFirestore,memoryLocalCache,collection,doc,getDoc,getDocFromServer,getDocs,query,where,orderBy,runTransaction,serverTimestamp,type DocumentSnapshot} from 'firebase/firestore';
import {DEFAULT_PROGRAMS} from '../shared/programs.mjs';
import {validateEntry} from '../shared/diary-validation.mjs';

type FirebaseWebConfig={apiKey:string;authDomain:string;projectId:string;appId:string;messagingSenderId?:string;storageBucket?:string};
type Entry={id:string;entryDate:string;title:string;content:string;mood:string;version:number;createdAt:string;updatedAt:string;deletedAt:string|null};
function fail(message:string,status=400):never{throw Object.assign(new Error(message),{status});}
function safeError(error:any):Error{
 if(error.status)return error;
 const messages:Record<string,string>={
  'auth/popup-closed-by-user':'로그인 창을 닫았어요. 다시 로그인해 주세요.',
  'auth/popup-blocked':'브라우저에서 로그인 팝업을 허용한 뒤 다시 시도해 주세요.',
  'auth/cancelled-popup-request':'이미 로그인 창이 열려 있어요.',
  'auth/unauthorized-domain':'이 사이트 주소가 Firebase 로그인 허용 도메인에 등록되지 않았어요.',
  'auth/network-request-failed':'로그인 서버에 연결하지 못했어요. 연결을 확인해 주세요.',
  'permission-denied':'이 자료에 접근할 권한이 없어요. 로그인과 Firebase 보안 설정을 확인해 주세요.',
  'unavailable':'저장 서버에 연결하지 못했어요. 입력 내용은 그대로 두었으니 다시 시도해 주세요.'
 };
 return Object.assign(new Error(messages[error.code]||'요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'),{status:error.code==='permission-denied'?403:503});
}
function normal(snapshot:DocumentSnapshot):Entry{
 const data=snapshot.data()!;const iso=(t:any)=>t?.toDate?.().toISOString()||null;
 return {id:snapshot.id,entryDate:data.entryDate,title:data.title,content:data.content,mood:data.mood,version:data.version,createdAt:iso(data.createdAt)!,updatedAt:iso(data.updatedAt)!,deletedAt:iso(data.deletedAt)};
}
export function createFirebasePlatform(config:FirebaseWebConfig){
 const app=initializeApp(config),auth=getAuth(app),db=initializeFirestore(app,{localCache:memoryLocalCache()});
 let currentUID:string|null=null;const monthCache=new Map<string,{at:number;entries:Entry[]}>();
 const ready=setPersistence(auth,browserSessionPersistence).then(()=>new Promise<void>(resolve=>{let first=true;onAuthStateChanged(auth,user=>{
  const uid=user?.uid||null;if(uid!==currentUID){currentUID=uid;monthCache.clear();window.dispatchEvent(new Event('culture:auth-changed'));}if(first){first=false;resolve();}
 });}));
 async function user():Promise<User>{await ready;const u=auth.currentUser;if(!u)fail('먼저 Google 계정으로 로그인해 주세요.',401);return u;}
 async function isAdmin(){await ready;if(!auth.currentUser)return false;const admin=await getDoc(doc(db,'cultureClubAdmins',auth.currentUser.uid));return admin.exists()&&admin.data().active===true;}
 async function ensurePrograms(){
  if(!await isAdmin())return;
  await runTransaction(db,async tx=>{
   const meta=doc(db,'cultureClubPublic','site');if((await tx.get(meta)).exists())return;
   const refs=DEFAULT_PROGRAMS.map(p=>doc(db,'cultureClubPrograms',p.id));const snapshots=await Promise.all(refs.map(ref=>tx.get(ref)));
   DEFAULT_PROGRAMS.forEach((p,i)=>{if(!snapshots[i].exists()){const {id,...data}=p;tx.set(refs[i],{...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});}});
   tx.set(meta,{initialized:true});
  });
 }
 const entryRef=(uid:string,id:string)=>doc(db,'cultureClubDiaries',uid,'entries',id);
 async function handle(path:string,options:RequestInit={}){
  await ready;const url=new URL(path,'https://culture.invalid');const method=options.method||'GET';const data=options.body?JSON.parse(String(options.body)):{};
  if(url.pathname==='/session')return {authenticated:!!auth.currentUser,setupRequired:false,canSetup:false,google:true,admin:await isAdmin(),uid:auth.currentUser?.uid||null,displayName:auth.currentUser?.displayName||''};
  if(url.pathname==='/login'&&method==='POST'){
   const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
   await signInWithPopup(auth,provider);await ensurePrograms();return {ok:true};
  }
  if(url.pathname==='/logout'&&method==='POST'){await signOut(auth);monthCache.clear();return {ok:true};}
  if(url.pathname==='/programs'&&method==='GET'){
   const [snapshot,meta]=await Promise.all([getDocs(collection(db,'cultureClubPrograms')),getDoc(doc(db,'cultureClubPublic','site'))]);
   if(!meta.exists()&&snapshot.empty)return {programs:DEFAULT_PROGRAMS};
   return {programs:snapshot.docs.map(d=>({id:d.id,...d.data()})).sort((a:any,b:any)=>(a.createdAt?.toMillis?.()||0)-(b.createdAt?.toMillis?.()||0))};
  }
  if(url.pathname.startsWith('/programs')&&['POST','PUT','DELETE'].includes(method)){
   if(!await isAdmin())fail('프로그램 관리는 허용된 교사 계정만 할 수 있어요.',403);
   const id=url.pathname.split('/')[2]||crypto.randomUUID(),ref=doc(db,'cultureClubPrograms',id);
   await runTransaction(db,async tx=>{const old=await tx.get(ref);if(method!=='POST'&&!old.exists())fail('프로그램을 찾지 못했어요.',404);
    if(method==='DELETE'){tx.delete(ref);return;}
    const title=typeof data.title==='string'?data.title.trim():'',description=typeof data.description==='string'?data.description.trim():'',address=typeof data.url==='string'?data.url.trim():'';
    if(!title||title.length>60||!description||description.length>200)fail('제목과 소개의 길이를 확인해 주세요.');
    if(!['/culture','/diary','/widgets/english-classroom.html'].includes(address)){let parsed;try{parsed=new URL(address);}catch{fail('HTTPS 주소를 입력해 주세요.');}if(parsed.protocol!=='https:'||parsed.username||parsed.password||address.length>2000)fail('로그인 정보가 없는 HTTPS 주소를 사용해 주세요.');}
    tx.set(ref,{title,description,url:address,createdAt:old.exists()?old.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
   });return {ok:true};
  }
  if(url.pathname==='/diary'&&method==='GET'){
   const u=await user(),month=url.searchParams.get('month')||'',search=(url.searchParams.get('q')||'').toLocaleLowerCase(),trashed=url.searchParams.get('trashed')==='true';
   if(month&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))fail('조회할 월을 확인해 주세요.');if(search.length>200)fail('검색어는 200자 이내로 입력해 주세요.');
   const key=u.uid+':'+month;let cached=monthCache.get(key);
   if(!cached||Date.now()-cached.at>5000){const root=collection(db,'cultureClubDiaries',u.uid,'entries');const q=month?query(root,where('entryDate','>=',month+'-01'),where('entryDate','<=',month+'-31'),orderBy('entryDate','desc')):query(root,orderBy('entryDate','desc'));const snapshots=await getDocs(q);cached={at:Date.now(),entries:snapshots.docs.map(normal)};monthCache.set(key,cached);}
   const entries=cached.entries.filter(e=>Boolean(e.deletedAt)===trashed&&(!search||(e.title+'\n'+e.content).toLocaleLowerCase().includes(search))).sort((a,b)=>b.entryDate.localeCompare(a.entryDate)||b.createdAt.localeCompare(a.createdAt));
   return {entries:entries.map(({content,createdAt,...entry})=>({...entry,preview:content.slice(0,90)}))};
  }
  if(url.pathname==='/diary'&&method==='POST'){
   const u=await user(),valid=validateEntry(data),ref=entryRef(u.uid,crypto.randomUUID());
   await runTransaction(db,async tx=>{tx.set(ref,{...valid,version:1,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),deletedAt:null});});monthCache.clear();return {entry:normal(await getDocFromServer(ref))};
  }
  const match=url.pathname.match(/^\/diary\/([a-zA-Z0-9-]+)(?:\/(trash|restore))?$/);
  if(match){const u=await user(),ref=entryRef(u.uid,match[1]);
   if(method==='GET'&&!match[2]){const snapshot=await getDocFromServer(ref);if(!snapshot.exists())fail('일기를 찾지 못했어요.',404);return {entry:normal(snapshot)};}
   await runTransaction(db,async tx=>{
    const old=await tx.get(ref);if(!old.exists())fail('일기를 찾지 못했어요.',404);const current=old.data();
    if(!Number.isSafeInteger(data.version)||data.version!==current.version)fail('다른 창에서 이 일기가 바뀌었어요. 목록에서 다시 열어 확인해 주세요.',409);
    if(method==='PUT'&&!match[2]){if(current.deletedAt)fail('휴지통의 일기를 먼저 복원해 주세요.',409);tx.update(ref,{...validateEntry(data),version:current.version+1,updatedAt:serverTimestamp()});}
    else if(method==='POST'&&match[2]){const restore=match[2]==='restore';if(restore?!current.deletedAt:!!current.deletedAt)fail('일기 상태가 바뀌었어요. 다시 열어 주세요.',409);tx.update(ref,{deletedAt:restore?null:serverTimestamp(),version:current.version+1,updatedAt:serverTimestamp()});}
    else fail('허용하지 않는 요청이에요.',405);
   });monthCache.clear();return {entry:normal(await getDocFromServer(ref))};
  }
  fail('요청한 기능을 찾지 못했어요.',404);
 }
 return {request:async(path:string,options?:RequestInit)=>{
  const signal=options?.signal;const uid=auth.currentUser?.uid;
  try{
   if(signal?.aborted)throw new DOMException('Aborted','AbortError');
   const result=await handle(path,options);
   if(signal?.aborted)throw new DOMException('Aborted','AbortError');
   if(path.startsWith('/diary')&&uid!==auth.currentUser?.uid)fail('계정이 바뀌었어요. 다시 열어 주세요.',401);
   return result;
  }catch(error){if((error as Error).name==='AbortError')throw error;throw safeError(error);}
 }};
}
