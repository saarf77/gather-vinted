import {searchVinted} from './src/vinted.js';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, extname, sep} from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
let searchRunning=false;
createServer(async(req,res)=>{
 try{
  if(req.url==='/api/search' && req.method==='POST'){
   if(req.headers.origin && !['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin)){res.writeHead(403);res.end('Origin denied');return;}
   if(searchRunning){res.writeHead(429);res.end('Another search is running. Please wait.');return;}
   let input='';for await(const chunk of req){input+=chunk;if(input.length>20000){res.writeHead(413);res.end('Request too large');return;}}
   let data;try{data=JSON.parse(input);}catch{res.writeHead(400);res.end('Invalid JSON');return;}
   searchRunning=true;const controller=new AbortController();res.on('close',()=>controller.abort());
   res.writeHead(200,{'Content-Type':'application/x-ndjson','Cache-Control':'no-store'});
   const send=event=>{if(!res.destroyed)res.write(JSON.stringify(event)+'\n');};
   try{const result=await searchVinted(data.entries,{pages:data.pages??3,signal:controller.signal,onProgress:send});send({type:'result',...result});}
   catch(error){send({type:'error',message:error.name==='TimeoutError'?'Vinted took too long to respond. Try again later.':error.message});}
   finally{searchRunning=false;res.end();}
   return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method not allowed');return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  const relative=target.slice(root.length);
  if(!target.startsWith(root) || relative.split(sep).some(part=>part.startsWith('.')) || !(relative==='index.html'||relative.startsWith('src/'))){res.writeHead(404);res.end('Not found');return;}
  const body=await readFile(target);
  res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://*.vinted.net; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Gather is running at http://127.0.0.1:${port}`));
