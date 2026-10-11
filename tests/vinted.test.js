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
