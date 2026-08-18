/**
 * 八字排盘引擎
 * 公历日期 → 四柱八字 → 大运推算
 *
 * 四柱：年柱、月柱、日柱、时柱
 * 大运：从月柱起，阳男阴女顺行，阴男阳女逆行
 */

// ============ 天干地支 ============

var BC_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var BC_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

var BC_STEM_ELEMENTS = {
  '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土',
  '庚':'金','辛':'金','壬':'水','癸':'水'
};

var BC_BRANCH_ELEMENTS = {
  '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火',
  '午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'
};

var BC_STEM_YINYANG = {
  '甲':'阳','乙':'阴','丙':'阳','丁':'阴','戊':'阳','己':'阴',
  '庚':'阳','辛':'阴','壬':'阳','癸':'阴'
};

// ============ 纳音五行表 ============

var NAYIN_TABLE = [
  '海中金','海中金','炉中火','炉中火','大林木','大林木','路旁土','路旁土','剑锋金','剑锋金',
  '山头火','山头火','涧下水','涧下水','城头土','城头土','白蜡金','白蜡金','杨柳木','杨柳木',
  '泉中水','泉中水','屋上土','屋上土','霹雳火','霹雳火','松柏木','松柏木','长流水','长流水',
  '沙中金','沙中金','山下火','山下火','平地木','平地木','壁上土','壁上土','金箔金','金箔金',
  '覆灯火','覆灯火','天河水','天河水','大驿土','大驿土','钗钏金','钗钏金','桑柘木','桑柘木',
  '大溪水','大溪水','沙中土','沙中土','天上火','天上火','石榴木','石榴木','大海水','大海水'
];

function getNayin(stem, branch) {
  var stemIdx = BC_STEMS.indexOf(stem);
  var branchIdx = BC_BRANCHES.indexOf(branch);
  var ganzhiIdx = (stemIdx % 10) === (branchIdx % 10)
    ? stemIdx  // valid pair (same parity)
    : -1;
  // 60甲子索引 = stemIdx + 6 * (branchIdx - stemIdx/2 ... )
  // 实际: 干支索引 = (stemIdx % 5) * 12 + branchIdx... 不对
  // 正确算法: stemIdx和branchIdx奇偶相同, ganzhiIdx = (stemIdx * 12 - branchIdx * 10 + 60) % 60 / 2
  // 简化: 查表
  var idx = ((stemIdx % 10 - branchIdx % 12 + 60) % 60);
  // 60甲子: 甲子=0, 乙丑=1, 丙寅=2...
  // stem cycles 0-9, branch cycles 0-11, same parity
  // ganzhi index = (6 * (stemIdx - branchIdx % 2... 不对
  // 正确: ganzhi_idx = (stemIdx + 10 * k) where (stemIdx + 10*k) % 12 == branchIdx
  for (var k = 0; k < 6; k++) {
    if ((stemIdx + 10 * k) % 12 === branchIdx) {
      return NAYIN_TABLE[stemIdx + 10 * k];
    }
  }
  return '未知';
}

// ============ 十二长生 ============
// 阳干顺行, 阴干逆行
var CHANG_SHENG_TABLE = {
  '甲': { start: '亥', dir: 1 },  // 阳木 长生在亥 顺行
  '丙': { start: '寅', dir: 1 },  // 阳火 长生在寅
  '戊': { start: '寅', dir: 1 },  // 阳土 长生在寅
  '庚': { start: '巳', dir: 1 },  // 阳金 长生在巳
  '壬': { start: '申', dir: 1 },  // 阳水 长生在申
  '乙': { start: '午', dir: -1 }, // 阴木 长生在午 逆行
  '丁': { start: '酉', dir: -1 }, // 阴火 长生在酉
  '己': { start: '酉', dir: -1 }, // 阴土 长生在酉
  '辛': { start: '子', dir: -1 }, // 阴金 长生在子
  '癸': { start: '卯', dir: -1 }  // 阴水 长生在卯
};

var SHI_ER_CHANG_SHENG = [
  '长生','沐浴','冠带','临官','帝旺','衰','病','死','墓','绝','胎','养'
];

function getChangSheng(dayStem, branch) {
  var config = CHANG_SHENG_TABLE[dayStem];
  if (!config) return '未知';
  var startIdx = BC_BRANCHES.indexOf(config.start);
  var branchIdx = BC_BRANCHES.indexOf(branch);
  var offset = config.dir === 1
    ? (branchIdx - startIdx + 12) % 12
    : (startIdx - branchIdx + 12) % 12;
  return SHI_ER_CHANG_SHENG[offset];
}

// ============ 神煞 ============

// 天乙贵人
var TIAN_YI_GUI_REN = {
  '甲': ['未','丑'], '乙': ['申','子'], '丙': ['酉','亥'], '丁': ['酉','亥'],
  '戊': ['未','丑'], '己': ['申','子'], '庚': ['未','丑'], '辛': ['寅','午'],
  '壬': ['卯','巳'], '癸': ['卯','巳']
};

// 文昌贵人
var WEN_CHANG = {
  '甲':'巳','乙':'午','丙':'申','丁':'酉','戊':'申','己':'酉','庚':'亥','辛':'子','壬':'寅','癸':'卯'
};

// 羊刃
var YANG_REN = {
  '甲':'卯','乙':'辰','丙':'午','丁':'未','戊':'午','己':'未','庚':'酉','辛':'戌','壬':'子','癸':'丑'
};

// 桃花 (寅午戌→卯, 巳酉丑→午, 申子辰→酉, 亥卯未→子)
var TAO_HUA_GROUP = {
  '寅':'卯','午':'卯','戌':'卯',
  '巳':'午','酉':'午','丑':'午',
  '申':'酉','子':'酉','辰':'酉',
  '亥':'子','卯':'子','未':'子'
};

// 驿马 (寅午戌→申, 巳酉丑→亥, 申子辰→寅, 亥卯未→巳)
var YI_MA_GROUP = {
  '寅':'申','午':'申','戌':'申',
  '巳':'亥','酉':'亥','丑':'亥',
  '申':'寅','子':'寅','辰':'寅',
  '亥':'巳','卯':'巳','未':'巳'
};

// 华盖 (寅午戌→戌, 巳酉丑→丑, 申子辰→辰, 亥卯未→未)
var HUA_GAI_GROUP = {
  '寅':'戌','午':'戌','戌':'戌',
  '巳':'丑','酉':'丑','丑':'丑',
  '申':'辰','子':'辰','辰':'辰',
  '亥':'未','卯':'未','未':'未'
};

// 将星 (寅午戌→午, 巳酉丑→酉, 申子辰→子, 亥卯未→卯)
var JIANG_XING_GROUP = {
  '寅':'午','午':'午','戌':'午',
  '巳':'酉','酉':'酉','丑':'酉',
  '申':'子','子':'子','辰':'子',
  '亥':'卯','卯':'卯','未':'卯'
};

// 劫煞 (寅午戌→亥, 巳酉丑→寅, 申子辰→巳, 亥卯未→申)
var JIE_SHA_GROUP = {
  '寅':'亥','午':'亥','戌':'亥',
  '巳':'寅','酉':'寅','丑':'寅',
  '申':'巳','子':'巳','辰':'巳',
  '亥':'申','卯':'申','未':'申'
};

// 亡神 (寅午戌→巳, 巳酉丑→申, 申子辰→亥, 亥卯未→寅)
var WANG_SHEN_GROUP = {
  '寅':'巳','午':'巳','戌':'巳',
  '巳':'申','酉':'申','丑':'申',
  '申':'亥','子':'亥','辰':'亥',
  '亥':'寅','卯':'寅','未':'寅'
};

