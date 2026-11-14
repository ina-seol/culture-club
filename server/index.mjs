import {createApp} from './app.mjs';
const port=Number(process.env.PORT||3001),host=process.env.HOST||'127.0.0.1';
const {server}=createApp();server.listen(port,host,()=>console.log(`컬처클럽: http://${host}:${port}`));
