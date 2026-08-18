/**
 * 命理趋势参考指数评分引擎
 * 基于设计文档 numerology-trend-index.html 的评分模型实现
 *
 * 核心流程：八字排盘 → 基础分析 → 基础分 → 大运修正 → 流年修正 → 综合指数
 */

// ============ 天干地支基础数据 ============

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

const STEM_ELEMENTS = {
  '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土',
  '庚':'金','辛':'金','壬':'水','癸':'水'
};
const STEM_YIN_YANG = {
  '甲':'阳','乙':'阴','丙':'阳','丁':'阴','戊':'阳','己':'阴',
  '庚':'阳','辛':'阴','壬':'阳','癸':'阴'
};
const BRANCH_ELEMENTS = {
  '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火',
  '午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'
};
const BRANCH_HIDDEN_STEMS = {
  '子':['癸'],'丑':['己','辛','癸'],"寅":['甲','丙','戊'],"卯":['乙'],
  '辰':['戊','乙','癸'],'巳':['丙','庚','戊'],'午':['丁','己'],'未':['己','丁','乙'],
  '申':['庚','壬','戊'],'酉':['辛'],'戌':['戊','辛','丁'],'亥':['壬','甲']
};

// 五行生克关系
const GENERATES = {'金':'水','水':'木','木':'火','火':'土','土':'金'};
const RESTRAINS = {'金':'木','木':'土','土':'水','水':'火','火':'金'};

// 地支冲合刑害
const BRANCH_CLASHES = {
  '子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅',
  '卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'
};
const BRANCH_COMBINES_6 = {
  '子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯',
  '辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午'
};

// ============ 十神计算 ============

function getTenGod(dayMaster, targetStem) {
  if (dayMaster === targetStem) return '比肩';
  const dmEl = STEM_ELEMENTS[dayMaster];
  const tgEl = STEM_ELEMENTS[targetStem];
  const samePolarity = STEM_YIN_YANG[dayMaster] === STEM_YIN_YANG[targetStem];
  const sameElement = dmEl === tgEl;
  const iGenerate = GENERATES[dmEl] === tgEl;
  const iRestrain = RESTRAINS[dmEl] === tgEl;
  const restrainsMe = RESTRAINS[tgEl] === dmEl;
  const generatesMe = GENERATES[tgEl] === dmEl;

  if (sameElement) return samePolarity ? '比肩' : '劫财';
  if (iGenerate) return samePolarity ? '食神' : '伤官';
  if (iRestrain) return samePolarity ? '偏财' : '正财';
  if (restrainsMe) return samePolarity ? '七杀' : '正官';
  if (generatesMe) return samePolarity ? '偏印' : '正印';
  return '未知';
}

function getTenGodFromBranch(dayMaster, branch) {
  var hidden = BRANCH_HIDDEN_STEMS[branch] || [];
  if (hidden.length === 0) return '未知';
  return getTenGod(dayMaster, hidden[0]);
}

// ============ 五行分布计算 ============

function calculateFiveElements(chart) {
  var counts = {'金':0,'水':0,'木':0,'火':0,'土':0};
  var pillars = [chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar];

  pillars.forEach(function(p) {
    var stemEl = STEM_ELEMENTS[p.stem];
    var branchEl = BRANCH_ELEMENTS[p.branch];
    counts[stemEl] += 1.0;
    counts[branchEl] += 0.7;
    var hidden = BRANCH_HIDDEN_STEMS[p.branch] || [];
    hidden.forEach(function(hs, idx) {
      var hEl = STEM_ELEMENTS[hs];
      var weight = [0.6, 0.3, 0.1][idx] || 0.1;
      counts[hEl] += weight * 0.5;
    });
  });

  var total = Object.values(counts).reduce(function(a,b){return a+b;}, 0);
  var balance = 1 - (stdDev(Object.values(counts)) / (total / 5 + 0.01));
  return { counts: counts, total: total, balance: Math.max(0, Math.min(1, balance)) };
}

