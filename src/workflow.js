import {filterOptions,validateFilters,categoryIds,sizeGroups} from './filters.js';
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
 const chosen=categoryIds(entry).map(id=>filterOptions.categories.find(o=>o.id===id)).filter(o=>o&&o.id!==o.departmentId);
 const category='';
 if(chosen.length){
  const types=chosen.map(o=>{
   const path=o.label.toLocaleLowerCase('de');
   if(/schuhe|stiefel|sandalen/.test(path))return 'shoes';
   if(/mützen|hüte/.test(path))return 'hats';
   // Only leaf sock categories; an underwear parent also includes clothing.
   if(/\/ socken$/.test(path))return 'socks';
   if(/accessoires/.test(path))return 'other';
   return /kleidung/.test(path)||/clothing/i.test(englishCategories[o.id]??'')?'clothing':'other';
  });
  if(types.every(type=>type==='clothing')&&chosen.some(parent=>filterOptions.categories.some(child=>child.label.startsWith(parent.label+' / ')))){
   const keywordType=sizingType({...entry,categoryIds:[],categoryId:null});
   if(keywordType!=='clothing')return keywordType;
  }
  return types.every(type=>type===types[0])?types[0]:'other';
 }
 const keyword=entry.keyword.toLocaleLowerCase('de');
 if(/schuhe|stiefel|sandalen/.test(category)||/\bshoes?\b|schuh|\bboots?\b|stiefel|sandal|slipper|hausschuh|sneaker/.test(keyword))return 'shoes';
 if(/mützen|hüte/.test(category)||/beanie|mütze|muetze|\bhat\b|\bhut\b|bonnet|berretto/.test(keyword))return 'hats';
 if(/socken/.test(category)||/sock|chaussette|calzini/.test(keyword))return 'socks';
 if(/accessoires/.test(category)||/scarf|schal|tuch|glove|handschuh|belt|gürtel|bag|tasche|rucksack/.test(keyword))return 'other';
 if(/kleidung/.test(category)||/jacket|jacke|coat|mantel|mäntel|trouser|\bpants\b|hose|bodysuit|\bbody\b|bodies|dress|kleid|skirt|\brock\b|röcke|shirt|hemd|blouse|bluse|romper|strampler|pyjama|pajama|schlafanzug|tights|strumpfhose|legging|hoodie|pullover|sweater|jumper|cardigan|strickjacke|\bvest\b|weste|swimsuit|badeanzug|jeans|snowsuit|schneeanzug|\bshorts\b|bikini|swimwear|bademode/.test(keyword))return 'clothing';
 return 'other';
}
export function resolveEntry(entry,preferences){
 if(entry.useListPreferences===false)return {...entry};
 const categoryDepartments=[...new Set(categoryIds(entry).map(id=>filterOptions.categories.find(o=>o.id===id)?.departmentId).filter(Boolean))];
 const sizeDepartments=[...new Set((entry.sizeIds??[]).flatMap(id=>filterOptions.sizes.filter(o=>o.id===id&&(!sizeGroups(entry).length||sizeGroups(entry).includes(`${o.departmentId}:${o.group}`))).map(o=>o.departmentId)))];
 const departmentIds=entry.departmentIds?.length?[...entry.departmentIds]:categoryDepartments.length?categoryDepartments:sizeDepartments.length?sizeDepartments:preferences.departmentId?[preferences.departmentId]:[];
 const choices=categorySizes({...entry,departmentIds},preferences);
 const inheritSize=entry.useListSizes!==false&&!entry.sizeIds?.length&&!entry.sizes?.length&&sizingType(entry)==='clothing'&&choices.length>0&&choices.every(s=>s.group===clothingGroups[s.departmentId])&&departmentIds.length===1&&departmentIds[0]===preferences.departmentId;
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

export function availableSizes(entry){
 const categories=categoryIds(entry).map(id=>filterOptions.categories.find(o=>o.id===id)).filter(Boolean);
 const departments=entry.departmentIds?.length?entry.departmentIds:[...new Set(categories.map(o=>o.departmentId))];
 return filterOptions.sizes.filter(o=>!departments.length||departments.includes(o.departmentId));
}
export function sizeIdsForGroup(ids,group){return ids.filter(id=>filterOptions.sizes.some(o=>o.id===id&&`${o.departmentId}:${o.group}`===group));}

const groupKey=size=>`${size.departmentId}:${size.group}`;
function productGroup(path,department){
 const text=path.toLocaleLowerCase('de');
 if(/handschuhe/.test(text))return department===1193?null:'Handschuhe für Erwachsene';
 if(/schuhe|stiefel|sandalen/.test(text))return {1904:'Schuhe',5:'Schuhe Männer',1193:'Kinderschuhgröße'}[department];
 if(/hüte|mützen/.test(text))return department===1193?'Kindermützen':'Hüte für Erwachsene';
 if(/\/ socken$/.test(text))return {1904:'Socken für Damen',5:'Socken für Herren',1193:'Socken für Kinder'}[department];
 if(/\/ ringe$/.test(text))return 'Ringe';
 if(/\/ uhren$/.test(text))return 'Uhren';
 if(/schwangerschafts.*gürtel/.test(text))return 'Schwangerschaftsgürtel';
 if(/\/ gürtel$/.test(text))return {1904:'Gürtel für Damen',5:'Gürtel für Herren',1193:'Gürtel für Kinder'}[department];
 if(/bhs$/.test(text))return 'BHs';
 if(department===5&&/\/ (hosen|jeans|shorts)( \/ |$)|anzughosen/.test(text))return 'Hosen für Herren';
 if(department===5&&/\/ hemden( \/ |$)/.test(text))return 'Hemden für Herren';
 if(department===5&&/\/ blazer$/.test(text))return 'Anzugjacken für Herren';
 if(/autositze( \/ |$)/.test(text))return 'Autositze für Babys';
 if(/bettwäsche/.test(text))return 'Bettwäsche für Babys';
 if(/wickeltaschen/.test(text))return 'Wickeltaschen';
 if(/accessoires|spielzeug|pflege|möbel|kinderwagen|tragen|schmuck|taschen/.test(text))return null;
 const category=filterOptions.categories.find(c=>c.label===path);
 return /kleidung/.test(text)||/clothing/i.test(englishCategories[category?.id]??'')?clothingGroups[department]:null;
}
const categoryGroupCache=new Map();
function groupsForCategory(category){
 if(categoryGroupCache.has(category.id))return categoryGroupCache.get(category.id);
 const descendants=filterOptions.categories.filter(c=>c.departmentId===category.departmentId&&c.label.startsWith(category.label+' / '));
 const leaves=descendants.length?descendants.filter(c=>!descendants.some(child=>child.label.startsWith(c.label+' / '))):[category];
 const groups=new Set(leaves.map(c=>productGroup(c.label,c.departmentId)).filter(Boolean).map(group=>`${category.departmentId}:${group}`));
 categoryGroupCache.set(category.id,groups);return groups;
}
export function categorySizes(entry,preferences=defaultPreferences()){
 const categories=categoryIds(entry).map(id=>filterOptions.categories.find(c=>c.id===id)).filter(Boolean);
 if(categories.length){const groups=new Set(categories.flatMap(c=>[...groupsForCategory(c)]));return filterOptions.sizes.filter(s=>groups.has(groupKey(s)));}
 // Saved overrides keep their department when list defaults differ.
 const departments=entry.departmentIds?.length?entry.departmentIds:sizeGroups(entry).length?sizeGroups(entry).map(g=>Number(g.split(':')[0])):entry.useListPreferences!==false&&preferences.departmentId?[preferences.departmentId]:[];
 let type=sizingType(entry),keyword=entry.keyword.toLocaleLowerCase('de'),group=null;
 if(/\brings?\b|\bringe?\b/.test(keyword))group='Ringe';
 else if(/\bbra(s)?\b|\bbh(s)?\b/.test(keyword))group='BHs';
 else if(/glove|handschuh/.test(keyword))group='Handschuhe für Erwachsene';
 else if(/belt|gürtel/.test(keyword))type='belts';
 const matching=filterOptions.sizes.filter(s=>!departments.length||departments.includes(s.departmentId));
 if(group)return matching.filter(s=>s.group===group);
 const mensGroup=/trouser|\bpants\b|\bhosen?\b|jeans|\bshorts\b/.test(keyword)?'Hosen für Herren':!/\bt[ -]?shirts?\b/.test(keyword)&&/\bshirts?\b|\bhemd(?:en)?\b/.test(keyword)?'Hemden für Herren':null;
 if(mensGroup)return matching.filter(s=>s.group===(s.departmentId===5?mensGroup:clothingGroups[s.departmentId]));
 if(type==='other'&&entry.sizeIds?.length){const savedGroups=sizeGroups(entry);return filterOptions.sizes.filter(s=>savedGroups.length?savedGroups.includes(groupKey(s)):entry.sizeIds.includes(s.id));}
 return matching.filter(s=>type==='clothing'?s.group===clothingGroups[s.departmentId]:type==='shoes'?/schuh/i.test(s.group):type==='hats'?/mützen|hüte/i.test(s.group):type==='socks'?/^Socken für/.test(s.group):type==='belts'?/^Gürtel für/.test(s.group):false);
}
export function compatibleSizeIds(ids,choices){return ids.filter(id=>choices.some(s=>s.id===id));}
