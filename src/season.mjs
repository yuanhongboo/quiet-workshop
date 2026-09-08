export const SEASON = Object.freeze({
  id: 'street-shop',
  number: '01',
  title: '街角旧店',
  description: '九处小小的日常，等你慢慢收好。',
  story: '灯亮起来，唱片转起来。让街角这家小店，再一次开门。',
  openingId: 'opening',
  chapters: [
    {
      number: '一',
      title: '收拾日常',
      description: '从身边的小事开始。',
      levelIds: ['coffee', 'desk', 'tea'],
    },
    {
      number: '二',
      title: '让旧物复苏',
      description: '留一点耐心，让它重新好用。',
      levelIds: ['record', 'plant', 'clock'],
    },
    {
      number: '三',
      title: '重新开门',
      description: '把光和日常，重新请进店里。',
      levelIds: ['window', 'sign', 'opening'],
    },
  ],
  restorationIds: ['coffee', 'desk', 'tea', 'record', 'plant', 'clock', 'window', 'sign'],
});
export const seasonLevelIds = (season) => season.chapters.flatMap((chapter) => chapter.levelIds);

export const SEASON_TWO = Object.freeze({
  id: 'rain-garden', number: '02', title: '雨后花房', label: '第二季',
  description: '雨停了。让一座小小花房，重新生长。',
  story: '擦去雨痕，安放新芽。把光，一点点请进来。',
  overviewName: '花房', openingId: 'garden-awakening',
  chapters: [
    { number: '一', title: '雨停之后', description: '先把雨留下的痕迹，慢慢收好。', levelIds: ['garden-pot','garden-tools','garden-seeds'] },
    { number: '二', title: '重新生长', description: '木头、玻璃和水，都有了新的位置。', levelIds: ['garden-shelf','garden-glass','garden-fountain'] },
    { number: '三', title: '把光请进来', description: '留一盏灯，也留一个坐下来的地方。', levelIds: ['garden-lantern','garden-bench','garden-awakening'] },
  ],
  restorationIds: ['garden-pot','garden-tools','garden-seeds','garden-shelf','garden-glass','garden-fountain','garden-lantern','garden-bench'],
});
export const SEASONS = Object.freeze([SEASON, SEASON_TWO]);
export const getSeason = (id) => SEASONS.find((season) => season.id === id) || SEASON;
export const seasonForLevel = (level) => SEASONS.find((season) => seasonLevelIds(season).includes(typeof level === 'string' ? level : level?.id)) || SEASON;
export const seasonLabel = (season) => season.label || '第一季';
