import {messages} from './messages.js';
import {englishCategories} from './filter-translations.js';
export function chooseLanguage(saved,browser='de') {return ['de','en'].includes(saved)?saved:/^en\b/i.test(browser)?'en':'de';}
export function createTranslator(locale) {
 return (key,params={}) => (messages[locale]?.[key]??messages.en[key]??key).replace(/\{(\w+)\}/g,(_,name)=>String(params[name]??`{${name}}`));
}
let saved=null;try{if(typeof window!=='undefined')saved=window.localStorage?.getItem('gather.language.v1');}catch{}
export let language=chooseLanguage(saved,globalThis.navigator?.language);
export const t=(key,params)=>createTranslator(language)(key,params);
export function setLanguage(value){language=chooseLanguage(value);try{if(typeof window!=='undefined')window.localStorage?.setItem('gather.language.v1',language);}catch{}}
export function translateDocument(root=document){
 for(const node of root.querySelectorAll('[data-i18n]'))node.textContent=t(node.dataset.i18n);
 for(const attr of ['placeholder','aria-label'])for(const node of root.querySelectorAll(`[data-i18n-${attr}]`))node.setAttribute(attr,t(node.getAttribute(`data-i18n-${attr}`)));
 for(const node of root.querySelectorAll('[data-language]'))node.hidden=node.dataset.language!==language;
 document.documentElement.lang=language;document.title=t('page.title');
 document.querySelector('#language-switch').value=language;
}
const groups={
 'Kleidergrößen':'Clothing sizes','Hüte für Erwachsene':'Adult hats','BHs':'Bras','Schuhe':'Shoes','Handschuhe für Erwachsene':'Adult gloves','Ringe':'Rings','Gürtel für Damen':"Women’s belts",'Uhren':'Watches','Socken für Damen':"Women’s socks",'Größen Männer':"Clothing sizes",'Schuhe Männer':"Men’s shoes",'Hosen für Herren':"Men’s trousers",'Anzugjacken für Herren':"Men’s suit jackets",'Gürtel für Herren':"Men’s belts",'Socken für Herren':"Men’s socks",'Hemden für Herren':"Men’s shirts",'Baby- und Kindergrößen':'Baby & kids clothing (44–176)','Kindermützen':'Kids hats','Autositze für Babys':'Baby car seats','Alter des Babys':'Baby age','Kinderschuhgröße':'Kids shoes','Socken für Kinder':'Kids socks','Gürtel für Kinder':'Kids belts','Schwangerschaftsgürtel':'Maternity belts','Bettwäsche für Babys':'Baby bedding','Wickeltaschen':'Changing bags'
};
function sizeText(label,locale){
 if(locale==='de')return label.replace(/Preemies/g,'Frühchen').replace(/months/g,'Monate').replace(/years/g,'Jahre').replace('12 and older','12 Jahre und älter').replace('One size','Einheitsgröße');
 return label.replace('Frühchen, bis 44','Preemie, up to 44').replace('Neugeborenes','Newborn').replace('Bis zu 1 Monat','Up to 1 month').replace(/Monate[n]?/g,'months').replace(/Jahre[n]?/g,'years').replace('Einheitsgröße','One size').replace('Sonstige','Other').replace('Größenverstellbar','Adjustable').replace('Für jedes Alter','All ages').replace('Neugeborene','Newborn').replace(/^Ab /,'From ').replace(' und kleiner',' and smaller').replace('Kinderbett','Cot').replace(/^Bis /,'Up to ').replace(' & größer',' & larger');
}
export function optionLabel(type,option,locale=language){
 if(!option)return '';
 const label=typeof option==='string'?option:option.label;
 if(type==='group')return locale==='en'?groups[label]??label:label==='Baby- und Kindergrößen'?'Baby- & Kinderkleidung (44–176)':label;
 if(type==='department')return locale==='en'?({1904:'Women',5:'Men',1193:'Kids'})[option.id]??label:label;
 if(type==='category')return locale==='en'?englishCategories[option.id]??label:label;
 if(type==='condition')return locale==='en'?({6:'New with tags',1:'New without tags',2:'Very good',3:'Good',4:'Satisfactory'})[option.id]??label:label;
 if(type==='size'){
  if(option.departmentId===1193&&option.group==='Baby- und Kindergrößen'){
   const parts=label.split(' / ');
   if(parts.length===2&&/^\d+$/.test(parts[1]))return `${parts[1]} · ${sizeText(parts[0],locale)}`;
   if(label==='Frühchen, bis 44')return locale==='de'?'Bis 44 · Frühchen':'Up to 44 · Preemie';
  }
  return sizeText(label,locale);
 }
 return label;
}
export function localizeError(message){
 const record=/^Listing (\d+): (.*)$/.exec(message);if(record)return t('import.record',{index:record[1],reason:localizeError(record[2])});
 const length=/^(\w+) must be text between 1 and 250 characters\.$/.exec(message);if(length)return t('import.textLength',{field:length[1]});
 const text=/^(\w+) must be text\.$/.exec(message);if(text)return t('import.text',{field:text[1]});
 const key=Object.keys(messages.en).find(k=>messages.en[k]===message||messages.de[k]===message);
 if(key)return t(key);
 const http=/^Vinted returned HTTP (\d+)\./.exec(message);if(http)return t('error.http',{status:http[1]});
 if(/timeout|timed out/i.test(message))return t('error.timeout');
 return message;
}
