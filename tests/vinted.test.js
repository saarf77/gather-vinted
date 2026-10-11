import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCatalogHtml, searchVinted, searchTerm} from '../src/vinted.js';
const product=(id,seller,title,extra={})=>({id,title,url:`/items/${id}-item`,price:{amount:'8.00',currencyCode:'EUR'},user:{id:seller},itemBox:{firstLine:'COS',secondLine:'M · Sehr gut'},thumbnailUrl:'https://images1.vinted.net/t/photo.webp',...extra});
const html=products=>`<script>self.__next_f.push(${JSON.stringify([1,`a7:${JSON.stringify(['$',null,null,{state:JSON.stringify({items:{items:products.map(productItem=>({productItem}))}})}])}\n`])})</script>`;
test('extracts real listing fields from embedded catalogue state without executing scripts',()=>{
 const [r]=parseCatalogHtml(html([product(123,456,'Wool scarf')]));
 assert.equal(r.sellerId,'456');assert.equal(r.price,8);assert.equal(r.size,'M');assert.equal(r.url,'https://www.vinted.de/items/123-item');assert.equal(r.brand,'COS');assert.ok(r.image.startsWith('https://images1.vinted.net/'));
});
test('unknown size stays unknown; non-EUR records are skipped',()=>{
 const r=parseCatalogHtml(html([product(1,2,'Scarf',{itemBox:{firstLine:'COS',secondLine:'Sehr gut'}}),product(3,4,'Scarf',{price:{amount:'4',currencyCode:'GBP'}})]));
 assert.equal(r.length,1);assert.equal(r[0].size,'');
});
test('unexpected or blocked HTML reports a real error, never demo listings',()=>{
 assert.throws(()=>parseCatalogHtml('<html>captcha</html>'),/blocked|changed/i);
});
test('translates known search terms for German searches',()=>{assert.equal(searchTerm('beanie'),'mütze');assert.equal(searchTerm('Socks'),'socken');assert.equal(searchTerm('Levis 501'),'Levis 501');});
test('searches distinct queries, merges IDs, keeps per-query relevance and emits progress',async()=>{
 const requested=[],events=[];
 const entries=[{id:'a',keyword:'scarf',maxPrice:15},{id:'b',keyword:'beanie',maxPrice:null}];
 const result=await searchVinted(entries,{pages:1,onProgress:event=>events.push(event),fetchPage:async url=>{requested.push(url);return html([product(123,456,'Mixed item')]);}});
 assert.equal(requested.length,2);assert.equal(result.listings.length,1);assert.deepEqual(result.listings[0].searchEntryIds,['a','b']);assert.equal(events.length,2);
});
test('access blocks stop with no bypass or paid fallback',async()=>{
 await assert.rejects(()=>searchVinted([{id:'a',keyword:'scarf'}],{pages:1,fetchPage:async()=>{throw new Error('Vinted returned HTTP 403.');}}),/403/);
});
test('only catalogue result rows are returned, never unrelated recommendations',()=>{
 const state={items:{items:[{productItem:product(1,2,'COS Scarf')}]},recommendations:[{productItem:product(99,3,'Other scarf',{itemBox:{firstLine:'H&M',secondLine:'XL · Gut'}})}]};
 const page=`<script>self.__next_f.push(${JSON.stringify([1,'a:'+JSON.stringify(state)+'\n'])})</script>`;
 assert.deepEqual(parseCatalogHtml(page).map(x=>x.id),['1']);
});

test('broader search preserves original pages and adds related queries with every native filter intact',async()=>{
 const entry={id:'p',keyword:'Schlafanzug',categoryIds:[1194],departmentIds:[1193],sizeIds:[1567],brandId:2029,conditionIds:[2],maxPrice:10};
 const requests=[],events=[];
 const full=html(Array.from({length:96},(_,i)=>product(i+1,55,'Pyjama',{itemBox:{firstLine:'COS',secondLine:'3 Jahre / 98 · Sehr gut'}})));
 const result=await searchVinted([entry],{pages:5,onProgress:e=>events.push(e),fetchPage:async url=>{requests.push(new URL(url));return full;}});
 assert.deepEqual(requests.map(u=>[u.searchParams.get('search_text'),u.searchParams.get('page')]),[['schlafanzug','1'],['schlafanzug','2'],['schlafanzug','3'],['schlafanzug','4'],['schlafanzug','5'],['pyjama','1'],['schlafanzüge','1']]);
 for(const url of requests){assert.deepEqual(url.searchParams.getAll('catalog[]'),['1194']);assert.deepEqual(url.searchParams.getAll('size_ids[]'),['1567']);assert.deepEqual(url.searchParams.getAll('brand_ids[]'),['2029']);assert.deepEqual(url.searchParams.getAll('status_ids[]'),['2']);assert.equal(url.searchParams.get('price_to'),'10');}
 assert.equal(result.listings.length,96);assert.equal(result.pagesFetched,7);
 assert.deepEqual(result.listings[0].searchEntryIds,['p']);assert.equal(result.listings[0].filterEvidence.p,JSON.stringify({catalog:[1194],size:[1567],brand:2029,status:[2]}));
 assert.deepEqual(events.map(e=>e.searchTerm),['schlafanzug','schlafanzug','schlafanzug','schlafanzug','schlafanzug','pyjama','schlafanzüge']);
});
test('an empty canonical query does not suppress related terms and short variants are not paginated',async()=>{
 const urls=[];
 const result=await searchVinted([{id:'p',keyword:'Schlafanzug'}],{pages:5,fetchPage:async value=>{const url=new URL(value);urls.push(url);return html(url.searchParams.get('search_text')==='pyjama'?[product(77,88,'Pyjama')]:[]);}});
 assert.deepEqual(urls.map(u=>u.searchParams.get('search_text')),['schlafanzug','pyjama','schlafanzüge']);
 assert.equal(result.pagesFetched,3);assert.equal(result.listings[0].title,'Pyjama');
});
test('query expansion never exceeds the existing request cap and respects cancellation',async()=>{
 const entries=Array.from({length:10},(_,i)=>({id:String(i),keyword:'Socks',departmentIds:[1193]}));let requests=0;
 const result=await searchVinted(entries,{pages:3,fetchPage:async()=>{requests++;return html(Array.from({length:96},(_,i)=>product(i+1,9,'Socken')));}});
 assert.equal(requests,30);assert.equal(result.pagesFetched,30);
 await assert.rejects(()=>searchVinted(entries,{pages:4}),/30 pages/);
 const controller=new AbortController();requests=0;
 await assert.rejects(()=>searchVinted([entries[0]],{pages:3,signal:controller.signal,onProgress:()=>controller.abort(),fetchPage:async()=>{requests++;return html([]);}}),{name:'AbortError'});
 assert.equal(requests,1);
});
