import {safeListingUrl} from './data.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderProduct(listing,{keyword,live,money,conditionLabel,unknownSize,viewLabel,art}) {
 const url=safeListingUrl(listing.url);
 const link=(content,className)=>url?`<a class="${className}"${className==='product-photo-link'?` aria-label="${escape(listing.title)}"`:''} href="${escape(url)}" target="_blank" rel="noopener noreferrer">${content}</a>`:content;
 const photo=live&&listing.image?`<img src="${escape(listing.image)}" alt="${escape(listing.title)}" loading="lazy" referrerpolicy="no-referrer">`:art(listing.kind,listing.tone);
 return `<div class="product">
  <div class="product-art">${link(photo,'product-photo-link')}</div>
  <p class="item-match">✓ ${escape(keyword)}</p>
  <h4 class="product-title">${link(escape(listing.title),'product-title-link')}</h4>
  ${listing.brand&&listing.brand!==listing.title?`<p class="product-brand">${escape(listing.brand)}</p>`:''}
  <p class="product-detail">${escape(listing.size||unknownSize)}${listing.condition?` · ${escape(conditionLabel(listing.condition))}`:''}</p>
  <p class="product-price">${escape(money(listing.price))}</p>
  ${url?link(escape(viewLabel),'listing-link'):''}
 </div>`;
}