function stdDev(arr) {
  var mean = arr.reduce(function(a,b){return a+b;}, 0) / arr.length;
  var variance = arr.reduce(function(a,b){return a + Math.pow(b-mean,2);}, 0) / arr.length;
  return Math.sqrt(variance);
}

// ============ 日主强弱判定 ============

function calculateDayMasterStrength(chart, fiveElements) {
  var dm = chart.dayMaster;
  var dmEl = STEM_ELEMENTS[dm];
  var monthBranch = chart.monthPillar.branch;
  var monthEl = BRANCH_ELEMENTS[monthBranch];

  // 得令：日干生月当令
  var deLing = 0;
  if (monthEl === dmEl) deLing = 30;
  else if (GENERATES[monthEl] === dmEl) deLing = 20;
  else if (RESTRAINS[monthEl] === dmEl) deLing = -5;
  else if (RESTRAINS[dmEl] === monthEl) deLing = -10;

  // 得地：地支中有根
  var deDi = 0;
  var pillars = [chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar];
  pillars.forEach(function(p) {
    var bEl = BRANCH_ELEMENTS[p.branch];
    if (bEl === dmEl) deDi += 12;
    if (GENERATES[bEl] === dmEl) deDi += 8;
    var hidden = BRANCH_HIDDEN_STEMS[p.branch] || [];
    hidden.forEach(function(hs) {
      if (STEM_ELEMENTS[hs] === dmEl) deDi += 5;
    });
  });
  deDi = Math.min(deDi, 35);

  // 得势：天干同类或生扶（跳过日柱本身，但计算其他柱同干）
  var deShi = 0;
  pillars.forEach(function(p, idx) {
    if (idx === 2) return;
    var sEl = STEM_ELEMENTS[p.stem];
    if (sEl === dmEl) deShi += 10;
    if (GENERATES[sEl] === dmEl) deShi += 8;
    // 地支藏干同类也计入得势
    var hidden = BRANCH_HIDDEN_STEMS[p.branch] || [];
    hidden.forEach(function(hs) {
      var hEl = STEM_ELEMENTS[hs];
      if (hEl === dmEl) deShi += 3;
      if (GENERATES[hEl] === dmEl) deShi += 2;
    });
  });
  deShi = Math.min(deShi, 30);

  var score = Math.max(0, deLing + deDi + deShi);

  var strength;
  if (score >= 65) strength = 'strong';
  else if (score >= 50) strength = 'slightlyStrong';
  else if (score >= 35) strength = 'balanced';
  else if (score >= 20) strength = 'slightlyWeak';
  else strength = 'weak';

  return { score: score, strength: strength, deLing: deLing, deDi: deDi, deShi: deShi };
}

// ============ 喜用神判定 ============

function findGenerator(el) {
  for (var k in GENERATES) { if (GENERATES[k] === el) return k; }
  return null;
}
function findRestrainter(el) {
  for (var k in RESTRAINS) { if (RESTRAINS[k] === el) return k; }
  return null;
}

function determineFavorableElements(strength, fiveElements) {
  var dmEl = fiveElements.dmElement;
  var favorable = [], unfavorable = [];

  // 生我 = findGenerator(dmEl), 克我 = findRestrainter(dmEl)
  // 同我 = dmEl, 我生 = GENERATES[dmEl], 我克 = RESTRAINS[dmEl]

  if (strength === 'strong' || strength === 'slightlyStrong') {
    // 身旺喜克泄耗：克我(官杀)、我生(食伤)、我克(财星)
    favorable.push(findRestrainter(dmEl), GENERATES[dmEl], RESTRAINS[dmEl]);
    // 忌生扶：生我(印星)、同我(比劫)
    unfavorable.push(findGenerator(dmEl), dmEl);
  } else if (strength === 'weak' || strength === 'slightlyWeak') {
    // 身弱喜生扶：生我(印星)、同我(比劫)
    favorable.push(findGenerator(dmEl), dmEl);
    // 忌克泄耗：克我(官杀)、我生(食伤)、我克(财星)
    unfavorable.push(findRestrainter(dmEl), GENERATES[dmEl], RESTRAINS[dmEl]);
  } else {
    // 中和：检查日主五行占比，偏高按旺论，偏低按弱论
    var total = Object.values(fiveElements.counts).reduce(function(a,b){return a+b;}, 0);
    var dmElPct = fiveElements.counts[dmEl] / total;
    if (dmElPct > 0.35) {
      favorable.push(findRestrainter(dmEl), GENERATES[dmEl], RESTRAINS[dmEl]);
      unfavorable.push(findGenerator(dmEl), dmEl);
    } else if (dmElPct < 0.12) {
      favorable.push(findGenerator(dmEl), dmEl);
      unfavorable.push(findRestrainter(dmEl), GENERATES[dmEl], RESTRAINS[dmEl]);
    } else {
      var sorted = Object.entries(fiveElements.counts).sort(function(a,b){return a[1]-b[1];});
      favorable.push(sorted[0][0]);
      unfavorable.push(sorted[sorted.length-1][0]);
    }
  }

  return {
    favorable: Array.from(new Set(favorable)),
    unfavorable: Array.from(new Set(unfavorable))
  };
}

