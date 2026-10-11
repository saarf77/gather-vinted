import {catalogIds,filterOptions} from './filters.js';
// Offline item-name aliases. Unknown phrases pass through unchanged; no translation service.
export const itemAliases = [
 ['scarf','scarves','schal','schals'],['sock','socks','socken','kindersocken','babysocken','wollsocken','stoppersocken','tennissocken','funktionssocken','rutschersocken','strümpfe','strümpfen','kniestrümpfe'],['beanie','mütze','mützen','muetze'],['jumper','sweater','pullover'],['gloves','handschuhe'],
 ['jacket','jackets','jacke','jacken'],['coat','coats','mantel','mäntel'],['trousers','pants','hose','hosen'],['bodysuit','bodysuits','body','bodies'],['dress','dresses','kleid','kleider'],['skirt','skirts','rock','röcke'],['shirt','shirts','hemd','hemden'],['blouse','blouses','bluse','blusen'],['shoes','shoe','schuhe'],['boots','boot','stiefel'],['sandals','sandalen'],['slippers','hausschuhe'],['hat','hats','hut','hüte'],['romper','rompers','strampler'],['pyjamas','pajamas','schlafanzug','schlafanzüge','schlafanzügen','schlafanzuege','schlafanzuegen','pyjama','pajama','pyjamaset','pyjama-set','weihnachtsschlafanzug','kinderschlafanzug','babyschlafanzug','winterschlafanzug','sommerschlafanzug'],['tights','strumpfhose','strumpfhosen'],['leggings'],['hoodie','hoodies','kapuzenpullover'],['cardigan','cardigans','strickjacke'],['vest','vests','weste'],['swimsuit','badeanzug'],['swimwear','bademode'],['bikini'],['sneakers','sneaker'],['jeans'],['t-shirt','t-shirts','tshirt'],['backpack','rucksack'],['handbag','handtasche'],['bag','bags','tasche'],['belt','belts','gürtel'],['sunglasses','sonnenbrille'],['sleeping bag','schlafsack'],['snowsuit','schneeanzug'],['ring','rings','ringe'],['bra','bras','bh','bhs'],['shorts','short','kurze hose','kurze hosen']
];
const germanTerms=['schal','socken','mütze','pullover','handschuhe','jacke','mantel','hose','body','kleid','rock','hemd','bluse','schuhe','stiefel','sandalen','hausschuhe','hut','strampler','schlafanzug','strumpfhose','leggings','kapuzenpullover','strickjacke','weste','badeanzug','bademode','bikini','sneakers','jeans','t-shirt','rucksack','handtasche','tasche','gürtel','sonnenbrille','schlafsack','schneeanzug','ring','bh','shorts'];
const translations=new Map(itemAliases.flatMap((group,index)=>group.filter(word=>word!==germanTerms[index]&&!/[äöü]/.test(word)).slice(0,2).map(word=>[word,germanTerms[index]])));
export function germanSearchTerm(value){return translations.get(value.trim().toLowerCase())??value.trim();}

// These are retrieval alternatives, not instructions to relax an item's filters.
const relatedQueries={
 schal:['schal','schals','scarf'],socken:['socken','strümpfe','socks'],mütze:['mütze','mützen','beanie'],
 jacke:['jacke','jacken','jacket'],mantel:['mantel','mäntel','coat'],hose:['hose','hosen','trousers'],
 body:['body','bodies','bodysuit'],kleid:['kleid','kleider','dress'],rock:['rock','röcke','skirt'],
 hemd:['hemd','hemden','shirt'],bluse:['bluse','blusen','blouse'],schuhe:['schuhe','shoe','shoes'],
 strampler:['strampler','romper','rompers'],schlafanzug:['schlafanzug','pyjama','schlafanzüge'],
 strumpfhose:['strumpfhose','strumpfhosen','tights'],kapuzenpullover:['kapuzenpullover','hoodie','hoodies'],
 strickjacke:['strickjacke','cardigan','cardigans'],shorts:['shorts','kurze hose','kurze hosen']
};
function kidsContext(entry){
 const catalogs=catalogIds(entry);
 const departments=catalogs.length?catalogs.map(id=>filterOptions.departments.find(d=>d.id===id)?.id??filterOptions.categories.find(c=>c.id===id)?.departmentId):
  (entry.sizeIds??[]).flatMap(id=>filterOptions.sizes.filter(s=>s.id===id).map(s=>s.departmentId));
 return departments.length>0&&departments.every(id=>id===1193);
}
export function searchVariants(entry){
 const input=entry.keyword.normalize('NFKC').toLocaleLowerCase('de').trim();
 const canonical=Object.keys(relatedQueries).find(term=>relatedQueries[term].includes(input)||itemAliases[germanTerms.indexOf(term)].slice(0,2).includes(input));
 if(!canonical)return [germanSearchTerm(entry.keyword)];
 if(canonical==='socken'&&kidsContext(entry))return ['socken','kindersocken','stoppersocken'];
 return [...relatedQueries[canonical]];
}