// 红鸾 (以年支推算)
var HONG_LUAN = {
  '子':'卯','丑':'寅','寅':'丑','卯':'子','辰':'亥','巳':'戌',
  '午':'酉','未':'申','申':'未','酉':'午','戌':'巳','亥':'辰'
};

// 天喜 (红鸾对宫)
var TIAN_XI = {
  '子':'酉','丑':'申','寅':'未','卯':'午','辰':'巳','巳':'辰',
  '午':'卯','未':'寅','申':'丑','酉':'子','戌':'亥','亥':'戌'
};

// 空亡 (以日柱推算, 旬空)
var XUN_KONG = [
  ['戌','亥'], // 甲子旬(0-9): 空戌亥
  ['申','酉'], // 甲戌旬(10-19)
  ['午','未'], // 甲申旬(20-29)
  ['辰','巳'], // 甲午旬(30-39)
  ['寅','卯'], // 甲辰旬(40-49)
  ['子','丑']  // 甲寅旬(50-59)
];

function getKongWang(dayStem, dayBranch) {
  var stemIdx = BC_STEMS.indexOf(dayStem);
  var branchIdx = BC_BRANCHES.indexOf(dayBranch);
  // 找到所属旬
  for (var k = 0; k < 6; k++) {
    var ganzhiIdx = stemIdx + 10 * k;
    if (ganzhiIdx % 12 === branchIdx) {
      var xunIdx = Math.floor(ganzhiIdx / 10);
      return XUN_KONG[xunIdx];
    }
  }
  return [];
}

function calculateShensha(chart) {
  var dm = chart.dayMaster;
  var yearBranch = chart.yearPillar.branch;
  var dayBranch = chart.dayPillar.branch;
  var monthBranch = chart.monthPillar.branch;
  var hourBranch = chart.hourPillar.branch;

  var branches = [yearBranch, monthBranch, dayBranch, hourBranch];
  var pillarNames = ['年柱', '月柱', '日柱', '时柱'];

  var shensha = [];

  // 天乙贵人 (以日干查)
  var tyg = TIAN_YI_GUI_REN[dm] || [];
  tyg.forEach(function(b) {
    if (branches.indexOf(b) >= 0) {
      shensha.push({ name: '天乙贵人', branch: b, pillar: pillarNames[branches.indexOf(b)], desc: '逢凶化吉, 贵人相助' });
    }
  });

  // 文昌 (以日干查)
  var wc = WEN_CHANG[dm];
  if (wc && branches.indexOf(wc) >= 0) {
    shensha.push({ name: '文昌', branch: wc, pillar: pillarNames[branches.indexOf(wc)], desc: '聪明好学, 文采出众' });
  }

  // 羊刃 (以日干查)
  var yr = YANG_REN[dm];
  if (yr && branches.indexOf(yr) >= 0) {
    shensha.push({ name: '羊刃', branch: yr, pillar: pillarNames[branches.indexOf(yr)], desc: '刚毅果断, 易有刑伤' });
  }

  // 桃花 (以年支和日支查)
  var th = TAO_HUA_GROUP[yearBranch];
  if (th && branches.indexOf(th) >= 0) {
    shensha.push({ name: '桃花', branch: th, pillar: pillarNames[branches.indexOf(th)], desc: '人缘好, 异性缘佳' });
  }

  // 驿马 (以年支和日支查)
  var ym = YI_MA_GROUP[yearBranch];
  if (ym && branches.indexOf(ym) >= 0) {
    shensha.push({ name: '驿马', branch: ym, pillar: pillarNames[branches.indexOf(ym)], desc: '奔波走动, 出行有利' });
  }

  // 华盖 (以年支和日支查)
  var hg = HUA_GAI_GROUP[yearBranch];
  if (hg && branches.indexOf(hg) >= 0) {
    shensha.push({ name: '华盖', branch: hg, pillar: pillarNames[branches.indexOf(hg)], desc: '聪明孤僻, 喜宗教艺术' });
  }

  // 将星
  var jx = JIANG_XING_GROUP[yearBranch];
  if (jx && branches.indexOf(jx) >= 0) {
    shensha.push({ name: '将星', branch: jx, pillar: pillarNames[branches.indexOf(jx)], desc: '有领导力, 权威显赫' });
  }

  // 劫煞
  var js = JIE_SHA_GROUP[yearBranch];
  if (js && branches.indexOf(js) >= 0) {
    shensha.push({ name: '劫煞', branch: js, pillar: pillarNames[branches.indexOf(js)], desc: '易有意外损失, 需防破财' });
  }

  // 亡神
  var ws = WANG_SHEN_GROUP[yearBranch];
  if (ws && branches.indexOf(ws) >= 0) {
    shensha.push({ name: '亡神', branch: ws, pillar: pillarNames[branches.indexOf(ws)], desc: '易有失意, 需防口舌' });
  }

  // 红鸾 (以年支查)
  var hl = HONG_LUAN[yearBranch];
  if (hl && branches.indexOf(hl) >= 0) {
    shensha.push({ name: '红鸾', branch: hl, pillar: pillarNames[branches.indexOf(hl)], desc: '婚姻喜庆, 感情顺遂' });
  }

  // 天喜 (以年支查)
  var tx = TIAN_XI[yearBranch];
  if (tx && branches.indexOf(tx) >= 0) {
    shensha.push({ name: '天喜', branch: tx, pillar: pillarNames[branches.indexOf(tx)], desc: '喜庆吉利, 婚姻有成' });
  }

  // 空亡 (以日柱查)
  var kw = getKongWang(chart.dayPillar.stem, chart.dayPillar.branch);
  kw.forEach(function(b) {
    if (branches.indexOf(b) >= 0) {
      shensha.push({ name: '空亡', branch: b, pillar: pillarNames[branches.indexOf(b)], desc: '逢空则虚, 吉凶减半' });
    }
  });

  return shensha;
}

// ============ 时辰转换 ============

var SHICHEN_NAMES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var SHICHEN_RANGES = [
  '23:00-01:00','01:00-03:00','03:00-05:00','05:00-07:00',
  '07:00-09:00','09:00-11:00','11:00-13:00','13:00-15:00',
  '15:00-17:00','17:00-19:00','19:00-21:00','21:00-23:00'
];

function getShichen(hour) {
  var zi = (hour + 1) % 24;
  return Math.floor(zi / 2);
}

// ============ 日柱计算 ============
// 基准日：2000-01-07 = 庚辰日（索引46）
// 60甲子索引：甲子=0, 乙丑=1, ..., 庚辰=16...
// 实际：2000-01-07 对应 干支索引 = 16

function getDayGanZhi(year, month, day) {
  // 使用已知基准日
  // 2000-01-01 = 戊午日，60甲子索引=54
  var baseDate = new Date(2000, 0, 1);
  var targetDate = new Date(year, month - 1, day);
  var diffDays = Math.round((targetDate - baseDate) / (1000 * 60 * 60 * 24));
  var index = ((54 + diffDays) % 60 + 60) % 60;

  var stemIdx = index % 10;
  var branchIdx = index % 12;

  return {
    stem: BC_STEMS[stemIdx],
    branch: BC_BRANCHES[branchIdx],
    stemIdx: stemIdx,
    branchIdx: branchIdx,
    ganzhiIdx: index
  };
}

// ============ 年柱计算 ============

function getYearGanZhi(year, month, day) {
  var adjustedYear = year;
  // 使用精确节气计算立春
  if (window.LunarCalendar) {
    var monthInfo = LunarCalendar.getMonthInfo(year, month, day);
    adjustedYear = monthInfo.passedLiChun ? year : year - 1;
  } else {
    // 回退：2月4日前算上一年
    if (month === 1 || (month === 2 && day < 4)) adjustedYear = year - 1;
  }

  var stemIdx = (adjustedYear - 4 + 10000) % 10;
  var branchIdx = (adjustedYear - 4 + 10000) % 12;

  return {
    stem: BC_STEMS[stemIdx],
    branch: BC_BRANCHES[branchIdx],
    stemIdx: stemIdx,
    branchIdx: branchIdx
  };
}

