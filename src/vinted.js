import { appendFilters, filterKey, validateFilters } from './filters.js';
const origin='https://www.vinted.de';
import {germanSearchTerm} from './search-terms.js';
export const searchTerm=germanSearchTerm;
export function parseCatalogHtml(html){
 const parts=[];
 for(const match of html.matchAll(/self\.__next_f\.push\((.*?)\)<\/script>/gs)){
  try{const value=JSON.parse(match[1]);if(value[0]===1&&typeof value[1]==='string')parts.push(value[1]);}catch{}
 }
 const products=new Map();let sawCatalog=false;
 function visit(value,depth=0){
  if(depth>80)return;
  if(typeof value==='string'&&/^[\[{]/.test(value)){try{visit(JSON.parse(value),depth+1);}catch{}return;}
  if(Array.isArray(value)){for(const child of value)visit(child,depth+1);return;}
  if(value&&typeof value==='object'){
   if(value.items && typeof value.items==='object' && Array.isArray(value.items.items)){
    sawCatalog=true;
    for(const row of value.items.items)if(row?.productItem)products.set(String(row.productItem.id),row.productItem);
   }
   for(const child of Object.values(value))visit(child,depth+1);
  }
 }
 for(const line of parts.join('').split('\n')){const i=line.indexOf(':');if(i<0)continue;try{visit(JSON.parse(line.slice(i+1)));}catch{}}
 if(!sawCatalog)throw new Error('Vinted blocked this request or changed its page format. No live results were loaded.');
 const results=[];
 for(const product of products.values()){
  const price=Number(product.price?.amount),sellerId=product.user?.id;
  if(!sellerId||!product.id||typeof product.title!=='string'||!Number.isFinite(price)||price<0||product.price?.currencyCode!=='EUR')continue;
  const line=product.itemBox?.secondLine??'',separated=line.split(' · ');
  const size=separated.length>1?separated[0].trim():'';
  const url=new URL(product.url,origin);
  if(url.origin!==origin||!/^\/items\/\d+/.test(url.pathname))continue;
  const image=product.thumbnailUrl;
  results.push({id:String(product.id),sellerId:String(sellerId),sellerName:`Seller #${sellerId}`,title:product.title,price:Math.round(price*100)/100,size,brand:product.itemBox?.firstLine??'',category:'',condition:separated.at(-1),url:url.href,image:typeof image==='string'&&/^https:\/\/images\d*\.vinted\.net\/t\//.test(image)?image:null,kind:'generic',tone:'oat',searchEntryIds:[]});
 }
 return results;
}
const cache=new Map();
async function fetchPublicPage(url,signal){
 const cached=cache.get(url);if(cached&&Date.now()-cached.time<5*60*1000)return cached.listings;
 const response=await fetch(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),headers:{Accept:'text/html'}});
 if(!response.ok)throw new Error(`Vinted returned HTTP ${response.status}. Search stopped; no paid service or access bypass was used.`);
 const html=await response.text();if(html.length>12000000)throw new Error('Vinted returned an unexpectedly large page.');
 const listings=parseCatalogHtml(html);
 if(cache.size>=60)cache.delete(cache.keys().next().value);
 cache.set(url,{time:Date.now(),listings});return listings;
}
export async function searchVinted(entries,{pages=3,onProgress=()=>{},signal,fetchPage}={}){
 if(!Array.isArray(entries)||!entries.length||entries.length>10)throw new Error('Add between 1 and 10 shopping-list items.');
 if(!Number.isInteger(pages)||pages<1||pages>5||pages*entries.length>30)throw new Error('Search supports 1–5 pages per item, up to 30 pages total.');
 if(new Set(entries.map(e=>e?.id)).size!==entries.length)throw new Error('Shopping-list IDs must be unique.');
 signal=signal?AbortSignal.any([signal,AbortSignal.timeout(280000)]):AbortSignal.timeout(280000);
 for(const entry of entries)if(!entry||typeof entry.id!=='string'||typeof entry.keyword!=='string'||!entry.keyword.trim()||entry.keyword.length>80||!(entry.maxPrice==null||(Number.isFinite(entry.maxPrice)&&entry.maxPrice>=0&&entry.maxPrice<=100000)))throw new Error('Invalid shopping-list entry.');
 for(const entry of entries)validateFilters(entry);
 const merged=new Map();let completed=0;
 for(const entry of entries){
  for(let page=1;page<=pages;page++){
   signal?.throwIfAborted();
   const url=new URL('/catalog',origin);url.searchParams.set('search_text',searchTerm(entry.keyword));url.searchParams.set('page',String(page));url.searchParams.set('order','relevance');
   appendFilters(url,entry);
   if(entry.maxPrice!=null){url.searchParams.set('price_to',String(entry.maxPrice));url.searchParams.set('currency','EUR');}
   const products=fetchPage?parseCatalogHtml(await fetchPage(url.href)):await fetchPublicPage(url.href,signal);
   for(const product of products){const existing=merged.get(product.id);if(existing){if(!existing.searchEntryIds.includes(entry.id))existing.searchEntryIds.push(entry.id);existing.filterEvidence[entry.id]=filterKey(entry);}else merged.set(product.id,{...product,searchEntryIds:[entry.id],filterEvidence:{[entry.id]:filterKey(entry)}});}
   completed++;onProgress({type:'progress',keyword:entry.keyword,page,completed,total:pages*entries.length,listingCount:merged.size});
   if(products.length<96)break;
  }
 }
 return {listings:[...merged.values()],searchedAt:new Date().toISOString(),pagesFetched:completed};
}
