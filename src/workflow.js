import {filterOptions,validateFilters} from './filters.js';
import {englishCategories} from './filter-translations.js';
const clothingGroups={1904:'Kleidergrößen',5:'Größen Männer',1193:'Baby- und Kindergrößen'};
export const defaultPreferences=()=>({departmentId:null,sizeIds:[],conditionIds:[]});
export function preferenceSizes(departmentId){return filterOptions.sizes.filter(o=>o.departmentId===departmentId&&o.group===clothingGroups[departmentId]);}
export function validatePreferences(value){
 if(!value||typeof value!=='object'||(value.departmentId!==null&&!filterOptions.departments.some(o=>o.id===value.departmentId)))throw new Error('Invalid Vinted filter selection.');
 validateFilters({departmentIds:value.departmentId?[value.departmentId]:[],sizeIds:value.sizeIds,conditionIds:value.conditionIds});
 if(!Array.isArray(value.sizeIds)||!Array.isArray(value.conditionIds)||value.sizeIds.some(id=>!preferenceSizes(value.departmentId).some(o=>o.id===id)))throw new Error('Invalid Vinted filter selection.');
}
export function sizingType(entry){
 const chosenCategory=filterOptions.categories.find(o=>o.id===entry.categoryId);
 const category=chosenCategory?.label.toLocaleLowerCase('de')??'';
 if(chosenCategory&&chosenCategory.id!==chosenCategory.departmentId){
  if(/schuhe|stiefel|sandalen/.test(category))return 'shoes';
  if(/mützen|hüte/.test(category))return 'hats';
  if(/socken/.test(category))return 'socks';
  if(/accessoires/.test(category))return 'other';
  return /kleidung/.test(category)?'clothing':'other';
 }
 const keyword=entry.keyword.toLocaleLowerCase('de');
 if(/schuhe|stiefel|sandalen/.test(category)||/\bshoes?\b|schuh|\bboots?\b|stiefel|sandal|slipper|hausschuh|sneaker/.test(keyword))return 'shoes';
 if(/mützen|hüte/.test(category)||/beanie|mütze|muetze|\bhat\b|\bhut\b|bonnet|berretto/.test(keyword))return 'hats';
 if(/socken/.test(category)||/sock|chaussette|calzini/.test(keyword))return 'socks';
 if(/accessoires/.test(category)||/scarf|schal|tuch|glove|handschuh|belt|gürtel|bag|tasche|rucksack/.test(keyword))return 'other';
 if(/kleidung/.test(category)||/jacket|jacke|coat|mantel|mäntel|trouser|\bpants\b|hose|bodysuit|\bbody\b|bodies|dress|kleid|skirt|\brock\b|röcke|shirt|hemd|blouse|bluse|romper|strampler|pyjama|pajama|schlafanzug|tights|strumpfhose|legging|hoodie|pullover|sweater|jumper|cardigan|strickjacke|\bvest\b|weste|swimsuit|badeanzug|jeans|snowsuit|schneeanzug/.test(keyword))return 'clothing';
 return 'other';
}
export function resolveEntry(entry,preferences){
 if(entry.useListPreferences===false)return {...entry};
 const category=filterOptions.categories.find(o=>o.id===entry.categoryId);
 const sizeDepartments=[...new Set((entry.sizeIds??[]).map(id=>filterOptions.sizes.find(o=>o.id===id)?.departmentId).filter(Boolean))];
 const departmentIds=entry.departmentIds?.length?[...entry.departmentIds]:category?[category.departmentId]:sizeDepartments.length?sizeDepartments:preferences.departmentId?[preferences.departmentId]:[];
 const inheritSize=!entry.sizeIds?.length&&!entry.sizes?.length&&sizingType(entry)==='clothing'&&departmentIds.length===1&&departmentIds[0]===preferences.departmentId;
 const sizeIds=entry.sizeIds?.length?[...entry.sizeIds]:inheritSize?[...preferences.sizeIds]:[];
 return {...entry,departmentIds,sizeIds,sizes:sizeIds.length?sizeIds.map(id=>filterOptions.sizes.find(o=>o.id===id)?.label).filter(Boolean):[...(entry.sizes??[])],conditionIds:entry.conditionIds?.length?[...entry.conditionIds]:[...preferences.conditionIds]};
}
const normal=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('de').trim();
export function searchCategories(query,departmentIds=[]){
 const terms=normal(query).split(/\s+/).filter(Boolean);
 return filterOptions.categories.filter(c=>(!departmentIds.length||departmentIds.includes(c.departmentId))&&c.id!==c.departmentId&&terms.every(term=>normal(c.label+' '+englishCategories[c.id]).includes(term)));
}
export function searchPages(mode,count){return count>0?Math.min(mode==='quick'?1:3,5,Math.floor(30/count)):0;}
export function nextSearchPages(current,count){const max=count>0?Math.min(5,Math.floor(30/count)):0;return current<max?Math.min(current+2,max):null;}