// ============ 月柱计算 ============

// 节气月份（从寅月开始）
var SOLAR_TERM_MONTHS = [
  { name: '寅', start: { m: 2, d: 4 } },   // 立春
  { name: '卯', start: { m: 3, d: 6 } },   // 惊蛰
  { name: '辰', start: { m: 4, d: 5 } },   // 清明
  { name: '巳', start: { m: 5, d: 5 } },   // 立夏
  { name: '午', start: { m: 6, d: 6 } },   // 芒种
  { name: '未', start: { m: 7, d: 7 } },   // 小暑
  { name: '申', start: { m: 8, d: 8 } },   // 立秋
  { name: '酉', start: { m: 9, d: 8 } },   // 白露
  { name: '戌', start: { m: 10, d: 8 } },  // 寒露
  { name: '亥', start: { m: 11, d: 7 } },   // 立冬
  { name: '子', start: { m: 12, d: 7 } },   // 大雪
  { name: '丑', start: { m: 1, d: 6 } }     // 小寒
];

function getMonthBranch(year, month, day) {
  // 使用精确节气计算
  if (window.LunarCalendar) {
    var monthInfo = LunarCalendar.getMonthInfo(year, month, day);
    return monthInfo.branch;
  }
  // 回退到固定日期
  var date = month * 100 + day;
  for (var i = SOLAR_TERM_MONTHS.length - 1; i >= 0; i--) {
    var st = SOLAR_TERM_MONTHS[i];
    var stDate = st.start.m * 100 + st.start.d;
    if (date >= stDate) {
      return st.name;
    }
  }
  return '丑';
}

function getMonthGanZhi(year, month, day) {
  var yearGZ = getYearGanZhi(year, month, day);
  var yearStemIdx = yearGZ.stemIdx;

  var monthBranchName = getMonthBranch(year, month, day);
  var monthBranchIdx = BC_BRANCHES.indexOf(monthBranchName);

  // 五虎遁：年干 → 寅月天干起始
  var wuHuDunStart = {
    0: 2, 5: 2,   // 甲己 → 丙寅起
    1: 4, 6: 4,   // 乙庚 → 戊寅起
    2: 6, 7: 6,   // 丙辛 → 庚寅起
    3: 8, 8: 8,   // 丁壬 → 壬寅起
    4: 0, 9: 0    // 戊癸 → 甲寅起
  };

  var startStemIdx = wuHuDunStart[yearStemIdx];
  if (startStemIdx === undefined) startStemIdx = 2;

  // 寅月index = 2
  var offset = (monthBranchIdx - 2 + 12) % 12;
  var monthStemIdx = (startStemIdx + offset) % 10;

  return {
    stem: BC_STEMS[monthStemIdx],
    branch: monthBranchName,
    stemIdx: monthStemIdx,
    branchIdx: monthBranchIdx
  };
}

// ============ 时柱计算 ============

function getHourGanZhi(dayStem, hour) {
  var shichenIdx = getShichen(hour);
  var dayStemIdx = BC_STEMS.indexOf(dayStem);

  // 五鼠遁：日干 → 子时天干起始
  var wuShuDunStart = {
    0: 0, 5: 0,   // 甲己 → 甲子起
    1: 2, 6: 2,   // 乙庚 → 丙子起
    2: 4, 7: 4,   // 丙辛 → 戊子起
    3: 6, 8: 6,   // 丁壬 → 庚子起
    4: 8, 9: 8    // 戊癸 → 壬子起
  };

  var startStemIdx = wuShuDunStart[dayStemIdx];
  if (startStemIdx === undefined) startStemIdx = 0;

  var hourStemIdx = (startStemIdx + shichenIdx) % 10;

  return {
    stem: BC_STEMS[hourStemIdx],
    branch: BC_BRANCHES[shichenIdx],
    stemIdx: hourStemIdx,
    branchIdx: shichenIdx,
    shichenName: SHICHEN_NAMES[shichenIdx],
    shichenRange: SHICHEN_RANGES[shichenIdx]
  };
}

// ============ 四柱排盘 ============

function buildBaZiChart(year, month, day, hour, gender) {
  var yearGZ = getYearGanZhi(year, month, day);
  var monthGZ = getMonthGanZhi(year, month, day);
  var dayGZ = getDayGanZhi(year, month, day);
  var hourGZ = getHourGanZhi(dayGZ.stem, hour);

  var dayMaster = dayGZ.stem;
  var dmElement = BC_STEM_ELEMENTS[dayMaster];
  var dmYinYang = BC_STEM_YINYANG[dayMaster];

  // 纳音
  var yearNayin = getNayin(yearGZ.stem, yearGZ.branch);
  var monthNayin = getNayin(monthGZ.stem, monthGZ.branch);
  var dayNayin = getNayin(dayGZ.stem, dayGZ.branch);
  var hourNayin = getNayin(hourGZ.stem, hourGZ.branch);

  // 农历信息
  var lunarInfo = null;
  if (window.LunarCalendar) {
    lunarInfo = LunarCalendar.solar2lunar(year, month, day);
  }

  var chart = {
    yearPillar:   { stem: yearGZ.stem, branch: yearGZ.branch, nayin: yearNayin },
    monthPillar:  { stem: monthGZ.stem, branch: monthGZ.branch, nayin: monthNayin },
    dayPillar:    { stem: dayGZ.stem, branch: dayGZ.branch, nayin: dayNayin },
    hourPillar:   { stem: hourGZ.stem, branch: hourGZ.branch, nayin: hourNayin },
    dayMaster: dayMaster,
    dayMasterElement: dmElement,
    dayMasterYinYang: dmYinYang,
    gender: gender,
    birthInfo: { year: year, month: month, day: day, hour: hour, gender: gender },
    shichenName: hourGZ.shichenName,
    shichenRange: hourGZ.shichenRange,
    lunarInfo: lunarInfo
  };

  // 神煞
  chart.shensha = calculateShensha(chart);

  return chart;
}

// ============ 大运推算 ============

function calculateGrandCycles(chart) {
  var monthStemIdx = BC_STEMS.indexOf(chart.monthPillar.stem);
  var monthBranchIdx = BC_BRANCHES.indexOf(chart.monthPillar.branch);
  var yearStemIdx = BC_STEMS.indexOf(chart.yearPillar.stem);

  var yearStemYinYang = BC_STEM_YINYANG[chart.yearPillar.stem];
  var isMale = chart.gender === 'male';

  // 阳男阴女顺行，阴男阳女逆行
  var forward;
  if (yearStemYinYang === '阳') {
    forward = isMale; // 阳男顺行
  } else {
    forward = !isMale; // 阴女顺行
  }

  // 计算起运岁数
  // 简化：3天 = 1岁
  var birthDate = new Date(chart.birthInfo.year, chart.birthInfo.month - 1, chart.birthInfo.day);
  var startAge = calculateStartAge(birthDate, forward);

  // 推算8步大运
  var cycles = [];
  for (var i = 0; i < 8; i++) {
    var stemIdx, branchIdx;
    if (forward) {
      stemIdx = (monthStemIdx + i + 1) % 10;
      branchIdx = (monthBranchIdx + i + 1) % 12;
    } else {
      stemIdx = (monthStemIdx - i - 1 + 100) % 10;
      branchIdx = (monthBranchIdx - i - 1 + 100) % 12;
    }

    var ageStart = startAge + i * 10;
    var ageEnd = ageStart + 10;

    cycles.push({
      index: i + 1,
      ageStart: ageStart,
      ageEnd: ageEnd,
      stem: BC_STEMS[stemIdx],
      branch: BC_BRANCHES[branchIdx]
    });
  }

  return cycles;
}

