/**
 * 农历转换模块 — 公历↔农历 + 精确节气
 * 数据覆盖 1900-2100 年
 * Based on standard Chinese lunar calendar algorithm
 */
(function(global) {
  'use strict';

  // 农历 1900-2100 年的信息表
  // 编码: bits 15-4 = 月份1-12是否大月(30天), bits 3-0 = 闰月月份(0=无闰), bit 16 = 闰月是否大月
  var lunarInfo = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2, // 1900-1909
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977, // 1910-1919
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970, // 1920-1929
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950, // 1930-1939
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557, // 1940-1949
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0, // 1950-1959
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0, // 1960-1969
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6, // 1970-1979
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570, // 1980-1989
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0, // 1990-1999
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5, // 2000-2009
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930, // 2010-2019
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530, // 2020-2029
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45, // 2030-2039
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0, // 2040-2049
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0, // 2050-2059
    0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4, // 2060-2069
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0, // 2070-2079
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160, // 2080-2089
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252, // 2090-2099
    0x0d520 // 2100
  ];

  // 24节气名称
  var SOLAR_TERMS = [
    '小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨',
    '立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑',
    '白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'
  ];

  // 二十四节气编码表（每5位编码一个节气的日期，用于近似计算）
  // 使用更精确的基于天文算法的节气计算
  var BASE_OFFSET = 0; // 暂用计算法

  // 节气计算：基于地球公转的黄经角度
  // 冬至=270°, 立春=315°, 每个节气相差15°
  // 使用 VSOP87 简化公式计算太阳黄经

  function getJulianDay(year, month, day) {
    if (month <= 2) { year -= 1; month += 12; }
    var a = Math.floor(year / 100);
    var b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
  }

  // 计算太阳黄经（简化 VSOP87）
  // 返回 0-360 度
  function getSolarLongitude(jd) {
    var T = (jd - 2451545.0) / 36525; // 儒略世纪
    // 太阳平黄经
    var L0 = 280.46646 + 36000.76993 * T + 0.0003032 * T * T;
    // 太阳平近点角
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    // 地球轨道偏心率
    var e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
    // 中心差
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(deg2rad(M))
          + (0.019993 - 0.000101 * T) * Math.sin(deg2rad(2 * M))
          + 0.000289 * Math.sin(deg2rad(3 * M));
    // 太阳真黄经
    var theta = L0 + C;
    // 章动修正（简化）
    var omega = 125.04 - 1934.136 * T;
    var lambda = theta - 0.00569 - 0.00478 * Math.sin(deg2rad(omega));
    return ((lambda % 360) + 360) % 360;
  }

  function deg2rad(d) { return d * Math.PI / 180; }
  function rad2deg(r) { return r * 180 / Math.PI; }

  // 计算某年份第 n 个节气的公历日期 (n=0:小寒, n=1:大寒, n=2:立春, ...)
  // 每个节气对应太阳黄经 = 255 + n*15 (mod 360)
  // 小寒=285°, 大寒=300°, 立春=315°, 雨水=330°, 惊蛰=345°, 春分=0°/360°, ...
  function getSolarTermDate(year, termIndex) {
    // 节气对应的太阳黄经
    var targetLongitude = (termIndex * 15 + 255) % 360;
    if (targetLongitude >= 360) targetLongitude -= 360;

    // 估算初始日期：每个节气大约相差 15.2 天
    // 小寒约 1/6, 大寒约 1/20, 立春约 2/4, ...
    var baseMonth = Math.floor(termIndex / 2) + 1;
    if (baseMonth > 12) baseMonth -= 12;
    var baseDay = (termIndex % 2 === 0) ? 6 : 21;
    if (baseMonth === 1 && termIndex === 0) baseDay = 6;
    if (baseMonth === 1 && termIndex === 1) baseDay = 20;

    // 用迭代法找到太阳黄经等于目标值的日期
    var jd = getJulianDay(year, baseMonth, baseDay);
    for (var i = 0; i < 30; i++) {
      var lon = getSolarLongitude(jd + i);
      // 计算与目标角度的差（考虑环绕）
      var diff = targetLongitude - lon;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      if (Math.abs(diff) < 0.5) {
        // 返回日期
        return jdToGregorian(jd + i);
      }
    }
    // 如果迭代没找到精确值，返回最接近的
    var bestDay = 0;
    var minDiff = 999;
    for (var j = 0; j < 30; j++) {
      var lon2 = getSolarLongitude(jd + j);
      var diff2 = Math.abs(((targetLongitude - lon2 + 540) % 360) - 180);
      if (diff2 < minDiff) { minDiff = diff2; bestDay = j; }
    }
    return jdToGregorian(jd + bestDay);
  }

  function jdToGregorian(jd) {
    jd += 0.5;
    var Z = Math.floor(jd);
    var F = jd - Z;
    var A = Z;
    if (Z >= 2299161) {
      var alpha = Math.floor((Z - 1867216.25) / 36524.25);
      A = Z + 1 + alpha - Math.floor(alpha / 4);
    }
    var B = A + 1524;
    var C = Math.floor((B - 122.1) / 365.25);
    var D = Math.floor(365.25 * C);
    var E = Math.floor((B - D) / 30.6001);
    var day = B - D - Math.floor(30.6001 * E);
    var month = E < 14 ? E - 1 : E - 13;
    var year = month > 2 ? C - 4716 : C - 4715;
    return { year: year, month: month, day: day };
  }

  // ============ 农历核心函数 ============

  function lunarYearDays(year) {
    var sum = 348;
    for (var i = 0x8000; i > 0x8; i >>= 1) {
      sum += (lunarInfo[year - 1900] & i) ? 1 : 0;
    }
    sum += leapDays(year);
    return sum;
  }

  function leapMonth(year) {
    return lunarInfo[year - 1900] & 0xf;
  }

  function leapDays(year) {
    if (leapMonth(year)) {
      return (lunarInfo[year - 1900] & 0x10000) ? 30 : 29;
    }
    return 0;
  }

  function monthDays(year, month) {
    return (lunarInfo[year - 1900] & (0x10000 >> month)) ? 30 : 29;
  }

  // ============ 公历转农历 ============
  function solar2lunar(year, month, day) {
    // 基准日: 1900-01-31 = 农历 1900年正月初一
    var baseTime = Date.UTC(1900, 0, 31);
    var objTime = Date.UTC(year, month - 1, day);
    var offset = Math.floor((objTime - baseTime) / 86400000);

    var i, temp = 0;
    var lunarYear;
    // 计算农历年
    for (i = 1900; i < 2101 && offset > 0; i++) {
      temp = lunarYearDays(i);
      offset -= temp;
    }
    if (offset < 0) {
      offset += temp;
      i--;
    }
    lunarYear = i;

    // 计算农历月
    var leap = leapMonth(lunarYear);
    var isLeap = false;
    var lunarMonth = 1;

    for (i = 1; i < 13 && offset > 0; i++) {
      // 闰月
      if (leap > 0 && i === leap + 1 && !isLeap) {
        --i;
        isLeap = true;
        temp = leapDays(lunarYear);
      } else {
        temp = monthDays(lunarYear, i);
      }
      if (isLeap && i === leap + 1) isLeap = false;
      offset -= temp;
    }

    if (offset === 0 && leap > 0 && i === leap + 1) {
      if (isLeap) {
        isLeap = false;
      } else {
        isLeap = true;
        --i;
      }
    }
    if (offset < 0) {
      offset += temp;
      --i;
    }

    lunarMonth = i;
    var lunarDay = offset + 1;

    return {
      year: lunarYear,
      month: lunarMonth,
      day: lunarDay,
      isLeap: isLeap,
      monthName: getLunarMonthName(lunarMonth, isLeap),
      dayName: getLunarDayName(lunarDay),
      animal: getAnimal(lunarYear)
    };
  }

  // ============ 农历转公历 ============
  function lunar2solar(lunarYear, lunarMonth, lunarDay, isLeap) {
    if (isLeap === undefined) isLeap = false;
    if (lunarYear < 1900 || lunarYear > 2100) return null;

    var offset = 0;
    var i, temp;

    // 计算年到1900年的天数
    for (i = 1900; i < lunarYear; i++) {
      offset += lunarYearDays(i);
    }

    // 计算月的天数
    var leap = leapMonth(lunarYear);
    for (i = 1; i < lunarMonth; i++) {
      if (leap > 0 && i === leap + 1 && !isLeap) {
        // 如果没跳过闰月，加上闰月天数
      }
      offset += monthDays(lunarYear, i);
      if (i === leap) {
        offset += leapDays(lunarYear);
      }
    }

    // 如果是闰月
    if (isLeap) {
      // 需要确认该月确实是闰月
      if (leap !== lunarMonth) return null;
    }

    offset += lunarDay - 1;

    var baseTime = Date.UTC(1900, 0, 31);
    var resultTime = baseTime + offset * 86400000;
    var result = new Date(resultTime);

    return {
      year: result.getUTCFullYear(),
      month: result.getUTCMonth() + 1,
      day: result.getUTCDate()
    };
  }

  // ============ 农历日期名称 ============
  var monthNames = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
  var dayNames1 = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十'];
  var dayNames2 = ['十一','十二','十三','十四','十五','十六','十七','十八','十九','二十'];
  var dayNames3 = ['廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];

  function getLunarMonthName(month, isLeap) {
    var name = (isLeap ? '闰' : '') + monthNames[month - 1] + '月';
    return name;
  }

  function getLunarDayName(day) {
    if (day <= 10) return dayNames1[day - 1];
    if (day <= 20) return dayNames2[day - 11];
    return dayNames3[day - 21];
  }

  function getAnimal(year) {
    var animals = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
    return animals[(year - 4) % 12];
  }

  // ============ 节气查询 ============
  // 获取某年所有24节气的日期
  function getYearSolarTerms(year) {
    var terms = [];
    for (var i = 0; i < 24; i++) {
      var d = getSolarTermDate(year, i);
      terms.push({
        name: SOLAR_TERMS[i],
        month: d.month,
        day: d.day
      });
    }
    return terms;
  }

  // 获取包含某日期的节气
  // 节气分节和气，每月一节一气
  // 节：立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒
  // 气：雨水、春分、谷雨、小满、夏至、大暑、处暑、秋分、霜降、小雪、冬至、大寒
  // 月柱以"节"为分界
  function getMonthBranchBySolarTerm(year, month, day) {
    var terms = getYearSolarTerms(year);
    var termsPrev = getYearSolarTerms(year - 1);

    // 月支对应的节气索引
    // 寅(立春, index 2), 卯(惊蛰, 4), 辰(清明, 6), 巳(立夏, 8),
    // 午(芒种, 10), 未(小暑, 12), 申(立秋, 14), 酉(白露, 16),
    // 戌(寒露, 18), 亥(立冬, 20), 子(大雪, 22), 丑(小寒, 0)
    var branchTerms = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 0]; // 寅卯辰巳午未申酉戌亥子丑
    var branchNames = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];

    // 找到在当前日期之前最近的"节"
    var currentJD = getJulianDay(year, month, day);
    var bestBranch = 0; // 默认小寒对应的丑
    var bestDiff = Infinity;

    for (var b = 0; b < 12; b++) {
      var termIdx = branchTerms[b];
      var termYear = year;
      // 小寒和大寒可能在上一年或当年
      if (termIdx <= 1) {
        // 小寒(0)和大寒(1)在年初
        var term = terms[termIdx];
        var termJD = getJulianDay(termYear, term.month, term.day);
        var diff = currentJD - termJD;
        if (diff >= 0 && diff < bestDiff) {
          bestDiff = diff;
          bestBranch = b;
        }
        // 也检查上一年的小寒大寒
        var termPrev = termsPrev[termIdx];
        var termPrevJD = getJulianDay(year - 1, termPrev.month, termPrev.day);
        var diffPrev = currentJD - termPrevJD;
        if (diffPrev >= 0 && diffPrev < bestDiff) {
          bestDiff = diffPrev;
          bestBranch = b;
        }
      } else {
        var term = terms[termIdx];
        var termJD = getJulianDay(termYear, term.month, term.day);
        var diff = currentJD - termJD;
        if (diff >= 0 && diff < bestDiff) {
          bestDiff = diff;
          bestBranch = b;
        }
      }
    }

    return {
      branch: branchNames[bestBranch],
      branchIndex: bestBranch,
      term: SOLAR_TERMS[branchTerms[bestBranch]],
      termDate: null
    };
  }

  // 判断当前日期在哪个"节"之后，用于确定月柱
  // 返回月支和年柱是否已过立春
  function getMonthInfo(year, month, day) {
    var terms = getYearSolarTerms(year);
    var termsPrev = getYearSolarTerms(year - 1);

    // 节气分界列表（从上年小寒到本年小寒）
    var boundaries = [];
    // 上年小寒
    boundaries.push({ term: '小寒', month: termsPrev[0].month, day: termsPrev[0].day, year: year-1, branch: '丑', branchIdx: 4 });
    // 上年立春
    boundaries.push({ term: '立春', month: termsPrev[2].month, day: termsPrev[2].day, year: year-1, branch: '寅', branchIdx: 0, isLiChun: true });
    // 上年惊蛰
    boundaries.push({ term: '惊蛰', month: termsPrev[4].month, day: termsPrev[4].day, year: year-1, branch: '卯', branchIdx: 1 });
    // 当年各节
    var currentYearTerms = [
      { term: '小寒', idx: 0, branch: '丑', branchIdx: 4 },
      { term: '立春', idx: 2, branch: '寅', branchIdx: 0, isLiChun: true },
      { term: '惊蛰', idx: 4, branch: '卯', branchIdx: 1 },
      { term: '清明', idx: 6, branch: '辰', branchIdx: 2 },
      { term: '立夏', idx: 8, branch: '巳', branchIdx: 3 },
      { term: '芒种', idx: 10, branch: '午', branchIdx: 4 },
      { term: '小暑', idx: 12, branch: '未', branchIdx: 5 },
      { term: '立秋', idx: 14, branch: '申', branchIdx: 6 },
      { term: '白露', idx: 16, branch: '酉', branchIdx: 7 },
      { term: '寒露', idx: 18, branch: '戌', branchIdx: 8 },
      { term: '立冬', idx: 20, branch: '亥', branchIdx: 9 },
      { term: '大雪', idx: 22, branch: '子', branchIdx: 10 }
    ];

    var currentJD = getJulianDay(year, month, day);

    var result = {
      branch: '丑',
      branchIdx: 4,
      passedLiChun: false,
      liChunDate: null
    };

    // 找立春日期
    var liChun = terms[2]; // 当年立春
    var liChunJD = getJulianDay(year, liChun.month, liChun.day);
    result.liChunDate = { month: liChun.month, day: liChun.day };
    result.passedLiChun = currentJD >= liChunJD;

    // 找到当前日期所在的月支
    // 从上年的小寒开始，按顺序检查
    var allBoundaries = [];
    // 上年小寒到上年大雪
    for (var i = 0; i < 12; i++) {
      var t = currentYearTerms[i];
      var prevTerm = termsPrev[t.idx];
      allBoundaries.push({
        jd: getJulianDay(year - 1, prevTerm.month, prevTerm.day),
        branch: t.branch,
        branchIdx: t.branchIdx,
        term: t.term
      });
    }
    // 当年小寒到当年大雪
    for (var i = 0; i < 12; i++) {
      var t = currentYearTerms[i];
      var curTerm = terms[t.idx];
      allBoundaries.push({
        jd: getJulianDay(year, curTerm.month, curTerm.day),
        branch: t.branch,
        branchIdx: t.branchIdx,
        term: t.term
      });
    }

    // 找到在当前日期之前最近的边界
    var found = false;
    for (var i = allBoundaries.length - 1; i >= 0; i--) {
      if (currentJD >= allBoundaries[i].jd) {
        result.branch = allBoundaries[i].branch;
        result.branchIdx = allBoundaries[i].branchIdx;
        result.term = allBoundaries[i].term;
        found = true;
        break;
      }
    }

    // 如果没找到（日期太早），默认为丑
    if (!found) {
      result.branch = '丑';
      result.branchIdx = 4;
    }

    return result;
  }

  // 导出
  global.LunarCalendar = {
    solar2lunar: solar2lunar,
    lunar2solar: lunar2solar,
    getYearSolarTerms: getYearSolarTerms,
    getMonthInfo: getMonthInfo,
    getLunarMonthName: getLunarMonthName,
    getLunarDayName: getLunarDayName,
    getAnimal: getAnimal,
    SOLAR_TERMS: SOLAR_TERMS
  };

})(window);
