import { stationArtwork } from '../src/station-art.mjs';
import { seasonLevelIds, seasonLabel } from '../src/season.mjs';
import { seasonArtwork } from '../src/season-art.mjs';
import { gardenArtwork } from '../src/garden-art.mjs';
import { postArtwork } from '../src/post-art.mjs';
const presentations={
  'mountain-station':{theme:'station',note:'山风轻轻，列车慢慢。',caption:'THE MOUNTAIN STOP',description:'修好一张长椅，留下一张车票。让山间的小站，等来熟悉的车轮声。'},
  'street-shop':{theme:'shop',note:'灯亮了，咖啡也热了。',caption:'THE CORNER SHOP',description:'从咖啡角到书桌，从唱片到一盏灯。让街角这家小店，再一次开门。'},
  'rain-garden':{theme:'garden',note:'雨停了，新绿住下。',caption:'AFTER THE RAIN',description:'翻看一只旧花盆，安放一株新苗。把风、流水和阳光，重新请进花房。'},
  'lighthouse-post':{theme:'post',note:'让好消息，找到远方。',caption:'LETTERS BY THE SEA',description:'擦亮一枚邮戳，修好一台旧机器。每一章，都让灯塔旁的邮局多一点生机。'},
};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function seasonCardsMarkup(seasons,releaseUrl='../dist/') {
  return seasons.map(season=>{
    const p=presentations[season.id]||{theme:'shop',note:season.description,caption:'A LITTLE RESET',description:season.story};
    const art=stationArtwork(season.openingId)||postArtwork(season.openingId)||gardenArtwork(season.openingId)||seasonArtwork(season.openingId)||'';
    const href=`${releaseUrl}?season=${encodeURIComponent(season.id)}`;
    return `<article class="season-card ${escape(p.theme)}" data-season="${escape(season.id)}"><div class="art-wrap"><span class="season-tag">SEASON ${escape(season.number)}</span><span class="card-annotation">${escape(p.note)}</span><div class="season-art">${art}</div><span class="art-caption">${escape(p.caption)}</span></div><div class="card-content"><div class="card-title"><div><p class="eyebrow">${escape(seasonLabel(season))}</p><h3>${escape(season.title)}</h3></div><span class="level-count">${seasonLevelIds(season).length}<small>个关卡</small></span></div><p class="season-description">${escape(p.description)}</p><div class="chapter-tags">${season.chapters.map(chapter=>`<span>${escape(chapter.title)}</span>`).join('')}</div><div class="card-progress"><span id="progress-${escape(season.id)}">等你慢慢收好</span><div class="progress-track" aria-hidden="true"><i id="fill-${escape(season.id)}"></i></div></div><a class="play-link" id="play-${escape(season.id)}" href="${escape(href)}">开始收拾 <span>↗</span></a></div></article>`;
  }).join('');
}
export const catalogSummary=seasons=>`${seasons.length} 个季节，${seasons.reduce((total,season)=>total+seasonLevelIds(season).length,0)} 处慢慢变好的风景。`;
