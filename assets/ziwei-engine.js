/**
 * 紫微斗数引擎
 * 基于传统紫微斗数排盘法
 *
 * 功能：命宫定位 → 五行局判定 → 紫微星安星 → 十四主星布局 → 十二宫盘
 */

// ============ 十二宫位（地支）============
// 从寅开始顺时针排列
var ZW_BRANCHES = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
var ZW_BRANCH_INDEX = {};
ZW_BRANCHES.forEach(function(b, i) { ZW_BRANCH_INDEX[b] = i; });

// 十二宫名称（从命宫逆时针排列）
var ZW_PALACES = ['命宫','兄弟','夫妻','子女','财帛','疾厄','迁移','奴仆','官禄','田宅','福德','父母'];

// ============ 天干定位 ============
// 五虎遁：年干 → 寅宫天干
var WU_HU_DUN = {
  '甲': 0, '己': 0,  // 丙寅起
  '乙': 2, '庚': 2,  // 戊寅起
  '丙': 4, '辛': 4,  // 庚寅起
  '丁': 6, '壬': 6,  // 壬寅起
  '戊': 8, '癸': 8   // 甲寅起
};

function assignStemsToPalaces(yearStem) {
  var startStemIdx = WU_HU_DUN[yearStem];
  if (startStemIdx === undefined) startStemIdx = 0;
  var stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var palaceStems = {};
  for (var i = 0; i < 12; i++) {
    palaceStems[ZW_BRANCHES[i]] = stems[(startStemIdx + i) % 10];
  }
  return palaceStems;
}

// ============ 纳音五行局判定 ============
// 命宫干支 → 五行局
var NAYIN_WUXING = {
  '甲子': '金', '乙丑': '金', '丙寅': '火', '丁卯': '火', '戊辰': '木', '己巳': '木',
  '庚午': '土', '辛未': '土', '壬申': '金', '癸酉': '金', '甲戌': '火', '乙亥': '火',
  '丙子': '水', '丁丑': '水', '戊寅': '土', '己卯': '土', '庚辰': '金', '辛巳': '金',
  '壬午': '木', '癸未': '木', '甲申': '水', '乙酉': '水', '丙戌': '土', '丁亥': '土',
  '戊子': '火', '己丑': '火', '庚寅': '木', '辛卯': '木', '壬辰': '水', '癸巳': '水',
  '甲午': '金', '乙未': '金', '丙申': '火', '丁酉': '火', '戊戌': '木', '己亥': '木',
  '庚子': '土', '辛丑': '土', '壬寅': '金', '癸卯': '金', '甲辰': '火', '乙巳': '火',
  '丙午': '水', '丁未': '水', '戊申': '土', '己酉': '土', '庚戌': '金', '辛亥': '金',
  '壬子': '木', '癸丑': '木', '甲寅': '水', '乙卯': '水', '丙辰': '土', '丁巳': '土',
  '戊午': '火', '己未': '火', '庚申': '木', '辛酉': '木', '壬戌': '水', '癸亥': '水'
};

var WUXING_JU = {
  '金': 4, '木': 3, '水': 2, '火': 6, '土': 5
};

function getWuxingJu(stem, branch) {
  var key = stem + branch;
  var element = NAYIN_WUXING[key] || '水';
  return { element: element, ju: WUXING_JU[element] };
}

// ============ 命宫计算 ============
// 从寅起，顺数月数，再逆数时数
function calculateMingGong(month, hourIdx) {
  // month: 1-12 (农历月), hourIdx: 0-11 (子=0, 丑=1, ...)
  var pos = (month - 1 - hourIdx + 24) % 12;
  return pos; // 返回寅为0的位置
}

// ============ 紫微星安星 ============
// 根据农历日和五行局确定紫微星位置
function calculateZiweiStar(lunarDay, ju) {
  // 使用标准公式：根据日数和局数推算紫微星位置
  // 紫微星位置（以丑为0的索引）
  var pos = -1;

  // 使用查找表法
  // 各局对应的紫微星位置（以丑为0，顺时针：丑寅卯辰巳午未申酉戌亥子）
  var zwTable = {
    2: [ // 水二局
      0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,0,0,1,1,2,2
    ],
    3: [ // 木三局
      0,0,0,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6,7,7,7,8,8,8,9,9,9
    ],
    4: [ // 金四局
      0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,7,7
    ],
    5: [ // 土五局
      0,0,0,0,0,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,5
    ],
    6: [ // 火六局
      0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4,4,4
    ]
  };

  var table = zwTable[ju];
  if (table && lunarDay >= 1 && lunarDay <= 30) {
    pos = table[lunarDay - 1];
  }

  // 转换：丑为0的位置 → 寅为0的位置
  // 丑=11(寅为0), 寅=0, 卯=1, ..., 子=10, 丑=11
  // 丑为0的索引: 丑=0, 寅=1, 卯=2, ..., 子=10
  // 转换为寅为0: 寅为0的index = (丑为0的index + 1) % 12
  if (pos >= 0) {
    return (pos + 1) % 12;
  }
  return 5; // 默认午
}

// ============ 十四主星安星 ============

var ZW_MAIN_STARS = [
  '紫微','天机','太阳','武曲','天同','廉贞',
  '天府','太阴','贪狼','巨门','天相','天梁','七杀','破军'
];

function placeAllStars(ziweiPos) {
  // 紫微星系（逆时针排列）
  var stars = {};
  var zwStarOrder = ['紫微','天机','太阳','武曲','天同','廉贞'];
  var zwOffsets = [0, 11, 9, 8, 7, 3]; // 逆时针偏移

  for (var i = 0; i < zwStarOrder.length; i++) {
    var pos = (ziweiPos + zwOffsets[i]) % 12;
    if (!stars[pos]) stars[pos] = [];
    stars[pos].push(zwStarOrder[i]);
  }

  // 天府星位置 = (12 - 紫微Pos) % 12
  var tianfuPos = (12 - ziweiPos) % 12;

  // 天府星系（顺时针排列）
  var tfStarOrder = ['天府','太阴','贪狼','巨门','天相','天梁','七杀'];
  var tfOffsets = [0, 1, 2, 3, 4, 5, 6];

  for (var j = 0; j < tfStarOrder.length; j++) {
    var pos2 = (tianfuPos + tfOffsets[j]) % 12;
    if (!stars[pos2]) stars[pos2] = [];
    stars[pos2].push(tfStarOrder[j]);
  }

  // 破军位置 = 七杀 + 3 = (天府 + 6 + 3) % 12 = (天府 + 9) % 12
  var pojunPos = (tianfuPos + 9) % 12;
  if (!stars[pojunPos]) stars[pojunPos] = [];
  stars[pojunPos].push('破军');

  return stars;
}

// ============ 主星释义 ============

var STAR_MEANINGS = {
  '紫微': { type: '帝星', nature: '尊贵、领导', color: '#b8860b', desc: '紫微为北斗主星，象征帝王之尊，主尊贵权势' },
  '天机': { type: '善星', nature: '智慧、变动', color: '#4a6fa5', desc: '天机主智慧谋略，善于筹划，性多变' },
  '太阳': { type: '贵星', nature: '光明、博爱', color: '#cd5c5c', desc: '太阳主光明正大，博爱慷慨，男命主父己子' },
  '武曲': { type: '财星', nature: '刚毅、财利', color: '#8b6914', desc: '武曲主财利武勇，性刚毅果断' },
  '天同': { type: '福星', nature: '和乐、安逸', color: '#5a9b5a', desc: '天同主福寿和乐，性温和安逸' },
  '廉贞': { type: '囚星', nature: '情感、争讼', color: '#a02828', desc: '廉贞主情感争讼，性刚烈多欲' },
  '天府': { type: '令星', nature: '稳重、储藏', color: '#daa520', desc: '天府为南斗主星，主稳重守成' },
  '太阴': { type: '母星', nature: '柔美、阴柔', color: '#6a8cc4', desc: '太阴主柔美阴柔，女命主母' },
  '贪狼': { type: '桃花星', nature: '欲望、交际', color: '#c4623c', desc: '贪狼主欲望交际，多才多艺' },
  '巨门': { type: '暗星', nature: '口舌、疑心', color: '#6c6a80', desc: '巨门主口舌是非，多疑好辩' },
  '天相': { type: '印星', nature: '端正、辅助', color: '#4a3f7a', desc: '天相主端正辅助，性稳重有印' },
  '天梁': { type: '荫星', nature: '清高、荫庇', color: '#5a7a5a', desc: '天梁主清高荫庇，性孤高有寿' },
  '七杀': { type: '将星', nature: '威猛、果断', color: '#8b3a3a', desc: '七杀主威猛果断，性刚强有冲劲' },
  '破军': { type: '耗星', nature: '破坏、开创', color: '#9c4a4a', desc: '破军主破坏开创，性刚烈多变' }
};

