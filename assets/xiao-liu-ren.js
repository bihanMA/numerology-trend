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
    '大安': { result: '吉', detail: '大安主安定，诸事和顺昌隆。所问之事可成，宜稳步进取。' },
    '留连': { result: '凶', detail: '留连主迟滞，事难速成，须等待时机。不宜急躁，宜守不宜攻。' },
    '速喜': { result: '吉', detail: '速喜主喜庆，喜事速至，好事临门。把握机遇，可获吉利。' },
    '赤口': { result: '凶', detail: '赤口主口舌是非，恐有惊恐之事。不宜谋事，防口舌争端。' },
    '小吉': { result: '吉', detail: '小吉主和合，凡事吉昌，好商量。所问之事可为，宜与人协商合力。' },
    '空亡': { result: '凶', detail: '空亡主落空，事多不祥。所求难遂，宜暂缓不宜强求。' }
  },
  '寻物': {
    '大安': { result: '可寻', detail: '失物在东方附近，去不远，可寻回。宜速往东方找寻。' },
    '留连': { result: '迟寻', detail: '失物在南方，当日难寻，须过数日方有消息。南方有线索。' },
    '速喜': { result: '可寻', detail: '失物在南方，午时前后可寻到。逢未时见信息。速往南方寻觅。' },
    '赤口': { result: '难寻', detail: '失物往南觅，恐有口舌之争。被人拾去，寻回困难。' },
    '小吉': { result: '可寻', detail: '失物在坤方（西南），有人报信，可寻回。阴人报喜。' },
    '空亡': { result: '难寻', detail: '失物不回乡，事落空。恐难寻回，宜放下。' }
  },
  '测方位': {
    '大安': { result: '东方吉', detail: '宜往东方，诸事昌顺。东方有大安之象，主和平安定。' },
    '留连': { result: '南方迟', detail: '南方事迟滞，不宜急往。若必往南方，须有耐心等待。' },
    '速喜': { result: '南方喜', detail: '南方有喜事速至，宜往南方谋事。速喜临门。' },
    '赤口': { result: '西方凶', detail: '西方主口舌凶祸，不宜往西方。恐有惊恐之事。' },
    '小吉': { result: '坤方吉', detail: '西南方（坤方）主和合吉昌，宜往坤方。路上好商量。' },
    '空亡': { result: '北方空', detail: '北方主空亡不祥，不宜往北方。事多落空。' }
  },
  '测健康': {
    '大安': { result: '无妨', detail: '病者主无妨，身体安泰。宜安心调养，可速痊愈。' },
    '留连': { result: '缠绵', detail: '病者缠绵难愈，须耐心调养。事多反复，宜静养。' },
    '速喜': { result: '渐愈', detail: '病者南方祭，须还马上来。病情好转速愈之象。' },
    '赤口': { result: '主凶', detail: '病者主有妨，恐有惊变。宜急就医，不可拖延。' },
    '小吉': { result: '祷上苍', detail: '病者祷上苍，凡事和合。宜祈福禳灾，可渐安。' },
    '空亡': { result: '不祥', detail: '病者主不祥，事多不利。须仔细检查，不可大意。' }
  },
  '测出行办事': {
    '大安': { result: '可行', detail: '行人身未动，主安定。出行顺利，诸事平安。' },
    '留连': { result: '迟行', detail: '去者未回程，事迟滞。出行不顺，宜延期。' },
    '速喜': { result: '速行', detail: '速喜喜来临，出行速至。行路有喜，宜速行。' },
    '赤口': { result: '不宜', detail: '行人身未动，主口舌惊恐。不宜出行，防有争端。' },
    '小吉': { result: '可行', detail: '行人立便至，交关甚是强。出行和合，凡事顺利。' },
    '空亡': { result: '不宜', detail: '行人寻不见，事多不利。出行落空，不宜前往。' }
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
