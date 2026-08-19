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
  var first = result.first;
  var second = result.second;
  var third = result.third;

  var interp1 = getInterpretation(first.name, category);
  var interp2 = getInterpretation(second.name, category);
  var interp3 = getInterpretation(third.name, category);

  var jiMap = { '大安': 2, '留连': -1, '速喜': 3, '赤口': -2, '小吉': 2, '空亡': -3 };
  var score1 = jiMap[first.name] || 0;
  var score2 = jiMap[second.name] || 0;
  var score3 = jiMap[third.name] || 0;
  var totalScore = score1 + score2 + score3;

  var trend = '';
  var hasTurn = false;
  var turnDesc = '';

  if (score1 > 0 && score3 < 0) {
    trend = '先吉后凶';
    hasTurn = true;
    turnDesc = '事情开头看着不错，但结局可能有变。别被一时的顺利冲昏头脑，后半段要格外小心，留好退路再往前走～';
  } else if (score1 < 0 && score3 > 0) {
    trend = '先凶后吉';
    hasTurn = true;
    turnDesc = '刚开始不太顺，别灰心，事情会慢慢好转的。坚持住，转机就在后面等着你，后半段会越来越好～';
  } else if (score1 > 0 && score3 > 0 && score2 < 0) {
    trend = '吉中受阻终吉';
    hasTurn = true;
    turnDesc = '整体是好的，但中间会有一段波折。稳住心态，别因为一时的不顺就放弃，挺过去就是柳暗花明～';
  } else if (score1 < 0 && score3 < 0 && score2 > 0) {
    trend = '凶中暂安终凶';
    hasTurn = true;
    turnDesc = '中间喘了口气，但整体走势不太理想。趁平稳的时候多做预防，别掉以轻心，后面可能还有考验～';
  } else if (totalScore >= 5) {
    trend = '三传皆吉';
    turnDesc = '从开头到结尾都很顺，难得的好卦象！抓住机会放手去做，各方面都会事半功倍～';
  } else if (totalScore <= -5) {
    trend = '三传皆凶';
    turnDesc = '整体走势偏弱，不太适合做重大决定。先稳住基本盘，等时机好转再行动，低调度过这段就好～';
  } else {
    trend = '平稳';
    turnDesc = '三传起伏不大，整体平稳。不急不躁地推进，该做的做好，结果不会差到哪去～';
  }

  var actionAdvice = '';
  if (totalScore >= 5) {
    actionAdvice = '行动力拉满，主动出击，谈合作、办事情、做决定都很适合～';
  } else if (totalScore >= 2) {
    actionAdvice = '可以行动，但别太激进，稳中求进最靠谱～';
  } else if (totalScore >= -2) {
    actionAdvice = '保持观望，小事可以做，大事先缓一缓，等等再定～';
  } else {
    actionAdvice = '暂缓重大行动，先做好防护，等运势好转再出手～';
  }

  var firstRole = '起因';
  var secondRole = '过程';
  var thirdRole = '结局';

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
    interpretation: interp3.detail,
    interpResult: interp3.result,
    threeTransmissions: [
      { label: '初传（起因）', position: first, interp: interp1, role: firstRole },
      { label: '中传（过程）', position: second, interp: interp2, role: secondRole },
      { label: '末传（结局）', position: third, interp: interp3, role: thirdRole }
    ],
    trend: trend,
    hasTurn: hasTurn,
    turnDesc: turnDesc,
    totalScore: totalScore,
    actionAdvice: actionAdvice,
    inputs: result.inputs
  };
}
