import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('public/src',{recursive:true});
await copyFile('index.html','public/index.html');
for(const name of ['app.js','product-card.js','result-window.js','style.css','matching.js','data.js','filters.js','filter-options.js','messages.js','i18n.js','filter-translations.js','search-terms.js','workflow.js']){
 await copyFile(`src/${name}`,`public/src/${name}`);
}
