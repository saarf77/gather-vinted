import {language,t,setLanguage,translateDocument,optionLabel,localizeError,selectedCategoryText} from './i18n.js';
import {filterOptions,validateFilters,categoryIds,sizeGroups} from './filters.js';
import {rankSellers,matches} from './matching.js';
import {initialEntries,validateListings} from './data.js';
import {renderProduct} from './product-card.js';
import {createResultWindow,RESULT_BATCH_SIZE} from './result-window.js';
import {defaultPreferences,validatePreferences,preferenceSizes,resolveEntry,sizingType,searchCategories,searchPages,nextSearchPages,categorySizes,compatibleSizeIds} from './workflow.js';
const $=selector=>document.querySelector(selector);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>new Intl.NumberFormat(language==='de'?'de-DE':'en-IE',{style:'currency',currency:'EUR'}).format(value);
const KEY='gather.workspace.v1';
const freshEntries=()=>structuredClone(initialEntries).map(e=>({...e,sizes:[],useListPreferences:true}));
let entries=freshEntries(),listings=[],preferences=defaultPreferences(),source='live',filter='multi';
const resultWindow=createResultWindow();
let resultPage={items:[],shown:0,total:0,hasMore:false},bestSellerId=null;
let editId=null,searching=false,searchController=null,statusMessage=null,lastSearchPages=0,storageProblem=false;
let useListSizes=true,selectedSizeIds=new Set(),selectedSizeGroups=[],legacySizes=[],selectedCategoryIds=new Set(),preferenceSizeIds=new Set();
const conditionSets={'':[],6:[6],1:[6,1],2:[6,1,2],3:[6,1,2,3],4:[6,1,2,3,4]};
try{
 const saved=JSON.parse(localStorage.getItem(KEY)??'null');
 if(saved){
  if(!Array.isArray(saved.entries)||saved.entries.length>10||!saved.entries.every(e=>e&&typeof e.id==='string'&&typeof e.keyword==='string'&&e.keyword.trim()&&e.keyword.length<=80&&Array.isArray(e.sizes)&&e.sizes.every(s=>typeof s==='string')&&typeof e.brand==='string'&&typeof e.category==='string'&&(e.maxPrice===null||(Number.isFinite(e.maxPrice)&&e.maxPrice>=0&&e.maxPrice<=100000))&&(e.useListPreferences===undefined||typeof e.useListPreferences==='boolean')&&(e.useListSizes===undefined||typeof e.useListSizes==='boolean'))||new Set(saved.entries.map(e=>e.id)).size!==saved.entries.length)throw new Error();
  entries=saved.entries.map(e=>({...e,category:'',departmentIds:e.departmentIds??[],sizeIds:e.sizeIds??[],conditionIds:e.conditionIds??[],categoryIds:categoryIds(e),categoryId:null,brandId:e.brandId??null}));
  entries.forEach(validateFilters);preferences=saved.preferences??defaultPreferences();validatePreferences(preferences);
  source=['import','empty','live'].includes(saved.source)?saved.source:'live';listings=source==='import'?validateListings(saved.listings):[];
 }
}catch{storageProblem=true;entries=freshEntries();preferences=defaultPreferences();source='live';listings=[];}
const effectiveEntries=()=>entries.map(entry=>resolveEntry(entry,preferences));
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,4200);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({entries,preferences,source,listings:source==='import'?listings:[]}));}catch{toast(t('storage.unavailable'));}}
function setStatus(key,params={}){
 statusMessage={key,params};$('#search-status').textContent=t(key,params.error?{...params,error:localizeError(params.error)}:params);
 $('#search-progress-label').textContent=t(key==='search.progress'?'search.requestProgress':'search.loadingLabel',params);
 if(key==='search.progress'){$('#search-progress').max=params.total;$('#search-progress').value=params.done;}
 else $('#search-progress').removeAttribute('value');
}
function invalidateResults(){lastSearchPages=0;if(source==='live'){listings=[];setStatus('search.changed');}}
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
function entrySizeLabels(entry){return entry.sizeIds?.length?[...new Set(entry.sizeIds.map(id=>filterOptions.sizes.find(o=>o.id===id)).filter(Boolean).map(sizeLabel))]:entry.sizes??[];}
const label=(type,id)=>optionLabel(type,filterOptions[type==='category'?'categories':type==='condition'?'conditions':'departments'].find(o=>o.id===id));
const departmentName=id=>label('department',id);
function sellerName(result){return result.sellerName===`Seller #${result.sellerId}`?t('results.seller',{id:result.sellerId}):result.sellerName;}
function conditionLabel(value){const option=filterOptions.conditions.find(o=>o.label.toLowerCase()===value?.toLowerCase());return option?optionLabel('condition',option):value;}
function minimumCondition(ids){return Object.keys(conditionSets).find(key=>JSON.stringify([...conditionSets[key]].sort())===JSON.stringify([...ids].sort()))??'';}
function conditionSummary(ids){
 const key=minimumCondition(ids),message=({6:'preferences.tags',1:'preferences.new',2:'preferences.veryGood',3:'preferences.good',4:'preferences.satisfactory'})[key];
 return message?t(message):ids.map(id=>label('condition',id)).join(', ');
}
function preferenceSummary(){
 const parts=[];
 if(preferences.departmentId)parts.push(departmentName(preferences.departmentId));
 if(preferences.sizeIds.length)parts.push(entrySizeLabels(preferences).join(', '));
 const condition=minimumCondition(preferences.conditionIds);
 if(condition)parts.push(t(({6:'preferences.tags',1:'preferences.new',2:'preferences.veryGood',3:'preferences.good',4:'preferences.satisfactory'})[condition]));
 return parts.length?parts.join(' · '):t('preferences.unset');
}
function render(){
 const resolved=effectiveEntries(),ranked=rankSellers(resolved,listings),complete=ranked.filter(r=>r.covered===entries.length);
 $('#list-count').textContent=t(entries.length===1?'items.one':'items.count',{count:entries.length});
 for(const id of ['import-button','demo-button','clear-button'])$('#'+id).disabled=searching;
 $('#add-button').disabled=searching||entries.length>=10;$('#preferences-button').disabled=searching;
 $('#preferences-button').textContent=t(preferences.departmentId||preferences.conditionIds.length?'preferences.change':'preferences.edit');
 $('#preferences-summary').textContent=preferenceSummary();
 $('#live-search').textContent=t(searching?'search.cancel':'search.button');$('#search-pages').disabled=searching;
 $('#entries').innerHTML=resolved.map(e=>`<article class="entry"><div class="entry-head"><span class="entry-icon">${art(kindFor(e.keyword))}</span><h3>${escape(e.keyword)}</h3><div class="entry-controls"><button class="small-button edit-entry" data-id="${escape(e.id)}" ${searching?'disabled':''} aria-label="${escape(t('items.edit',{item:e.keyword}))}">✎</button><button class="small-button remove-entry" data-id="${escape(e.id)}" ${searching?'disabled':''} aria-label="${escape(t('items.remove',{item:e.keyword}))}">×</button></div></div><p class="entry-info">${escape(entrySizeLabels(e).length?entrySizeLabels(e).join(', '):t('filters.anySize'))} · ${escape(e.maxPrice===null?t('filters.anyPrice'):t('filters.upTo',{price:money(e.maxPrice)}))}${e.brand?`<br>${escape(e.brand)}`:''}${e.departmentIds?.length?`<br>${e.departmentIds.map(id=>escape(departmentName(id))).join(', ')}`:''}${categoryIds(e).length?`<br>${escape(selectedCategoryText(categoryIds(e).map(id=>filterOptions.categories.find(c=>c.id===id))))}`:''}${e.conditionIds?.length?` · ${escape(conditionSummary(e.conditionIds))}`:''}${source==='live'&&listings.length?`<br><strong>${escape(t('items.matchingListings',{count:listings.filter(listing=>matches(e,listing)).length}))}</strong>`:''}</p></article>`).join('')||`<p class="muted">${t('items.start')}</p>`;
 $('#source-label').innerHTML=source==='live'?`<strong>${t('source.live')}</strong> · ${t(listings.length?'source.fetched':'source.ready',{count:listings.length})}`:source==='empty'?`<strong>${t('source.empty')}</strong> · ${t('source.importHelp')}`:`<strong>${t('source.import')}</strong> · ${t('source.importCount',{count:listings.length})}`;
 $('#multi-count').textContent=ranked.filter(r=>r.covered>=2).length;$('#all-count').textContent=ranked.length;$('#full-count').textContent=complete.length;
 for(const [id,value] of [['all-filter','all'],['multi-filter','multi'],['full-filter','full']]){$('#'+id).classList.toggle('active',filter===value);$('#'+id).setAttribute('aria-pressed',String(filter===value));}
 const more=lastSearchPages?nextSearchPages(lastSearchPages,entries.length):null;
 $('#search-more-row').hidden=more===null;$('#search-more').disabled=searching;
 $('#search-more-hint').textContent=t('search.moreHint');
 let visible=filter==='full'?complete:filter==='multi'?ranked.filter(r=>r.covered>=2):[...ranked];
 if($('#sort').value==='price')visible=[...visible].sort((a,b)=>a.subtotal-b.subtotal||b.covered-a.covered||a.sellerId.localeCompare(b.sellerId));
 $('#results-summary').textContent=t(entries.length?'results.summary':'results.first',{count:ranked.length,complete:complete.length});
 $('#results').classList.toggle('has-single-matches',visible.some(result=>result.covered===1));
 $('#results').classList.toggle('bundles-only',visible.length>0&&visible.every(result=>result.covered>1));
 bestSellerId=ranked[0]?.sellerId??null;
 resultPage=resultWindow.update(visible,[filter,$('#sort').value,entries,listings,preferences,source]);updateResultControls();
 if(!visible.length){const kind=!entries.length?'list':!listings.length?'ready':filter==='multi'?'multi':filter==='full'?'full':'none';$('#results').innerHTML=`<div class="empty"><span class="empty-symbol" aria-hidden="true">⌁</span><h3>${t(`empty.${kind}Title`)}</h3><p>${t(`empty.${kind}Body`,{count:ranked.length})}</p>${filter!=='all'&&listings.length?`<button class="secondary-button" id="empty-all">${t('empty.all')}</button>`:''}</div>`;return;}
 $('#results').innerHTML=resultPage.items.map(renderSellerCard).join('');
}
function renderSellerCard(result){
 const best=result.sellerId===bestSellerId&&filter!=='full'&&$('#sort').value==='coverage';
  const matched=result.selected.map(({entryIndex})=>entries[entryIndex].keyword).join(' + ');
  return `<article class="seller-card${result.covered===1?' single-match':' bundle-card'}${best?' best':''}">
   <div class="items-grid">${result.selected.map(({listing,entryIndex})=>renderProduct(listing,{keyword:entries[entryIndex].keyword,live:source==='live',money,conditionLabel,unknownSize:t('results.unknownSize'),viewLabel:t('results.vinted'),art})).join('')}</div>
   <div class="bundle-heading"><div><h3>${escape(t('results.matches',{items:matched}))}</h3><p class="bundle-price">${escape(t('results.total',{price:money(result.subtotal)}))}</p></div><span class="coverage${result.covered===entries.length?' complete':''}">${result.covered===entries.length?'✓ ':''}${t('results.of',{count:result.covered,total:entries.length})}</span></div>
   ${best&&result.covered>1?`<div class="best-ribbon"><span aria-hidden="true">✳</span> ${t('results.best')}</div>`:''}
   <div class="seller-bottom"><span class="seller-name">${escape(sellerName(result))}</span><button class="bundle-toggle" data-seller="${escape(result.sellerId)}" aria-expanded="false">${t('results.details')} <span aria-hidden="true">⌄</span></button></div>
   <div class="bundle-detail" hidden><strong>${t(source==='live'?'results.liveDetail':'results.importDetail')}</strong><p>${t('results.loaded',{count:result.listingCount})}</p>${result.missing.length?`<p>${escape(t('results.missing',{items:result.missing.map(e=>e.keyword).join(', ')}))}</p>`:''}<ul>${result.selected.map(({entryIndex,listing})=>`<li>${escape(entries[entryIndex].keyword)} → ${escape(listing.title)} (${money(listing.price)})</li>`).join('')}</ul><p>${t('results.purchase')} ${t('results.excluded')}</p></div>
  </article>`;
}
function updateResultControls(){
 $('#results-tools').hidden=!searching&&!resultPage.total;
 $('#results-search-progress').hidden=!searching;
 $('#results-progress').hidden=!resultPage.total;
 $('#results-shown').textContent=t('results.shown',resultPage);
 $('#results-progress-bar').max=Math.max(1,resultPage.total);$('#results-progress-bar').value=resultPage.shown;
 $('#load-results').hidden=!resultPage.total;
 $('#results-page-summary').textContent=t(resultPage.hasMore?'results.shown':'results.allShown',resultPage);
 $('#load-more-results').hidden=!resultPage.hasMore;$('#load-more-results').disabled=searching;
 $('#load-more-results').textContent=t('results.loadMore',{count:Math.min(RESULT_BATCH_SIZE,resultPage.total-resultPage.shown)});
}