function calculateStartAge(birthDate, forward) {
  // 简化计算：以出生日为基准，向前或向后找到最近的节气
  // 3天 = 1岁，1天 = 4个月，1时辰 = 10天

  // 简化版本：默认起运年龄为约5-8岁
  // 根据出生月份调整
  var month = birthDate.getMonth() + 1;
  var day = birthDate.getDate();

  // 简化：根据离最近节气的天数计算
  var nearestTerm = findNearestTerm(month, day);
  var daysDiff = Math.abs(nearestTerm.dayDiff);

  var startAge = Math.max(1, Math.round(daysDiff / 3));
  return Math.min(startAge, 10);
}

function findNearestTerm(month, day) {
  var dateVal = month * 100 + day;
  var nearest = { dayDiff: 30 };

  for (var i = 0; i < SOLAR_TERM_MONTHS.length; i++) {
    var st = SOLAR_TERM_MONTHS[i];
    var stVal = st.start.m * 100 + st.start.d;
    var diff = dateVal - stVal;
    if (Math.abs(diff) < Math.abs(nearest.dayDiff)) {
      nearest = { name: st.name, dayDiff: diff };
    }
  }

  return nearest;
}

// ============ 流年推算 ============

function calculateAnnual(year) {
  var stemIdx = (year - 4 + 10000) % 10;
  var branchIdx = (year - 4 + 10000) % 12;
  var zodiac = BC_BRANCHES[branchIdx];

  return {
    year: year,
    stem: BC_STEMS[stemIdx],
    branch: BC_BRANCHES[branchIdx],
    zodiac: zodiac
  };
}

// ============ 十神计算 ============

var GENERATES_BC = {'金':'水','水':'木','木':'火','火':'土','土':'金'};
var RESTRAINS_BC = {'金':'木','木':'土','土':'水','水':'火','火':'金'};

function getTenGodBC(dayMaster, targetStem) {
  if (dayMaster === targetStem) return '比肩';
  var dmEl = BC_STEM_ELEMENTS[dayMaster];
  var tgEl = BC_STEM_ELEMENTS[targetStem];
  var samePolarity = BC_STEM_YINYANG[dayMaster] === BC_STEM_YINYANG[targetStem];
  var sameElement = dmEl === tgEl;
  var iGenerate = GENERATES_BC[dmEl] === tgEl;
  var iRestrain = RESTRAINS_BC[dmEl] === tgEl;
  var restrainsMe = RESTRAINS_BC[tgEl] === dmEl;
  var generatesMe = GENERATES_BC[tgEl] === dmEl;

  if (sameElement) return samePolarity ? '比肩' : '劫财';
  if (iGenerate) return samePolarity ? '食神' : '伤官';
  if (iRestrain) return samePolarity ? '偏财' : '正财';
  if (restrainsMe) return samePolarity ? '七杀' : '正官';
  if (generatesMe) return samePolarity ? '偏印' : '正印';
  return '未知';
}

var BRANCH_HIDDEN_STEMS_BC = {
  '子':['癸'],'丑':['己','辛','癸'],"寅":['甲','丙','戊'],"卯":['乙'],
  '辰':['戊','乙','癸'],'巳':['丙','庚','戊'],'午':['丁','己'],'未':['己','丁','乙'],
  '申':['庚','壬','戊'],'酉':['辛'],'戌':['戊','辛','丁'],'亥':['壬','甲']
};

function getTenGodFromBranchBC(dayMaster, branch) {
  var hidden = BRANCH_HIDDEN_STEMS_BC[branch] || [];
  if (hidden.length === 0) return '未知';
  return getTenGodBC(dayMaster, hidden[0]);
}

// ============ 排盘信息完整化 ============

function getFullChartInfo(chart) {
  var dm = chart.dayMaster;
  var pillars = [
    { name: '年柱', ...chart.yearPillar, tenGod: getTenGodBC(dm, chart.yearPillar.stem) },
    { name: '月柱', ...chart.monthPillar, tenGod: getTenGodBC(dm, chart.monthPillar.stem) },
    { name: '日柱', ...chart.dayPillar, tenGod: '日主' },
    { name: '时柱', ...chart.hourPillar, tenGod: getTenGodBC(dm, chart.hourPillar.stem) }
  ];

  var hiddenTypes = ['主气', '中气', '余气'];

  pillars.forEach(function(p) {
    p.branchTenGod = getTenGodFromBranchBC(dm, p.branch);
    p.stemElement = BC_STEM_ELEMENTS[p.stem];
    p.branchElement = BC_BRANCH_ELEMENTS[p.branch];

    // 藏干 + 支神（每个藏干的十神）
    var hidden = BRANCH_HIDDEN_STEMS_BC[p.branch] || [];
    p.hiddenStems = hidden.map(function(hs, idx) {
      return {
        stem: hs,
        tenGod: getTenGodBC(dm, hs),
        type: hiddenTypes[idx] || '余气',
        element: BC_STEM_ELEMENTS[hs]
      };
    });

    // 十二长生（支神运程）
    p.changSheng = getChangSheng(dm, p.branch);

    // 纳音
    if (p.nayin) p.nayin = p.nayin;
  });

  return pillars;
}

// ============ 个人指导生成 ============

