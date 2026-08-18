/**
 * 小六壬引擎 — 六壬时课
 * 基于《增补玉匣记·李淳风六壬时课》
 *
 * 六个宫位：大安 → 留连 → 速喜 → 赤口 → 小吉 → 空亡
 * 计算方法：从大安起，顺数月、日、时（或三数），得三传
 */

// ============ 六壬宫位定义 ============

var XLR_POSITIONS = [
  {
    name: '大安', element: '木', direction: '东方', deity: '青龙', hexagram: '六合',
    color: '#2d8659', nature: '安定、和平',
    verse: '大安事事昌，求谋在东方，失物去不远，宅舍保安康。\n行人身未动，病者主无妨，将军与马匹，仔细好推详。',
    summary: '事事安定，诸事昌隆'
  },
  {
    name: '留连', element: '水', direction: '南方', deity: '勾陈', hexagram: '腾蛇',
    color: '#4a6fa5', nature: '迟滞、纠缠',
    verse: '留连事难成，求谋日未明，官事凡有理，去者未回程。\n失物南方见，再有讨不和，令人愁更想，长短不光荣。',
    summary: '事难成就，迟滞未明'
  },
  {
    name: '速喜', element: '火', direction: '南方', deity: '朱雀', hexagram: '六合',
    color: '#c4623c', nature: '喜庆、迅速',
    verse: '速喜喜来临，求财向南方，失物午时觅，官事有福音。\n病者南方祭，须还马上来，家宅亲光见，官非有救来。',
    summary: '喜事来临，迅速吉利'
  },
  {
    name: '赤口', element: '金', direction: '西方', deity: '白虎', hexagram: '白虎',
    color: '#a02828', nature: '口舌、惊恐',
    verse: '赤口主口舌，凶祸不可为，求财勿信义，失物往南觅。\n行人身未动，病者主无妨，将军与马匹，仔细好推详。',
    summary: '口舌凶祸，事不可为'
  },
  {
    name: '小吉', element: '木', direction: '坤方', deity: '六合', hexagram: '六合',
    color: '#5a9b5a', nature: '和合、吉利',
    verse: '小吉最吉昌，路上好商量，阴人来报喜，失物在坤方。\n行人立便至，交关甚是强，凡事皆和合，病者祷上苍。',
    summary: '和合吉昌，凡事好商量'
  },
  {
    name: '空亡', element: '土', direction: '北方', deity: '玄武', hexagram: '玄武',
    color: '#6c6a80', nature: '落空、不吉',
    verse: '空亡事不详，求谋却未当，官事无气力，失物不回乡。\n行人寻不见，病者主不祥，凡事多不利，仔细好推详。',
    summary: '事多不祥，求谋未当'
  }
];

// ============ 时辰转换 ============

var ZHI_HOURS = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

function getShichenFromHour(hour) {
  var zi = (hour + 1) % 24;
  return Math.floor(zi / 2);
}

function getCurrentShichen() {
  var now = new Date();
  return getShichenFromHour(now.getHours());
}

// ============ 小六壬计算 ============

function calculateXiaoLiuRen(month, day, hour) {
  month = parseInt(month) || 1;
  day = parseInt(day) || 1;
  hour = parseInt(hour) || 1;

  while (month < 1) month += 6;
  while (day < 1) day += 6;
  while (hour < 1) hour += 6;

  var firstPos = (month - 1) % 6;
  var secondPos = (firstPos + day - 1) % 6;
  var thirdPos = (secondPos + hour - 1) % 6;

  return {
    inputs: { month: month, day: day, hour: hour },
    first: XLR_POSITIONS[firstPos],
    second: XLR_POSITIONS[secondPos],
    third: XLR_POSITIONS[thirdPos],
    firstIndex: firstPos,
    secondIndex: secondPos,
    thirdIndex: thirdPos
  };
}

function calculateFromDate(date) {
  var month = date.getMonth() + 1;
  var day = date.getDate();
  var shichenIdx = getShichenFromHour(date.getHours());
  var hour = shichenIdx + 1;
  return calculateXiaoLiuRen(month, day, hour);
}

function calculateFromThreeNumbers(n1, n2, n3) {
  return calculateXiaoLiuRen(n1, n2, n3);
}

// ============ 分类断辞 ============

