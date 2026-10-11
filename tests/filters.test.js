import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogIds, filterKey, validateFilters, conditionMatches } from '../src/filters.js';
import { matches } from '../src/matching.js';
import { searchVinted } from '../src/vinted.js';
const html='<script>self.__next_f.push('+JSON.stringify([1,'a:'+JSON.stringify({items:{items:[{productItem:{id:1,title:'Scarf',url:'/items/1-scarf',price:{amount:8,currencyCode:'EUR'},user:{id:2},itemBox:{firstLine:'COS',secondLine:'M · Sehr gut'}}}]}})+'\n'])+')</script>';
test('category selection narrows departments instead of OR-ing a broad parent',()=>{
 assert.deepEqual(catalogIds({departmentIds:[1904,5],categoryId:1187}),[1187]);
 assert.deepEqual(catalogIds({departmentIds:[1904,5]}),[1904,5]);
});
test('conditions use exact labels rather than treating Sehr gut as Gut',()=>{
 assert.equal(conditionMatches([3],'Sehr gut'),false);
 assert.equal(conditionMatches([2,3],'Sehr gut'),true);
 assert.equal(conditionMatches([6],'New with tags'),true);
 assert.equal(conditionMatches([2],''),false);
});
test('unverified filter IDs and malformed arrays are rejected',()=>{
 assert.throws(()=>validateFilters({sizeIds:[99999999]}),/filter/i);
 assert.throws(()=>validateFilters({departmentIds:[2994]}),/filter/i);
 assert.throws(()=>validateFilters({conditionIds:'2'}),/filter/i);
});
test('native filters are sent to Vinted and their provenance is preserved',async()=>{
 const entry={id:'a',keyword:'scarf',departmentIds:[1904],sizeIds:[4],brandId:2029,conditionIds:[2]}; let requested;
 const result=await searchVinted([entry],{pages:1,fetchPage:async url=>{requested=new URL(url);return html;}});
 assert.deepEqual(requested.searchParams.getAll('catalog[]'),['1904']);
 assert.deepEqual(requested.searchParams.getAll('size_ids[]'),['4']);
 assert.deepEqual(requested.searchParams.getAll('status_ids[]'),['2']);
 assert.deepEqual(requested.searchParams.getAll('brand_ids[]'),['2029']);
 assert.equal(result.listings[0].filterEvidence.a,filterKey(entry));
 assert.equal(matches(entry,result.listings[0]),true);
});
test('a filtered result cannot satisfy another department or a changed size request',()=>{
 const entry={id:'a',keyword:'scarf',departmentIds:[1904],sizeIds:[4]};
 const listing={title:'Scarf',price:8,size:'M',condition:'Sehr gut',filterEvidence:{a:filterKey(entry)}};
 assert.equal(matches(entry,listing),true);
 assert.equal(matches({...entry,sizeIds:[] ,departmentIds:[5]},listing),false);
 assert.equal(matches({...entry,id:'b'},listing),false);
 assert.equal(matches(entry,{...listing,filterEvidence:undefined}),false);
});
test('duplicate entry IDs cannot mix filter evidence across requests',async()=>{
 await assert.rejects(()=>searchVinted([{id:'a',keyword:'scarf'},{id:'a',keyword:'beanie'}],{fetchPage:async()=>html}),/unique/);
});
test('native sizes cannot be sent for a different effective department',()=>{
 assert.throws(()=>validateFilters({departmentIds:[5],sizeIds:[623]}),/Size does not belong/);
 assert.throws(()=>validateFilters({departmentIds:[1904,1193],categoryId:183,sizeIds:[623]}));
});
