import test from 'node:test';
import assert from 'node:assert/strict';
import {createResultWindow} from '../src/result-window.js';
const sellers=Array.from({length:55},(_,id)=>({sellerId:String(id)}));
test('starts with 24 sellers and reveals ordered batches without duplicate sellers',()=>{
 const window=createResultWindow();
 const first=window.update(sellers,['all','coverage']);
 assert.equal(first.shown,24);assert.equal(first.total,55);assert.equal(first.hasMore,true);
 assert.deepEqual(first.items,sellers.slice(0,24));
 const second=window.more();assert.equal(second.shown,48);assert.deepEqual(second.items,sellers.slice(0,48));
 const last=window.more();assert.equal(last.shown,55);assert.equal(last.hasMore,false);assert.deepEqual(last.items,sellers);
 assert.deepEqual(window.more(),last);
});
test('filter, sort and new data reset the batch while language-only renders preserve it',()=>{
 const data={},window=createResultWindow();
 window.update(sellers,['all','coverage',data]);window.more();
 assert.equal(window.update([...sellers],['all','coverage',data]).shown,48);
 assert.equal(window.update(sellers,['all','price',data]).shown,24);
 window.more();assert.equal(window.update(sellers,['multi','price',data]).shown,24);
 window.more();assert.equal(window.update(sellers,['multi','price',{}]).shown,24);
});
test('short and empty results clamp counts and never show a load-more action',()=>{
 const window=createResultWindow();
 assert.deepEqual(window.update([],['empty']),{items:[],shown:0,total:0,hasMore:false});
 const one=window.update(sellers.slice(0,1),['one']);assert.equal(one.shown,1);assert.equal(one.hasMore,false);
 assert.deepEqual(window.more(),one);
});
