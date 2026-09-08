import { SEASONS, seasonLevelIds, seasonLabel, seasonForLevel } from '../src/season.mjs';
import { getLevel } from '../src/levels.mjs';
import { COLLECTION_KEY, collectionStatus, seasonProgress, selectedLevel } from '../src/progress.mjs';
import { seasonArtwork } from '../src/season-art.mjs';
import { gardenArtwork } from '../src/garden-art.mjs';
import { landingSelection } from './selection.mjs';

const localPreview = ['127.0.0.1','localhost','[::1]'].includes(location.hostname);
const releaseUrl = localPreview ? new URL('/dist/',location.origin).href : __GAME_RELEASE_URL__;
const fixedUrl = typeof __LANDING_URL__ === 'string' ? __LANDING_URL__ : new URL('./',location.href).href;
const $=id=>document.getElementById(id);
const storage=(()=>{try{return localStorage;}catch{return {getItem:()=>null};}})();
const href=(season,id)=>{const url=new URL(releaseUrl);url.searchParams.set('season',season.id);if(id)url.searchParams.set('level',id);return url.href;};
$('art-shop').innerHTML=seasonArtwork('opening');
$('art-garden').innerHTML=gardenArtwork('garden-awakening');

function refresh() {
  $('return-heading').textContent='今天，想收拾哪里？';
  $('return-detail').textContent='两个季节，十八处慢慢变好的风景。';
  $('resume-link').href='#seasons';
  $('resume-link').innerHTML='选个喜欢的地方 <span>↓</span>';
  for(const season of SEASONS){
    const rows=collectionStatus(storage,season),progress=seasonProgress(storage,season);
    const chosen=landingSelection(season,rows,selectedLevel(storage).id);
    const link=$('play-'+season.id);
    if(!link)continue;
    link.href=href(season,chosen.id);
    link.innerHTML=`${chosen.label} <span>↗</span>`;
    link.setAttribute('aria-label',`${season.title}，${chosen.label}`);
    const count=progress.completedIds.size,total=seasonLevelIds(season).length;
    $('progress-'+season.id).textContent=count?`${count} / ${total} 处已焕新`:chosen.started?'接着上次，慢慢收好':'等你慢慢收好';
    $('fill-'+season.id).style.width=`${count/total*100}%`;
  }
  let selected=null;
  try{const raw=JSON.parse(storage.getItem(COLLECTION_KEY));if(raw?.selected&&getLevel(raw.selected).id===raw.selected)selected=getLevel(raw.selected);}catch{}
  if(!selected)return;
  const season=seasonForLevel(selected),row=collectionStatus(storage,season).find(row=>row.level.id===selected.id);
  if(!row || (!row.started&&!row.completed&&!row.restored))return;
  $('return-heading').textContent='你的进度，还留在这里。';
  $('return-detail').textContent=`${seasonLabel(season)} · ${season.title} / ${selected.name}`;
  $('resume-link').href=href(season,selected.id);
  $('resume-link').innerHTML=`${row.completed?'再看看上次的成果':'继续上次收拾'} <span>↗</span>`;
}
refresh();
window.addEventListener('pageshow',refresh);
window.addEventListener('storage',refresh);
$('fixed-link').href=fixedUrl;
$('copy-link').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(fixedUrl);$('copy-status').textContent='入口链接已复制';}
  catch{$('copy-status').textContent='长按左侧链接，即可复制或收藏';}
});
