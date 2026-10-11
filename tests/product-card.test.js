import test from 'node:test';
import assert from 'node:assert/strict';
import {renderProduct} from '../src/product-card.js';
const listing={title:'Wool socks',brand:'H&M',size:'25–27',condition:'Very good',price:3,image:'https://images.example/socks.jpg',url:'https://www.vinted.de/items/123-socks'};
const options={keyword:'Socks',live:true,money:value=>`€${value}`,conditionLabel:()=> 'Sehr gut',unknownSize:'Unknown size',viewLabel:'View on Vinted ↗',art:()=>'<svg></svg>'};
test('photo and title open the same validated listing while details remain visible',()=>{
 const html=renderProduct(listing,options);
 assert.equal((html.match(/href="https:\/\/www.vinted.de\/items\/123-socks"/g)||[]).length,3);
 for(const detail of ['Wool socks','H&amp;M','25–27','Sehr gut','€3'])assert.ok(html.includes(detail),detail);
 assert.match(html,/<img[^>]+alt="Wool socks"/);
 assert.match(html,/class="item-match">✓ Socks/);
});
test('untrusted listing text is escaped and unsafe purchase URLs are not linked',()=>{
 const html=renderProduct({...listing,title:'<script>"bad"</script>',brand:'<img onerror=evil>',url:'javascript:alert(1)'},options);
 assert.ok(!html.includes('<script>'));
 assert.ok(!html.includes('<img onerror'));
 assert.ok(!html.includes('href='));
 assert.ok(html.includes('&lt;script&gt;&quot;bad&quot;&lt;/script&gt;'));
});
test('missing metadata and imported listings retain usable placeholders',()=>{
 const html=renderProduct({...listing,brand:'',size:'',condition:'',image:null,url:null},{...options,live:false});
 assert.ok(html.includes('Unknown size'));
 assert.ok(html.includes('<svg>'));
 assert.ok(!html.includes('undefined'));
 assert.ok(!html.includes('href='));
});
test('a catalogue title fallback is not repeated as a brand',()=>{
 const html=renderProduct({...listing,brand:listing.title},options);
 assert.ok(!html.includes('class="product-brand"'));
});
test('placeholder photo links have a readable accessible name',()=>{
 const html=renderProduct({...listing,image:null},options);
 assert.match(html,/<a class="product-photo-link"[^>]*aria-label="Wool socks"/);
});
