export const SEASON = Object.freeze({
  id: 'street-shop',
  number: '01',
  title: '街角旧店',
  description: '九处小小的日常，等你慢慢收好。',
  story: '灯亮起来，唱片转起来。让街角这家小店，再一次开门。',
  openingId: 'opening', overviewName: '小店', overviewTitle: '一点点，<br/>恢复日常。', openingLabel: '准备开门', reopeningLabel: '重温小店开张', readyHint: '打开门，让日常重新开始。', restoredHint: '一起开门',
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
  overviewName: '花房', openingId: 'garden-awakening', inspection: true,
  overviewTitle: '让一座花房，<br/>慢慢苏醒。', openingLabel: '唤醒花房', reopeningLabel: '重温花房苏醒', readyHint: '让阳光，慢慢照进花房。', restoredHint: '让花房苏醒',
  chapters: [
    { number: '一', title: '雨停之后', description: '先把雨留下的痕迹，慢慢收好。', levelIds: ['garden-pot','garden-tools','garden-seeds'] },
    { number: '二', title: '重新生长', description: '木头、玻璃和水，都有了新的位置。', levelIds: ['garden-shelf','garden-glass','garden-fountain'] },
    { number: '三', title: '把光请进来', description: '留一盏灯，也留一个坐下来的地方。', levelIds: ['garden-lantern','garden-bench','garden-awakening'] },
  ],
  restorationIds: ['garden-pot','garden-tools','garden-seeds','garden-shelf','garden-glass','garden-fountain','garden-lantern','garden-bench'],
});
export const SEASON_THREE = Object.freeze({
  id: 'lighthouse-post', number: '03', label: '第三季', title: '海边来信',
  description: '灯塔旁的小邮局，等一封迟来的信。',
  story: '擦去海风留下的盐霜，修好手边的小机械。让一封信，重新找到远方。',
  overviewName: '邮局', openingId: 'post-opening', inspection: true, chapterReturns: true, fitIntroTitle: true,
  overviewTitle: '把好消息，<br/>慢慢寄出去。',
  openingLabel: '让邮局开门', reopeningLabel: '重温海边来信',
  readyHint: '点亮灯塔，让好消息找到方向。', restoredHint: '让邮局重新运转',
  chapters: [
    {id:'welcome',number:'一',title:'把门重新打开',description:'从邮筒到一枚小小的邮戳。',levelIds:['post-box','post-sorter','post-stamp'],returnTitle:'第一束光，<br/>落进了邮局。',returnDescription:'邮筒能收信，分信格有了秩序，邮戳也清晰了。你修好的前三件东西，已经一起回到门边。'},
    {id:'working',number:'二',title:'让邮局忙起来',description:'字迹、包裹和远处的声音。',levelIds:['post-typewriter','post-parcel','post-radio'],returnTitle:'桌上的小事，<br/>开始彼此呼应。',returnDescription:'打字机写好了寄语，包裹系紧了绳，电台收到清楚的信号。现在，邮局已经有了忙碌前的安静。'},
    {id:'journey',number:'三',title:'让信抵达远方',description:'沿着灯光，把心意送出去。',levelIds:['post-bicycle','post-beacon','post-opening']},
  ],
  restorationIds:['post-box','post-sorter','post-stamp','post-typewriter','post-parcel','post-radio','post-bicycle','post-beacon'],
});
export const SEASONS = Object.freeze([SEASON, SEASON_TWO, SEASON_THREE]);
export const getSeason = (id) => SEASONS.find((season) => season.id === id) || SEASON;
export const seasonForLevel = (level) => SEASONS.find((season) => seasonLevelIds(season).includes(typeof level === 'string' ? level : level?.id)) || SEASON;
export const seasonLabel = (season) => season.label || '第一季';