var XLR_INTERPRETATIONS = {
  '测吉凶': {
    '大安': { result: '吉', detail: '稳稳的安心感！事情顺顺当当的，不用急，慢慢来就好啦～' },
    '留连': { result: '小阻', detail: '事情有点卡住了呢，别着急，给它一点时间。好事多磨嘛～' },
    '速喜': { result: '大吉', detail: '好消息要来啦！开心的事就在路上了，准备好迎接吧～' },
    '赤口': { result: '小凶', detail: '今天容易遇到小摩擦哦，别太在意别人的话。先避避风头，明天就好啦～' },
    '小吉': { result: '吉', detail: '和和美美的一天！凡事都好商量，多跟朋友聊聊天，事情就顺了～' },
    '空亡': { result: '平', detail: '今天能量有点低，不妨先放一放，休息一下。等你状态回来了再继续～' }
  },
  '寻物': {
    '大安': { result: '可寻', detail: '东西没走远，就在东边附近呢。别慌，慢慢找找就能找到～' },
    '留连': { result: '迟寻', detail: '东西一时半会儿找不到，不过别担心，过两天会有消息的～' },
    '速喜': { result: '可寻', detail: '往南边找找看！中午前后说不定就能发现它呢，快去～' },
    '赤口': { result: '难寻', detail: '可能被人捡走了，找回有点难度。别太纠结，旧的不去新的不来嘛～' },
    '小吉': { result: '可寻', detail: '往西南方向找找，会有朋友帮你看到线索的。好消息要来了～' },
    '空亡': { result: '难寻', detail: '东西可能真的找不回来了，心疼你，但也别太难过。放下也是一种智慧呀～' }
  },
  '测方位': {
    '大安': { result: '东方吉', detail: '往东边走准没错！那边安稳又顺当，放心大胆去～' },
    '留连': { result: '南方迟', detail: '南方的话会有点小波折，如果一定要去，多给自己留点时间～' },
    '速喜': { result: '南方喜', detail: '南边有好运气等着你！去那边办事会很顺利的，冲鸭～' },
    '赤口': { result: '西方慎', detail: '西边容易碰上小麻烦，不太建议往那边走。换个方向试试？' },
    '小吉': { result: '坤方吉', detail: '西南方向很适合你！一路顺遂，路上说不定还能遇到帮忙的人～' },
    '空亡': { result: '北方空', detail: '北方暂时没啥好运气，先别往那边跑了。等时机好些再说～' }
  },
  '测健康': {
    '大安': { result: '无妨', detail: '身体状态还不错！安心养着就好，很快就能元气满满啦～' },
    '留连': { result: '缠绵', detail: '恢复需要一点时间，别着急。好好休息，身体会慢慢好起来的～' },
    '速喜': { result: '渐愈', detail: '好消息！身体在好转了，保持好心态，很快就能恢复活力～' },
    '赤口': { result: '注意', detail: '身体在提醒你要多关注它了。建议去看看医生，早点处理早点安心～' },
    '小吉': { result: '渐安', detail: '情况在慢慢好转，保持好心情，多祈福，一切都会好起来的～' },
    '空亡': { result: '慎之', detail: '身体需要多关注了，别大意。认真检查一下，对自己好一点呀～' }
  },
  '测出行办事': {
    '大安': { result: '可行', detail: '放心出门吧！一路平安顺遂，出门遇贵人，稳稳的～' },
    '留连': { result: '迟行', detail: '出行可能有点不太顺，如果可以的话稍微延后一两天更好～' },
    '速喜': { result: '速行', detail: '趁现在赶紧出发！路上有好事等着你，越快越好～' },
    '赤口': { result: '不宜', detail: '今天出门容易碰上小麻烦，如果不是特别急，改天再走吧～' },
    '小吉': { result: '可行', detail: '出行很顺利！办事也顺，路上遇到的人都蛮好的，放心去～' },
    '空亡': { result: '不宜', detail: '今天出门容易扑空，事情办成的概率不大。先歇歇，改天再约～' }
  }
};

function getInterpretation(positionName, category) {
  var cat = XLR_INTERPRETATIONS[category];
  if (!cat) return { result: '—', detail: '暂无解读' };
  return cat[positionName] || { result: '—', detail: '暂无解读' };
}

function generateXLRNarrative(result, category) {
  var third = result.third;
  var first = result.first;
  var second = result.second;
  var interp = getInterpretation(third.name, category);

  return {
    category: category,
    resultName: third.name,
    resultElement: third.element,
    resultDirection: third.direction,
    resultDeity: third.deity,
    resultHexagram: third.hexagram,
    resultColor: third.color,
    verse: third.verse,
    summary: third.summary,
    interpretation: interp.detail,
    interpResult: interp.result,
    threeTransmissions: [
      { label: '初传月', position: first },
      { label: '中传日', position: second },
      { label: '末传时', position: third }
    ],
    inputs: result.inputs
  };
}
