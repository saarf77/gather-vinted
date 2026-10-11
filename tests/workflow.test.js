import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveEntry,defaultPreferences,validatePreferences,searchCategories,searchPages,nextSearchPages} from '../src/workflow.js';
import {filterKey} from '../src/filters.js';
const preferences={departmentId:1193,sizeIds:[619,622],conditionIds:[6,1,2]};
const item=(keyword,extra={})=>({id:keyword,keyword,sizes:[],sizeIds:[],departmentIds:[],conditionIds:[],categoryId:null,brandId:null,brand:'',category:'',maxPrice:null,...extra});
test('clothing inherits list filters as actual Germany IDs without mutating saved items',()=>{
 const raw=item('jacket');const copy=structuredClone(raw);const resolved=resolveEntry(raw,preferences);
 assert.deepEqual(resolved.departmentIds,[1193]);assert.deepEqual(resolved.sizeIds,[619,622]);assert.deepEqual(resolved.conditionIds,[6,1,2]);assert.deepEqual(raw,copy);
 assert.notEqual(filterKey(raw),filterKey(resolved));
});
test('shoe, hat, sock and accessory requests never inherit clothing sizes',()=>{
 for(const keyword of ['shoes','Kinderschuhe','beanie','Mütze','Socken','scarf','Spielzeug'])assert.deepEqual(resolveEntry(item(keyword),preferences).sizeIds,[],keyword);
 assert.deepEqual(resolveEntry(item('shoes',{sizeIds:[807]}),preferences).sizeIds,[807]);
});
test('explicit item filters override defaults and can disable inheritance',()=>{
 const own=resolveEntry(item('jacket',{sizeIds:[623],conditionIds:[6]}),preferences);assert.deepEqual(own.sizeIds,[623]);assert.deepEqual(own.conditionIds,[6]);
 assert.deepEqual(resolveEntry(item('jacket',{useListPreferences:false}),preferences).departmentIds,[]);
 const men=resolveEntry(item('jacket',{departmentIds:[5]}),preferences);assert.deepEqual(men.sizeIds,[]);assert.deepEqual(men.departmentIds,[5]);
 const legacy=resolveEntry(item('jacket',{sizes:['L']}),preferences);assert.deepEqual(legacy.sizeIds,[]);assert.deepEqual(legacy.sizes,['L']);
});
test('list preferences reject invalid IDs and sizes outside their clothing department',()=>{
 assert.deepEqual(defaultPreferences(),{departmentId:null,sizeIds:[],conditionIds:[]});
 assert.doesNotThrow(()=>validatePreferences(preferences));
 for(const bad of [{...preferences,departmentId:99},{...preferences,sizeIds:[1]},{...preferences,departmentId:5},{...preferences,conditionIds:[99]}])assert.throws(()=>validatePreferences(bad));
});
test('categories can be narrowed by German or English within selected departments',()=>{
 const german=searchCategories('Jacke',[1193]);assert.ok(german.length);assert.ok(german.every(c=>c.departmentId===1193));
 assert.ok(searchCategories('jacket',[1193]).length);assert.equal(searchCategories('no-such-category',[]).length,0);
});
test('quick, broader and more searches always fit the 30-page total and 5-page per-item limits',()=>{
 assert.equal(searchPages('quick',10),1);assert.equal(searchPages('broad',10),3);assert.equal(searchPages('broad',1),3);
 assert.equal(nextSearchPages(1,3),3);assert.equal(nextSearchPages(3,3),5);assert.equal(nextSearchPages(5,3),null);
 assert.equal(nextSearchPages(1,10),3);assert.equal(nextSearchPages(3,10),null);assert.equal(searchPages('broad',0),0);
});
test('a category or explicit native size from another department overrides list department',async()=>{
 const {filterOptions}=await import('../src/filters.js');
 const adultSize=filterOptions.sizes.find(o=>o.departmentId===5&&o.group==='Größen Männer');
 assert.deepEqual(resolveEntry(item('jacket',{sizeIds:[adultSize.id]}),preferences).departmentIds,[5]);
 const adultCategory=filterOptions.categories.find(o=>o.departmentId===5&&o.id!==5);
 assert.deepEqual(resolveEntry(item('jacket',{categoryId:adultCategory.id}),preferences).departmentIds,[5]);
});
test('a clothing category takes priority over misleading keywords',async()=>{
 const {filterOptions}=await import('../src/filters.js');
 const size=filterOptions.sizes.find(o=>o.departmentId===1904&&o.group==='Kleidergrößen');
 assert.deepEqual(resolveEntry(item('Bootcut jeans',{categoryId:183}),{departmentId:1904,sizeIds:[size.id],conditionIds:[]}).sizeIds,[size.id]);
});
test('keyword-only bootcut jeans still uses clothing sizes',async()=>{
 const {filterOptions}=await import('../src/filters.js');
 const size=filterOptions.sizes.find(o=>o.departmentId===1904&&o.group==='Kleidergrößen');
 assert.deepEqual(resolveEntry(item('Bootcut jeans'),{departmentId:1904,sizeIds:[size.id],conditionIds:[]}).sizeIds,[size.id]);
});
