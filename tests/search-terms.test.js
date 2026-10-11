import test from 'node:test';
import assert from 'node:assert/strict';
import * as terms from '../src/search-terms.js';
const variants=entry=>terms.searchVariants?.(entry);

test('English and German simple item names fetch the same related terms',()=>{
 assert.deepEqual(variants({keyword:'Schlafanzug'}),['schlafanzug','pyjama','schlafanzüge']);
 assert.deepEqual(variants({keyword:'Pyjamas'}),variants({keyword:'Schlafanzug'}));
 assert.deepEqual(variants({keyword:'Socks'}),variants({keyword:'socken'}));
 assert.deepEqual(variants({keyword:'Jacket'}),['jacke','jacken','jacket']);
});
test('kids categories and native sock sizes add child terminology',()=>{
 const expected=['socken','kindersocken','stoppersocken'];
 for(const entry of [{keyword:'Socks',departmentIds:[1193]},{keyword:'socken',categoryIds:[1600,1757]},{keyword:'socken',sizeIds:[1511]}])assert.deepEqual(variants(entry),expected);
});
test('adult or mixed filters never add children-only query terms',()=>{
 for(const entry of [{keyword:'Socks',departmentIds:[5]},{keyword:'Socks',departmentIds:[1193,5]},{keyword:'Socks',categoryIds:[183],departmentIds:[1193,1904]},{keyword:'Socks',sizeIds:[4]}])assert.equal(variants(entry)?.includes('kindersocken'),false);
});
test('qualified phrases and custom names remain exact rather than losing restrictions',()=>{
 for(const keyword of ['red socks','Paw Patrol Schlafanzug','Levis 501','Wollsocken'])assert.deepEqual(variants({keyword}),[keyword]);
});
