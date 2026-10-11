export const initialEntries = [
 {id:'scarf',keyword:'Scarf',sizes:['One size'],maxPrice:15,brand:'',category:''},
 {id:'socks',keyword:'Socks',sizes:['39–42'],maxPrice:5,brand:'',category:''},
 {id:'beanie',keyword:'Beanie',sizes:['M'],maxPrice:10,brand:'',category:''}
];
const sellers = [
 ['anna','annas.wardrobe',[['Wool scarf','One size',8,'scarf','oat'],['Cotton socks','39–42',3,'socks','sage'],['Ribbed beanie','M',6,'beanie','rust'],['Cable knit jumper','M',19,'jumper','oat']]],
 ['mila','mila.secondhand',[['Checked scarf','One size',12,'scarf','rust'],['Everyday socks','39–42',4,'socks','oat'],['Wool beanie','M',9,'beanie','sage']]],
 ['leo','leos.archive',[['Soft wool Schal','One size',5,'scarf','sage'],['Classic Mütze','M',5,'beanie','oat'],['Cotton pullover','L',16,'jumper','rust']]],
 ['jules','jules.pre-loved',[['Unworn Socken','39–42',2,'socks','rust'],['Fisherman beanie','M',4,'beanie','sage']]],
 ['nora','nora.edit',[['Cashmere scarf','One size',14,'scarf','oat'],['Fine knit beanie','L',7,'beanie','rust']]]
];
export const demoListings = sellers.flatMap(([sellerId,sellerName,items])=>items.map(([title,size,price,kind,tone],i)=>({id:`${sellerId}-${i}`,sellerId,sellerName,title,size,price,kind,tone,brand:'',category:kind === 'jumper' ? 'clothing' : 'accessories',condition:'Very good',url:null})));
export function safeListingUrl(value) {
 try { const url = new URL(value); return url.protocol === 'https:' && ['www.vinted.de','vinted.de'].includes(url.hostname) && !url.username && !url.password && (!url.port || url.port === '443') && /^\/items\/\d+(?:-|\/|$)/.test(url.pathname) ? url.href : null; } catch { return null; }
}
export function validateListings(value) {
 if (!Array.isArray(value)) throw new Error('Import must be a JSON array of listings.');
 if (value.length > 1000) throw new Error('Import at most 1,000 listings at a time.');
 const ids = new Set();
 return value.map((record,index)=>{
  const fail = message => { throw new Error(`Listing ${index+1}: ${message}`); };
  if (!record || typeof record !== 'object') fail('expected an object.');
  for (const key of ['id','sellerId','sellerName','title']) if(typeof record[key] !== 'string' || !record[key].trim() || record[key].length > 250) fail(`${key} must be text between 1 and 250 characters.`);
  const id = record.id.trim();
  if (ids.has(id)) fail('duplicate listing id.');
  ids.add(id);
  if(typeof record.price !== 'number' || !Number.isFinite(record.price) || record.price < 0 || record.price > 100000) fail('price must be a number from 0 to 100000, in EUR.');
  if (record.currency && record.currency !== 'EUR') fail('only EUR prices are supported.');
  for(const key of ['size','brand','category','condition']) if(record[key] != null && (typeof record[key] !== 'string' || record[key].length > 250)) fail(`${key} must be text.`);
  if(record.url && !safeListingUrl(record.url)) fail('url must be an HTTPS vinted.de item link.');
  return {id,sellerId:record.sellerId.trim(),sellerName:record.sellerName.trim(),title:record.title.trim(),price:Math.round(record.price*100)/100,size:record.size?.trim()??'',brand:record.brand?.trim()??'',category:record.category?.trim()??'',condition:record.condition?.trim()??'',url:record.url ? safeListingUrl(record.url):null,kind:'generic',tone:'oat'};
 });
}