function checkOptions(target,type,checked=[]){
 const options=type==='department'?filterOptions.departments:filterOptions.conditions;
 $(target).innerHTML=options.map(o=>`<label class="check-option"><input type="checkbox" value="${o.id}" ${checked.includes(o.id)?'checked':''}>${escape(optionLabel(type,o))}</label>`).join('');
}
const checkedValues=selector=>[...document.querySelectorAll(`${selector} input:checked`)].map(n=>Number(n.value));
function itemDraft(){return {id:editId??'draft',keyword:$('#keyword').value,sizes:legacySizes,sizeIds:[...selectedSizeIds],sizeGroups:selectedSizeIds.size?selectedSizeGroups:[],departmentIds:checkedValues('#department-options'),conditionIds:checkedValues('#condition-options'),categoryIds:[...selectedCategoryIds],useListPreferences:$('#use-preferences').checked,useListSizes};}
const draftResolved=()=>resolveEntry(itemDraft(),preferences);
const sizeChoices=()=>categorySizes(itemDraft(),preferences);
function updateSizeSummary(){
 const raw=itemDraft(),resolved=resolveEntry(raw,preferences),labels=entrySizeLabels(resolved);
 $('#size-summary').textContent=labels.length?t(!raw.sizeIds.length&&!raw.sizes.length?'preferences.inheritedSize':'filters.sizes',{sizes:labels.join(', ')}):t('filters.anySize');
 if(raw.sizeIds.length||raw.sizes.length)$('#size-summary').textContent=labels.join(', ');
 const choices=sizeChoices(),socks=choices.length&&choices.every(s=>s.group.startsWith('Socken für'));
 $('#item-size-hint').textContent=!choices.length?t(raw.categoryIds.length?'filters.noCategorySizes':'filters.categoryFirst'):socks?t(choices.every(s=>s.departmentId===1193)?'filters.kidsSocksHint':'filters.adultSocksHint'):'';
 $('#size-picker').hidden=!choices.length;
}
function renderSizeChoices(){
 const choices=sizeChoices(),groups=[...new Set(choices.map(s=>`${s.departmentId}:${s.group}`))],current=draftResolved().sizeIds;
 $('#size-options').innerHTML=groups.map(group=>{
  const options=choices.filter(s=>`${s.departmentId}:${s.group}`===group),first=options[0];
  return `<fieldset class="size-section"><legend>${escape(departmentName(first.departmentId))} · ${escape(optionLabel('group',first.group))}</legend><div class="size-options">${options.map(o=>`<label class="check-option"><input type="checkbox" value="${o.id}" ${current.includes(o.id)?'checked':''}>${escape(sizeLabel(o))}</label>`).join('')}</div></fieldset>`;
 }).join('');
 $('#clear-sizes').disabled=!current.length&&!legacySizes.length;
 $('#use-list-sizes').hidden=useListSizes||!resolveEntry({...itemDraft(),sizeIds:[],sizes:[],sizeGroups:[],useListSizes:true},preferences).sizeIds.length;
 updateSizeSummary();
}
function renderCategories(){
 const raw=itemDraft(),departments=raw.departmentIds.length?raw.departmentIds:raw.useListPreferences&&preferences.departmentId?[preferences.departmentId]:[];
 const choices=searchCategories($('#category-search').value,departments);
 const selected=filterOptions.categories.filter(o=>selectedCategoryIds.has(o.id));
 // Keep selected categories visible even when the query or department changes.
 const options=[...selected,...choices.filter(o=>!selectedCategoryIds.has(o.id))];
 $('#category-options').innerHTML=options.map(c=>`<label class="check-option category-option"><input type="checkbox" value="${c.id}" ${selectedCategoryIds.has(c.id)?'checked':''}><span>${escape(optionLabel('category',c))}</span></label>`).join('');
 $('#category-summary').textContent=selected.length?selectedCategoryText(selected):t('filters.anyCategory');
 $('#category-count').textContent=t(choices.length?'filters.categoryCount':'filters.noCategories',{count:choices.length});
 $('#clear-categories').disabled=!selected.length;
}

