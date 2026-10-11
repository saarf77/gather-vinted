import {searchVinted} from '../src/vinted.js';
export const maxDuration=300;
let running=0;
export default async function handler(req,res){
 if(req.method!=='POST'){res.statusCode=405;res.end('Method not allowed');return;}
 const host=req.headers['x-forwarded-host']||req.headers.host;
 try{if(req.headers.origin&&new URL(req.headers.origin).host!==host)throw new Error();}catch{res.statusCode=403;res.end('Origin denied');return;}
 if(running>=2){res.statusCode=429;res.end('Search is busy. Please try again shortly.');return;}
 if(JSON.stringify(req.body??'').length>20000){res.statusCode=413;res.end('Request too large');return;}
 let data=req.body;
 try{if(typeof data==='string')data=JSON.parse(data);if(!data||typeof data!=='object')throw new Error();}catch{res.statusCode=400;res.end('Invalid JSON');return;}
 running++;res.setHeader('Content-Type','application/x-ndjson');res.setHeader('Cache-Control','no-store');
 const controller=new AbortController();res.on('close',()=>controller.abort());
 const send=event=>{if(!res.destroyed)res.write(JSON.stringify(event)+'\n');};
 try{const result=await searchVinted(data.entries,{pages:data.pages??3,signal:controller.signal,onProgress:send});send({type:'result',...result});}
 catch(error){send({type:'error',message:error.name==='TimeoutError'?'Vinted took too long to respond. Try again later.':error.message});}
 finally{running--;res.end();}
}