// ============ 宫位释义 ============

var PALACE_MEANINGS = {
  '命宫': '个性、体质、外貌、先天格局',
  '兄弟': '兄弟姐妹关系、交友',
  '夫妻': '婚姻感情、配偶特征',
  '子女': '子女缘分、生育',
  '财帛': '财运、理财方式',
  '疾厄': '健康状况、体质',
  '迁移': '外出、旅行、环境变动',
  '奴仆': '下属、朋友、人际',
  '官禄': '事业、工作、学业',
  '田宅': '房产、家庭环境',
  '福德': '精神生活、福分、兴趣',
  '父母': '父母关系、长辈缘分'
};

// ============ 四化表 ============

var SI_HUA_TABLE = {
  '甲': { lu: '廉贞', quan: '破军', ke: '武曲', ji: '太阳' },
  '乙': { lu: '天机', quan: '天梁', ke: '紫微', ji: '太阴' },
  '丙': { lu: '天同', quan: '天机', ke: '文昌', ji: '廉贞' },
  '丁': { lu: '太阴', quan: '天同', ke: '天机', ji: '巨门' },
  '戊': { lu: '贪狼', quan: '太阴', ke: '右弼', ji: '天机' },
  '己': { lu: '武曲', quan: '贪狼', ke: '天梁', ji: '文曲' },
  '庚': { lu: '太阳', quan: '武曲', ke: '太阴', ji: '天同' },
  '辛': { lu: '巨门', quan: '太阳', ke: '文曲', ji: '文昌' },
  '壬': { lu: '天梁', quan: '紫微', ke: '左辅', ji: '武曲' },
  '癸': { lu: '破军', quan: '巨门', ke: '太阴', ji: '贪狼' }
};

var SI_HUA_NAMES = { lu: '化禄', quan: '化权', ke: '化科', ji: '化忌' };
var SI_HUA_DESC = {
  '化禄': '财运增益、机缘增多、顺遂兴旺',
  '化权': '权力增强、掌控力提升、权威显赫',
  '化科': '名声提升、学业有成、贵人相助',
  '化忌': '阻碍困扰、执念不放、是非波折'
};

function calculateSiHua(yearStem) {
  var table = SI_HUA_TABLE[yearStem];
  if (!table) return [];
  return [
    { name: '化禄', star: table.lu, desc: SI_HUA_DESC['化禄'] },
    { name: '化权', star: table.quan, desc: SI_HUA_DESC['化权'] },
    { name: '化科', star: table.ke, desc: SI_HUA_DESC['化科'] },
    { name: '化忌', star: table.ji, desc: SI_HUA_DESC['化忌'] }
  ];
}

// 标注四化到宫位中的星
function applySiHuaToStars(starsMap, siHuaList) {
  var result = {};
  for (var pos in starsMap) {
    result[pos] = starsMap[pos].map(function(star) {
      var hua = null;
      for (var i = 0; i < siHuaList.length; i++) {
        if (siHuaList[i].star === star) {
          hua = siHuaList[i].name;
          break;
        }
      }
      return { name: star, hua: hua };
    });
  }
  return result;
}

// ============ 辅星安星 ============

// 左辅：从辰起顺数生月
function placeZuoFu(lunarMonth) {
  // 辰=2 in ZW_BRANCHES, 顺数月数
  var startIdx = ZW_BRANCH_INDEX['辰'];
  return (startIdx + lunarMonth - 1) % 12;
}

// 右弼：从戌起逆数生月
function placeYouBi(lunarMonth) {
  var startIdx = ZW_BRANCH_INDEX['戌'];
  return ((startIdx - lunarMonth + 1) + 12 * 10) % 12;
}

// 文昌：从戌起逆数生时
function placeWenChang(hourIdx) {
  var startIdx = ZW_BRANCH_INDEX['戌'];
  return ((startIdx - hourIdx) + 12 * 10) % 12;
}

// 文曲：从辰起顺数生时
function placeWenQu(hourIdx) {
  var startIdx = ZW_BRANCH_INDEX['辰'];
  return (startIdx + hourIdx) % 12;
}

// 天魁/天钺：以日干定
var TIAN_KUI_YUE = {
  '甲': { kui: '丑', yue: '未' }, '戊': { kui: '丑', yue: '未' }, '庚': { kui: '丑', yue: '未' },
  '乙': { kui: '子', yue: '申' }, '己': { kui: '子', yue: '申' },
  '丙': { kui: '亥', yue: '酉' }, '丁': { kui: '亥', yue: '酉' },
  '辛': { kui: '午', yue: '寅' },
  '壬': { kui: '卯', yue: '巳' }, '癸': { kui: '卯', yue: '巳' }
};

// 禄存：以年干定
var LU_CUN = {
  '甲':'寅','乙':'卯','丙':'巳','丁':'午','戊':'巳','己':'午',
  '庚':'申','辛':'酉','壬':'亥','癸':'子'
};

// 天马：以年支定（同驿马）
var TIAN_MA = {
  '寅':'申','午':'申','戌':'申',
  '巳':'亥','酉':'亥','丑':'亥',
  '申':'寅','子':'寅','辰':'寅',
  '亥':'巳','卯':'巳','未':'巳'
};

// ============ 煞星安星 ============

// 擎羊：禄存前一位
var QING_YANG = {
  '甲':'卯','乙':'辰','丙':'午','丁':'未','戊':'午','己':'未',
  '庚':'酉','辛':'戌','壬':'子','癸':'丑'
};

// 陀罗：禄存后一位
var TUO_LUO = {
  '甲':'丑','乙':'寅','丙':'辰','丁':'巳','戊':'辰','己':'巳',
  '庚':'未','辛':'申','壬':'戌','癸':'亥'
};

// 火星：以年支+生时
var HUO_XING_START = {
  '寅':'丑','午':'丑','戌':'丑',
  '巳':'卯','酉':'卯','丑':'卯',
  '申':'戌','子':'戌','辰':'戌',
  '亥':'酉','卯':'酉','未':'酉'
};

// 铃星：以年支+生时
var LING_XING_START = {
  '寅':'卯','午':'卯','戌':'卯',
  '巳':'戌','酉':'戌','丑':'戌',
  '申':'戌','子':'戌','辰':'戌',
  '亥':'戌','卯':'戌','未':'戌'
};