function updateFilterMenus(reconcile=false){
 renderCategories();
 $('#department-default-hint').textContent=t($('#use-preferences').checked&&preferences.departmentId?'filters.emptyDefault':'filters.anyUnchecked');
 $('#condition-default-hint').textContent=t($('#use-preferences').checked&&preferences.conditionIds.length?'filters.emptyDefault':'filters.anyUnchecked');
 if(reconcile){
  const choices=sizeChoices(),kept=compatibleSizeIds([...selectedSizeIds],choices);
  if(kept.length!==selectedSizeIds.size||legacySizes.length){$('#item-size-notice').textContent=t('filters.sizeTypeChanged');$('#item-size-notice').hidden=false;}
  selectedSizeIds=new Set(kept);legacySizes=[];
  selectedSizeGroups=[...new Set(choices.filter(s=>selectedSizeIds.has(s.id)).map(s=>`${s.departmentId}:${s.group}`))];
 }
 renderSizeChoices();
}
checkOptions('#department-options','department');checkOptions('#condition-options','condition');
$('#brand-options').innerHTML=filterOptions.brands.map(o=>`<option value="${escape(o.label)}"></option>`).join('');
$('#department-options').addEventListener('change',()=>updateFilterMenus(true));
$('#use-preferences').addEventListener('change',()=>updateFilterMenus());
$('#keyword').addEventListener('input',()=>updateFilterMenus());
$('#keyword').addEventListener('blur',()=>{if(!selectedCategoryIds.size)updateFilterMenus(true);});
$('#category-search').addEventListener('input',renderCategories);
$('#category-options').addEventListener('change',event=>{const id=Number(event.target.value);event.target.checked?selectedCategoryIds.add(id):selectedCategoryIds.delete(id);updateFilterMenus(true);});
$('#clear-categories').addEventListener('click',()=>{selectedCategoryIds.clear();updateFilterMenus(true);});
$('#size-options').addEventListener('change',event=>{
 $('#item-size-notice').hidden=true;selectedSizeIds=new Set(draftResolved().sizeIds);useListSizes=false;legacySizes=[];const id=Number(event.target.value);event.target.checked?selectedSizeIds.add(id):selectedSizeIds.delete(id);
 selectedSizeGroups=[...new Set(sizeChoices().filter(s=>selectedSizeIds.has(s.id)).map(s=>`${s.departmentId}:${s.group}`))];
 renderSizeChoices();
});
$('#clear-sizes').addEventListener('click',()=>{useListSizes=false;selectedSizeIds.clear();selectedSizeGroups=[];legacySizes=[];updateFilterMenus();});
$('#use-list-sizes').addEventListener('click',()=>{useListSizes=true;selectedSizeIds.clear();selectedSizeGroups=[];legacySizes=[];updateFilterMenus();});
function openItem(id=null){
 if(searching)return;editId=id;$('#item-form').reset();$('#size-picker').open=false;$('#more-filters').open=false;$('#category-picker').open=false;$('#item-error').textContent='';$('#item-size-notice').hidden=true;$('#item-dialog-title').textContent=t(id?'editor.edit':'editor.add');
 const entry=entries.find(e=>e.id===id);useListSizes=entry?.useListSizes!==false;selectedSizeIds=new Set(entry?.sizeIds??[]);selectedSizeGroups=entry?sizeGroups(entry):[];legacySizes=selectedSizeIds.size?[]:entry?.sizes??[];selectedCategoryIds=new Set(entry?categoryIds(entry):[]);
 if(entry){$('#keyword').value=entry.keyword;$('#max-price').value=entry.maxPrice??'';$('#brand').value=entry.brand;}
 $('#use-preferences').checked=entry?.useListPreferences!==false;
 checkOptions('#department-options','department',entry?.departmentIds);checkOptions('#condition-options','condition',entry?.conditionIds);
 updateFilterMenus();
 $('#item-dialog').showModal();
}
$('#add-button').addEventListener('click',()=>openItem());
$('#entries').addEventListener('click',event=>{
 const edit=event.target.closest('.edit-entry'),remove=event.target.closest('.remove-entry');if(edit)openItem(edit.dataset.id);
 if(remove&&!searching){entries=entries.filter(e=>e.id!==remove.dataset.id);invalidateResults();persist();render();toast(t('items.removed'));}
});
$('#item-form').addEventListener('submit',event=>{
 event.preventDefault();if(searching)return;const keyword=$('#keyword').value.trim();
 if(!keyword){$('#item-error').textContent=t('editor.required');return;}
 if(!editId&&entries.length>=10){$('#item-error').textContent=t('editor.limit');return;}
 const entry={...itemDraft(),id:editId??crypto.randomUUID(),keyword,sizes:selectedSizeIds.size?[...new Set([...selectedSizeIds].map(id=>filterOptions.sizes.find(o=>o.id===id).label))]:legacySizes,maxPrice:$('#max-price').value===''?null:Number($('#max-price').value),brand:$('#brand').value.trim(),brandId:filterOptions.brands.find(o=>o.label.toLowerCase()===$('#brand').value.trim().toLowerCase())?.id??null,category:''};
 try{validateFilters(entry);validateFilters(resolveEntry(entry,preferences));}catch(error){$('#item-error').textContent=localizeError(error.message);return;}
 entries=editId?entries.map(e=>e.id===editId?entry:e):[...entries,entry];invalidateResults();persist();render();$('#item-dialog').close();toast(t('items.saved'));
});
function renderPreferenceChoices(){
 const department=Number($('#preference-department').value)||null,choices=preferenceSizes(department);
 $('#preference-sizes').innerHTML=choices.map(o=>`<label class="check-option"><input type="checkbox" value="${o.id}" ${preferenceSizeIds.has(o.id)?'checked':''}>${escape(sizeLabel(o))}</label>`).join('')||`<p class="muted">${t('preferences.chooseDepartment')}</p>`;
}
function renderPreferenceDepartments(selected=preferences.departmentId){
 $('#preference-department').innerHTML=`<option value="">${t('preferences.anyDepartment')}</option>`+filterOptions.departments.map(o=>`<option value="${o.id}">${escape(optionLabel('department',o))}</option>`).join('');$('#preference-department').value=selected??'';
}
$('#preferences-button').addEventListener('click',()=>{
 if(searching)return;preferenceSizeIds=new Set(preferences.sizeIds);renderPreferenceDepartments();renderPreferenceChoices();$('#preference-condition').value=minimumCondition(preferences.conditionIds);$('#preferences-error').textContent='';$('#preferences-dialog').showModal();
});
$('#preference-department').addEventListener('change',()=>{preferenceSizeIds.clear();renderPreferenceChoices();});
$('#preference-sizes').addEventListener('change',event=>{const id=Number(event.target.value);event.target.checked?preferenceSizeIds.add(id):preferenceSizeIds.delete(id);});
$('#preferences-form').addEventListener('submit',event=>{
 event.preventDefault();if(searching)return;
 const next={departmentId:Number($('#preference-department').value)||null,sizeIds:[...preferenceSizeIds],conditionIds:[...conditionSets[$('#preference-condition').value]]};
 try{validatePreferences(next);entries.map(e=>resolveEntry(e,next)).forEach(validateFilters);}catch(error){$('#preferences-error').textContent=localizeError(error.message);return;}
 preferences=next;invalidateResults();persist();render();$('#preferences-dialog').close();toast(t('preferences.saved'));
});
for(const button of document.querySelectorAll('.close-dialog'))button.addEventListener('click',()=>button.closest('dialog').close());
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
$('#all-filter').addEventListener('click',()=>{filter='all';render();});$('#multi-filter').addEventListener('click',()=>{filter='multi';render();});$('#full-filter').addEventListener('click',()=>{filter='full';render();});$('#sort').addEventListener('change',render);
$('#results').addEventListener('click',event=>{
 if(event.target.closest('#empty-all')){filter='all';render();}
 const button=event.target.closest('.bundle-toggle');if(button){const detail=button.closest('.seller-card').querySelector('.bundle-detail');detail.hidden=!detail.hidden;button.setAttribute('aria-expanded',String(!detail.hidden));button.innerHTML=`${t(detail.hidden?'results.details':'results.hide')} <span aria-hidden="true">${detail.hidden?'⌄':'⌃'}</span>`;}
});
$('#load-more-results').addEventListener('click',()=>{
 if(searching||!resultPage.hasMore)return;
 const shown=resultPage.shown;resultPage=resultWindow.more();
 $('#results').insertAdjacentHTML('beforeend',resultPage.items.slice(shown).map(renderSellerCard).join(''));
 updateResultControls();
 const next=$('#results').querySelectorAll('.seller-card')[shown];
 if(next){next.tabIndex=-1;next.focus({preventScroll:true});}
});
let scrollFrame=false;
function updateBackToTop(){$('#back-to-top').hidden=window.scrollY<600;}
window.addEventListener('scroll',()=>{if(scrollFrame)return;scrollFrame=true;requestAnimationFrame(()=>{updateBackToTop();scrollFrame=false;});},{passive:true});
$('#back-to-top').addEventListener('click',()=>{
 window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 $('.logo').focus({preventScroll:true});
});
updateBackToTop();
$('#about-button').addEventListener('click',()=>$('#about-dialog').showModal());
$('#import-button').addEventListener('click',()=>{if(searching)return;$('#import-error').textContent='';$('#import-file').value='';$('#import-dialog').showModal();});
const example=[{id:'your-listing-id',sellerId:'your-seller-id',sellerName:'seller-name',title:'Wool scarf',size:'One size',price:8,currency:'EUR',brand:'',category:'accessories',condition:'Very good'}];
$('#schema-example').textContent=JSON.stringify(example,null,2);
$('#download-example').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(example,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='gather-listings-example.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#import-file').addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;$('#import-error').textContent='';
 try{if(file.size>1024*1024)throw new Error(t('import.large'));let parsed;try{parsed=JSON.parse(await file.text());}catch{throw new Error(t('import.invalid'));}listings=validateListings(parsed);source='import';lastSearchPages=0;filter='all';setStatus('import.success',{count:listings.length});persist();render();$('#import-dialog').close();toast(t('import.success',{count:listings.length}));}catch(error){$('#import-error').textContent=localizeError(error.message);}
});
$('#demo-button').addEventListener('click',()=>{if(searching)return;entries=freshEntries();listings=[];lastSearchPages=0;source='live';setStatus('items.winterLoaded');filter='all';$('#sort').value='coverage';persist();render();toast(t('items.winterToast'));});
$('#clear-button').addEventListener('click',()=>{if(searching)return;entries=[];listings=[];preferences=defaultPreferences();lastSearchPages=0;source='empty';filter='all';statusMessage=null;$('#search-status').textContent='';try{localStorage.removeItem(KEY);}catch{}render();toast(t('items.cleared'));});
async function runSearch(pages){
 if(searching){searchController.abort();return;}
 if(!entries.length){toast(t('items.first'));return;}
 if(!pages||pages*entries.length>30){toast(t('search.limit'));return;}
 const requested=effectiveEntries(),previous={listings,source};
 searching=true;searchController=new AbortController();filter=entries.length>=2?'multi':'all';render();$('#live-search').classList.add('cancel');setStatus('search.contact');let finished=false;
 try{
  const response=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries:requested,pages}),signal:searchController.signal});
  if(!response.ok)throw new Error(await response.text());
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
  while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let index;
   while((index=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+1);if(!line)continue;const event=JSON.parse(line);
    if(event.type==='progress')setStatus('search.progress',{item:event.keyword,term:event.searchTerm??event.keyword,page:event.page,count:event.listingCount,done:event.completed,total:event.total});
    if(event.type==='error')throw new Error(event.message);
    if(event.type==='result'){listings=event.listings;source='live';lastSearchPages=pages;finished=true;persist();render();const bundles=rankSellers(requested,listings).filter(r=>r.covered>=2).length;setStatus('search.done',{count:listings.length,pages:event.pagesFetched,bundles});}
   }
  }
  if(!finished)throw new Error(t('search.connection'));
 }catch(error){
  if(!finished){listings=previous.listings;source=previous.source;}
  setStatus(error.name==='AbortError'?(listings.length?'search.cancelledKept':'search.cancelled'):(listings.length?'search.failedKept':'search.failed'),{error:error.message});
 }finally{searching=false;$('#live-search').classList.remove('cancel');render();}
}
$('#live-search').addEventListener('click',()=>runSearch(searchPages($('#search-pages').value,entries.length)));
$('#search-more').addEventListener('click',()=>{const pages=nextSearchPages(lastSearchPages,entries.length);if(pages)runSearch(pages);else toast(t('search.moreLimit'));});
$('#language-switch').addEventListener('change',event=>{
 const expanded=[...document.querySelectorAll('.bundle-toggle[aria-expanded="true"]')].map(n=>n.dataset.seller),departments=checkedValues('#department-options'),conditions=checkedValues('#condition-options');
 setLanguage(event.target.value);translateDocument();checkOptions('#department-options','department',departments);checkOptions('#condition-options','condition',conditions);updateFilterMenus();$('#item-dialog-title').textContent=t(editId?'editor.edit':'editor.add');
 renderPreferenceDepartments(Number($('#preference-department').value)||null);renderPreferenceChoices();
 if(statusMessage)setStatus(statusMessage.key,statusMessage.params);$('#toast').hidden=true;render();
 for(const button of document.querySelectorAll('.bundle-toggle'))if(expanded.includes(button.dataset.seller)){button.setAttribute('aria-expanded','true');button.innerHTML=`${t('results.hide')} <span aria-hidden="true">⌃</span>`;button.closest('.seller-card').querySelector('.bundle-detail').hidden=false;}
});
renderPreferenceDepartments();translateDocument();render();if(storageProblem)toast(t('storage.invalid'));