// ============ 基础分计算 ============

function calculateBaseScore(chart, fiveElements, dayMasterInfo, favElements, dimension) {
  var dm = chart.dayMaster;
  var pillars = [chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar];
  var allStems = pillars.map(function(p){return p.stem;});
  var allBranches = pillars.map(function(p){return p.branch;});
  var fav = favElements.favorable;
  var unfav = favElements.unfavorable;
  var score = 50;

  function getStarStrength(tenGodType) {
    var count = 0;
    var strong = false;
    allStems.forEach(function(s) {
      if (s !== dm) {
        var tg = getTenGod(dm, s);
        if (tg === tenGodType || (tenGodType === 'authority' && (tg === '正官' || tg === '七杀'))
            || (tenGodType === 'wealth' && (tg === '正财' || tg === '偏财'))
            || (tenGodType === 'resource' && (tg === '正印' || tg === '偏印'))
            || (tenGodType === 'expression' && (tg === '食神' || tg === '伤官'))
            || (tenGodType === 'companion' && (tg === '比肩' || tg === '劫财'))) {
          count++;
          if (fav.includes(STEM_ELEMENTS[s])) strong = true;
        }
      }
    });
    allBranches.forEach(function(b) {
      var bEl = BRANCH_ELEMENTS[b];
      var tg = getTenGodFromBranch(dm, b);
      var matched = false;
      if (tenGodType === 'authority' && (tg === '正官' || tg === '七杀')) { count += 0.5; matched = true; }
      if (tenGodType === 'wealth' && (tg === '正财' || tg === '偏财')) { count += 0.5; matched = true; }
      if (tenGodType === 'resource' && (tg === '正印' || tg === '偏印')) { count += 0.5; matched = true; }
      if (tenGodType === 'expression' && (tg === '食神' || tg === '伤官')) { count += 0.5; matched = true; }
      if (tenGodType === 'companion' && (tg === '比肩' || tg === '劫财')) { count += 0.5; matched = true; }
      if (matched && fav.includes(bEl)) strong = true;
      if (matched && unfav.includes(bEl)) strong = false;
    });
    return { count: count, isFavorable: strong, isPresent: count > 0 };
  }

  function applyStarAdjust(starInfo, strongAdj, midAdj, weakAdj, unfavAdj, noneAdj) {
    if (!starInfo.isPresent) { score += noneAdj; return; }
    if (starInfo.isFavorable) {
      if (starInfo.count >= 2) score += strongAdj;
      else if (starInfo.count >= 1) score += midAdj;
      else score += weakAdj;
    } else {
      score += unfavAdj;
    }
  }

  switch(dimension) {
    case 'career':
      var authority = getStarStrength('authority');
      var resource = getStarStrength('resource');
      var expression = getStarStrength('expression');
      applyStarAdjust(authority, 25, 15, 5, -15, 0);
      applyStarAdjust(resource, 18, 10, 3, -12, 0);
      applyStarAdjust(expression, 12, 8, 3, -8, 0);
      // 特殊组合
      var hasAuthority = authority.isPresent;
      var hasResource = resource.isPresent;
      var hasExpression = expression.isPresent;
      if (hasAuthority && hasResource) score += 12; // 官印相生
      if (hasExpression && hasAuthority) score -= 15; // 伤官见官
      break;

    case 'wealth':
      var wealth = getStarStrength('wealth');
      var expr2 = getStarStrength('expression');
      var companion = getStarStrength('companion');
      applyStarAdjust(wealth, 25, 15, 5, -15, -5);
      // 食伤生财
      if (expr2.isPresent && wealth.isPresent) score += 15;
      else if (expr2.isPresent) score += 5;
      // 身财关系
      if (dayMasterInfo.strength === 'strong' && wealth.isPresent && wealth.count >= 1) score += 12;
      else if ((dayMasterInfo.strength === 'weak') && wealth.isPresent && wealth.count >= 1) score -= 10;
      else if (dayMasterInfo.strength === 'strong' && !wealth.isPresent) score -= 8;
      // 比劫夺财
      if (companion.isPresent && companion.count >= 2 && !wealth.isPresent) score -= 12;
      break;

    case 'marriage':
      var dayBranch = chart.dayPillar.branch;
      var dayBranchEl = BRANCH_ELEMENTS[dayBranch];
      // 夫妻宫
      if (fav.includes(dayBranchEl)) score += 18;
      // 日支逢冲
      var dayClashed = false;
      allBranches.forEach(function(b) {
        if (b !== dayBranch && BRANCH_CLASHES[b] === dayBranch) dayClashed = true;
      });
      if (dayClashed) score -= 12;
      // 日支逢合
      var dayCombined = false;
      allBranches.forEach(function(b) {
        if (b !== dayBranch && BRANCH_COMBINES_6[b] === dayBranch) dayCombined = true;
      });
      if (dayCombined) score += 10;
      // 配偶星（男命看财星，女命看官星）
      var isMale = chart.gender === 'male';
      var spouseStarType = isMale ? 'wealth' : 'authority';
      var spouseStar = getStarStrength(spouseStarType);
      applyStarAdjust(spouseStar, 18, 10, 3, -12, -5);
      // 配偶星位置
      var dayPillarIdx = 2;
      var spouseInDay = false, spouseInMonth = false, spouseInHour = false, spouseInYear = false;
      pillars.forEach(function(p, idx) {
        var tg = getTenGod(dm, p.stem);
        if (isMale && (tg === '正财' || tg === '偏财')) {
          if (idx === 2) spouseInDay = true;
          else if (idx === 1) spouseInMonth = true;
          else if (idx === 3) spouseInHour = true;
          else if (idx === 0) spouseInYear = true;
        }
        if (!isMale && (tg === '正官' || tg === '七杀')) {
          if (idx === 2) spouseInDay = true;
          else if (idx === 1) spouseInMonth = true;
          else if (idx === 3) spouseInHour = true;
          else if (idx === 0) spouseInYear = true;
        }
      });
      if (spouseInDay) score += 10;
      else if (spouseInMonth) score += 8;
      else if (spouseInHour) score += 5;
      else if (spouseInYear) score += 3;
      break;

    case 'family':
      var resource2 = getStarStrength('resource');
      var wealth2 = getStarStrength('wealth');
      var companion2 = getStarStrength('companion');
      var expression2 = getStarStrength('expression');
      applyStarAdjust(resource2, 15, 8, 3, -10, -3);
      applyStarAdjust(wealth2, 12, 6, 2, -8, -3);
      // 比劫适度
      if (companion2.isPresent && companion2.count >= 1 && companion2.count <= 2) score += 8;
      else if (companion2.isPresent && companion2.count > 2) score -= 6;
      else score -= 3;
      applyStarAdjust(expression2, 10, 5, 2, -6, 0);
      break;

    case 'health':
      // 五行平衡度
      var bal = fiveElements.balance;
      if (bal >= 0.8) score += 20;
      else if (bal >= 0.6) score += 10;
      else if (bal >= 0.4) score += 0;
      else score -= 15;
      // 日主被克程度
      if ((dayMasterInfo.strength === 'strong' || dayMasterInfo.strength === 'slightlyStrong') && getStarStrength('authority').isPresent) score += 8;
      else if (dayMasterInfo.strength === 'weak' && getStarStrength('authority').isPresent) score -= 12;
      else score += 5;
      // 冲刑数量
      var clashCount = 0;
      for (var i = 0; i < allBranches.length; i++) {
        for (var j = i+1; j < allBranches.length; j++) {
          if (BRANCH_CLASHES[allBranches[i]] === allBranches[j]) clashCount++;
        }
      }
      if (clashCount === 0) score += 10;
      else if (clashCount === 1) score += 0;
      else if (clashCount === 2) score -= 8;
      else score -= 15;
      // 用神受损
      var favDamaged = false;
      allBranches.forEach(function(b) {
        var bEl = BRANCH_ELEMENTS[b];
        if (fav.includes(bEl)) {
          var bClashed = allBranches.some(function(ob) { return ob !== b && BRANCH_CLASHES[ob] === b; });
          if (bClashed) favDamaged = true;
        }
      });
      if (favDamaged) score -= 10;
      else score += 8;
      break;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============ 大运修正计算 ============

function calculateGrandCycleModifier(chart, fiveElements, dayMasterInfo, favElements, grandCycle, dimension) {
  var dm = chart.dayMaster;
  var gcStemEl = STEM_ELEMENTS[grandCycle.stem];
  var gcBranchEl = BRANCH_ELEMENTS[grandCycle.branch];
  var fav = favElements.favorable;
  var unfav = favElements.unfavorable;
  var modifier = 0;

  // 因子一：大运五行 vs 喜用神
  var stemFav = fav.includes(gcStemEl);
  var stemUnfav = unfav.includes(gcStemEl);
  var branchFav = fav.includes(gcBranchEl);
  var branchUnfav = unfav.includes(gcBranchEl);

  if (stemFav && branchFav) modifier += 15;
  else if (stemFav || branchFav) modifier += 8;
  else if (stemUnfav && branchUnfav) modifier -= 15;
  else if (stemUnfav || branchUnfav) modifier -= 8;

  // 因子二：大运天干十神 vs 维度关联
  var stemTenGod = getTenGod(dm, grandCycle.stem);
  var branchTenGod = getTenGodFromBranch(dm, grandCycle.branch);

  var tenGodMap = {
    '正官':   { career: 10, wealth: 3, marriage: 8, family: 2, health: -2 },
    '七杀':   { career: 8,  wealth: 2, marriage: 6, family: 0, health: -5 },
    '正印':   { career: 8,  wealth: 0, marriage: 0, family: 10, health: 5 },
    '偏印':   { career: 5,  wealth: -2, marriage: 0, family: 6, health: 3 },
    '正财':   { career: 3,  wealth: 12, marriage: 8, family: 3, health: -2 },
    '偏财':   { career: 2,  wealth: 10, marriage: 6, family: 5, health: -3 },
    '食神':   { career: 5,  wealth: 8, marriage: 3, family: 5, health: 5 },
    '伤官':   { career: 3,  wealth: 6, marriage: -5, family: 3, health: 2 },
    '比肩':   { career: 0,  wealth: -8, marriage: 0, family: 8, health: 3 },
    '劫财':   { career: -2, wealth: -10, marriage: -3, family: 5, health: 2 }
  };

  // 姻缘维度的性别修正
  var genderMarriageAdj = 0;
  if (dimension === 'marriage') {
    var isMale = chart.gender === 'male';
    if (isMale && (stemTenGod === '正财' || stemTenGod === '偏财')) genderMarriageAdj = tenGodMap[stemTenGod].marriage;
    if (!isMale && (stemTenGod === '正官' || stemTenGod === '七杀')) genderMarriageAdj = tenGodMap[stemTenGod].marriage;
    if (stemTenGod !== '正财' && stemTenGod !== '偏财' && stemTenGod !== '正官' && stemTenGod !== '七杀') {
      genderMarriageAdj = tenGodMap[stemTenGod].marriage;
    }
  } else {
    genderMarriageAdj = tenGodMap[stemTenGod] ? tenGodMap[stemTenGod][dimension] : 0;
  }
  modifier += genderMarriageAdj;

  // 因子三：大运冲克关系
  var dayBranch = chart.dayPillar.branch;
  var yearBranch = chart.yearPillar.branch;
  var monthBranch = chart.monthPillar.branch;

  if (BRANCH_CLASHES[grandCycle.branch] === dayBranch) {
    if (dimension === 'marriage') modifier -= 8;
  }
  if (BRANCH_CLASHES[grandCycle.branch] === yearBranch) {
    if (dimension === 'family') modifier -= 5;
  }
  if (BRANCH_CLASHES[grandCycle.branch] === monthBranch) {
    if (dimension === 'career') modifier -= 6;
  }
  if (BRANCH_COMBINES_6[grandCycle.branch] === dayBranch) {
    if (dimension === 'marriage') modifier += 6;
  }

  return Math.max(-20, Math.min(20, Math.round(modifier)));
}

// ============ 流年修正计算 ============

function calculateAnnualModifier(chart, fiveElements, favElements, grandCycle, annual, dimension) {
  var dm = chart.dayMaster;
  var anStemEl = STEM_ELEMENTS[annual.stem];
  var anBranchEl = BRANCH_ELEMENTS[annual.branch];
  var fav = favElements.favorable;
  var unfav = favElements.unfavorable;
  var modifier = 0;

  // 因子一：流年太岁 vs 喜用神
  var stemFav = fav.includes(anStemEl);
  var stemUnfav = unfav.includes(anStemEl);
  var branchFav = fav.includes(anBranchEl);
  var branchUnfav = unfav.includes(anBranchEl);

  if (stemFav && branchFav) modifier += 8;
  else if (stemFav || branchFav) modifier += 4;
  else if (stemUnfav && branchUnfav) modifier -= 8;
  else if (stemUnfav || branchUnfav) modifier -= 4;

  // 因子二：流年十神关联（取大运十神修正的50%）
  var stemTenGod = getTenGod(dm, annual.stem);
  var tenGodMap = {
    '正官':   { career: 5, wealth: 1.5, marriage: 4, family: 1, health: -1 },
    '七杀':   { career: 4, wealth: 1, marriage: 3, family: 0, health: -2.5 },
    '正印':   { career: 4, wealth: 0, marriage: 0, family: 5, health: 2.5 },
    '偏印':   { career: 2.5, wealth: -1, marriage: 0, family: 3, health: 1.5 },
    '正财':   { career: 1.5, wealth: 6, marriage: 4, family: 1.5, health: -1 },
    '偏财':   { career: 1, wealth: 5, marriage: 3, family: 2.5, health: -1.5 },
    '食神':   { career: 2.5, wealth: 4, marriage: 1.5, family: 2.5, health: 2.5 },
    '伤官':   { career: 1.5, wealth: 3, marriage: -2.5, family: 1.5, health: 1 },
    '比肩':   { career: 0, wealth: -4, marriage: 0, family: 4, health: 1.5 },
    '劫财':   { career: -1, wealth: -5, marriage: -1.5, family: 2.5, health: 1 }
  };

  var adj = tenGodMap[stemTenGod] ? tenGodMap[stemTenGod][dimension] : 0;
  // 姻缘性别修正
  if (dimension === 'marriage') {
    var isMale = chart.gender === 'male';
    if (!isMale && (stemTenGod === '正财' || stemTenGod === '偏财')) adj = tenGodMap[stemTenGod].marriage;
    if (isMale && (stemTenGod === '正官' || stemTenGod === '七杀')) adj = tenGodMap[stemTenGod].marriage;
  }
  modifier += adj;

  // 因子三：特殊流年事件
  var zodiac = BRANCHES[(annual.year - 4) % 12];
  var isBenming = annual.branch === chart.yearPillar.branch;
  var chongTaiSui = BRANCH_CLASHES[annual.branch] === zodiac;
  var heTaiSui = BRANCH_COMBINES_6[annual.branch] === zodiac;

  if (isBenming && dimension === 'health') modifier -= 5;
  if (chongTaiSui) modifier -= 6;
  if (heTaiSui) modifier += 4;

  // 流年与大运天克地冲
  var stemClash = false;
  var branchClash = BRANCH_CLASHES[annual.branch] === grandCycle.branch;
  // 天干相克
  var gcEl = STEM_ELEMENTS[grandCycle.stem];
  var anEl = STEM_ELEMENTS[annual.stem];
  if (RESTRAINS[gcEl] === anEl || RESTRAINS[anEl] === gcEl) stemClash = true;
  if (stemClash && branchClash) modifier -= 5;

  // 流年与大运天合地合
  var stemCombine = (parseInt(STEMS.indexOf(grandCycle.stem)) + parseInt(STEMS.indexOf(annual.stem)) === 5);
  var branchCombine = BRANCH_COMBINES_6[annual.branch] === grandCycle.branch;
  if (stemCombine && branchCombine) modifier += 5;

  return Math.max(-10, Math.min(10, Math.round(modifier)));
}

// ============ 综合指数计算 ============

var DIMENSION_WEIGHTS = {
  career: 0.25,
  wealth: 0.20,
  marriage: 0.20,
  family: 0.15,
  health: 0.20
};

function calculateCompositeIndex(scores) {
  return Math.round(
    scores.career * DIMENSION_WEIGHTS.career +
    scores.wealth * DIMENSION_WEIGHTS.wealth +
    scores.marriage * DIMENSION_WEIGHTS.marriage +
    scores.family * DIMENSION_WEIGHTS.family +
    scores.health * DIMENSION_WEIGHTS.health
  );
}

function getTrendLevel(compositeIndex) {
  if (compositeIndex >= 85) return { level: 'excellent', label: '上吉', color: '#2d8659' };
  if (compositeIndex >= 70) return { level: 'good', label: '吉', color: '#5a9b5a' };
  if (compositeIndex >= 55) return { level: 'average', label: '平', color: '#b8a030' };
  if (compositeIndex >= 40) return { level: 'poor', label: '凶', color: '#c4623c' };
  return { level: 'bad', label: '下凶', color: '#a02828' };
}

// ============ 完整评分计算 ============

function calculateTrend(chart, grandCycle, annual) {
  var fiveElements = calculateFiveElements(chart);
  fiveElements.dmElement = STEM_ELEMENTS[chart.dayMaster];

  var dayMasterInfo = calculateDayMasterStrength(chart, fiveElements);
  var favElements = determineFavorableElements(dayMasterInfo.strength, fiveElements);

  var dimensions = ['career', 'wealth', 'marriage', 'family', 'health'];
  var baseScores = {};
  var gcModifiers = {};
  var anModifiers = {};
  var finalScores = {};

  dimensions.forEach(function(dim) {
    baseScores[dim] = calculateBaseScore(chart, fiveElements, dayMasterInfo, favElements, dim);
    gcModifiers[dim] = calculateGrandCycleModifier(chart, fiveElements, dayMasterInfo, favElements, grandCycle, dim);
    anModifiers[dim] = calculateAnnualModifier(chart, fiveElements, favElements, grandCycle, annual, dim);
    finalScores[dim] = Math.max(0, Math.min(100, baseScores[dim] + gcModifiers[dim] + anModifiers[dim]));
  });

  var compositeIndex = calculateCompositeIndex(finalScores);
  var trendLevel = getTrendLevel(compositeIndex);

  return {
    fiveElements: fiveElements,
    dayMasterInfo: dayMasterInfo,
    favElements: favElements,
    scores: {
      baseScore: baseScores,
      grandCycleModifier: gcModifiers,
      annualModifier: anModifiers,
      finalScore: finalScores
    },
    compositeIndex: compositeIndex,
    trendLevel: trendLevel
  };
}

// ============ 文字解读生成 ============

var DIMENSION_LABELS = {
  career: '事业学业',
  wealth: '财运',
  marriage: '姻缘',
  family: '亲情',
  health: '健康'
};

var TEN_GOD_LABELS = {
  '正官': '正官（代表权力与地位）',
  '七杀': '七杀（代表魄力与挑战）',
  '正印': '正印（代表学业与贵人）',
  '偏印': '偏印（代表才华与孤独）',
  '正财': '正财（代表稳定收入）',
  '偏财': '偏财（代表偏门财源）',
  '食神': '食神（代表才华与福气）',
  '伤官': '伤官（代表创造与叛逆）',
  '比肩': '比肩（代表同辈与竞争）',
  '劫财': '劫财（代表争夺与破财）'
};

function generateNarrative(trendResult, chart, grandCycle, annual) {
  var scores = trendResult.scores.finalScore;
  var narratives = {};
  var dm = chart.dayMaster;
  var stemTenGod = getTenGod(dm, grandCycle.stem);
  var strengthLabel = {
    'strong': '身旺', 'slightlyStrong': '身偏旺', 'balanced': '中和',
    'slightlyWeak': '身偏弱', 'weak': '身弱'
  }[trendResult.dayMasterInfo.strength];

  var tenGodDesc = TEN_GOD_LABELS[stemTenGod] || stemTenGod;

  var dims = ['career', 'wealth', 'marriage', 'family', 'health'];
  dims.forEach(function(dim) {
    var score = scores[dim];
    var label = DIMENSION_LABELS[dim];
    var parts = [];

    // 趋势判断
    if (score >= 85) parts.push(label + '超棒！好运爆棚，冲就完事了～');
    else if (score >= 70) parts.push(label + '趋势很不错，事情在往好的方向走～');
    else if (score >= 55) parts.push(label + '比较平稳，没大起大落，安心啦～');
    else if (score >= 40) parts.push(label + '稍微有点弱，多留意一下细节哦～');
    else parts.push(label + '压力有点大，先稳住别急，保护好自己最重要～');

    // 命理依据
    var gcMod = trendResult.scores.grandCycleModifier[dim];
    var anMod = trendResult.scores.annualModifier[dim];

    if (gcMod > 0 || anMod > 0) {
      parts.push('大运天干' + tenGodDesc + '，在给你加油打气呢');
    } else if (gcMod < 0 || anMod < 0) {
      parts.push('大运天干' + tenGodDesc + '，压力有一丢丢，别怕，慢慢来');
    } else {
      parts.push('大运对这个方面影响比较中性，不急不躁');
    }

    if (anMod > 3) parts.push('流年也在帮忙，时机蛮好的，加油鸭');
    else if (anMod < -3) parts.push('流年有点小波动，稳住心态，谨慎一点没坏处');

    // 建议提示
    if (score >= 70) parts.push('可以把握机会，积极冲一冲');
    else if (score >= 55) parts.push('保持现状，稳稳地往前走');
    else if (score >= 40) parts.push('做事稳一点，多关注薄弱的地方');
    else parts.push('先守好基本盘，别急着冒进，等风来');

    narratives[dim] = parts.join('。') + '。（仅供参考）';
  });

  // 综合解读
  var compositeLevel = trendResult.trendLevel.label;
  narratives.composite = '综合趋势指数' + trendResult.compositeIndex + '分，等级"' + compositeLevel + '"～' +
    '日主' + dm + '（' + STEM_ELEMENTS[dm] + '），' + strengthLabel + '。' +
    '正走在' + grandCycle.stem + grandCycle.branch + '大运（' + tenGodDesc + '）里，' +
    annual.year + '年' + annual.stem + annual.branch + '流年加持中。' +
    '（仅供参考）';

  return narratives;
}

// ============ 导出 ============

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STEMS, BRANCHES, STEM_ELEMENTS, BRANCH_ELEMENTS,
    getTenGod, getTenGodFromBranch,
    calculateFiveElements, calculateDayMasterStrength,
    determineFavorableElements,
    calculateBaseScore, calculateGrandCycleModifier, calculateAnnualModifier,
    calculateCompositeIndex, getTrendLevel,
    calculateTrend, generateNarrative,
    DIMENSION_WEIGHTS, DIMENSION_LABELS
  };
}
