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
export const SEASON_FOUR = Object.freeze({
  id: 'mountain-station', number: '04', label: '第四季', title: '山间小站',
  description: '山风停在站台，等一列慢慢回来的小火车。',
  story: '擦亮站名，收好行李，让车轮轻轻转动。把一段旅途，安放在山间。',
  overviewName: '小站', openingId: 'station-opening', inspection: true, chapterReturns: true, fitIntroTitle: true,
  overviewTitle: '让旅途，<br/>有个停靠的地方。',
  openingLabel: '迎接小火车', reopeningLabel: '重温山间归来',
  readyHint: '小火车停稳了，收好这一次归来。', restoredHint: '迎接小火车回来',
  chapters: [
    {id:'arrival',number:'一',title:'山风进站',description:'先留下一个可以坐下来的地方。',levelIds:['station-sign','station-bench','station-ticket'],returnTitle:'名字亮了，<br/>座位也留好了。',returnDescription:'站牌重新指向山谷，长椅恢复了温润的木色，第一张车票也准备好了。山间小站，开始有了等候的样子。'},
    {id:'journeys',number:'二',title:'旅途有序',description:'把方向与行李，慢慢收好。',levelIds:['station-board','station-luggage','station-signal'],returnTitle:'行李收好，<br/>方向也清楚了。',returnDescription:'时刻牌翻到了下一程，行李放得稳稳当当，站台信号也亮了。你修好的六件东西，正在等同一趟归来。'},
    {id:'homecoming',number:'三',title:'等列车回来',description:'让熟悉的车轮，再转一程。',levelIds:['station-track','station-train','station-opening']},
  ],
  restorationIds:['station-sign','station-bench','station-ticket','station-board','station-luggage','station-signal','station-track','station-train'],
});
export const SEASONS = Object.freeze([SEASON, SEASON_TWO, SEASON_THREE, SEASON_FOUR]);
export const getSeason = (id) => SEASONS.find((season) => season.id === id) || SEASON;
export const seasonForLevel = (level) => SEASONS.find((season) => seasonLevelIds(season).includes(typeof level === 'string' ? level : level?.id)) || SEASON;
export const seasonLabel = (season) => season.label || '第一季';