function generatePersonalGuidance(chart, trendResult) {
  var dm = chart.dayMaster;
  var dmEl = chart.dayMasterElement;
  var strength = trendResult ? trendResult.dayMasterInfo.strength : 'balanced';
  var fav = trendResult ? trendResult.favElements.favorable : [];
  var unfav = trendResult ? trendResult.favElements.unfavorable : [];

  var strengthLabel = {
    'strong': '身旺', 'slightlyStrong': '身偏旺', 'balanced': '中和',
    'slightlyWeak': '身偏弱', 'weak': '身弱'
  }[strength] || '中和';

  var guidance = {
    personality: '',
    career: '',
    wealth: '',
    marriage: '',
    health: '',
    luckDirection: '',
    favorableElements: fav,
    unfavorableElements: unfav
  };

  // 性格分析
  var personalityMap = {
    '甲': '直爽有仁心，向上生长如参天大树，领导力强',
    '乙': '柔韧有韧性，善于变通，如藤蔓适应环境',
    '丙': '热情奔放，光明磊落，有感染力',
    '丁': '温和细腻，内心有光，善于照亮他人',
    '戊': '厚重稳健，诚信可靠，有承载之德',
    '己': '踏实包容，善于滋养，低调务实',
    '庚': '刚毅果决，义气分明，有变革之力',
    '辛': '精致细腻，有珠宝之质，善于发现价值',
    '壬': '智慧通达，如江河奔流，善于应变',
    '癸': '柔润至极，善于滋润万物，直觉敏锐'
  };
  guidance.personality = '日主' + dm + '（' + dmEl + '），' + strengthLabel + '。' +
    (personalityMap[dm] || '性格特点鲜明') + '。';

  // 喜用五行方向
  var elementDirections = {
    '木': '东方', '火': '南方', '土': '中方/四隅', '金': '西方', '水': '北方'
  };
  var favDirs = fav.map(function(e) { return e + '（' + elementDirections[e] + '）'; }).join('、');
  guidance.luckDirection = '喜用五行：' + favDirs + '。宜多接触相应方位及颜色。';

  // 事业指导
  if (fav.includes(dmEl) || fav.includes(GENERATES_BC[dmEl])) {
    guidance.career = '适合从事与自身五行属性相关的行业，发挥自身优势。';
  } else {
    guidance.career = '宜从事喜用五行相关行业，以补命局之不足。';
  }

  var careerByElement = {
    '木': '教育、文化、出版、林业、服装',
    '火': '能源、电子、餐饮、传媒、照明',
    '土': '房地产、建筑、农业、矿产、仓储',
    '金': '金融、机械、五金、法律、军警',
    '水': '物流、旅游、贸易、水产、咨询'
  };
  var suitableCareers = fav.map(function(e) { return careerByElement[e]; }).filter(Boolean).join('、');
  if (suitableCareers) guidance.career += '适合行业：' + suitableCareers + '。';

  // 财运指导
  var wealthStar = (chart.gender === 'male') ? '正偏财' : '官杀';
  if (strength === 'strong' || strength === 'slightlyStrong') {
    guidance.wealth = '身旺能担财，财运较好，适合主动求财和投资理财。' +
      '注意比劫夺财，不宜过于张扬财富。';
  } else if (strength === 'weak' || strength === 'slightlyWeak') {
    guidance.wealth = '身弱担财有压力，宜稳扎稳打，不宜冒进投资。' +
      '宜合伙经营，借助他人之力。';
  } else {
    guidance.wealth = '中和之命，财运平稳。量入为出，适度理财即可。';
  }

  // 婚姻指导
  if (strength === 'strong' || strength === 'slightlyStrong') {
    guidance.marriage = '身旺者在婚姻中较为主观，宜学会包容退让，' +
      '选择能理解自己的伴侣。配偶宜柔顺。';
  } else if (strength === 'weak' || strength === 'slightlyWeak') {
    guidance.marriage = '身弱者在婚姻中需要依靠伴侣，宜选择能扶持自己的配偶。' +
      '夫妻宫逢冲需注意婚姻稳定。';
  } else {
    guidance.marriage = '婚姻运势平稳，注重沟通和理解即可。';
  }

  // 健康指导
  var healthByElement = {
    '木': '注意肝胆、筋骨系统，保持情志舒畅',
    '火': '注意心血管、眼睛、血液循环，避免过劳',
    '土': '注意脾胃、消化系统，饮食规律',
    '金': '注意肺部、呼吸系统、皮肤，防外伤',
    '水': '注意肾脏、泌尿系统、耳部，防寒'
  };
  var healthConcern = fav.map(function(e) { return healthByElement[e]; }).filter(Boolean).join('；');
  if (!healthConcern) healthConcern = healthByElement[dmEl] || '注意日常保健';
  guidance.health = '健康方面：' + healthConcern + '。' +
    '五行' + (fav.length > 0 ? '以' + fav.join('、') + '为调养重点' : '保持平衡') + '。';

  return guidance;
}

// ============ 整体命理总览 ============

function generateBaZiLifeReading(chart, grandCycles, yearlyTrends) {
  var dm = chart.dayMaster;
  var dmEl = chart.dayMasterElement;
  var dmYY = chart.dayMasterYinYang;
  var fiveElements = calculateFiveElements(chart);
  fiveElements.dmElement = dmEl;
  var dayMasterInfo = calculateDayMasterStrength(chart, fiveElements);
  var favResult = determineFavorableElements(dayMasterInfo.strength, fiveElements);
  var fav = favResult.favorable;
  var unfav = favResult.unfavorable;
  var strength = dayMasterInfo.strength;

  var strengthLabel = {
    'strong': '身旺', 'slightlyStrong': '身偏旺', 'balanced': '中和',
    'slightlyWeak': '身偏弱', 'weak': '身弱'
  }[strength] || '中和';

  // --- 一句话总结 ---
  var personalityMap = {
    '甲': '直爽仁厚', '乙': '柔韧善变', '丙': '热情光明', '丁': '温和细腻',
    '戊': '厚重稳健', '己': '踏实包容', '庚': '刚毅果决', '辛': '精致敏锐',
    '壬': '智慧通达', '癸': '柔润直觉'
  };
  var elementDir = { '木': '东方', '火': '南方', '土': '中枢', '金': '西方', '水': '北方' };
  var favDir = fav.map(function(e) { return elementDir[e]; }).join('、');

  // 缺失五行
  var missingElements = [];
  ['金','木','水','火','土'].forEach(function(e) {
    if ((fiveElements.counts[e] || 0) === 0) missingElements.push(e);
  });

  // 最旺五行
  var maxEl = '', maxVal = 0;
  Object.keys(fiveElements.counts).forEach(function(e) {
    if (fiveElements.counts[e] > maxVal) { maxVal = fiveElements.counts[e]; maxEl = e; }
  });

  var oneSentence = '日主' + dm + dmEl + '，' + strengthLabel +
    '，五行' + (missingElements.length > 0 ? '缺' + missingElements.join('、') : maxEl + '偏旺') +
    '，喜' + fav.join('、') + '，宜' + favDir + '发展，' +
    (personalityMap[dm] || '性格鲜明') + '，' +
    (strength === 'strong' || strength === 'slightlyStrong' ? '中年运势上扬' : '大运转入喜用后运势渐佳') +
    '。';

  // --- 人生各阶段 ---
  var lifeStages = [];
  var stageNames = ['少年运', '青年运', '中年运', '壮年运', '晚年运'];
  var stageAdvice = {
    'strong': '身旺宜注意克制冲动，凡事三思而后行',
    'slightlyStrong': '身偏旺运势不错，但需谦逊待人',
    'balanced': '中和之命运势平稳，稳中求进',
    'slightlyWeak': '身偏弱需待时而动，不宜冒进',
    'weak': '身弱宜守成，待大运扶身再进'
  };

  grandCycles.forEach(function(gc, idx) {
    var stageName = idx < stageNames.length ? stageNames[idx] : '晚年运';
    var gcEl = BC_STEM_ELEMENTS[gc.stem] + BC_BRANCH_ELEMENTS[gc.branch];
    var isFav = fav.indexOf(BC_STEM_ELEMENTS[gc.stem]) >= 0 || fav.indexOf(BC_BRANCH_ELEMENTS[gc.branch]) >= 0;
    var tenGod = getTenGodBC(dm, gc.stem);
    var branchTenGod = getTenGodFromBranchBC(dm, gc.branch);
    var changSheng = getChangSheng(dm, gc.branch);

    var luckLevel = '';
    var luckDesc = '';
    if (isFav) {
      luckLevel = '吉运';
      luckDesc = '此运' + fav.join('、') + '当令，运势顺遂，宜把握机遇、积极进取';
    } else {
      var unfavEl = BC_STEM_ELEMENTS[gc.stem];
      luckLevel = '平运';
      luckDesc = '此运' + gc.stem + gc.branch + '(' + gcEl + ')，十神为' + tenGod +
        '，' + (stageAdvice[strength] || '稳中求进');
    }

    // 长生阶段特殊提示
    var csAdvice = '';
    if (changSheng === '长生' || changSheng === '冠带' || changSheng === '临官' || changSheng === '帝旺') {
      csAdvice = '处于' + changSheng + '之地，精力旺盛，事业上升期';
    } else if (changSheng === '衰' || changSheng === '病' || changSheng === '死' || changSheng === '墓' || changSheng === '绝') {
      csAdvice = '处于' + changSheng + '之地，宜守不宜攻，注意健康';
    } else {
      csAdvice = '处于' + changSheng + '之地，运势平稳过渡';
    }

    lifeStages.push({
      name: stageName,
      ageRange: gc.ageStart + '-' + gc.ageEnd + '岁',
      ganzhi: gc.stem + gc.branch,
      tenGod: tenGod,
      changSheng: changSheng,
      luckLevel: luckLevel,
      summary: luckDesc,
      detail: csAdvice,
      isFavorable: isFav
    });
  });

  // --- 日常建议 ---
  var elementColors = { '木': '青/绿色', '火': '红/紫色', '土': '黄/棕色', '金': '白/银色', '水': '黑/蓝色' };
  var elementFood = { '木': '酸味食物、蔬菜', '火': '苦味食物、红色食材', '土': '甘味食物、根茎类', '金': '辛味食物、白色食材', '水': '咸味食物、黑色食材' };
  var elementActivity = { '木': '散步、园艺、接触自然', '火': '晒太阳、有氧运动', '土': '徒步、接触大地', '金': '器械运动、呼吸练习', '水': '游泳、近水活动' };

  var dailyAdvice = {
    color: '宜穿' + fav.map(function(e) { return elementColors[e]; }).join('、') + '衣物',
    direction: '出行宜朝' + favDir + '，居住宜选朝' + favDir + '的房间',
    diet: '饮食宜多食' + fav.map(function(e) { return elementFood[e]; }).join('、'),
    activity: '宜' + fav.map(function(e) { return elementActivity[e]; }).join('、'),
    social: strength === 'strong' || strength === 'slightlyStrong'
      ? '社交中宜谦逊，避免争强好胜'
      : '社交中宜主动结交贵人，多与' + fav.join('、') + '旺者来往',
    taboo: missingElements.length > 0
      ? '忌过度接触' + missingElements.join('、') + '相关事物'
      : '忌过度张扬，宜低调行事'
  };

  // --- 提升命格 ---
  var destinyImprovement = [];

  // 方位调整
  destinyImprovement.push({
    category: '方位调理',
    advice: '日常多朝' + favDir + '活动，办公桌或床位置宜朝' + favDir +
      '。若条件允许，可搬迁至出生地的' + favDir + '方位发展。'
  });

  // 颜色调理
  destinyImprovement.push({
    category: '颜色调理',
    advice: '日常穿着、家居装饰宜多用' + fav.map(function(e) { return elementColors[e]; }).join('、') +
      '，避免过多使用忌神颜色。'
  });

  // 行业调理
  var careerByElement = {
    '木': '教育、文化、出版、服装、林业',
    '火': '能源、电子、餐饮、传媒、照明',
    '土': '房地产、建筑、农业、矿产、仓储',
    '金': '金融、机械、五金、法律、军警',
    '水': '物流、旅游、贸易、水产、咨询'
  };
  var suitableCareers = fav.map(function(e) { return careerByElement[e]; }).filter(Boolean).join('、');
  destinyImprovement.push({
    category: '行业选择',
    advice: '适合从事与' + fav.join('、') + '五行相关的行业：' + suitableCareers + '。'
  });

  // 饮食调理
  destinyImprovement.push({
    category: '饮食调养',
    advice: '多食' + fav.map(function(e) { return elementFood[e]; }).join('、') +
      '，少食忌神五行对应的食物，以调和体质。'
  });

  // 社交调理
  destinyImprovement.push({
    category: '人际调理',
    advice: strength === 'strong' || strength === 'slightlyStrong'
      ? '身旺宜多结交比劫旺者(同五行)以外的朋友，选择能包容自己的伴侣。'
      : '身弱宜多与' + fav.join('、') + '旺者交往，选择能扶持自己的伴侣和合作伙伴。'
  });

  // 神煞特殊调理
  var hasTaoHua = chart.shensha.some(function(s) { return s.name === '桃花'; });
  var hasYiMa = chart.shensha.some(function(s) { return s.name === '驿马'; });
  var hasHuaGai = chart.shensha.some(function(s) { return s.name === '华盖'; });

  var shenshaAdvice = '';
  if (hasHuaGai) shenshaAdvice += '命带华盖，适合修行、研究玄学或艺术，可借此提升精神境界。';
  if (hasYiMa) shenshaAdvice += '命带驿马，宜多外出走动、旅行或从事流动性工作，有利运势。';
  if (hasTaoHua) shenshaAdvice += '命带桃花，可从事需要人际交往的工作，善用人缘提升事业。';
  if (shenshaAdvice) {
    destinyImprovement.push({
      category: '神煞调理',
      advice: shenshaAdvice
    });
  }

  // 流年提示
  var currentYearTip = '';
  if (yearlyTrends && yearlyTrends.length > 0) {
    var current = yearlyTrends.find(function(t) { return t.year === new Date().getFullYear(); });
    if (current) {
      var compIdx = current.trend.compositeIndex;
      var level = current.trend.trendLevel;
      currentYearTip = current.year + '年综合趋势指数' + compIdx + '，' + level.label +
        '。' + (compIdx >= 55 ? '今年运势不错，宜积极进取。' : '今年运势偏弱，宜稳守为主，不宜冒进。');
    }
  }

  return {
    oneSentenceSummary: oneSentence,
    lifeStages: lifeStages,
    dailyAdvice: dailyAdvice,
    destinyImprovement: destinyImprovement,
    currentYearTip: currentYearTip,
    strength: strengthLabel,
    pattern: determineBaZiPattern(chart),
    favorableElements: fav,
    unfavorableElements: unfav,
    missingElements: missingElements,
    personality: personalityMap[dm] || '性格鲜明'
  };
}

