import {defineConfig} from 'vite';
const repository=process.env.GITHUB_REPOSITORY?.split('/')[1];
const base=process.env.VITE_BASE_PATH||(process.env.VITE_DEPLOY_TARGET==='github-pages'&&repository?'/'+repository+'/':'/');
const cloud=process.env.VITE_BACKEND==='firebase';
export default defineConfig({base,plugins:cloud?[{name:'firebase-entry',transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/main.tsx','/cloud/entry.ts');}}}]:[],server:{host:'127.0.0.1',port:5173,proxy:{'/api':'http://127.0.0.1:3001'}},build:{outDir:'dist'}});