function placeAuxAndShaStars(yearStem, yearBranch, lunarMonth, hourIdx) {
  var aux = {};
  var sha = {};

  // 左辅
  var zfPos = placeZuoFu(lunarMonth);
  if (!aux[zfPos]) aux[zfPos] = [];
  aux[zfPos].push({ name: '左辅', type: '辅星', desc: '辅助助力，人缘佳' });

  // 右弼
  var ybPos = placeYouBi(lunarMonth);
  if (!aux[ybPos]) aux[ybPos] = [];
  aux[ybPos].push({ name: '右弼', type: '辅星', desc: '辅助变通，多助力' });

  // 文昌
  var wcPos = placeWenChang(hourIdx);
  if (!aux[wcPos]) aux[wcPos] = [];
  aux[wcPos].push({ name: '文昌', type: '辅星', desc: '聪明好学，文采出众' });

  // 文曲
  var wqPos = placeWenQu(hourIdx);
  if (!aux[wqPos]) aux[wqPos] = [];
  aux[wqPos].push({ name: '文曲', type: '辅星', desc: '口才好，艺能佳' });

  // 天魁
  var kuiYue = TIAN_KUI_YUE[yearStem];
  if (kuiYue) {
    var kuiPos = ZW_BRANCH_INDEX[kuiYue.kui];
    if (!aux[kuiPos]) aux[kuiPos] = [];
    aux[kuiPos].push({ name: '天魁', type: '贵人星', desc: '阳贵人，逢凶化吉' });
    var yuePos = ZW_BRANCH_INDEX[kuiYue.yue];
    if (!aux[yuePos]) aux[yuePos] = [];
    aux[yuePos].push({ name: '天钺', type: '贵人星', desc: '阴贵人，暗中有助' });
  }

  // 禄存
  var lcBranch = LU_CUN[yearStem];
  if (lcBranch) {
    var lcPos = ZW_BRANCH_INDEX[lcBranch];
    if (!aux[lcPos]) aux[lcPos] = [];
    aux[lcPos].push({ name: '禄存', type: '财星', desc: '财禄稳固，有储蓄之能' });
  }

  // 天马
  var tmBranch = TIAN_MA[yearBranch];
  if (tmBranch) {
    var tmPos = ZW_BRANCH_INDEX[tmBranch];
    if (!aux[tmPos]) aux[tmPos] = [];
    aux[tmPos].push({ name: '天马', type: '动星', desc: '奔波走动，外出有利' });
  }

  // 擎羊
  var qyBranch = QING_YANG[yearStem];
  if (qyBranch) {
    var qyPos = ZW_BRANCH_INDEX[qyBranch];
    if (!sha[qyPos]) sha[qyPos] = [];
    sha[qyPos].push({ name: '擎羊', type: '煞星', desc: '刑伤破害，刚烈冲动' });
  }

  // 陀罗
  var tlBranch = TUO_LUO[yearStem];
  if (tlBranch) {
    var tlPos = ZW_BRANCH_INDEX[tlBranch];
    if (!sha[tlPos]) sha[tlPos] = [];
    sha[tlPos].push({ name: '陀罗', type: '煞星', desc: '拖延困扰，固执不变' });
  }

  // 火星
  var hxStart = HUO_XING_START[yearBranch];
  if (hxStart) {
    var hxStartIdx = ZW_BRANCH_INDEX[hxStart];
    var hxPos = (hxStartIdx + hourIdx) % 12;
    if (!sha[hxPos]) sha[hxPos] = [];
    sha[hxPos].push({ name: '火星', type: '煞星', desc: '急躁冲动，突发变故' });
  }

  // 铃星
  var lxStart = LING_XING_START[yearBranch];
  if (lxStart) {
    var lxStartIdx = ZW_BRANCH_INDEX[lxStart];
    var lxPos = (lxStartIdx + hourIdx) % 12;
    if (!sha[lxPos]) sha[lxPos] = [];
    sha[lxPos].push({ name: '铃星', type: '煞星', desc: '阴沉暗损，潜在危机' });
  }

  // 地空：从亥起逆数生时
  var dkPos = ((ZW_BRANCH_INDEX['亥'] - hourIdx) + 12 * 10) % 12;
  if (!sha[dkPos]) sha[dkPos] = [];
  sha[dkPos].push({ name: '地空', type: '煞星', desc: '精神空虚，破财耗损' });

  // 地劫：从亥起顺数生时
  var djPos = (ZW_BRANCH_INDEX['亥'] + hourIdx) % 12;
  if (!sha[djPos]) sha[djPos] = [];
  sha[djPos].push({ name: '地劫', type: '煞星', desc: '劫财破耗，突然损失' });

  return { aux: aux, sha: sha };
}

// ============ 深层宫位解读 ============

var DEEP_PALACE_INTERPRETATIONS = {
  '命宫': {
    '紫微': '命宫紫微，气质高贵，有领导才能，但易孤高自傲。宜培养谦和之心，可成大器。',
    '天机': '命宫天机，心思细腻，善于谋略，应变力强。适合从事策划、研究类工作，但需防多虑伤神。',
    '太阳': '命宫太阳，光明磊落，热心公益，男命主贵。须注意劳逸结合，避免过劳。',
    '武曲': '命宫武曲，刚毅果决，财缘佳，适合金融武职。需注意人际沟通，避免过于刚硬。',
    '天同': '命宫天同，性情温和，福厚安逸，享受生活。需激发上进心，避免过于懒散。',
    '廉贞': '命宫廉贞，性格刚烈，情感丰富，多才多艺。需注意情绪管理，防桃花纠纷。',
    '天府': '命宫天府，稳重保守，有储藏之能，领导力佳。适合管理、金融，但需防过于保守。',
    '太阴': '命宫太阴，温柔细腻，重视感情，女命主母星。宜从事文艺、服务类工作。',
    '贪狼': '命宫贪狼，欲望强盛，多才多艺，交际广泛。需注意节制欲望，防桃花之累。',
    '巨门': '命宫巨门，口才好但多疑，善于分析批评。适合法律、研究，需防口舌是非。',
    '天相': '命宫天相，端正稳重，有印信之能，善于辅佐。适合公务、管理类工作。',
    '天梁': '命宫天梁，清高正直，有荫庇之能，逢凶化吉。适合教育、宗教、医药。',
    '七杀': '命宫七杀，威猛刚强，有开创精神，冲劲十足。适合军警、创业，需防冲动。',
    '破军': '命宫破军，性刚多变，有破坏后重建之能。适合开创性工作，需防破财。'
  },
  '官禄': {
    '紫微': '事业宫紫微，适合从政、管理，有领导之位，事业发展大。',
    '天机': '事业宫天机，适合策划、研究、技术类工作，智慧型事业。',
    '太阳': '事业宫太阳，适合传媒、外交、公益，有声名之事业。',
    '武曲': '事业宫武曲，适合金融、军警、机械，财运型事业。',
    '天府': '事业宫天府，适合管理、金融、储存，稳健型事业。',
    '太阴': '事业宫太阴，适合文艺、服务、房地产，柔和型事业。'
  },
  '财帛': {
    '紫微': '财帛宫紫微，财运丰隆，有贵人助财，理财有方。',
    '武曲': '财帛宫武曲，主财星入财帛，理财能力强，适合金融投资。',
    '天府': '财帛宫天府，主储藏之财，有积蓄之能，理财保守稳健。',
    '太阴': '财帛宫太阴，主暗财，偏财运佳，可能有意外之财。',
    '破军': '财帛宫破军，财运波动，破而后立，需控制消费。'
  },
  '夫妻': {
    '紫微': '夫妻宫紫微，配偶有贵气，但易有支配欲，需互相尊重。',
    '太阴': '夫妻宫太阴，配偶温柔体贴，感情和谐，男命得贤内助。',
    '贪狼': '夫妻宫贪狼，感情多姿，桃花重，需防外遇。',
    '廉贞': '夫妻宫廉贞，感情热烈但易有争执，需控制情绪。',
    '天同': '夫妻宫天同，感情温馨，配偶温和，婚姻和顺。'
  }
};

