import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('public/src',{recursive:true});
await copyFile('index.html','public/index.html');
for(const name of ['app.js','style.css','matching.js','data.js','filters.js','filter-options.js']){
 await copyFile(`src/${name}`,`public/src/${name}`);
}
