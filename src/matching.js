import {itemAliases} from './search-terms.js';
import { conditionMatches, filterKey, needsEvidence } from './filters.js';
const normal = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('de').trim().replace(/\s+/g,' ');
const aliases = [['scarf','schal','schals','scarves','tuch','halstuch','seidentuch','sjaal','sjaals','écharpe','echarpe','foulard','sciarpa'],['socks','sock','socken','chaussettes','calzini','sokken'],['beanie','mütze','muetze','mützen','bonnet','muts','berretto'],['jumper','sweater','pullover'],['gloves','handschuhe'],['one size','einheitsgröße','einheitsgroesse']];
function alternatives(word) { return [...new Set([word,...aliases.filter(group=>group.includes(word)).flat(),...itemAliases.filter(group=>group.includes(word)).flat()])]; }
function hasPhrase(title, phrase) {
 const words = normal(title).match(/[\p{L}\p{N}]+/gu) ?? [];
 const wanted = normal(phrase).match(/[\p{L}\p{N}]+/gu) ?? [];
 return wanted.length > 0 && words.some((_,i) => wanted.every((w,j) => words[i+j] === w));
}
export function matches(entry, listing) {
 const keyword = normal(entry.keyword);
 if (!keyword || !alternatives(keyword).some(word => hasPhrase(listing.title,word))) return false;
 const sizeNormal = value => normal(value).replace(/[–—]/g, '-');
 const displayedSizes = [sizeNormal(listing.size), ...String(listing.size ?? '').split('/').map(sizeNormal)];
 if (needsEvidence(entry) && listing.filterEvidence?.[entry.id] !== filterKey(entry)) return false;
 if (!conditionMatches(entry.conditionIds,listing.condition)) return false;
 if (!entry.sizeIds?.length && entry.sizes?.length && !entry.sizes.some(size => alternatives(sizeNormal(size)).some(allowed => displayedSizes.includes(allowed)))) return false;
 if (entry.brand && normal(entry.brand) !== normal(listing.brand)) return false;
 if (entry.category && normal(entry.category) !== normal(listing.category)) return false;
 if (!Number.isFinite(listing.price) || listing.price < 0) return false;
 return entry.maxPrice == null || listing.price <= entry.maxPrice;
}
export function rankSellers(entries, listings) {
 if (!entries.length) return [];
 if (entries.length > 10) throw new Error('Use at most 10 shopping-list entries.');
 const groups = new Map();
 for (const listing of listings) {
  const eligible = entries.map((entry,index) => matches(entry,listing) ? index : -1).filter(index => index >= 0);
  if (!eligible.length) continue;
  if (!groups.has(listing.sellerId)) groups.set(listing.sellerId,[]);
  groups.get(listing.sellerId).push({listing,eligible});
 }
 const results = [];
 for (const [sellerId, candidates] of groups) {
  // Snapshot each step so one listing can only be assigned once.
  const states = new Map([[0,{cents:0, selected:[]}]]);
  for (const {listing,eligible} of candidates.sort((a,b)=>a.listing.id.localeCompare(b.listing.id))) {
   for (const [mask,state] of [...states]) for (const index of eligible) {
    if (mask & (1 << index)) continue;
    const nextMask = mask | (1 << index);
    const cents = state.cents + Math.round(listing.price * 100);
    if (!states.has(nextMask) || cents < states.get(nextMask).cents) states.set(nextMask,{cents,selected:[...state.selected,{entryIndex:index,listing}]});
   }
  }
  const best = [...states.values()].sort((a,b)=>b.selected.length-a.selected.length || a.cents-b.cents)[0];
  const chosen = new Set(best.selected.map(match=>match.entryIndex));
  results.push({sellerId,sellerName:candidates[0].listing.sellerName,covered:best.selected.length,subtotal:best.cents/100,selected:best.selected.sort((a,b)=>a.entryIndex-b.entryIndex),missing:entries.filter((_,i)=>!chosen.has(i)),listingCount:listings.filter(item=>item.sellerId === sellerId).length});
 }
 return results.sort((a,b)=>b.covered-a.covered || a.subtotal-b.subtotal || a.sellerId.localeCompare(b.sellerId));
}
