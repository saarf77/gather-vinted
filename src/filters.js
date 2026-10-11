import { filterOptions } from './filter-options.js';
export { filterOptions };
const normal=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('de').trim();
export function catalogIds(entry){return entry.categoryId?[entry.categoryId]:entry.departmentIds??[];}
export function filterKey(entry){return JSON.stringify({catalog:catalogIds(entry).slice().sort((a,b)=>a-b),size:(entry.sizeIds??[]).slice().sort((a,b)=>a-b),brand:entry.brandId??null,status:(entry.conditionIds??[]).slice().sort((a,b)=>a-b)});}
export function needsEvidence(entry){return catalogIds(entry).length>0 || entry.sizeIds?.length>0 || Boolean(entry.brandId);}
export function validateFilters(entry){
 for(const [key,choices] of [['departmentIds',filterOptions.departments],['sizeIds',filterOptions.sizes],['conditionIds',filterOptions.conditions]]){
  const ids=entry[key]??[];if(!Array.isArray(ids)||ids.length>30||ids.some(id=>!Number.isInteger(id)||!choices.some(o=>o.id===id)))throw new Error('Invalid Vinted filter selection.');
 }
 for(const [key,choices] of [['categoryId',filterOptions.categories],['brandId',filterOptions.brands]])if(entry[key]!=null&&!choices.some(o=>o.id===entry[key]))throw new Error('Invalid Vinted filter selection.');
 if(entry.categoryId && entry.departmentIds?.length && !entry.departmentIds.includes(filterOptions.categories.find(c=>c.id===entry.categoryId).departmentId))throw new Error('Category does not belong to the selected department.');
 const departments=entry.categoryId?[filterOptions.categories.find(c=>c.id===entry.categoryId).departmentId]:entry.departmentIds??[];
 if(departments.length&&(entry.sizeIds??[]).some(id=>!departments.includes(filterOptions.sizes.find(s=>s.id===id).departmentId)))throw new Error('Size does not belong to the selected department. Clear the size selection or choose a matching department.');
}
export function appendFilters(url,entry){
 validateFilters(entry);
 for(const [key,ids] of [['catalog[]',catalogIds(entry)],['size_ids[]',entry.sizeIds??[]],['status_ids[]',entry.conditionIds??[]],['brand_ids[]',entry.brandId?[entry.brandId]:[]]])for(const id of new Set(ids))url.searchParams.append(key,String(id));
}
const conditionAliases={6:['neu, mit etikett','new with tags','neu mit etikett'],1:['neu','new without tags','neu ohne etikett'],2:['sehr gut','very good'],3:['gut','good'],4:['zufriedenstellend','satisfactory']};
export function conditionMatches(ids,label){return !ids?.length || ids.some(id=>conditionAliases[id]?.includes(normal(label)));}