function generateDeepPalaceInterpretation(palaceName, stars, auxStars, shaStars, siHuaStars) {
  var interpretations = [];
  var mainStar = stars.length > 0 ? stars[0] : null;

  // 主星解读
  if (mainStar) {
    var palaceMap = DEEP_PALACE_INTERPRETATIONS[palaceName];
    if (palaceMap && palaceMap[mainStar]) {
      interpretations.push({ star: mainStar, text: palaceMap[mainStar] });
    } else {
      var starInfo = STAR_MEANINGS[mainStar];
      if (starInfo) {
        interpretations.push({ star: mainStar, text: palaceName + '逢' + mainStar + '，主' + starInfo.nature + '。' + starInfo.desc + '。' });
      }
    }
  } else {
    interpretations.push({ star: '无主星', text: palaceName + '无主星坐守，性格多变，易受他宫影响。' });
  }

  // 四化解读
  if (siHuaStars && siHuaStars.length > 0) {
    siHuaStars.forEach(function(sh) {
      if (sh.hua) {
        interpretations.push({
          star: sh.name + sh.hua,
          text: sh.name + sh.hua + '入' + palaceName + '：' + SI_HUA_DESC[sh.hua] + '。'
        });
      }
    });
  }

  // 辅星解读
  if (auxStars && auxStars.length > 0) {
    auxStars.forEach(function(a) {
      interpretations.push({ star: a.name, text: a.name + '入' + palaceName + '：' + a.desc + '。' });
    });
  }

  // 煞星解读
  if (shaStars && shaStars.length > 0) {
    var shaNames = shaStars.map(function(s) { return s.name; }).join('、');
    var shaDescs = shaStars.map(function(s) { return s.name + '（' + s.desc + '）'; }).join('；');
    interpretations.push({ star: shaNames, text: palaceName + '逢煞星：' + shaDescs + '。需注意防范。' });
  }

  return interpretations;
}

// ============ 完整排盘 ============

function buildZiweiChart(birthInfo) {
  // birthInfo: { year, lunarMonth, lunarDay, hourIdx, gender, yearStem }
  // 支持公历自动转农历
  var month = birthInfo.lunarMonth;
  var day = birthInfo.lunarDay;
  var hourIdx = birthInfo.hourIdx;

  // 如果没有农历信息，但有公历信息，自动转换
  if ((!month || !day) && birthInfo.solarMonth && window.LunarCalendar) {
    var lunar = LunarCalendar.solar2lunar(birthInfo.year, birthInfo.solarMonth, birthInfo.solarDay);
    month = lunar.month;
    day = lunar.day;
    birthInfo.lunarMonth = month;
    birthInfo.lunarDay = day;
    birthInfo.lunarInfo = lunar;
  }

  // 1. 计算命宫位置
  var mingGongPos = calculateMingGong(month, hourIdx);

  // 2. 分配天干
  var palaceStems = assignStemsToPalaces(birthInfo.yearStem);

  // 3. 确定五行局
  var mgStem = palaceStems[ZW_BRANCHES[mingGongPos]];
  var mgBranch = ZW_BRANCHES[mingGongPos];
  var wuxingJu = getWuxingJu(mgStem, mgBranch);

  // 4. 安紫微星
  var ziweiPos = calculateZiweiStar(day, wuxingJu.ju);

  // 5. 安十四主星
  var starsMap = placeAllStars(ziweiPos);

  // 6. 计算四化
  var siHuaList = calculateSiHua(birthInfo.yearStem);
  var starsWithHua = applySiHuaToStars(starsMap, siHuaList);

  // 7. 安辅星和煞星
  var yearBranch = ZW_BRANCHES[mingGongPos]; // 命宫地支不一定是年支
  // 年支从年干推算
  var allBranches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var yearBranchIdx = (birthInfo.year - 4) % 12;
  yearBranch = allBranches[yearBranchIdx];
  var auxSha = placeAuxAndShaStars(birthInfo.yearStem, yearBranch, month, hourIdx);

  // 8. 分配十二宫 + 深层解读
  var palaces = {};
  for (var i = 0; i < 12; i++) {
    var pos = (mingGongPos - i + 24) % 12;
    var branch = ZW_BRANCHES[pos];
    var mainStars = starsMap[pos] || [];
    var auxStars = auxSha.aux[pos] || [];
    var shaStars = auxSha.sha[pos] || [];
    var siHuaStars = (starsWithHua[pos] || []);

    palaces[ZW_PALACES[i]] = {
      position: pos,
      branch: branch,
      stem: palaceStems[branch],
      stars: mainStars,
      starsWithHua: siHuaStars,
      auxStars: auxStars,
      shaStars: shaStars,
      palaceName: ZW_PALACES[i],
      meaning: PALACE_MEANINGS[ZW_PALACES[i]],
      interpretation: generateDeepPalaceInterpretation(
        ZW_PALACES[i], mainStars, auxStars, shaStars, siHuaStars
      )
    };
  }

  // 9. 计算身宫位置
  var shenGongPos = (month - 1 + hourIdx) % 12;

  return {
    mingGongPos: mingGongPos,
    shenGongPos: shenGongPos,
    wuxingJu: wuxingJu,
    ziweiPos: ziweiPos,
    palaces: palaces,
    palaceStems: palaceStems,
    starsMap: starsMap,
    starsWithHua: starsWithHua,
    siHuaList: siHuaList,
    auxStars: auxSha.aux,
    shaStars: auxSha.sha,
    birthInfo: birthInfo,
    gridOrder: getGridOrder(mingGongPos, shenGongPos, palaces)
  };
}

function getGridOrder(mingGongPos, shenGongPos, palaces) {
  var grid = [];
  for (var i = 0; i < 12; i++) {
    var pos = (mingGongPos - i + 24) % 12;
    var branch = ZW_BRANCHES[pos];
    var palaceName = ZW_PALACES[i];
    grid.push({
      gridPos: pos,
      branch: branch,
      stem: palaces[palaceName].stem,
      stars: palaces[palaceName].stars,
      starsWithHua: palaces[palaceName].starsWithHua,
      auxStars: palaces[palaceName].auxStars,
      shaStars: palaces[palaceName].shaStars,
      interpretation: palaces[palaceName].interpretation,
      palaceName: palaceName,
      meaning: palaces[palaceName].meaning,
      isMingGong: i === 0,
      isShenGong: pos === shenGongPos
    });
  }
  return grid;
}

// ============ 当日运势计算 ============

function calculateDailyFortune(chart, targetDate) {
  if (!targetDate) targetDate = new Date();
  var year = targetDate.getFullYear();
  var stemIdx = (year - 4) % 10;
  var branchIdx = (year - 4) % 12;
  var stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

  var dayStem = stems[stemIdx];
  var dayBranch = branches[branchIdx];

  // 流年地支对应的宫位
  var branchIdxInZW = ZW_BRANCH_INDEX[dayBranch];
  var mingGongBranch = ZW_BRANCHES[chart.mingGongPos];

  // 查找流年所在宫位对应的十二宫
  var yearPalaceIdx = -1;
  for (var i = 0; i < 12; i++) {
    var pos = (chart.mingGongPos - i + 24) % 12;
    if (pos === branchIdxInZW || ZW_BRANCHES[pos] === dayBranch) {
      yearPalaceIdx = i;
      break;
    }
  }

  var yearPalaceName = yearPalaceIdx >= 0 ? ZW_PALACES[yearPalaceIdx] : '命宫';
  var yearPalace = chart.palaces[yearPalaceName] || chart.palaces['命宫'];

  // 今日运势：根据日干支与命宫的关系
  var dayBranchIdx = ZW_BRANCH_INDEX[dayBranch] || 0;
  var dailyPalacePos = (dayBranchIdx - chart.mingGongPos + 12) % 12;
  var dailyPalaceName = ZW_PALACES[dailyPalacePos] || '命宫';

  // 生成运势解读
  var fortune = generateDailyFortuneText(chart, yearPalaceName, dailyPalaceName, dayStem, dayBranch);

  return {
    date: targetDate,
    yearStemBranch: dayStem + dayBranch,
    yearPalace: yearPalaceName,
    dailyPalace: dailyPalaceName,
    stars: yearPalace.stars,
    fortune: fortune,
    dayStem: dayStem,
    dayBranch: dayBranch
  };
}

