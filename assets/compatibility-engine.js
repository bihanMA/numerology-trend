/**
 * 双人八字合盘引擎
 * 基于双方八字排盘分析五行互补、性格契合、情绪相处等维度
 *
 * 输出四大板块：
 *   ① 契合的方面（性格/情绪/现实物质/精神共鸣）
 *   ② 不合拍的方面（具体摩擦领域）
 *   ③ 五行互补分析（互补/互耗）
 *   ④ 实际磨合建议（可落地相处方式）
 *
 * 禁止绝对宿命断语，所有文案闺蜜风，仅供参考
 */

(function(global) {
  'use strict';

  // ============ 性格关键词 ============

  var PERSONALITY = {
    '甲': { traits: '直爽有主见，像大树一样挺拔，天生自带领导力', social: '喜欢拿主意，做事干脆利落' },
    '乙': { traits: '柔韧灵活，像藤蔓一样能适应各种环境，善于变通', social: '擅长察言观色，人缘很好' },
    '丙': { traits: '热情开朗，像太阳一样温暖，走到哪都发光', social: '社交达人，感染力超强' },
    '丁': { traits: '温和细腻，内心有光，默默照亮身边人', social: '不争不抢，但很有主见' },
    '戊': { traits: '稳重可靠，像大山一样踏实，值得信赖', social: '不太会表达，但用行动证明' },
    '己': { traits: '踏实包容，低调有实力，默默滋养身边人', social: '不争风头，但人缘不差' },
    '庚': { traits: '刚毅果决，义气满满，做事雷厉风行', social: '说话直来直去，不拐弯抹角' },
    '辛': { traits: '精致细腻，自带珠宝气质，审美在线', social: '有点傲娇，但其实很重感情' },
    '壬': { traits: '聪明通透，像江河一样奔放，超会随机应变', social: '朋友超多，八面玲珑' },
    '癸': { traits: '柔润敏感，直觉力max，善于滋润万物', social: '心思细腻，很会照顾人情绪' }
  };

  // 元素互动关系文案
  var ELEMENT_RELATION_TEXT = {
    '同': '同类相助，彼此加buff',
    '生我': '对方生你，被照顾的感觉',
    '我生': '你照顾对方，付出感会有一点',
    '克我': '对方管你，有压力但也有安全感',
    '我克': '你管对方，主导权在你手里'
  };

  // ============ 合盘主函数 ============

  function calculateCompatibility(chartA, chartB, infoA, infoB) {
    var dmA = chartA.dayMaster;
    var dmB = chartB.dayMaster;
    var elA = STEM_ELEMENTS[dmA];
    var elB = STEM_ELEMENTS[dmB];
    var yinYangA = STEM_YIN_YANG[dmA];
    var yinYangB = STEM_YIN_YANG[dmB];

    // 五行分布
    var feA = calculateFiveElements(chartA);
    var feB = calculateFiveElements(chartB);
    feA.dmElement = elA;
    feB.dmElement = elB;

    // 日主强弱
    var strengthA = calculateDayMasterStrength(chartA, feA);
    var strengthB = calculateDayMasterStrength(chartB, feB);

    // 喜用神
    var favA = determineFavorableElements(strengthA.strength, feA);
    var favB = determineFavorableElements(strengthB.strength, feB);

    // 日主天干关系
    var dmRelation = getDayMasterRelation(dmA, dmB);

    // 地支互动
    var branchInteractions = analyzeBranchInteractions(chartA, chartB);

    // 十神互动
    var tenGodAtoB = getTenGod(dmA, dmB);
    var tenGodBtoA = getTenGod(dmB, dmA);

    // 综合评分
    var score = calculateScore(feA, feB, favA, favB, dmRelation, branchInteractions, tenGodAtoB, tenGodBtoA);

    // 四大板块
    var sections = {
      harmony: analyzeHarmony(dmA, dmB, elA, elB, yinYangA, yinYangB, feA, feB, favA, favB, tenGodAtoB, tenGodBtoA, branchInteractions),
      friction: analyzeFriction(dmA, dmB, elA, elB, yinYangA, yinYangB, feA, feB, favA, favB, branchInteractions, chartA, chartB),
      elements: analyzeElements(feA, feB, favA, favB, elA, elB, dmRelation),
      advice: null
    };

    // 建议板块依赖前面三个板块的结果
    sections.advice = generateAdvice(sections.harmony, sections.friction, sections.elements, dmRelation, branchInteractions);

    return {
      score: score.value,
      level: score.level,
      levelLabel: score.label,
      personA: { dayMaster: dmA, element: elA, strength: strengthA.strength, info: infoA },
      personB: { dayMaster: dmB, element: elB, strength: strengthB.strength, info: infoB },
      dmRelation: dmRelation,
      tenGodAtoB: tenGodAtoB,
      tenGodBtoA: tenGodBtoA,
      branchInteractions: branchInteractions,
      sections: sections,
      feA: feA,
      feB: feB
    };
  }

  // ============ 日主关系分析 ============

  function getDayMasterRelation(dmA, dmB) {
    var elA = STEM_ELEMENTS[dmA];
    var elB = STEM_ELEMENTS[dmB];
    var samePolarity = STEM_YIN_YANG[dmA] === STEM_YIN_YANG[dmB];

    if (elA === elB) {
      return {
        type: samePolarity ? '比肩' : '劫财',
        elementRelation: '同',
        desc: samePolarity ? '同类同频，像照镜子一样' : '同类但阴阳不同，既吸引又暗暗较劲'
      };
    }

    if (GENERATES[elA] === elB) {
      return {
        type: samePolarity ? '食神' : '伤官',
        elementRelation: '我生',
        desc: samePolarity ? '你自然地滋养对方，相处舒服' : '你付出多一点，但也乐在其中'
      };
    }

    if (GENERATES[elB] === elA) {
      return {
        type: samePolarity ? '偏印' : '正印',
        elementRelation: '生我',
        desc: samePolarity ? '对方照顾你，被宠的感觉很暖' : '对方像长辈一样关心你，有安全感'
      };
    }

    if (RESTRAINS[elA] === elB) {
      return {
        type: samePolarity ? '偏财' : '正财',
        elementRelation: '我克',
        desc: samePolarity ? '你主导关系，对方被你管着' : '你管对方但方式比较温和'
      };
    }

    if (RESTRAINS[elB] === elA) {
      return {
        type: samePolarity ? '七杀' : '正官',
        elementRelation: '克我',
        desc: samePolarity ? '对方管你，有压力但也有吸引力' : '对方管你但你能接受，像乖乖被管'
      };
    }

    return { type: '未知', elementRelation: '同', desc: '关系独特，需要细品' };
  }

  // ============ 地支互动分析 ============

  function analyzeBranchInteractions(chartA, chartB) {
    var branchesA = [chartA.yearPillar.branch, chartA.monthPillar.branch, chartA.dayPillar.branch, chartA.hourPillar.branch];
    var branchesB = [chartB.yearPillar.branch, chartB.monthPillar.branch, chartB.dayPillar.branch, chartB.hourPillar.branch];
    var pillarNames = ['年柱', '月柱', '日柱', '时柱'];

    var combos = [];
    var clashes = [];

    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 4; j++) {
        var bA = branchesA[i];
        var bB = branchesB[j];

        // 六合
        if (BRANCH_COMBINES_6[bA] === bB) {
          combos.push({
            branchA: bA, branchB: bB,
            pillarA: pillarNames[i], pillarB: pillarNames[j],
            type: '六合',
            desc: bA + bB + '六合，暗中互助'
          });
        }

        // 相冲
        if (BRANCH_CLASHES[bA] === bB) {
          clashes.push({
            branchA: bA, branchB: bB,
            pillarA: pillarNames[i], pillarB: pillarNames[j],
            type: '相冲',
            desc: bA + bB + '相冲，容易有摩擦'
          });
        }
      }
    }

    // 日柱关系单独标注（夫妻宫互动）
    var spouseInteraction = null;
    var dayBranchA = chartA.dayPillar.branch;
    var dayBranchB = chartB.dayPillar.branch;
    if (BRANCH_COMBINES_6[dayBranchA] === dayBranchB) {
      spouseInteraction = { type: '六合', desc: '日支六合，夫妻宫暗合，缘分很深～' };
    } else if (BRANCH_CLASHES[dayBranchA] === dayBranchB) {
      spouseInteraction = { type: '相冲', desc: '日支相冲，夫妻宫对冲，容易磕磕碰碰～' };
    } else {
      spouseInteraction = { type: '中性', desc: '日支无冲无合，自然相处就好～' };
    }

    return {
      combos: combos,
      clashes: clashes,
      spouseInteraction: spouseInteraction,
      comboCount: combos.length,
      clashCount: clashes.length
    };
  }

  // ============ 综合评分 ============

  function calculateScore(feA, feB, favA, favB, dmRelation, branchInter, tgAtoB, tgBtoA) {
    var score = 50;

    // 日主关系加分/减分
    var goodRelations = ['正印', '偏印', '食神', '正财', '正官', '偏财'];
    var neutralRelations = ['比肩', '偏印'];
    var tensionRelations = ['七杀', '劫财', '伤官'];

    if (goodRelations.indexOf(tgAtoB) >= 0) score += 8;
    if (goodRelations.indexOf(tgBtoA) >= 0) score += 8;
    if (tensionRelations.indexOf(tgAtoB) >= 0) score -= 5;
    if (tensionRelations.indexOf(tgBtoA) >= 0) score -= 5;

    // 五行互补加分
    var favSetA = favA.favorable || [];
    var favSetB = favB.favorable || [];

    // A的喜用神是否在B的五行中偏旺
    Object.keys(feB.counts).forEach(function(el) {
      if (favSetA.indexOf(el) >= 0 && feB.counts[el] > 2) score += 4;
    });
    Object.keys(feA.counts).forEach(function(el) {
      if (favSetB.indexOf(el) >= 0 && feA.counts[el] > 2) score += 4;
    });

    // 地支互动
    score += branchInter.comboCount * 3;
    score -= branchInter.clashCount * 3;

    // 夫妻宫互动
    if (branchInter.spouseInteraction.type === '六合') score += 8;
    if (branchInter.spouseInteraction.type === '相冲') score -= 8;

    // 评分区间
    score = Math.max(20, Math.min(95, Math.round(score)));

    var level, label;
    if (score >= 80) { level = 'high'; label = '心心相印'; }
    else if (score >= 65) { level = 'good'; label = '蛮合得来'; }
    else if (score >= 50) { level = 'medium'; label = '需要磨合'; }
    else if (score >= 35) { level = 'low'; label = '磨合较多'; }
    else { level = 'veryLow'; label = '考验不少'; }

    return { value: score, level: level, label: label };
  }

  // ============ 板块一：契合的方面 ============

  function analyzeHarmony(dmA, dmB, elA, elB, yyA, yyB, feA, feB, favA, favB, tgAB, tgBA, branchInter) {
    var aspects = [];

    // 性格契合
    var pA = PERSONALITY[dmA] || { traits: '性格鲜明', social: '各有特色' };
    var pB = PERSONALITY[dmB] || { traits: '性格鲜明', social: '各有特色' };

    var personalityScore = 0;
    if (elA === elB) personalityScore = 2;
    else if (GENERATES[elA] === elB || GENERATES[elB] === elA) personalityScore = 3;
    else if (RESTRAINS[elA] === elB || RESTRAINS[elB] === elA) personalityScore = 1;
    else personalityScore = 2;

    if (personalityScore >= 2) {
      aspects.push({
        area: '性格',
        match: true,
        detail: pA.traits + '，对方' + pB.traits + '。' +
          (elA === elB ? '你们骨子里是一类人，能get到对方的点～' : '') +
          (GENERATES[elA] === elB ? '你的能量自然流向对方，相处起来很舒服～' : '') +
          (GENERATES[elB] === elA ? '对方的能量滋养你，待在一起有被治愈的感觉～' : '') +
          (personalityScore === 2 && elA !== elB && GENERATES[elA] !== elB && GENERATES[elB] !== elA ? '虽然性格不同，但恰好互补，不会撞车～' : '')
      });
    }

    // 情绪契合
    var emoCompatible = false;
    var emoDetail = '';
    if (branchInter.spouseInteraction.type === '六合') {
      emoCompatible = true;
      emoDetail = '日支六合，内心深处有一种天然的默契感。你们不用多说话，对方就能get到你的情绪～';
    } else if (yyA !== yyB) {
      emoCompatible = true;
      emoDetail = '一阴一阳，情绪节奏恰好交错。你high的时候对方陪你疯，你emo的时候对方接得住～';
    } else if (branchInter.comboCount >= 2) {
      emoCompatible = true;
      emoDetail = '地支多组合，情绪频道容易调到同频，默契感不错～';
    } else {
      emoCompatible = true;
      emoDetail = '情绪上虽然节奏不完全一样，但都愿意迁就对方，这就是温柔呀～';
    }
    aspects.push({ area: '情绪', match: emoCompatible, detail: emoDetail });

    // 现实物质
    var matCompatible = false;
    var matDetail = '';
    var favSetA = favA.favorable || [];
    var favSetB = favB.favorable || [];

    var aNeedsBHas = false;
    var bNeedsAHas = false;
    favSetA.forEach(function(el) {
      if (feB.counts[el] > 2) aNeedsBHas = true;
    });
    favSetB.forEach(function(el) {
      if (feA.counts[el] > 2) bNeedsAHas = true;
    });

    if (aNeedsBHas && bNeedsAHas) {
      matCompatible = true;
      matDetail = '你们各自缺的五行，对方恰好偏旺。现实层面互补性超强，在一起能"旺"对方～';
    } else if (aNeedsBHas || bNeedsAHas) {
      matCompatible = true;
      matDetail = aNeedsBHas
        ? '你的喜用五行在对方命盘里偏旺，对方能给你带来好运和助力～'
        : '对方的喜用五行在你命盘里偏旺，你也能旺到对方哦～';
    } else {
      matDetail = '物质层面大家各自独立，不依赖对方也很棒，平起平坐～';
    }
    aspects.push({ area: '现实物质', match: matCompatible || true, detail: matDetail });

    // 精神共鸣
    var spiritCompatible = false;
    var spiritDetail = '';
    if (tgAB === '正印' || tgBA === '正印' || tgAB === '偏印' || tgBA === '偏印') {
      spiritCompatible = true;
      spiritDetail = '日主形成"印"的关系，精神层面互相滋养。跟对方聊天会觉得有收获、有启发～';
    } else if (tgAB === '比肩' || tgBA === '比肩') {
      spiritCompatible = true;
      spiritDetail = '日主同类，世界观和价值观容易同频，聊什么都懂对方在说什么～';
    } else if (tgAB === '食神' || tgBA === '食神') {
      spiritCompatible = true;
      spiritDetail = '一方"生"另一方，相处中有自然的温暖和灵感涌出来～';
    } else {
      spiritCompatible = true;
      spiritDetail = '精神层面虽然不完全同频，但各自有独立的小世界，反而能互相学习～';
    }
    aspects.push({ area: '精神共鸣', match: spiritCompatible, detail: spiritDetail });

    return {
      title: '契合的方面',
      icon: '✅',
      aspects: aspects,
      summary: '这几块你们比较合拍～'
    };
  }

  // ============ 板块二：不合拍的方面 ============

  function analyzeFriction(dmA, dmB, elA, elB, yyA, yyB, feA, feB, favA, favB, branchInter, chartA, chartB) {
    var frictions = [];

    // 沟通模式
    if (RESTRAINS[elA] === elB || RESTRAINS[elB] === elA) {
      var whoControls = RESTRAINS[elA] === elB ? '你' : '对方';
      frictions.push({
        area: '沟通模式',
        detail: whoControls + '在沟通中容易"克"住对方，说话会无意间压人一头。' +
          '尤其是吵架的时候，' + whoControls + '的气势容易让对方喘不过气～' +
          '建议吵架时主动退一步，别争赢～'
      });
    }

    // 金钱观念
    var wealthA = feA.counts['金'] + feA.counts['木'];
    var wealthB = feB.counts['金'] + feB.counts['木'];
    if (Math.abs(wealthA - wealthB) > 3) {
      var bigSpender = wealthA > wealthB ? '你' : '对方';
      var saver = wealthA > wealthB ? '对方' : '你';
      frictions.push({
        area: '金钱观念',
        detail: bigSpender + '在物质上更大方，' + saver + '可能更精打细算。' +
          '花钱方式不一样容易拌嘴，建议大额支出提前商量～'
      });
    }

    // 家庭观念
    if (branchInter.spouseInteraction.type === '相冲') {
      frictions.push({
        area: '家庭观念',
        detail: '日支相冲，对"家"的理解不完全一样。' +
          '可能一个人想安安稳稳，另一个人想出去闯。' +
          '别急，多聊聊对未来的期待，找到中间点～'
      });
    }

    // 地支多冲
    if (branchInter.clashCount >= 3) {
      frictions.push({
        area: '生活习惯',
        detail: '地支多处相冲，日常习惯和节奏差异不小。' +
          '小事上容易你一个想法、ta一个想法。' +
          '不是什么大问题，但需要多一点耐心去磨合～'
      });
    }

    // 阴阳全同
    if (yyA === yyB && elA === elB) {
      frictions.push({
        area: '角色分配',
        detail: '日主完全相同，性格太像了反而容易"撞"。' +
          '都想当主导者的时候会暗暗较劲。' +
          '建议在不同领域各自当老大，别抢同一个方向盘～'
      });
    }

    // 十神互动中的紧张关系
    var tgAtoB = getTenGod(dmA, dmB);
    var tgBtoA = getTenGod(dmB, dmA);
    if (tgAtoB === '伤官' || tgBtoA === '伤官') {
      frictions.push({
        area: '表达方式',
        detail: '一方对另一方形成"伤官"关系，说话容易踩到对方的雷区。' +
          '不是有意的，但嘴比脑子快。建议说话前先三秒缓冲～'
      });
    }

    if (frictions.length === 0) {
      frictions.push({
        area: '整体',
        detail: '目前没有明显的硬伤摩擦，但日常相处中肯定还是会有小磕碰。' +
          '不用太在意，关系都是在小事里磨出来的～'
      });
    }

    return {
      title: '不合拍的方面',
      icon: '⚠️',
      frictions: frictions,
      summary: '这几块留意一下，磨合好了更舒服～'
    };
  }

  // ============ 板块三：五行互补分析 ============

  function analyzeElements(feA, feB, favA, favB, elA, elB, dmRelation) {
    var complement = [];
    var consume = [];
    var favSetA = favA.favorable || [];
    var favSetB = favB.favorable || [];
    var unfavA = favA.unfavorable || [];
    var unfavB = favB.unfavorable || [];

    var elements = ['金', '木', '水', '火', '土'];

    elements.forEach(function(el) {
      var countA = feA.counts[el] || 0;
      var countB = feB.counts[el] || 0;

      // A缺B有 → 互补
      if (favSetA.indexOf(el) >= 0 && countB > 2) {
        complement.push({
          element: el,
          detail: '你命局喜' + el + '，对方' + el + '偏旺。ta的' + el + '能量能补上你的短板，' +
            '在一起你会莫名觉得运气变好了～'
        });
      }
      // B缺A有 → 互补
      if (favSetB.indexOf(el) >= 0 && countA > 2) {
        complement.push({
          element: el,
          detail: '对方命局喜' + el + '，你' + el + '偏旺。你的' + el + '能量能旺到ta，' +
            'ta跟你在一起会觉得诸事顺遂～'
        });
      }
      // A忌B有 → 互耗
      if (unfavA.indexOf(el) >= 0 && countB > 3) {
        consume.push({
          element: el,
          detail: '你命局忌' + el + '，但对方' + el + '偏旺。对方无意间会给你带来一些' + el + '的压力，' +
            '不用太紧张，注意调节就好～'
        });
      }
      // B忌A有 → 互耗
      if (unfavB.indexOf(el) >= 0 && countA > 3) {
        consume.push({
          element: el,
          detail: '对方命局忌' + el + '，但你' + el + '偏旺。你无意间也会给ta带来' + el + '方面的小压力，' +
            '多给对方一点空间～'
        });
      }
    });

    // 日主五行互动
    var dmInteraction = null;
    if (elA === elB) {
      dmInteraction = '你们日主同为' + elA + '，五行同频，能量叠加效果强。' +
        '好的时候特别好，但如果' + elA + '本身就是忌神，也会"一荣俱荣一损俱损"～';
    } else if (GENERATES[elA] === elB) {
      dmInteraction = '你的' + elA + '生对方的' + elB + '，你天然"旺"对方。' +
        '你付出会多一点，但对方好了你也会好，双赢～';
    } else if (GENERATES[elB] === elA) {
      dmInteraction = '对方的' + elB + '生你的' + elA + '，对方天然"旺"你。' +
        '被ta滋养的感觉很暖，记得也回馈ta的好～';
    } else if (RESTRAINS[elA] === elB) {
      dmInteraction = '你的' + elA + '克对方的' + elB + '，你天然有"管"对方的能力。' +
        '管得好是关心，管太多是压力，把握好度～';
    } else if (RESTRAINS[elB] === elA) {
      dmInteraction = '对方的' + elB + '克你的' + elA + '，对方天然有"管"你的能力。' +
        '被管有时候有安全感，但太紧了也会想逃，沟通好边界～';
    } else {
      dmInteraction = '你们日主五行关系比较特殊，既不相生也不相克，' +
        '像平行线一样各自独立。相处方式比较自由，但深层次连接需要主动经营～';
    }

    if (complement.length === 0) {
      complement.push({
        element: '综合',
        detail: '五行没有特别突出的互补点，但也意味着没有明显的短板。' +
          '各自独立又互相尊重，也是一种舒服的相处模式～'
      });
    }

    if (consume.length === 0) {
      consume.push({
        element: '综合',
        detail: '五行没有明显的互耗，挺好的～' +
          '说明你们的能量场比较和谐，不会互相消耗～'
      });
    }

    return {
      title: '五行互补分析',
      icon: '🔄',
      complement: complement,
      consume: consume,
      dmInteraction: dmInteraction,
      summary: '看清能量流向，相处更通透～'
    };
  }

  // ============ 板块四：实际磨合建议 ============

  function generateAdvice(harmony, friction, elements, dmRelation, branchInter) {
    var tips = [];

    // 基于契合点的建议
    harmony.aspects.forEach(function(a) {
      if (a.match && a.area === '性格') {
        tips.push('性格上合拍的部分多用起来，一起做你们都擅长的事，默契感会越来越强～');
      }
      if (a.match && a.area === '情绪') {
        tips.push('情绪频道能对上，就多分享日常的小情绪。你们之间的"懂"是稀缺品，好好珍惜～');
      }
    });

    // 基于摩擦点的建议
    friction.frictions.forEach(function(f) {
      if (f.area === '沟通模式') {
        tips.push('沟通容易"克"到对方的话，约定一个暗号：谁觉得自己被压了就说"暂停"，给彼此喘口气～');
      }
      if (f.area === '金钱观念') {
        tips.push('花钱方式不同没关系，定一个"大额支出提前商量"的规则就好。小事各花各的，大事一起拍板～');
      }
      if (f.area === '家庭观念') {
        tips.push('对"家"的理解不同，别急着改变对方。各自说说心里理想的家是什么样，慢慢往中间靠～');
      }
      if (f.area === '角色分配') {
        tips.push('性格太像容易抢方向盘，不如分工：你管这块ta管那块，各自当老大，互不干涉～');
      }
      if (f.area === '表达方式') {
        tips.push('嘴比脑子快的时候，先深呼吸三秒再说话。把"你怎么"换成"我觉得"，摩擦少一半～');
      }
    });

    // 基于五行的建议
    if (elements.dmInteraction) {
      if (dmRelation.elementRelation === '生我') {
        tips.push('对方天然旺你，多跟ta待在一起，运气会变好。但也别光接受不回馈，ta也需要你的温暖～');
      }
      if (dmRelation.elementRelation === '我生') {
        tips.push('你天然旺对方，付出是你的本能。但也别忘了照顾自己，你的能量杯满了才能倒给别人～');
      }
      if (dmRelation.elementRelation === '克我') {
        tips.push('对方管你是关心，但你有自己的节奏。温柔地告诉ta你的边界在哪，被管也要有底线～');
      }
      if (dmRelation.elementRelation === '我克') {
        tips.push('你管对方的时候注意分寸，关心别变成控制。给ta留一点自由空间，ta会更感激你～');
      }
    }

    // 基于地支互动
    if (branchInter.spouseInteraction.type === '六合') {
      tips.push('日支六合是很好的缘分基础，多创造二人世界的专属回忆，让这份默契越来越深～');
    }
    if (branchInter.spouseInteraction.type === '相冲') {
      tips.push('日支相冲不代表不好，反而是"吸引力法则"。磕磕碰碰是常态，但别冷战，有问题当天说开～');
    }
    if (branchInter.clashCount >= 3) {
      tips.push('地支多冲的话，日常生活可以适度保持各自的空间和爱好，不用24小时黏在一起，距离产生美～');
    }

    if (tips.length === 0) {
      tips.push('你们整体相处还不错，保持现在的节奏就好。记得多夸夸对方，好关系是夸出来的～');
    }

    // 限制建议条数，取最重要的5条
    if (tips.length > 5) tips = tips.slice(0, 5);

    return {
      title: '实际磨合建议',
      icon: '💡',
      tips: tips,
      summary: '落地小贴士，慢慢来就好～'
    };
  }

  // ============ 导出 ============

  global.calculateCompatibility = calculateCompatibility;

})(window);
