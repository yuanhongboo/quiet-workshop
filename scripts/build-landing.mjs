import { SEASONS } from '../src/season.mjs';
import { seasonCardsMarkup } from '../landing/cards.mjs';
import { build } from 'vite';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const catalog=JSON.parse(await readFile(path.join(root,'config/catalog.json')));
const args=process.argv.slice(2), hostingIndex=args.indexOf('--hosting-receipt');
const hostingPath=hostingIndex>=0?path.resolve(args[hostingIndex+1]):path.join(root,'config/hosting.json');
const hosting=JSON.parse(await readFile(hostingPath));
const {version}=JSON.parse(await readFile(path.join(root,'package.json')));
if(catalog.release!==`${catalog.landingPrefix}/v${version}`)throw new Error('Catalog must target the current game version');
const releaseUrl=new URL(catalog.release+'/',hosting.url).href;
const landingUrl=new URL(catalog.landingPrefix+'/',hosting.url).href;
await build({plugins:[{name:'landing-links',transformIndexHtml(html){return html.replace('<!-- SEASON_CARDS -->',seasonCardsMarkup(SEASONS,releaseUrl)).replaceAll('../dist/?season=',releaseUrl+'?season=').replace('</head>',`<link rel="canonical" href="${landingUrl}" /></head>`);}}],configFile:false,root:path.join(root,'landing'),base:'./',define:{__GAME_RELEASE_URL__:JSON.stringify(releaseUrl),__LANDING_URL__:JSON.stringify(landingUrl)},build:{outDir:path.join(root,'landing-dist'),emptyOutDir:true,target:'es2022'}});
const files={};
async function visit(dir,rel=''){for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const name=path.posix.join(rel,entry.name),absolute=path.join(dir,entry.name);if(entry.isDirectory())await visit(absolute,name);else{const bytes=await readFile(absolute);files[name]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}}}
await visit(path.join(root,'landing-dist'));
const manifest={version,release:catalog.release,files,bytes:Object.values(files).reduce((n,file)=>n+file.bytes,0)};
await mkdir(path.join(root,'qa'),{recursive:true});
await writeFile(path.join(root,'qa/landing-build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Landing: ${Object.keys(files).length} files, ${manifest.bytes} bytes → ${landingUrl}`);