function generateDailyFortuneText(chart, yearPalace, dailyPalace, dayStem, dayBranch) {
  var palaceStars = chart.palaces[yearPalace] ? chart.palaces[yearPalace].stars : [];
  var starDescs = palaceStars.map(function(s) {
    var m = STAR_MEANINGS[s];
    return m ? s + '（' + m.nature + '）' : s;
  });

  var general = '今日流年宫位在「' + yearPalace + '」，主星：' +
    (starDescs.length > 0 ? starDescs.join('、') : '无主星') + '。';

  var career = '', wealth = '', love = '', health = '';

  // 事业
  if (palaceStars.includes('紫微') || palaceStars.includes('武曲')) {
    career = '事业运势强劲，有领导力和决断力，适合处理重要事务。';
  } else if (palaceStars.includes('天机') || palaceStars.includes('太阳')) {
    career = '思维活跃，人际关系佳，适合沟通协作类工作。';
  } else if (palaceStars.includes('巨门') || palaceStars.includes('廉贞')) {
    career = '需注意口舌是非，工作中避免争辩，宜低调行事。';
  } else {
    career = '事业平稳，按部就班即可。';
  }

  // 财运
  if (palaceStars.includes('武曲') || palaceStars.includes('天府')) {
    wealth = '财运较好，适合理财投资，有进财之象。';
  } else if (palaceStars.includes('太阴')) {
    wealth = '偏财运佳，可能有暗财或他人馈赠。';
  } else if (palaceStars.includes('破军') || palaceStars.includes('贪狼')) {
    wealth = '财运波动大，不宜大额投资，控制消费。';
  } else {
    wealth = '财运平稳，量入为出。';
  }

  // 感情
  if (palaceStars.includes('贪狼') || palaceStars.includes('廉贞')) {
    love = '感情方面有桃花之象，但需注意分寸，已婚者防外遇。';
  } else if (palaceStars.includes('太阴') || palaceStars.includes('天同')) {
    love = '感情温馨和谐，适合与伴侣共度时光。';
  } else {
    love = '感情平稳，无大波动。';
  }

  // 健康
  if (palaceStars.includes('七杀') || palaceStars.includes('破军')) {
    health = '注意身体安全，避免剧烈运动和意外伤害。';
  } else if (palaceStars.includes('巨门') || palaceStars.includes('天梁')) {
    health = '注意口腔、消化系统，保持规律作息。';
  } else {
    health = '健康状况良好，注意日常保养。';
  }

  return {
    general: general,
    career: career,
    wealth: wealth,
    love: love,
    health: health
  };
}

// ============ 整体盘解读 ============

function generateChartNarrative(chart) {
  var mgPalace = chart.palaces['命宫'];
  var mgStars = mgPalace.stars;
  var mainStar = mgStars[0] || '无主星';
  var starInfo = STAR_MEANINGS[mainStar] || { type: '', nature: '', desc: '' };

  var narrative = '命宫在' + mgPalace.stem + mgPalace.branch + '（' + chart.wuxingJu.element +
    chart.wuxingJu.ju + '局），主星' + (mgStars.length > 0 ? mgStars.join('、') : '无') + '。';

  narrative += '命宫主星为' + mainStar + '，主' + starInfo.nature + '。' + starInfo.desc + '。';

  // 四化总览
  if (chart.siHuaList && chart.siHuaList.length > 0) {
    var huaText = chart.siHuaList.map(function(sh) {
      return sh.star + sh.name + '（' + sh.desc + '）';
    }).join('、');
    narrative += '年生年四化：' + huaText + '。';
  }

  // 深层命宫解读
  if (mgPalace.interpretation && mgPalace.interpretation.length > 0) {
    var mgDeep = mgPalace.interpretation.map(function(item) { return item.text; }).join('');
    narrative += mgDeep;
  }

  // 事业宫
  var careerPalace = chart.palaces['官禄'];
  var careerStars = careerPalace.stars;
  if (careerStars.length > 0) {
    narrative += '事业宫主星' + careerStars.join('、') + '，';
    var careerInfo = STAR_MEANINGS[careerStars[0]] || { nature: '' };
    narrative += '事业方面' + careerInfo.nature + '。';
  }
  if (careerPalace.interpretation && careerPalace.interpretation.length > 0) {
    narrative += careerPalace.interpretation.map(function(item) { return item.text; }).join('');
  }

  // 财帛宫
  var wealthPalace = chart.palaces['财帛'];
  var wealthStars = wealthPalace.stars;
  if (wealthStars.length > 0) {
    narrative += '财帛宫主星' + wealthStars.join('、') + '，';
    var wealthInfo = STAR_MEANINGS[wealthStars[0]] || { nature: '' };
    narrative += '财运方面' + wealthInfo.nature + '。';
  }
  if (wealthPalace.interpretation && wealthPalace.interpretation.length > 0) {
    narrative += wealthPalace.interpretation.map(function(item) { return item.text; }).join('');
  }

  // 夫妻宫
  var spousePalace = chart.palaces['夫妻'];
  var spouseStars = spousePalace.stars;
  if (spouseStars.length > 0) {
    narrative += '夫妻宫主星' + spouseStars.join('、') + '，';
    var spouseInfo = STAR_MEANINGS[spouseStars[0]] || { nature: '' };
    narrative += '感情方面' + spouseInfo.nature + '。';
  }
  if (spousePalace.interpretation && spousePalace.interpretation.length > 0) {
    narrative += spousePalace.interpretation.map(function(item) { return item.text; }).join('');
  }

  narrative += '（以上解读仅供参考）';

  return {
    general: narrative,
    mainStar: mainStar,
    mainStarInfo: starInfo,
    careerStars: careerStars,
    wealthStars: wealthStars,
    spouseStars: spouseStars,
    siHuaList: chart.siHuaList,
    deepInterpretations: {
      mingGong: mgPalace.interpretation,
      career: careerPalace.interpretation,
      wealth: wealthPalace.interpretation,
      spouse: spousePalace.interpretation
    }
  };
}

// ============ 紫微斗数整体命理总览 ============

