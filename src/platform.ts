export const cloudMode=import.meta.env.VITE_BACKEND==='firebase';
declare global {interface Window {cultureRequest?: (path:string,options?:RequestInit)=>Promise<any>;}}
export async function request(path:string,options:RequestInit={}){
 try{
  if(cloudMode){if(!window.cultureRequest)throw new Error('Firebase 연결 설정을 불러오지 못했어요. 새로고침해 주세요.');return await window.cultureRequest(path,options);}
  const res=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...options.headers},cache:'no-store'});const data=await res.json();if(!res.ok)throw Object.assign(new Error(data.error||'잠시 후 다시 시도해 주세요.'),{status:res.status});return data;
 }catch(error){if((error as any).status===401)window.dispatchEvent(new Event('diary:expired'));throw error;}
}
