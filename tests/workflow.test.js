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
test('multiple native sock categories infer kids and never inherit clothing sizes',()=>{
 const resolved=resolveEntry(item('socks',{categoryIds:[1600,1757]}),{departmentId:5,sizeIds:[],conditionIds:[]});
 assert.deepEqual(resolved.departmentIds,[1193]);assert.deepEqual(resolved.sizeIds,[]);
});
test('mixed category size types never inherit a clothing default',()=>{
 assert.deepEqual(resolveEntry(item('jacket',{categoryIds:[1521,1600]}),preferences).sizeIds,[]);
});
test('sock keywords in broad clothing parents keep clothing defaults separate',()=>{
 for(const categoryIds of [[85],[1252],[85,1828]]){
  assert.deepEqual(resolveEntry(item('Socks',{categoryIds}),{departmentId:categoryIds[0]===85?5:1193,sizeIds:[categoryIds[0]===85?206:619],conditionIds:[]}).sizeIds,[],String(categoryIds));
 }
});
test('shared ring IDs respect the selected men sizing group',()=>{
 const resolved=resolveEntry(item('ring',{sizeIds:[1202],sizeGroup:'5:Ringe'}),defaultPreferences());
 assert.deepEqual(resolved.departmentIds,[5]);
});
test('size type options stay available despite selections from another type',async()=>{
 const workflow=await import('../src/workflow.js');
 assert.ok(workflow.availableSizes?.(item('Socks',{sizeIds:[1509,807]}),defaultPreferences()).some(s=>s.departmentId===5&&s.group==='Ringe'));
 assert.deepEqual(workflow.sizeIdsForGroup?.([1509,807,1202],'5:Ringe'),[1202]);
});

test('categories determine relevant sizes without a separate size type',async()=>{
 const {categorySizes}=await import('../src/workflow.js');
 const groups=ids=>[...new Set(categorySizes?.(item('wrong keyword',{categoryIds:ids}),defaultPreferences())?.map(s=>`${s.departmentId}:${s.group}`))];
 assert.deepEqual(groups([242]),['5:Ringe']);
 assert.deepEqual(groups([119]),['1904:BHs']);
 assert.deepEqual(groups([1600,1757]),['1193:Socken für Kinder']);
 assert.deepEqual(groups([1255]),['1193:Kinderschuhgröße']);
 assert.deepEqual(groups([1499]),[]);
 assert.deepEqual(groups([242,1828]),['5:Ringe','5:Socken für Herren']);
});
test('parent underwear categories offer their distinct applicable size groups',async()=>{
 const {categorySizes}=await import('../src/workflow.js');
 const groups=[...new Set(categorySizes?.(item('underwear',{categoryIds:[85]}),defaultPreferences())?.map(s=>s.group))];
 assert.deepEqual(groups,['Größen Männer','Socken für Herren']);
});
test('category changes keep only compatible sizes',async()=>{
 const {categorySizes,compatibleSizeIds}=await import('../src/workflow.js');
 const choices=categorySizes?.(item('ring',{categoryIds:[242]}),defaultPreferences());
 assert.deepEqual(compatibleSizeIds?.([1509,807,1202],choices),[1202]);
});
test('bras and men trouser categories never inherit general clothing sizes',()=>{
 assert.deepEqual(resolveEntry(item('Bra',{categoryIds:[119]}),{departmentId:1904,sizeIds:[3],conditionIds:[]}).sizeIds,[]);
 assert.deepEqual(resolveEntry(item('trousers',{categoryIds:[34]}),{departmentId:5,sizeIds:[206],conditionIds:[]}).sizeIds,[]);
});
test('category-free sizing uses item name and list department without inferring from old sizes',async()=>{
 const {categorySizes}=await import('../src/workflow.js');
 assert.ok(categorySizes?.(item('socks'),preferences)?.every(s=>s.group==='Socken für Kinder'));
 assert.ok(categorySizes?.(item('Ring',{departmentIds:[5],sizeIds:[1509]}),preferences)?.some(s=>s.group==='Ringe'));
 assert.deepEqual(categorySizes?.(item(''),defaultPreferences()),[]);
});

test('saved custom names retain their selected size groups without a category',async()=>{
 const {categorySizes}=await import('../src/workflow.js');
 assert.ok(categorySizes(item('Birthday present',{sizeIds:[1202],sizeGroups:['5:Ringe']}),preferences).some(s=>s.id===1202&&s.departmentId===5));
});

test('glove categories never offer shoe sizes',async()=>{
 const {categorySizes}=await import('../src/workflow.js');
 for(const id of [90,91])assert.ok(categorySizes(item('gloves',{categoryIds:[id]})).every(s=>s.group==='Handschuhe für Erwachsene'));
 assert.ok(!categorySizes(item('gloves',{categoryIds:[1578]})).some(s=>/schuh/i.test(s.group)));
});

test('mixed general and specialized clothing categories do not inherit clothing defaults',()=>{
 assert.deepEqual(resolveEntry(item('Bra',{categoryIds:[119,532]}),{departmentId:1904,sizeIds:[3],conditionIds:[]}).sizeIds,[]);
 assert.deepEqual(resolveEntry(item('Trousers',{categoryIds:[34,84]}),{departmentId:5,sizeIds:[206],conditionIds:[]}).sizeIds,[]);
});