function generateZiWeiLifeReading(chart) {
  var mgPalace = chart.palaces['命宫'];
  var mgStars = mgPalace.stars;
  var mainStar = mgStars[0] || '无主星';
  var starInfo = STAR_MEANINGS[mainStar] || { type: '', nature: '', desc: '' };

  // --- 一句话总结 ---
  var careerPalace = chart.palaces['官禄'];
  var wealthPalace = chart.palaces['财帛'];
  var spousePalace = chart.palaces['夫妻'];
  var careerStar = careerPalace.stars[0] || '';
  var wealthStar = wealthPalace.stars[0] || '';
  var spouseStar = spousePalace.stars[0] || '';

  var oneSentence = '命宫' + (mgStars.length > 0 ? mgStars.join('、') : '无主星') +
    '，' + (starInfo.nature || '性格多变') +
    '，事业宫' + (careerStar || '无主星') +
    (careerStar ? '主' + (STAR_MEANINGS[careerStar] || {}).nature : '') +
    '，财帛宫' + (wealthStar || '无主星') +
    (wealthStar ? '主' + (STAR_MEANINGS[wealthStar] || {}).nature : '') +
    '，' + chart.wuxingJu.element + chart.wuxingJu.ju + '局命格。';

  // --- 人生各阶段 ---
  var lifeStages = [];
  var stageNames = ['少年运', '青年运', '中年运', '壮年运', '晚年运'];
  var currentAge = new Date().getFullYear() - chart.birthInfo.year;

  // 根据大限推算各阶段
  var decadePalaces = ['命宫','父母','福德','田宅','官禄','奴仆','迁移','疾厄','财帛','子女','夫妻','兄弟'];

  for (var i = 0; i < 6; i++) {
    var stageName = i < stageNames.length ? stageNames[i] : '晚年运';
    var ageStart = 6 + i * 10;
    var ageEnd = ageStart + 10;
    var palaceIdx = i % 12;
    var palaceName = decadePalaces[palaceIdx];
    var palace = chart.palaces[palaceName];
    var stageStars = palace ? palace.stars : [];
    var stageMainStar = stageStars[0] || '无主星';
    var stageStarInfo = STAR_MEANINGS[stageMainStar] || { nature: '变化', desc: '' };
    var isCurrent = (currentAge >= ageStart && currentAge < ageEnd);

    var luckLevel = '平运';
    var luckDesc = '';
    if (stageMainStar !== '无主星') {
      if (['紫微','天府','太阳','武曲','天梁'].indexOf(stageMainStar) >= 0) {
        luckLevel = '吉运';
        luckDesc = '此限主星' + stageMainStar + '，' + stageStarInfo.nature + '，运势较佳';
      } else if (['贪狼','廉贞','破军','七杀','巨门'].indexOf(stageMainStar) >= 0) {
        luckLevel = '变动运';
        luckDesc = '此限主星' + stageMainStar + '，' + stageStarInfo.nature + '，变动较多，需把握机遇';
      } else {
        luckLevel = '平稳运';
        luckDesc = '此限主星' + stageMainStar + '，' + stageStarInfo.nature + '，运势平稳';
      }
    } else {
      luckDesc = '此限无主星坐守，运势随他宫影响而变';
    }

    // 四化影响
    var huaInPalace = '';
    if (palace && palace.starsWithHua) {
      palace.starsWithHua.forEach(function(s) {
        if (s.hua) {
          huaInPalace += s.name + s.hua + '入' + palaceName + '；';
        }
      });
    }
    if (huaInPalace) {
      luckDesc += '。' + huaInPalace;
    }

    // 煞星影响
    var shaInPalace = '';
    if (palace && palace.shaStars && palace.shaStars.length > 0) {
      shaInPalace = '注意：' + palace.shaStars.map(function(s) { return s.name; }).join('、') + '入限，需谨慎';
    }

    lifeStages.push({
      name: stageName,
      ageRange: ageStart + '-' + ageEnd + '岁',
      palace: palaceName,
      mainStar: stageMainStar,
      luckLevel: luckLevel,
      summary: luckDesc,
      detail: shaInPalace || '无明显煞星干扰',
      isCurrent: isCurrent
    });
  }

  // --- 日常建议 ---
  var dailyFortune = calculateDailyFortune(chart, new Date());
  var dailyAdvice = {
    general: dailyFortune.fortune.general,
    career: dailyFortune.fortune.career,
    wealth: dailyFortune.fortune.wealth,
    love: dailyFortune.fortune.love,
    health: dailyFortune.fortune.health,
    palace: dailyFortune.yearPalace + '宫',
    stars: dailyFortune.stars || []
  };

  // --- 提升命格 ---
  var destinyImprovement = [];

  // 命宫主星调理
  var mgImprovementMap = {
    '紫微': '命宫紫微，宜培养领导力和格局观，多读书增长见识，避免孤高自傲',
    '天机': '命宫天机，宜多学习思考，培养专长技能，避免想多做少',
    '太阳': '命宫太阳，宜多行善积德，发挥博爱精神，注意劳逸结合',
    '武曲': '命宫武曲，宜培养理财能力，注重人际沟通，避免过于刚硬',
    '天同': '命宫天同，宜激发上进心，设定目标，避免过于安逸',
    '廉贞': '命宫廉贞，宜注重情绪管理，培养正当兴趣，避免桃花纠纷',
    '天府': '命宫天府，宜培养管理能力，稳健发展，适当拓展舒适圈',
    '太阴': '命宫太阴，宜培养艺术修养，注重家庭，发挥柔和之力',
    '贪狼': '命宫贪狼，宜培养专长，节制欲望，将交际能力用于正途',
    '巨门': '命宫巨门，宜修炼口德，学习沟通技巧，避免是非口舌',
    '天相': '命宫天相，宜培养辅佐之能，注重诚信，适合公务管理',
    '天梁': '命宫天梁，宜培养正直品格，学习养生之道，逢凶化吉',
    '七杀': '命宫七杀，宜培养耐心和谋略，避免冲动行事，适合开创',
    '破军': '命宫破军，宜培养变通能力，学会止损，避免破坏性决策',
    '无主星': '命宫无主星，性格多变，宜参考对宫和三方四正星曜，培养稳定性格'
  };
  destinyImprovement.push({
    category: '命宫调理',
    advice: mgImprovementMap[mainStar] || '宜根据命宫星曜特点培养自身优势'
  });

  // 四化调理
  if (chart.siHuaList && chart.siHuaList.length > 0) {
    var huaAdvice = chart.siHuaList.map(function(sh) {
      if (sh.name === '化禄') return sh.star + '化禄：把握财运机遇，积极经营' + sh.star + '所主之事';
      if (sh.name === '化权') return sh.star + '化权：发挥权力和掌控力，但需适度';
      if (sh.name === '化科') return sh.star + '化科：注重名声和学习，考试顺利';
      if (sh.name === '化忌') return sh.star + '化忌：需注意' + sh.star + '所主方面的阻碍，宜化解执念';
      return '';
    }).filter(Boolean).join('；');
    destinyImprovement.push({
      category: '四化调理',
      advice: huaAdvice
    });
  }

  // 煞星调理
  var allShaStars = [];
  for (var pos in chart.shaStars) {
    chart.shaStars[pos].forEach(function(s) { allShaStars.push(s); });
  }
  if (allShaStars.length > 0) {
    var shaNames = allShaStars.map(function(s) { return s.name; });
    var uniqueShaNames = [];
    shaNames.forEach(function(n) { if (uniqueShaNames.indexOf(n) < 0) uniqueShaNames.push(n); });
    destinyImprovement.push({
      category: '煞星化解',
      advice: '命盘有' + uniqueShaNames.join('、') + '等煞星，需在对应宫位注意防范。' +
        '可通过行善积德、修身养性来化解煞星负面影响。'
    });
  }

  // 方位调理
  var favDir = '';
  if (chart.wuxingJu.element === '木') favDir = '东方、东南方';
  else if (chart.wuxingJu.element === '火') favDir = '南方';
  else if (chart.wuxingJu.element === '土') favDir = '中方、东北、西南';
  else if (chart.wuxingJu.element === '金') favDir = '西方、西北方';
  else favDir = '北方';
  destinyImprovement.push({
    category: '方位调理',
    advice: '五行局为' + chart.wuxingJu.element + '局，宜朝' + favDir + '发展，' +
      '居住、办公宜选朝' + favDir + '的位置。'
  });

  return {
    oneSentenceSummary: oneSentence,
    lifeStages: lifeStages,
    dailyAdvice: dailyAdvice,
    destinyImprovement: destinyImprovement,
    mainStar: mainStar,
    mainStarInfo: starInfo,
    wuxingJu: chart.wuxingJu.element + chart.wuxingJu.ju + '局',
    currentAge: currentAge,
    patterns: determineZiWeiPattern(chart)
  };
}

// ============ 紫微斗数格局判定 ============