// ============ 八字格局判定 ============

function determineBaZiPattern(chart) {
  var dm = chart.dayMaster;
  var dmEl = BC_STEM_ELEMENTS[dm];
  var dmYY = BC_STEM_YINYANG[dm];
  var monthBranch = chart.monthPillar.branch;
  var hiddenStems = BRANCH_HIDDEN_STEMS_BC[monthBranch] || [];
  var monthStem = chart.monthPillar.stem;

  var patterns = [];
  var mainPattern = '';
  var patternDesc = '';

  var transparentStems = [];
  for (var i = 0; i < hiddenStems.length; i++) {
    var hs = hiddenStems[i];
    if (hs === monthStem || hs === chart.yearPillar.stem || hs === chart.hourPillar.stem) {
      transparentStems.push(hs);
    }
  }

  // 以本气为主格
  var mainHidden = hiddenStems[0];
  if (mainHidden) {
    var tenGod = getTenGodBC(dm, mainHidden);
    mainPattern = tenGod + '格';
  }

  // 特殊格局判定
  var allStems = [chart.yearPillar.stem, chart.monthPillar.stem, chart.dayPillar.stem, chart.hourPillar.stem];
  var allBranches = [chart.yearPillar.branch, chart.monthPillar.branch, chart.dayPillar.branch, chart.hourPillar.branch];

  // 比肩格/建禄格
  if (mainPattern === '比肩格') {
    if (monthBranch === getLuoLuPosition(dm)) {
      mainPattern = '建禄格';
      patternDesc = '月令为日主之禄，主自身强健，独立自主，适合创业';
    } else if (monthBranch === getYangRenPosition(dm)) {
      mainPattern = '月刃格（羊刃格）';
      patternDesc = '月令为日主之刃，主性格刚烈，武职利达，需官杀制伏';
    } else {
      mainPattern = '比肩格';
      patternDesc = '月令比肩，主为人刚健，独立自主';
    }
  }

  // 正官格
  if (mainPattern === '正官格') {
    patternDesc = '月令正官，主为人端正，守纪律，适合公职管理';
  }
  // 七杀格
  if (mainPattern === '七杀格') {
    mainPattern = '七杀格（偏官格）';
    patternDesc = '月令七杀，主为人刚烈果断，有将帅之才，需食神制杀或印化';
  }
  // 正财格
  if (mainPattern === '正财格') {
    patternDesc = '月令正财，主为人勤俭，财运稳定，适合经商理财';
  }
  // 偏财格
  if (mainPattern === '偏财格') {
    patternDesc = '月令偏财，主为人慷慨大方，财来财去，适合投资经营';
  }
  // 正印格
  if (mainPattern === '正印格') {
    patternDesc = '月令正印，主为人慈祥，学业有成，适合教育文化';
  }
  // 偏印格
  if (mainPattern === '偏印格') {
    mainPattern = '偏印格（枭神格）';
    patternDesc = '月令偏印，主为人聪慧多变，适合技艺宗教，忌见食神';
  }
  // 食神格
  if (mainPattern === '食神格') {
    patternDesc = '月令食神，主为人温和厚道，衣食丰足，适合艺术饮食';
  }
  // 伤官格
  if (mainPattern === '伤官格') {
    patternDesc = '月令伤官，主人才华横溢，桀骜不驯，宜伤官配印或伤官生财';

    // 伤官见官
    var hasZhengGuan = false;
    for (var j = 0; j < allStems.length; j++) {
      if (getTenGodBC(dm, allStems[j]) === '正官') hasZhengGuan = true;
    }
    if (hasZhengGuan) {
      patterns.push('伤官见官');
    }
  }

  // 特殊格局
  // 从格判定
  var elementCounts = {};
  allStems.forEach(function(s) {
    var el = BC_STEM_ELEMENTS[s];
    elementCounts[el] = (elementCounts[el] || 0) + 1;
  });
  allBranches.forEach(function(b) {
    var el = BC_BRANCH_ELEMENTS[b];
    elementCounts[el] = (elementCounts[el] || 0) + 1;
  });

  var dmCount = elementCounts[dmEl] || 0;
  var totalCount = 8;
  var isStrong = dmCount >= 5;

  // 从强格/从弱格
  var maxEl = dmEl;
  var maxCount = dmCount;
  for (var el in elementCounts) {
    if (elementCounts[el] > maxCount) {
      maxEl = el;
      maxCount = elementCounts[el];
    }
  }

  if (maxCount >= 7) {
    if (maxEl === dmEl) {
      patterns.unshift('从强格');
      patternDesc = '日主极旺，全盘同党，从强则贵，逆之则凶';
    } else if (maxEl === RESTRAINS_EL[dmEl]) {
      patterns.unshift('从杀格');
      patternDesc = '日主极弱，杀星极旺，从杀则贵，逆之则凶';
    } else if (maxEl === I_RESTRAIN_EL[dmEl]) {
      patterns.unshift('从财格');
      patternDesc = '日主极弱，财星极旺，从财则富，逆之则凶';
    } else if (maxEl === GENERATES_ME_EL[dmEl]) {
      patterns.unshift('从儿格');
      patternDesc = '日主极弱，食伤极旺，从儿则秀，逆之则凶';
    }
  }

  // 天干合化
  var stemCombinations = checkStemCombinations(allStems);
  patterns = patterns.concat(stemCombinations);

  // 地支冲合
  var branchCombinations = checkBranchCombinations(allBranches);
  patterns = patterns.concat(branchCombinations);

  // 三合局
  var sanHe = checkSanHe(allBranches);
  if (sanHe) patterns.push(sanHe);

  // 半合局
  var banHe = checkBanHe(allBranches);
  if (banHe) patterns.push(banHe);

  // 冲
  var chongs = checkChongs(allBranches);
  patterns = patterns.concat(chongs);

  // 刑
  var xings = checkXings(allBranches);
  patterns = patterns.concat(xings);

  // 害
  var hais = checkHais(allBranches);
  patterns = patterns.concat(hais);

  // 枭神夺食
  if (mainPattern === '偏印格') {
    var hasShiShen = false;
    allStems.forEach(function(s) {
      if (getTenGodBC(dm, s) === '食神') hasShiShen = true;
    });
    if (hasShiShen) patterns.push('枭神夺食');
  }

  // 伤官配印
  if (mainPattern.indexOf('伤官') >= 0) {
    var hasYin = false;
    allStems.forEach(function(s) {
      if (getTenGodBC(dm, s) === '正印' || getTenGodBC(dm, s) === '偏印') hasYin = true;
    });
    if (hasYin) patterns.push('伤官配印');
  }

  // 食神生财
  if (mainPattern === '食神格') {
    var hasCai = false;
    allStems.forEach(function(s) {
      if (getTenGodBC(dm, s) === '偏财' || getTenGodBC(dm, s) === '正财') hasCai = true;
    });
    if (hasCai) patterns.push('食神生财');
  }

  // 杀印相生
  if (mainPattern.indexOf('七杀') >= 0 || mainPattern.indexOf('偏官') >= 0) {
    var hasYin2 = false;
    allStems.forEach(function(s) {
      if (getTenGodBC(dm, s) === '正印' || getTenGodBC(dm, s) === '偏印') hasYin2 = true;
    });
    if (hasYin2) patterns.push('杀印相生');
  }

  // 财官双美
  var hasCai2 = false, hasGuan = false;
  allStems.forEach(function(s) {
    var tg = getTenGodBC(dm, s);
    if (tg === '正财' || tg === '偏财') hasCai2 = true;
    if (tg === '正官' || tg === '七杀') hasGuan = true;
  });
  if (hasCai2 && hasGuan) patterns.push('财官双美');

  // 返回格局结果
  return {
    mainPattern: mainPattern,
    description: patternDesc,
    secondaryPatterns: patterns.filter(function(p, i, arr) {
      return arr.indexOf(p) === i && p !== mainPattern;
    }),
    transparent: transparentStems,
    summary: mainPattern + (patterns.length > 0 ? ' · 兼' + patterns.slice(0, 3).join('、') : '')
  };
}

