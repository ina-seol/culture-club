// GitHub Pages serves a project below /repository/. Keep both assets and routes below that prefix.
export const usesHashRoutes=import.meta.env.VITE_DEPLOY_TARGET==='github-pages';
export const assetPath=(path:string)=>import.meta.env.BASE_URL+path.replace(/^\//,'');
export function currentPage(){
 const path=usesHashRoutes?(location.hash.slice(1)||'/'):location.pathname;
 return path==='/diary'?'diary':path==='/culture'?'culture':path==='/teacher'?'teacher':'hub';
}
export function pagePath(page:string){const route=page==='hub'?'/':'/'+page;return usesHashRoutes?import.meta.env.BASE_URL+'#'+route:route;}
export function programPath(path:string){return ['/culture','/diary','/teacher'].includes(path)?pagePath(path.slice(1)):assetPath(path);}
