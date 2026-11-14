import {spawnSync} from 'node:child_process';
process.env.VITE_BACKEND='firebase';
process.env.VITE_DEPLOY_TARGET='github-pages';
process.env.VITE_BASE_PATH ||= '/culture-club/';
for (const args of [['node_modules/typescript/bin/tsc','-p','tsconfig.cloud.json'],['node_modules/vite/bin/vite.js','build']]) {
 const result=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});
 if(result.status!==0)process.exit(result.status||1);
}