function getLuoLuPosition(stem) {
  var luos = { '甲':'寅','乙':'卯','丙':'巳','丁':'午','戊':'巳','己':'午','庚':'申','辛':'酉','壬':'亥','癸':'子' };
  return luos[stem] || '';
}

function getYangRenPosition(stem) {
  var yangrens = { '甲':'卯','乙':'寅','丙':'午','丁':'巳','戊':'午','己':'巳','庚':'酉','辛':'申','壬':'子','癸':'亥' };
  return yangrens[stem] || '';
}

var RESTRAINS_EL = { '木':'金','火':'水','土':'木','金':'火','水':'土' };
var I_RESTRAIN_EL = { '木':'土','火':'金','土':'水','金':'木','水':'火' };
var GENERATES_ME_EL = { '木':'水','火':'木','土':'火','金':'土','水':'金' };

function checkStemCombinations(stems) {
  var results = [];
  var pairs = [
    ['甲','己','甲己合化土'], ['乙','庚','乙庚合化金'],
    ['丙','辛','丙辛合化水'], ['丁','壬','丁壬合化木'], ['戊','癸','戊癸合化火']
  ];
  pairs.forEach(function(p) {
    if (stems.indexOf(p[0]) >= 0 && stems.indexOf(p[1]) >= 0) {
      results.push(p[2]);
    }
  });
  return results;
}

function checkBranchCombinations(branches) {
  var results = [];
  var liuHe = [
    ['子','丑','子丑合化土'], ['寅','亥','寅亥合化木'],
    ['卯','戌','卯戌合化火'], ['辰','酉','辰酉合化金'],
    ['巳','申','巳申合化水'], ['午','未','午未合化土']
  ];
  liuHe.forEach(function(p) {
    if (branches.indexOf(p[0]) >= 0 && branches.indexOf(p[1]) >= 0) {
      results.push(p[2]);
    }
  });
  return results;
}

function checkSanHe(branches) {
  var sanHeGroups = [
    { branches: ['申','子','辰'], result: '申子辰三合水局' },
    { branches: ['亥','卯','未'], result: '亥卯未三合木局' },
    { branches: ['寅','午','戌'], result: '寅午戌三合火局' },
    { branches: ['巳','酉','丑'], result: '巳酉丑三合金局' }
  ];
  for (var i = 0; i < sanHeGroups.length; i++) {
    var g = sanHeGroups[i];
    if (g.branches.every(function(b) { return branches.indexOf(b) >= 0; })) {
      return g.result;
    }
  }
  return null;
}

