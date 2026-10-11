import {language,t,setLanguage,translateDocument,optionLabel,localizeError} from './i18n.js';
import { filterOptions, validateFilters } from './filters.js';
import { rankSellers } from './matching.js';
import { initialEntries, validateListings, safeListingUrl } from './data.js';
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => new Intl.NumberFormat(language==='de'?'de-DE':'en-IE',{style:'currency',currency:'EUR'}).format(value);
const KEY = 'gather.workspace.v1';
let entries = structuredClone(initialEntries), listings = [], source = 'live', filter='multi', editId=null;
let searching=false, searchController=null,statusMessage=null;
listings=[];entries=structuredClone(initialEntries).map(e=>({...e,sizes:[]}));
let storageProblem=false;
try {
 const saved=JSON.parse(localStorage.getItem(KEY) ?? 'null');
 if(saved){
  if(!Array.isArray(saved.entries) || saved.entries.length>10 || !saved.entries.every(e=>e && typeof e.id==='string' && typeof e.keyword==='string' && e.keyword.trim() && e.keyword.length<=80 && Array.isArray(e.sizes) && e.sizes.every(s=>typeof s==='string') && typeof e.brand==='string' && typeof e.category==='string' && (e.maxPrice===null || (Number.isFinite(e.maxPrice) && e.maxPrice>=0 && e.maxPrice<=100000))) || new Set(saved.entries.map(e=>e.id)).size!==saved.entries.length) throw new Error('Invalid saved list');
  entries=saved.entries.map(e=>({...e,category:'',departmentIds:e.departmentIds??[],sizeIds:e.sizeIds??[],conditionIds:e.conditionIds??[],categoryId:e.categoryId??null,brandId:e.brandId??null}));
  entries.forEach(validateFilters);
  source=['import','empty','live'].includes(saved.source)?saved.source:'live';
  listings=source==='import'?validateListings(saved.listings):[];
 }
} catch { storageProblem=true;entries=structuredClone(initialEntries).map(e=>({...e,sizes:[]}));listings=[];source='live'; }
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,4200);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({entries,source,listings:source==='import'?listings:[]}));}catch{toast(t('storage.unavailable'));}}
const artPaths={
 scarf:'<path d="M33 13c0-5 7-7 11-5l17 8-8 20-12-5-2 61H19l9-63-7-7Z" fill="currentColor"/><path d="m47 27 16 7-4 57H42l5-64Z" fill="currentColor" opacity=".83"/><path d="M22 83h15m8 0h13M26 48h12m8 0h14M29 35h10" stroke="#fff" opacity=".3" stroke-width="3"/><path d="M20 91v6m7-6v6m7-6v6m11-6v6m6-6v6m6-6v6" stroke="currentColor" stroke-width="2"/>',
 beanie:'<path d="M18 68c0-35 11-51 31-51s31 16 31 51Z" fill="currentColor"/><rect x="14" y="62" width="70" height="21" rx="5" fill="currentColor"/><path d="M30 66V40m10 24V25m10 38V23m10 41V27m10 39V42M23 69v9m10-9v9m10-9v9m10-9v9m10-9v9m10-9v9" stroke="#fff" opacity=".27" stroke-width="2"/>',
 socks:'<path d="M21 14h22v44c0 4-4 9-9 12L20 82C6 91-2 73 9 66l12-8Z" fill="currentColor"/><path d="M56 23h22v44c0 4-4 9-9 12L55 91C41 100 33 82 44 75l12-8Z" fill="currentColor" opacity=".85"/><path d="M22 23h20M22 29h20m15 3h20m-20 6h20M14 64l13 15m21-6 13 15" stroke="#fff" opacity=".5" stroke-width="3"/>',
 jumper:'<path d="m32 20-19 9L2 55l14 9 11-18v45h45V46l11 18 14-9-11-26-19-9c-7 12-28 12-35 0Z" fill="currentColor"/><path d="M37 19c2 9 22 9 25 0M30 82h39M36 35v41m13-39v39m13-40v40" stroke="#fff" opacity=".3" stroke-width="3"/>',
 generic:'<rect x="21" y="28" width="58" height="57" rx="6" fill="currentColor" opacity=".8"/><path d="M36 33V23a14 14 0 0 1 28 0v10" stroke="currentColor" stroke-width="5" fill="none"/><path d="m36 59 10 9 19-23" stroke="#fff" stroke-width="4" fill="none"/>'
};
function kindFor(keyword){const k=keyword.toLowerCase();return /scarf|schal/.test(k)?'scarf':/sock/.test(k)?'socks':/beanie|mütze/.test(k)?'beanie':/jumper|sweater|pullover/.test(k)?'jumper':'generic';}
function art(kind='generic',tone='oat'){return `<svg viewBox="0 0 100 110" aria-hidden="true" style="color:${({oat:'#baa585',sage:'#8b9b80',rust:'#b27c5e'})[tone]??'#baa585'}">${artPaths[kind]??artPaths.generic}</svg>`;}
function sizeLabel(option){return optionLabel('size',option);}
function entrySizeLabels(entry){return entry.sizeIds?.length?[...new Set(entry.sizeIds.map(id=>filterOptions.sizes.find(o=>o.id===id)).filter(Boolean).map(sizeLabel))]:entry.sizes;}
const label=(type,id)=>optionLabel(type,filterOptions[type==='category'?'categories':type==='condition'?'conditions':'departments'].find(o=>o.id===id));
function sellerName(result){return result.sellerName===`Seller #${result.sellerId}`?t('results.seller',{id:result.sellerId}):result.sellerName;}
function conditionLabel(value){const option=filterOptions.conditions.find(o=>o.label.toLowerCase()===value?.toLowerCase());return option?optionLabel('condition',option):value;}
function render(){
 $('#list-count').textContent=t(entries.length===1?'items.one':'items.count',{count:entries.length});
 $('#add-button').disabled=searching||entries.length>=10;
 $('#live-search').textContent=t(searching?'search.cancel':'search.button');
 $('#entries').innerHTML=entries.map(e=>`<article class="entry"><div class="entry-head"><span class="entry-icon">${art(kindFor(e.keyword))}</span><h3>${escape(e.keyword)}</h3><div class="entry-controls"><button class="small-button edit-entry" data-id="${escape(e.id)}" aria-label="${escape(t('items.edit',{item:e.keyword}))}">✎</button><button class="small-button remove-entry" data-id="${escape(e.id)}" aria-label="${escape(t('items.remove',{item:e.keyword}))}">×</button></div></div><p class="entry-info">${escape(entrySizeLabels(e).length?entrySizeLabels(e).join(', '):t('filters.anySize'))} · ${escape(e.maxPrice===null?t('filters.anyPrice'):t('filters.upTo',{price:money(e.maxPrice)}))}${e.brand?`<br>${escape(e.brand)}`:''}${e.departmentIds?.length?`<br>${e.departmentIds.map(id=>escape(departmentName(id))).join(', ')}`:''}${e.categoryId?` · ${escape(label('category',e.categoryId).split(' / ').at(-1))}`:''}${e.conditionIds?.length?`<br>${e.conditionIds.map(id=>escape(label('condition',id))).join(', ')}`:''}</p></article>`).join('')||`<p class="muted">${t('items.start')}</p>`;
 $('#source-label').innerHTML=source==='live'?`<strong>${t('source.live')}</strong> · ${t(listings.length?'source.fetched':'source.ready',{count:listings.length})}`:source==='empty'?`<strong>${t('source.empty')}</strong> · ${t('source.importHelp')}`:`<strong>${t('source.import')}</strong> · ${t('source.importCount',{count:listings.length})}`;
 const ranked=rankSellers(entries,listings),complete=ranked.filter(r=>r.covered===entries.length);
 $('#multi-count').textContent=ranked.filter(r=>r.covered>=2).length;$('#all-count').textContent=ranked.length;$('#full-count').textContent=complete.length;
 for(const [id,value] of [['all-filter','all'],['multi-filter','multi'],['full-filter','full']]){$('#'+id).classList.toggle('active',filter===value);$('#'+id).setAttribute('aria-pressed',String(filter===value));}
 let visible=filter==='full'?complete:filter==='multi'?ranked.filter(r=>r.covered>=2):[...ranked];
 if($('#sort').value==='price')visible=[...visible].sort((a,b)=>a.subtotal-b.subtotal||b.covered-a.covered||a.sellerId.localeCompare(b.sellerId));
 $('#results-summary').textContent=t(entries.length?'results.summary':'results.first',{count:ranked.length,complete:complete.length});
 if(!visible.length){const kind=!entries.length?'list':!listings.length?'ready':filter==='multi'?'multi':filter==='full'?'full':'none';$('#results').innerHTML=`<div class="empty"><span class="empty-symbol" aria-hidden="true">⌁</span><h3>${t(`empty.${kind}Title`)}</h3><p>${t(`empty.${kind}Body`)}</p>${filter!=='all'?`<button class="secondary-button" id="empty-all">${t('empty.all')}</button>`:''}</div>`;return;}
 $('#results').innerHTML=visible.map(result=>{
  const best=result===ranked[0]&&filter!=='full'&&$('#sort').value==='coverage';
  return `<article class="seller-card${best?' best':''}">${best?`<div class="best-ribbon"><span aria-hidden="true">✳</span> ${t('results.best')}</div>`:''}<div class="seller-heading"><span class="avatar" aria-hidden="true">${escape(sellerName(result)[0].toUpperCase())}</span><div><h3 class="seller-name">${escape(sellerName(result))}</h3><p class="seller-meta">${t('results.loaded',{count:result.listingCount})}</p></div><span class="coverage${result.covered===entries.length?' complete':''}">${result.covered===entries.length?'✓ ':''}${t('results.of',{count:result.covered,total:entries.length})}</span></div><div class="items-grid">${result.selected.map(({listing,entryIndex})=>`<div class="product"><div class="product-art ${listing.tone}"><span class="item-match">✓ ${escape(entries[entryIndex].keyword)}</span>${source==='live'&&listing.image?`<img src="${escape(listing.image)}" alt="${escape(listing.title)}" loading="lazy" referrerpolicy="no-referrer">`:art(listing.kind,listing.tone)}</div><h4 class="product-title">${escape(listing.title)}</h4><p class="product-detail">${escape(listing.size||t('results.unknownSize'))}${listing.condition?` · ${escape(conditionLabel(listing.condition))}`:''}</p><p class="product-price">${money(listing.price)}</p>${safeListingUrl(listing.url)?`<a class="listing-link" href="${escape(safeListingUrl(listing.url))}" target="_blank" rel="noopener noreferrer">${t('results.vinted')}</a>`:''}</div>`).join('')}</div>${result.missing.length?`<p class="missing">${escape(t('results.missing',{items:result.missing.map(e=>e.keyword).join(', ')}))}</p>`:''}<div class="seller-bottom"><p class="subtotal">${t('results.subtotal')}<strong>${money(result.subtotal)}</strong></p><button class="bundle-toggle" data-seller="${escape(result.sellerId)}" aria-expanded="false">${t('results.details')} <span aria-hidden="true">↗</span></button></div><div class="bundle-detail" hidden><strong>${t(source==='live'?'results.liveDetail':'results.importDetail')}</strong><ul>${result.selected.map(({entryIndex,listing})=>`<li>${escape(entries[entryIndex].keyword)} → ${escape(listing.title)} (${money(listing.price)})</li>`).join('')}</ul><p>${t('results.purchase')} ${t('results.excluded')}</p></div></article>`;
 }).join('');
}
let selectedSizeIds=new Set(), legacySizes=[];
const departmentName=id=>label('department',id);
const chosenDepartments=()=>[...document.querySelectorAll('#department-options input:checked')].map(n=>Number(n.value));
const sizeChoices=()=>filterOptions.sizes.filter(o=>!chosenDepartments().length||chosenDepartments().includes(o.departmentId));
function updateSizeSummary(){
 const labels=[...new Set([...selectedSizeIds].map(id=>filterOptions.sizes.find(o=>o.id===id)).filter(Boolean).map(sizeLabel))];
 $('#size-summary').textContent=labels.length?labels.join(', '):legacySizes.length?legacySizes.join(', '):t('filters.anySize');
}
function renderSizeChoices(){
 const choices=sizeChoices().filter(o=>`${o.departmentId}:${o.group}`===$('#size-group').value);
 $('#size-options').innerHTML=choices.map(o=>`<label class="check-option"><input type="checkbox" value="${o.id}" ${selectedSizeIds.has(o.id)?'checked':''}>${escape(sizeLabel(o))}</label>`).join('') || `<p class="muted">${t('filters.chooseHint')}</p>`;updateSizeSummary();
}
function updateFilterMenus(preferredGroup=''){
 const departments=chosenDepartments(),currentCategory=$('#category').value;
 $('#category').innerHTML=`<option value="">${t('filters.anyCategory')}</option>`+filterOptions.departments.filter(d=>!departments.length||departments.includes(d.id)).map(d=>`<optgroup label="${escape(optionLabel('department',d))}">${filterOptions.categories.filter(c=>c.departmentId===d.id&&c.id!==d.id).map(c=>`<option value="${c.id}">${escape(optionLabel('category',c).split(' / ').slice(1).join(' / '))}</option>`).join('')}</optgroup>`).join('');
 if([...$('#category').options].some(o=>o.value===currentCategory))$('#category').value=currentCategory;
 const choices=sizeChoices(),groups=[...new Map(choices.map(o=>[`${o.departmentId}:${o.group}`,`${departmentName(o.departmentId)} · ${optionLabel('group',o.group)}`])).entries()];
 const previous=preferredGroup||$('#size-group').value;
 $('#size-group').innerHTML=`<option value="">${t('filters.chooseType')}</option>`+groups.map(([value,label])=>`<option value="${escape(value)}">${escape(label)}</option>`).join('');
 if(groups.some(([key])=>key===previous))$('#size-group').value=previous;
 else if(departments.length===1)$('#size-group').value=({1904:'1904:Kleidergrößen',5:'5:Größen Männer',1193:'1193:Baby- und Kindergrößen'})[departments[0]];
 selectedSizeIds=new Set([...selectedSizeIds].filter(id=>choices.some(o=>o.id===id)));renderSizeChoices();
}
$('#department-options').innerHTML=filterOptions.departments.map(o=>`<label class="check-option"><input type="checkbox" value="${o.id}">${escape(optionLabel('department',o))}</label>`).join('');
$('#condition-options').innerHTML=filterOptions.conditions.map(o=>`<label class="check-option"><input type="checkbox" value="${o.id}">${escape(optionLabel('condition',o))}</label>`).join('');
$('#brand-options').innerHTML=filterOptions.brands.map(o=>`<option value="${escape(o.label)}"></option>`).join('');
$('#department-options').addEventListener('change',event=>{
 const kidsSelected=event.target.checked&&Number(event.target.value)===1193;
 updateFilterMenus(kidsSelected?'1193:Baby- und Kindergrößen':'');
 if(kidsSelected)$('#size-picker').open=true;
});
$('#size-group').addEventListener('change',renderSizeChoices);
$('#size-options').addEventListener('change',event=>{legacySizes=[];const id=Number(event.target.value);event.target.checked?selectedSizeIds.add(id):selectedSizeIds.delete(id);updateSizeSummary();});
$('#clear-sizes').addEventListener('click',()=>{selectedSizeIds.clear();legacySizes=[];renderSizeChoices();});
function openItem(id=null){
 if(searching)return;editId=id;$('#item-form').reset();$('#size-picker').open=false;$('#item-error').textContent='';$('#item-dialog-title').textContent=id?t('editor.edit'):t('editor.add');
 const e=entries.find(e=>e.id===id);selectedSizeIds=new Set(e?.sizeIds??[]);legacySizes=selectedSizeIds.size?[]:e?.sizes??[];
 if(e){$('#keyword').value=e.keyword;$('#max-price').value=e.maxPrice??'';$('#brand').value=e.brand;}
 for(const n of document.querySelectorAll('#department-options input'))n.checked=e?.departmentIds?.includes(Number(n.value))??false;
 for(const n of document.querySelectorAll('#condition-options input'))n.checked=e?.conditionIds?.includes(Number(n.value))??false;
 $('#size-group').value='';const selected=filterOptions.sizes.find(o=>selectedSizeIds.has(o.id));updateFilterMenus(selected?`${selected.departmentId}:${selected.group}`:'');$('#category').value=e?.categoryId??'';
 $('#item-dialog').showModal();
}
$('#add-button').addEventListener('click',()=>openItem());
$('#entries').addEventListener('click',event=>{const edit=event.target.closest('.edit-entry'),remove=event.target.closest('.remove-entry');if(edit)openItem(edit.dataset.id);if(remove&&!searching){entries=entries.filter(e=>e.id!==remove.dataset.id);persist();render();toast(t('items.removed'));}});
$('#item-form').addEventListener('submit',event=>{event.preventDefault();if(searching)return;const keyword=$('#keyword').value.trim();if(!keyword){$('#item-error').textContent=t('editor.required');return;}if(!editId&&entries.length>=10){$('#item-error').textContent=t('editor.limit');return;}const entry={id:editId??crypto.randomUUID(),keyword,sizes:selectedSizeIds.size?[...new Set([...selectedSizeIds].map(id=>filterOptions.sizes.find(o=>o.id===id).label))]:legacySizes,sizeIds:[...selectedSizeIds],departmentIds:chosenDepartments(),conditionIds:[...document.querySelectorAll('#condition-options input:checked')].map(n=>Number(n.value)),categoryId:$('#category').value?Number($('#category').value):null,brandId:filterOptions.brands.find(o=>o.label.toLowerCase()===$('#brand').value.trim().toLowerCase())?.id??null,maxPrice:$('#max-price').value===''?null:Number($('#max-price').value),brand:$('#brand').value.trim(),category:''};try{validateFilters(entry);}catch(error){$('#item-error').textContent=localizeError(error.message);return;}entries=editId?entries.map(e=>e.id===editId?entry:e):[...entries,entry];if(source==='live'){listings=[];setStatus('search.changed');}persist();render();$('#item-dialog').close();toast(t('items.saved'));});
for(const button of document.querySelectorAll('.close-dialog'))button.addEventListener('click',()=>button.closest('dialog').close());
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
$('#all-filter').addEventListener('click',()=>{filter='all';render();});$('#multi-filter').addEventListener('click',()=>{filter='multi';render();});$('#full-filter').addEventListener('click',()=>{filter='full';render();});$('#sort').addEventListener('change',render);
$('#results').addEventListener('click',event=>{if(event.target.closest('#empty-all')){filter='all';render();}const button=event.target.closest('.bundle-toggle');if(button){const detail=button.closest('.seller-card').querySelector('.bundle-detail');detail.hidden=!detail.hidden;button.setAttribute('aria-expanded',String(!detail.hidden));button.innerHTML=detail.hidden?`${t('results.details')} <span aria-hidden="true">↗</span>`:`${t('results.hide')} <span aria-hidden="true">↑</span>`;}});
$('#about-button').addEventListener('click',()=>$('#about-dialog').showModal());
$('#import-button').addEventListener('click',()=>{if(searching)return;$('#import-error').textContent='';$('#import-file').value='';$('#import-dialog').showModal();});
const example=[{id:'your-listing-id',sellerId:'your-seller-id',sellerName:'seller-name',title:'Wool scarf',size:'One size',price:8,currency:'EUR',brand:'',category:'accessories',condition:'Very good'}];
$('#schema-example').textContent=JSON.stringify(example,null,2);
$('#download-example').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(example,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='gather-listings-example.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#import-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;$('#import-error').textContent='';try{if(file.size>1024*1024)throw new Error(t('import.large'));let parsed;try{parsed=JSON.parse(await file.text());}catch{throw new Error(t('import.invalid'));}const imported=validateListings(parsed);listings=imported;source='import';filter='all';persist();render();$('#import-dialog').close();toast(t('import.success',{count:listings.length}));}catch(error){$('#import-error').textContent=localizeError(error.message);}});
$('#demo-button').addEventListener('click',()=>{if(searching)return;entries=structuredClone(initialEntries).map(e=>({...e,sizes:[]}));listings=[];source='live';setStatus('items.winterLoaded');filter='all';$('#sort').value='coverage';persist();render();toast(t('items.winterToast'));});
$('#clear-button').addEventListener('click',()=>{if(searching)return;entries=[];listings=[];source='empty';filter='all';try{localStorage.removeItem(KEY);}catch{}render();toast(t('items.cleared'));});

$('#live-search').addEventListener('click',async()=>{
 if(searching){searchController.abort();return;}
 if(!entries.length){toast(t('items.first'));return;}
 const pages=Number($('#search-pages').value);
 if(pages*entries.length>30){toast(t('search.limit'));return;}
 searching=true;searchController=new AbortController();listings=[];source='live';filter=entries.length>=2?'multi':'all';render();
 const button=$('#live-search');button.textContent=t('search.cancel');button.classList.add('cancel');$('#search-pages').disabled=true;
 setStatus('search.contact');let finished=false;
 try{
  const response=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries,pages}),signal:searchController.signal});
  if(!response.ok)throw new Error(await response.text());
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
  while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let index;while((index=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+1);if(!line)continue;const event=JSON.parse(line);
   if(event.type==='progress')setStatus('search.progress',{item:event.keyword,page:event.page,count:event.listingCount,done:event.completed,total:event.total});
   if(event.type==='error')throw new Error(event.message);
   if(event.type==='result'){listings=event.listings;finished=true;persist();render();const bundles=rankSellers(entries,listings).filter(r=>r.covered>=2).length;setStatus('search.done',{count:listings.length,pages:event.pagesFetched,bundles});}
  }}
  if(!finished)throw new Error(t('search.connection'));
 }catch(error){setStatus(error.name==='AbortError'?'search.cancelled':'search.failed',{error:error.message});}
 finally{searching=false;button.textContent=t('search.button');button.classList.remove('cancel');$('#search-pages').disabled=false;render();}
});
translateDocument();render();if(storageProblem)toast(t('storage.invalid'));