function determineZiWeiPattern(chart) {
  var patterns = [];
  var mgPalace = chart.palaces['命宫'];
  var mgStars = mgPalace.stars || [];
  var mgBranch = mgPalace.branch;
  var mgPos = mgPalace.position;

  // 辅助函数：检查某星是否在命宫
  function hasStarInMing(starName) {
    return mgStars.indexOf(starName) >= 0;
  }

  // 辅助函数：检查某星是否在指定宫位
  function hasStarInPalace(palaceName, starName) {
    var p = chart.palaces[palaceName];
    if (!p) return false;
    return (p.stars || []).indexOf(starName) >= 0;
  }

  // 辅助函数：检查某辅星是否在命宫
  function hasAuxInMing(starName) {
    var auxStars = mgPalace.auxStars || [];
    return auxStars.some(function(a) { return a.name === starName; });
  }

  // 辅助函数：检查某煞星是否在命宫
  function hasShaInMing(starName) {
    var shaStars = mgPalace.shaStars || [];
    return shaStars.some(function(s) { return s.name === starName; });
  }

  // 辅助函数：获取命宫前后宫位位置
  function getNeighborPositions(pos) {
    return [(pos - 1 + 12) % 12, (pos + 1) % 12];
  }

  // 辅助函数：检查某宫位是否有某煞星
  function hasShaInPos(pos, starName) {
    var shaList = chart.shaStars[pos] || [];
    return shaList.some(function(s) { return s.name === starName; });
  }

  // 辅助函数：检查某宫位是否有某辅星
  function hasAuxInPos(pos, starName) {
    var auxList = chart.auxStars[pos] || [];
    return auxList.some(function(a) { return a.name === starName; });
  }

  // 辅助函数：获取三方四正的宫位名
  function getSanFangSiZheng(palaceName) {
    var palaces = ['命宫','兄弟','夫妻','子女','财帛','疾厄','迁移','奴仆','官禄','田宅','福德','父母'];
    var idx = palaces.indexOf(palaceName);
    if (idx < 0) return [];
    // 三方 = 对宫(迁移=+6) + 财帛(+4) + 官禄(+8) = i, i+4, i+8
    // 四正 = 三方 + 对宫(i+6)
    var sanFang = [palaces[(idx + 4) % 12], palaces[(idx + 8) % 12]];
    var duiGong = palaces[(idx + 6) % 12];
    return { sanFang: sanFang, duiGong: duiGong, all: sanFang.concat([duiGong, palaceName]) };
  }

  // 辅助函数：在三方四正中查找星曜
  function hasStarInSanFangSiZheng(palaceName, starName) {
    var sfsz = getSanFangSiZheng(palaceName);
    return sfsz.all.some(function(pn) {
      var p = chart.palaces[pn];
      if (!p) return false;
      return (p.stars || []).indexOf(starName) >= 0;
    });
  }

  // ========== 主要格局判定 ==========

  // 1. 紫府同宫格：紫微天府同在命宫
  if (hasStarInMing('紫微') && hasStarInMing('天府')) {
    patterns.push({
      name: '紫府同宫格',
      desc: '紫微天府同坐命宫，至尊至富，主大贵大富，有领导才能与财富之象',
      level: '吉'
    });
  }

  // 2. 紫府朝垣格：紫微天府在三方四正会照命宫
  if (!hasStarInMing('紫微') && !hasStarInMing('天府') &&
      hasStarInSanFangSiZheng('命宫', '紫微') && hasStarInSanFangSiZheng('命宫', '天府')) {
    patterns.push({
      name: '紫府朝垣格',
      desc: '紫微天府于三方四正朝拱命宫，主人有贵气，得人敬重，事业有成',
      level: '吉'
    });
  }

  // 3. 君臣庆会格：命宫紫微+左辅+右弼
  if (hasStarInMing('紫微') && hasAuxInMing('左辅') && hasAuxInMing('右弼')) {
    patterns.push({
      name: '君臣庆会格',
      desc: '紫微得左辅右弼同宫会照，如帝君得贤臣，主大富大贵，一生多助',
      level: '吉'
    });
  }

  // 4. 辅弼夹命格：左辅右弼夹命宫
  var neighbors = getNeighborPositions(mgPos);
  if (hasAuxInPos(neighbors[0], '左辅') && hasAuxInPos(neighbors[1], '右弼') ||
      hasAuxInPos(neighbors[0], '右弼') && hasAuxInPos(neighbors[1], '左辅')) {
    patterns.push({
      name: '辅弼夹命格',
      desc: '左辅右弼夹命宫，主一生多贵人相助，凡事逢凶化吉',
      level: '吉'
    });
  }

  // 5. 府相朝垣格：天府天相在三方四正会照命宫
  if (hasStarInSanFangSiZheng('命宫', '天府') && hasStarInSanFangSiZheng('命宫', '天相')) {
    patterns.push({
      name: '府相朝垣格',
      desc: '天府天相于三方四正朝拱命宫，主衣食丰足，有印信之权，为人稳重',
      level: '吉'
    });
  }

  // 6. 日月同宫格：太阳太阴同在命宫
  if (hasStarInMing('太阳') && hasStarInMing('太阴')) {
    patterns.push({
      name: '日月同宫格',
      desc: '太阳太阴同坐命宫，阴阳调和，主聪慧多才，男女皆宜',
      level: '吉'
    });
  }

  // 7. 日月并明格：太阳太阴分入命宫和财帛宫（或对宫）
  if (!hasStarInMing('太阳') && !hasStarInMing('太阴')) {
    if (hasStarInSanFangSiZheng('命宫', '太阳') && hasStarInSanFangSiZheng('命宫', '太阴')) {
      patterns.push({
        name: '日月照命格',
        desc: '日月于三方四正照命，主人光明磊落，声名远播',
        level: '吉'
      });
    }
  }

  // 8. 机月同梁格：天机太阴天同天梁在三方四正会照命宫
  var hasJi = hasStarInSanFangSiZheng('命宫', '天机');
  var hasYue = hasStarInSanFangSiZheng('命宫', '太阴');
  var hasTong = hasStarInSanFangSiZheng('命宫', '天同');
  var hasLiang = hasStarInSanFangSiZheng('命宫', '天梁');
  if (hasJi && hasYue && hasTong && hasLiang) {
    patterns.push({
      name: '机月同梁格',
      desc: '天机太阴天同天梁四星会照命宫，主聪明稳重，适合公职、企管、文职',
      level: '吉'
    });
  }

  // 9. 巨机同临格：巨门天机同在命宫或三方会照
  if (hasStarInMing('巨门') && hasStarInMing('天机')) {
    patterns.push({
      name: '巨机同临格',
      desc: '巨门天机同坐命宫，主口才出众，智谋过人，适合法律、辩论、研究',
      level: '吉'
    });
  }

  // 10. 火贪格/铃贪格：火星/铃星与贪狼同宫
  if (hasStarInMing('贪狼')) {
    var hasHuo = hasShaInMing('火星');
    var hasLing = hasShaInMing('铃星');
    if (hasHuo) {
      patterns.push({
        name: '火贪格',
        desc: '火星贪狼同宫，主突发横财，武职荣身，有将帅之气',
        level: '吉'
      });
    }
    if (hasLing) {
      patterns.push({
        name: '铃贪格',
        desc: '铃星贪狼同宫，主暗中有成，适合经营投机，有意外之财',
        level: '吉'
      });
    }
  }

  // 11. 马头带箭格：七杀在午宫坐命
  if (hasStarInMing('七杀') && mgBranch === '午') {
    patterns.push({
      name: '马头带箭格',
      desc: '七杀在午宫坐命，主威权显赫，适合军警武职，有开创之能',
      level: '吉'
    });
  }

  // 12. 七杀仰斗格：七杀在子或寅宫坐命
  if (hasStarInMing('七杀') && (mgBranch === '子' || mgBranch === '寅')) {
    patterns.push({
      name: '七杀仰斗格',
      desc: '七杀在' + mgBranch + '宫坐命，主有威权，适合军警开创性行业',
      level: '吉'
    });
  }

  // 13. 紫相辰戌格：紫微天相在辰或戌
  if (hasStarInMing('紫微') && hasStarInMing('天相') && (mgBranch === '辰' || mgBranch === '戌')) {
    patterns.push({
      name: '紫相辰戌格',
      desc: '紫微天相在' + mgBranch + '宫坐命，主权贵但有波折，中年发福',
      level: '中'
    });
  }

  // 14. 三奇嘉会格：化禄化权化科会入命宫三方四正
  var hasHuaLu = false, hasHuaQuan = false, hasHuaKe = false;
  var sfsz = getSanFangSiZheng('命宫');
  sfsz.all.forEach(function(pn) {
    var p = chart.palaces[pn];
    if (p && p.starsWithHua) {
      p.starsWithHua.forEach(function(s) {
        if (s.hua === '化禄') hasHuaLu = true;
        if (s.hua === '化权') hasHuaQuan = true;
        if (s.hua === '化科') hasHuaKe = true;
      });
    }
  });
  if (hasHuaLu && hasHuaQuan && hasHuaKe) {
    patterns.push({
      name: '三奇嘉会格',
      desc: '化禄化权化科三奇会入命宫三方四正，主一生荣华富贵，名望权力财富兼备',
      level: '吉'
    });
  }

  // 15. 权禄巡逢格：化禄化权同在命宫或三方四正
  if (hasHuaLu && hasHuaQuan && !hasHuaKe) {
    patterns.push({
      name: '权禄巡逢格',
      desc: '化禄化权同会命宫，主富贵双全，有权有财，事业有成',
      level: '吉'
    });
  }

  // 16. 羊陀夹命格：擎羊陀罗夹命宫
  if (hasShaInPos(neighbors[0], '擎羊') && hasShaInPos(neighbors[1], '陀罗') ||
      hasShaInPos(neighbors[0], '陀罗') && hasShaInPos(neighbors[1], '擎羊')) {
    patterns.push({
      name: '羊陀夹命格',
      desc: '擎羊陀罗夹命宫，主一生多阻碍刑伤，需防意外纠纷',
      level: '凶'
    });
  }

  // 17. 空劫夹命格：地空地劫夹命宫
  if (hasShaInPos(neighbors[0], '地空') && hasShaInPos(neighbors[1], '地劫') ||
      hasShaInPos(neighbors[0], '地劫') && hasShaInPos(neighbors[1], '地空')) {
    patterns.push({
      name: '空劫夹命格',
      desc: '地空地劫夹命宫，主一生破财耗损，精神空虚，需谨防投资损失',
      level: '凶'
    });
  }

  // 18. 两重华盖格：地空地劫同在命宫
  if (hasShaInMing('地空') && hasShaInMing('地劫')) {
    patterns.push({
      name: '两重华盖格',
      desc: '地空地劫同坐命宫，主人聪明但精神空虚，适合宗教、艺术、哲学',
      level: '中'
    });
  }

  // 19. 阳梁昌禄格：太阳天梁文昌禄存会照命宫
  var hasYang = hasStarInSanFangSiZheng('命宫', '太阳');
  var hasLiang2 = hasStarInSanFangSiZheng('命宫', '天梁');
  var hasWenChang = false;
  var hasLuCun = false;
  sfsz.all.forEach(function(pn) {
    var p = chart.palaces[pn];
    if (p && p.auxStars) {
      p.auxStars.forEach(function(a) {
        if (a.name === '文昌') hasWenChang = true;
        if (a.name === '禄存') hasLuCun = true;
      });
    }
  });
  if (hasYang && hasLiang2 && hasWenChang && hasLuCun) {
    patterns.push({
      name: '阳梁昌禄格',
      desc: '太阳天梁文昌禄存会照命宫，主学业大成名扬天下，适合科举考试学术',
      level: '吉'
    });
  }

  // 20. 贪狼陀罗格：贪狼陀罗同在命宫
  if (hasStarInMing('贪狼') && hasShaInMing('陀罗')) {
    patterns.push({
      name: '贪狼陀罗格',
      desc: '贪狼陀罗同坐命宫，主人多才多艺但感情纠葛，宜从事文艺或投机行业',
      level: '中'
    });
  }

  // 21. 贪狼会铃火：贪狼与火星铃星同宫（已含火贪/铃贪，此处补充泛指）
  if (hasStarInMing('贪狼') && hasShaInMing('火星') && hasShaInMing('铃星')) {
    patterns.push({
      name: '贪火铃格',
      desc: '贪狼同会火星铃星，主突发横财，但需把握时机，过则反凶',
      level: '中'
    });
  }

  // 22. 刑囚夹命格：天刑+囚（廉贞）夹命
  // 简化判定：廉贞在命宫相邻宫位
  var hasLianZhen = false;
  neighbors.forEach(function(npos) {
    var allStars = chart.starsMap[npos] || [];
    if (allStars.indexOf('廉贞') >= 0) hasLianZhen = true;
  });
  if (hasLianZhen && hasShaInMing('擎羊')) {
    patterns.push({
      name: '刑囚夹命格',
      desc: '天刑廉贞夹命宫，主多是非官司，需防法律纠纷',
      level: '凶'
    });
  }

  // 23. 文桂文华格：文昌文曲同在命宫
  if (hasAuxInMing('文昌') && hasAuxInMing('文曲')) {
    patterns.push({
      name: '文桂文华格',
      desc: '文昌文曲同坐命宫，主文才出众，学业有成，适合文化教育',
      level: '吉'
    });
  }

  // 24. 贪武同行格：贪狼武曲同在命宫
  if (hasStarInMing('贪狼') && hasStarInMing('武曲')) {
    patterns.push({
      name: '贪武同行格',
      desc: '贪狼武曲同坐命宫，主有将帅之才，文武双全，适合军政商界',
      level: '吉'
    });
  }

  // 25. 日月反背格：太阳在未申，太阴在卯辰（反背）
  // 简化判定
  if (hasStarInMing('太阳') && (mgBranch === '未' || mgBranch === '申')) {
    patterns.push({
      name: '日月反背格（太阳）',
      desc: '太阳在' + mgBranch + '宫，日落西山之象，主辛劳多劳，中年后好转',
      level: '中'
    });
  }

  // 26. 紫杀同临：紫微七杀同在命宫
  if (hasStarInMing('紫微') && hasStarInMing('七杀')) {
    patterns.push({
      name: '紫杀同临格',
      desc: '紫微七杀同坐命宫，主权威显赫，有开创精神，适合创业领袖',
      level: '吉'
    });
  }

  // 27. 紫破同临：紫微破军同在命宫
  if (hasStarInMing('紫微') && hasStarInMing('破军')) {
    patterns.push({
      name: '紫破同临格',
      desc: '紫微破军同坐命宫，主破旧立新，有变革之能，适合创新行业',
      level: '中'
    });
  }

  // 28. 机巨同临格：天机巨门同在命宫
  if (hasStarInMing('天机') && hasStarInMing('巨门')) {
    patterns.push({
      name: '机巨同临格',
      desc: '天机巨门同坐命宫，主聪明善辩，但多疑多虑，适合研究法律',
      level: '中'
    });
  }

  // 29. 同巨同宫格：天同巨门同在命宫
  if (hasStarInMing('天同') && hasStarInMing('巨门')) {
    patterns.push({
      name: '同巨同宫格',
      desc: '天同巨门同坐命宫，主人温和但有口舌之忧，需注意沟通',
      level: '中'
    });
  }

  // 30. 武曲贪狼格：武曲贪狼同在命宫
  if (hasStarInMing('武曲') && hasStarInMing('贪狼')) {
    patterns.push({
      name: '武贪同宫格',
      desc: '武曲贪狼同坐命宫，主有偏财运，适合经营投机，晚发之命',
      level: '吉'
    });
  }

  // 如果没有格局，返回基本信息
  if (patterns.length === 0) {
    var mainStar = mgStars[0] || '无主星';
    patterns.push({
      name: mainStar + '坐命',
      desc: '命宫主星为' + mainStar + '，未构成传统著名格局，以星曜特质论命',
      level: '平'
    });
  }

  // 排序：吉 > 中 > 凶
  var levelOrder = { '吉': 0, '中': 1, '平': 2, '凶': 3 };
  patterns.sort(function(a, b) {
    return (levelOrder[a.level] || 2) - (levelOrder[b.level] || 2);
  });

  var mainPattern = patterns[0];
  var secondaryPatterns = patterns.slice(1).map(function(p) { return p.name; });

  return {
    mainPattern: mainPattern.name,
    mainDesc: mainPattern.desc,
    mainLevel: mainPattern.level,
    secondaryPatterns: secondaryPatterns,
    allPatterns: patterns,
    summary: mainPattern.name + (patterns.length > 1 ? ' · 兼' + secondaryPatterns.slice(0, 3).join('、') : '')
  };
}