function checkBanHe(branches) {
  var pairs = [
    ['申','子','申子半合水'], ['子','辰','子辰半合水'],
    ['亥','卯','亥卯半合木'], ['卯','未','卯未半合木'],
    ['寅','午','寅午半合火'], ['午','戌','午戌半合火'],
    ['巳','酉','巳酉半合金'], ['酉','丑','酉丑半合金']
  ];
  for (var i = 0; i < pairs.length; i++) {
    if (branches.indexOf(pairs[i][0]) >= 0 && branches.indexOf(pairs[i][1]) >= 0) {
      return pairs[i][2];
    }
  }
  return null;
}

function checkChongs(branches) {
  var chongPairs = [
    ['子','午','子午冲'], ['丑','未','丑未冲'], ['寅','申','寅申冲'],
    ['卯','酉','卯酉冲'], ['辰','戌','辰戌冲'], ['巳','亥','巳亥冲']
  ];
  var results = [];
  chongPairs.forEach(function(p) {
    if (branches.indexOf(p[0]) >= 0 && branches.indexOf(p[1]) >= 0) {
      results.push(p[2]);
    }
  });
  return results;
}

function checkXings(branches) {
  var xingGroups = [
    { set: ['寅','巳','申'], name: '寅巳申三刑' },
    { set: ['丑','戌','未'], name: '丑戌未三刑' },
    { set: ['子','卯'], name: '子卯相刑' },
    { set: ['辰','辰'], name: '辰自刑' },
    { set: ['午','午'], name: '午自刑' },
    { set: ['酉','酉'], name: '酉自刑' },
    { set: ['亥','亥'], name: '亥自刑' }
  ];
  var results = [];
  xingGroups.forEach(function(g) {
    var hasAll = g.set.every(function(b) {
      return branches.filter(function(x) { return x === b; }).length >= (g.set.indexOf(b) === g.set.lastIndexOf(b) ? 1 : 2);
    });
    if (g.set.length === 2 && g.set[0] === g.set[1]) {
      if (branches.filter(function(x) { return x === g.set[0]; }).length >= 2) {
        results.push(g.name);
      }
    } else if (g.set.every(function(b) { return branches.indexOf(b) >= 0; })) {
      results.push(g.name);
    }
  });
  return results;
}

function checkHais(branches) {
  var haiPairs = [
    ['子','未','子未相害'], ['丑','午','丑午相害'],
    ['寅','巳','寅巳相害'], ['卯','辰','卯辰相害'],
    ['申','亥','申亥相害'], ['酉','戌','酉戌相害']
  ];
  var results = [];
  haiPairs.forEach(function(p) {
    if (branches.indexOf(p[0]) >= 0 && branches.indexOf(p[1]) >= 0) {
      results.push(p[2]);
    }
  });
  return results;
}

// ============ 八字当日运势 ============

function calculateBaZiDaily(chart) {
  var now = new Date();
  var utc = now.getTime() + now.getTimezoneOffset() * 60000;
  var beijing = new Date(utc + 8 * 3600000);
  var year = beijing.getFullYear();
  var month = beijing.getMonth() + 1;
  var day = beijing.getDate();
  var hour = beijing.getHours();

  var dayGZ = getDayGanZhi(year, month, day);
  var monthGZ = getMonthGanZhi(year, month, day);
  var yearGZ = getYearGanZhi(year, month, day);

  var dm = chart.dayMaster;
  var dayTenGod = getTenGodBC(dm, dayGZ.stem);
  var dayBranchTenGod = getTenGodFromBranchBC(dm, dayGZ.branch);
  var monthTenGod = getTenGodBC(dm, monthGZ.stem);

  var fortune = {};

  // 综合评分
  var score = 50;
  var factors = [];

  // 日干十神影响
  var tenGodScores = {
    '比肩': 5, '劫财': 0, '食神': 10, '伤官': 5,
    '偏财': 8, '正财': 12, '七杀': -5, '正官': 8,
    '偏印': 0, '正印': 10
  };
  var dayScore = tenGodScores[dayTenGod] || 0;
  score += dayScore;
  factors.push(dayTenGod + (dayScore >= 0 ? '+' : '') + dayScore);

  // 日支十神影响
  var branchScore = tenGodScores[dayBranchTenGod] || 0;
  score += Math.floor(branchScore * 0.5);
  factors.push(dayBranchTenGod + (branchScore >= 0 ? '+' : '') + Math.floor(branchScore * 0.5));

  // 生肖相合相冲
  var yearBranch = chart.yearPillar.branch;
  var dayBranch = dayGZ.branch;
  if (BRANCH_COMBINES_6_BC[yearBranch] === dayBranch) {
    score += 5;
    factors.push('生肖合+5');
  }
  if (BRANCH_CLASHES_BC[yearBranch] === dayBranch) {
    score -= 5;
    factors.push('生肖冲-5');
  }

  score = Math.max(10, Math.min(95, score));

  // 运势描述
  var luckLevel = score >= 75 ? '大吉' : score >= 60 ? '吉' : score >= 45 ? '平' : score >= 30 ? '小凶' : '凶';

  // 各方面运势
  var aspects = {};
  var favorableEl = chart.favorableElements || [];

  // 事业
  var careerTenGods = ['正官', '正印', '食神', '比肩'];
  aspects.career = careerTenGods.indexOf(dayTenGod) >= 0 ? '今日利于事业，可积极推进工作计划' :
    (dayTenGod === '七杀' ? '工作压力大，需谨慎行事' :
    dayTenGod === '伤官' ? '才华外露但易得罪人，注意言辞' :
    dayTenGod === '偏财' ? '适合商业谈判，有偏业之喜' : '事业平稳，按部就班');

  // 财运
  var wealthTenGods = ['正财', '偏财', '食神'];
  aspects.wealth = wealthTenGods.indexOf(dayTenGod) >= 0 ? '今日财运不错，适合理财投资' :
    (dayTenGod === '比肩' ? '花销增多，注意控制支出' :
    dayTenGod === '劫财' ? '破财之象，不宜大额消费' : '财运平稳');

  // 感情
  var loveTenGods = ['正财', '正官', '正印'];
  aspects.love = loveTenGods.indexOf(dayTenGod) >= 0 ? '今日感情运佳，适合约会表白' :
    (dayTenGod === '伤官' ? '易生口角，注意沟通方式' :
    dayTenGod === '七杀' ? '感情压力，多包容理解' : '感情平稳');

  // 健康
  aspects.health = dayTenGod === '七杀' ? '注意心血管和压力' :
    dayTenGod === '偏印' ? '注意精神状态，多休息' :
    dayTenGod === '食神' ? '脾胃运佳，饮食有节' : '健康平稳，注意作息';

  // 方位
  var dirMap = { '木':'东方', '火':'南方', '土':'中央', '金':'西方', '水':'北方' };
  var dayEl = BC_STEM_ELEMENTS[dayGZ.stem];
  aspects.direction = '今日利' + (dirMap[dayEl] || '中央') + '方';

  // 幸运色
  var colorMap = { '木':'青绿色', '火':'红色', '土':'黄色', '金':'白色', '水':'黑色' };
  aspects.color = colorMap[dayEl] || '黄色';

  return {
    date: year + '-' + month + '-' + day,
    dayGanzhi: dayGZ.stem + dayGZ.branch,
    monthGanzhi: monthGZ.stem + monthGZ.branch,
    yearGanzhi: yearGZ.stem + yearGZ.branch,
    dayTenGod: dayTenGod,
    monthTenGod: monthTenGod,
    score: score,
    luckLevel: luckLevel,
    factors: factors,
    aspects: aspects
  };
}

var BRANCH_COMBINES_6_BC = {
  '子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯',
  '辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午'
};
var BRANCH_CLASHES_BC = {
  '子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅',
  '卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'
};