function setStatus(key,params={}){statusMessage={key,params};$('#search-status').textContent=t(key,params.error?{...params,error:localizeError(params.error)}:params);}
$('#language-switch').addEventListener('change',event=>{
 const expanded=[...document.querySelectorAll('.bundle-toggle[aria-expanded="true"]')].map(n=>n.dataset.seller);
 const departments=chosenDepartments(),conditions=[...document.querySelectorAll('#condition-options input:checked')].map(n=>Number(n.value)),group=$('#size-group').value;
 setLanguage(event.target.value);translateDocument();
 for(const [selector,type,checked] of [['#department-options','department',departments],['#condition-options','condition',conditions]]){
  const options=type==='department'?filterOptions.departments:filterOptions.conditions;
  $(selector).innerHTML=options.map(o=>`<label class="check-option"><input type="checkbox" value="${o.id}" ${checked.includes(o.id)?'checked':''}>${escape(optionLabel(type,o))}</label>`).join('');
 }
 updateFilterMenus(group);$('#item-dialog-title').textContent=t(editId?'editor.edit':'editor.add');
 if(statusMessage)setStatus(statusMessage.key,statusMessage.params);
 $('#toast').hidden=true;render();
 for(const button of document.querySelectorAll('.bundle-toggle'))if(expanded.includes(button.dataset.seller)){button.setAttribute('aria-expanded','true');button.innerHTML=`${t('results.hide')} <span aria-hidden="true">↑</span>`;button.closest('.seller-card').querySelector('.bundle-detail').hidden=false;}
});
