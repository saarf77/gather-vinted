import test from 'node:test';
import assert from 'node:assert/strict';
import { rankSellers, matches } from '../src/matching.js';
import { validateListings, safeListingUrl } from '../src/data.js';
const want = (keyword, extra = {}) => ({ id: keyword, keyword, sizes: [], brand: '', category: '', maxPrice: null, ...extra });
const item = (id, sellerId, title, extra = {}) => ({ id, sellerId, sellerName: sellerId, title, price: 10, size: 'M', brand: 'COS', category: 'accessories', ...extra });
test('full coverage ranks before a cheaper partial match', () => {
 const r = rankSellers([want('scarf'),want('beanie')],[item('1','a','scarf'), item('2','a','beanie'), item('3','b','scarf',{price:1})]);
 assert.equal(r[0].sellerId,'a'); assert.equal(r[0].covered,2); assert.equal(r[1].missing.length,1);
});
test('one listing cannot satisfy two entries', () => {
 const r = rankSellers([want('scarf'),want('beanie')],[item('1','a','scarf beanie')]);
 assert.equal(r[0].covered,1);
});
test('assignment avoids greedy overlap and minimises price', () => {
 const r = rankSellers([want('scarf'),want('beanie')],[item('1','a','scarf beanie',{price:1}),item('2','a','scarf',{price:3}),item('3','a','beanie',{price:9})]);
 assert.equal(r[0].covered,2); assert.equal(r[0].subtotal,4);
});
test('German aliases match whole words without substring false positives', () => {
 assert.ok(matches(want('beanie'),item('1','a','Warme Mütze')));
 assert.ok(matches(want('socks'),item('2','a','Neue Socken')));
 assert.equal(matches(want('hat'),item('3','a','that scarf')),false);
});
test('constraints reject missing or mismatched information', () => {
 const w=want('scarf',{sizes:['M'],brand:'COS',category:'accessories',maxPrice:15});
 assert.ok(matches(w,item('1','a','scarf')));
 for(const change of [{size:''},{size:'L'},{brand:''},{brand:'H&M'},{category:'clothing'},{price:16}]) assert.equal(matches(w,item('1','a','scarf',change)),false);
});
test('same display name does not combine sellers; price ties are deterministic', () => {
 const r=rankSellers([want('scarf')],[item('2','b','scarf',{sellerName:'Anna'}),item('1','a','scarf',{sellerName:'Anna'})]);
 assert.equal(r.length,2); assert.equal(r[0].sellerId,'a');
});
test('empty list or no matches produces no sellers', () => {
 assert.deepEqual(rankSellers([], [item('1','a','scarf')]),[]);
 assert.deepEqual(rankSellers([want('shoes')], [item('1','a','scarf')]),[]);
});
test('imports reject duplicate IDs, negative prices and malformed records', () => {
 assert.throws(()=>validateListings({}),/array/i);
 assert.throws(()=>validateListings([item('1','a','scarf',{price:-1})]),/price/i);
 assert.throws(()=>validateListings([item('1','a','scarf'),item('1','a','scarf')]),/duplicate/i);
 assert.throws(()=>validateListings([{}]),/id/i);
 assert.equal(validateListings([item('1','a','scarf')]).length,1);
});
test('only HTTPS Vinted Germany item links are accepted',()=>{
 assert.equal(safeListingUrl('javascript:alert(1)'),null);
 assert.equal(safeListingUrl('https://vinted.de.evil.test/items/12'),null);
 assert.equal(safeListingUrl('https://www.vinted.de/member/12'),null);
 assert.equal(safeListingUrl('https://www.vinted.de/items/123-scarf'),'https://www.vinted.de/items/123-scarf');
});
test('multilingual titles match but query relevance alone cannot create false bundles',()=>{
 const entry=want('scarf',{id:'a',sizes:['M'],maxPrice:15});
 assert.equal(matches(entry,item('1','a','Écharpe',{searchEntryIds:['a']})),true);
 assert.equal(matches(want('beanie',{id:'b'}),item('2','a','Vans Kappe',{searchEntryIds:['b']})),false);
 assert.equal(matches(entry,item('1','a','Echarpe',{searchEntryIds:['a'],size:'L'})),false);
 assert.equal(matches(entry,item('1','a','Unrelated item',{searchEntryIds:['a']})),false);
});
test('matches explicitly displayed size alternatives and normalises range punctuation',()=>{
 assert.ok(matches(want('scarf',{sizes:['M']}),item('1','a','scarf',{size:'M / 38 / 10'})));
 assert.ok(matches(want('socks',{sizes:['39–42']}),item('1','a','socks',{size:'39-42'})));
 assert.equal(matches(want('scarf',{sizes:['M']}),item('1','a','scarf',{size:'L / 40 / 12'})),false);
});

test('common singular and plural German item names match English requests',()=>{
 for(const [keyword,title] of [['Sneakers','Nike Sneaker'],['Tights','Strumpfhosen'],['Rings','Silberne Ringe'],['Bras','BHs Set']])assert.equal(matches({keyword},{title,price:5}),true,`${keyword}: ${title}`);
});
