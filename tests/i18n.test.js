import test from 'node:test';
import assert from 'node:assert/strict';
import {messages} from '../src/messages.js';
import {createTranslator,optionLabel,chooseLanguage,localizeError,setLanguage} from '../src/i18n.js';
import {filterOptions} from '../src/filters.js';
import {searchTerm} from '../src/vinted.js';
import {matches} from '../src/matching.js';
test('German and English have identical keys and interpolation tokens',()=>{
 assert.deepEqual(Object.keys(messages.de).sort(),Object.keys(messages.en).sort());
 for(const key of Object.keys(messages.en))assert.deepEqual((messages.en[key].match(/\{\w+\}/g)??[]).sort(),(messages.de[key].match(/\{\w+\}/g)??[]).sort(),key);
});
test('language preferences fall back safely and translate status parameters',()=>{
 assert.equal(chooseLanguage('fr','en-GB'),'en');assert.equal(chooseLanguage('de','en'),'de');assert.equal(chooseLanguage(null,'de-DE'),'de');
 assert.equal(createTranslator('de')('items.count',{count:3}),'3 Artikel');
 assert.equal(createTranslator('en')('items.count',{count:3}),'3 items');
});
test('translated filters retain Germany catalogue IDs and EU sizes',()=>{
 const size=filterOptions.sizes.find(o=>o.id===623);
 assert.equal(optionLabel('size',size,'de'),'104 · 4 Jahre');assert.equal(optionLabel('size',size,'en'),'104 · 4 years');assert.equal(size.id,623);
 assert.equal(optionLabel('condition',filterOptions.conditions.find(o=>o.id===6),'en'),'New with tags');
 assert.match(optionLabel('category',filterOptions.categories.find(o=>o.id===13),'en'),/Jumpers/i);
});
test('common English keywords search in German and can match German titles',()=>{
 for(const [input,german,title] of [['jacket','jacke','Warme Jacke'],['bodysuit','body','Body Gr 86'],['trousers','hose','Hose 92'],['scarf','schal','Schal'],['Beanie','mütze','Mütze'],['Rings','ring','Silberne Ringe'],['Bras','bh','BHs Set'],['Shorts','Shorts','Kurze Hosen'],['Sneaker','sneakers','Nike Sneaker']]){
  assert.equal(searchTerm(input),german);assert.equal(matches({keyword:input},{title,price:5}),true);
 }
 assert.equal(searchTerm('Levis 501'),'Levis 501');assert.equal(searchTerm('Jacke'),'Jacke');
});
test('all catalogue choices translate without changing canonical values',()=>{
 for(const category of filterOptions.categories)assert.notEqual(optionLabel('category',category,'en'),'',`category ${category.id}`);
 for(const size of filterOptions.sizes){const original=JSON.stringify(size);optionLabel('size',size,'en');optionLabel('size',size,'de');assert.equal(JSON.stringify(size),original);}
});

test('server and import errors use the selected interface language',()=>{
 setLanguage('de');
 try{
  assert.equal(localizeError('Invalid JSON'),'Ungültiges JSON');
  assert.equal(localizeError('Listing 2: duplicate listing id.'),'Angebot 2: Die Angebots-ID ist doppelt vorhanden.');
  assert.match(localizeError('Vinted returned HTTP 403. Search stopped; no paid service or access bypass was used.'),/HTTP 403/);
 }finally{setLanguage('en');}
});
test('sock sizes use verified adult letters and explicit EU foot ranges for kids',()=>{
 for(const [id,label] of [[1519,'L · 43–46'],[1520,'XL · 47–51'],[1522,'XS · 36–37'],[1523,'S · 38–42'],[1525,'L · 47–52']])assert.equal(optionLabel('size',filterOptions.sizes.find(s=>s.id===id),'en'),label);
 assert.equal(optionLabel('size',filterOptions.sizes.find(s=>s.id===1509),'en'),'EU 19–21');
 assert.equal(optionLabel('size',filterOptions.sizes.find(s=>s.id===1509),'de'),'EU 19–21');
});
