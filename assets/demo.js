(function() {
  'use strict';

  // ============ 样本数据 ============

  var chart = {
    yearPillar:  { stem: '庚', branch: '午' },
    monthPillar: { stem: '辛', branch: '巳' },
    dayPillar:   { stem: '庚', branch: '子' },
    hourPillar:  { stem: '庚', branch: '辰' },
    dayMaster: '庚',
    gender: 'male'
  };

  var grandCycles = [
    { index: 1, ageStart: 8,  ageEnd: 18, stem: '壬', branch: '午' },
    { index: 2, ageStart: 18, ageEnd: 28, stem: '癸', branch: '未' },
    { index: 3, ageStart: 28, ageEnd: 38, stem: '甲', branch: '申' },
    { index: 4, ageStart: 38, ageEnd: 48, stem: '乙', branch: '酉' },
    { index: 5, ageStart: 48, ageEnd: 58, stem: '丙', branch: '戌' },
    { index: 6, ageStart: 58, ageEnd: 68, stem: '丁', branch: '亥' },
    { index: 7, ageStart: 68, ageEnd: 78, stem: '戊', branch: '子' },
    { index: 8, ageStart: 78, ageEnd: 88, stem: '己', branch: '丑' }
  ];

  // 生成 2021-2030 流年数据
  var annuals = [];
  for (var y = 2021; y <= 2030; y++) {
    var stemIdx = (y - 4) % 10;
    var branchIdx = (y - 4) % 12;
    var stem = STEMS[stemIdx];
    var branch = BRANCHES[branchIdx];
    var zodiac = BRANCHES[(y - 4) % 12];
    var isBenming = (branch === chart.yearPillar.branch);
    annuals.push({
      year: y, stem: stem, branch: branch, zodiac: zodiac,
      isBenming: isBenming,
      chongTaiSui: (BRANCH_CLASHES[branch] === zodiac),
      heTaiSui: (BRANCH_COMBINES_6[branch] === zodiac)
    });
  }

  // 当前年所在大运索引
  var currentYear = 2026;
  var currentAge = currentYear - 1990; // 36
  var currentGCIndex = 2; // 3rd大运 (0-based index 2)

  // ============ 计算所有年份趋势 ============

  var yearlyTrends = annuals.map(function(an) {
    var age = an.year - 1990;
    // 根据年龄找到对应大运
    var gcIdx = 0;
    for (var i = 0; i < grandCycles.length; i++) {
      if (age >= grandCycles[i].ageStart && age < grandCycles[i].ageEnd) {
        gcIdx = i;
        break;
      }
    }
    var gc = grandCycles[gcIdx];
    var trend = calculateTrend(chart, gc, an);
    var narrative = generateNarrative(trend, chart, gc, an);
    return {
      year: an.year,
      age: age,
      grandCycleIndex: gcIdx,
      grandCycle: gc,
      annual: an,
      trend: trend,
      narrative: narrative
    };
  });

  // 当前选中年份索引
  var selectedYearIdx = yearlyTrends.findIndex(function(t) { return t.year === currentYear; });
  if (selectedYearIdx < 0) selectedYearIdx = 0;

  // ============ 渲染函数 ============

  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  // --- 大运时间轴 ---
  function renderGCTimeline() {
    var track = document.getElementById('gc-track');
    track.innerHTML = '';
    grandCycles.forEach(function(gc, idx) {
      // 计算该大运的平均综合指数
      var gcYears = yearlyTrends.filter(function(t) { return t.grandCycleIndex === idx; });
      var avgIndex = gcYears.length > 0
        ? Math.round(gcYears.reduce(function(s, t) { return s + t.trend.compositeIndex; }, 0) / gcYears.length)
        : 0;
      var level = getTrendLevel(avgIndex || 50);

      var isActive = (idx === yearlyTrends[selectedYearIdx].grandCycleIndex);
      var div = document.createElement('div');
      div.className = 'gc-item' + (isActive ? ' active' : '');
      div.innerHTML =
        '<div class="gc-age">' + gc.ageStart + '-' + gc.ageEnd + '岁</div>' +
        '<div class="gc-ganzhi">' + gc.stem + gc.branch + '</div>' +
        '<div class="gc-index">第' + gc.index + '运</div>' +
        '<div class="gc-bar" style="background:' + level.color + '"></div>';
      div.addEventListener('click', function() {
        // 切换到该大运的第一个年份
        var firstYearInGC = yearlyTrends.findIndex(function(t) { return t.grandCycleIndex === idx; });
        if (firstYearInGC >= 0) {
          selectedYearIdx = firstYearInGC;
          renderAll();
        }
      });
      track.appendChild(div);
    });
  }

  // --- 年份选择器 ---
  function renderYearSelector() {
    var sel = document.getElementById('year-selector');
    sel.innerHTML = '';
    yearlyTrends.forEach(function(t, idx) {
      var btn = document.createElement('button');
      btn.className = 'year-btn' + (idx === selectedYearIdx ? ' active' : '');
      btn.textContent = t.year;
      btn.addEventListener('click', function() {
        selectedYearIdx = idx;
        renderAll();
      });
      sel.appendChild(btn);
    });
  }

  // --- 雷达图 ---
  var radarChart = null;
  function renderRadar() {
    var current = yearlyTrends[selectedYearIdx];
    var baseScores = current.trend.scores.baseScore;
    var finalScores = current.trend.scores.finalScore;

    if (!radarChart) {
      radarChart = echarts.init(document.getElementById('chart-radar-demo'), null, { renderer: 'svg' });
      window.addEventListener('resize', function() { radarChart.resize(); });
    }

    radarChart.setOption({
      animation: false,
      tooltip: { appendToBody: true },
      legend: {
        bottom: 0,
        textStyle: { color: ink, fontSize: 12 },
        data: ['命局基础分', '当前最终分']
      },
      radar: {
        indicator: [
          { name: '事业', max: 100 },
          { name: '财运', max: 100 },
          { name: '姻缘', max: 100 },
          { name: '亲情', max: 100 },
          { name: '健康', max: 100 }
        ],
        center: ['50%', '45%'],
        radius: '58%',
        axisName: { color: ink, fontSize: 13, fontWeight: 'bold' },
        splitLine: { lineStyle: { color: rule } },
        splitArea: { areaStyle: { color: [bg2, 'transparent'] } },
        axisLine: { lineStyle: { color: rule } }
      },
      series: [{
        type: 'radar',
        data: [
          {
            value: [baseScores.career, baseScores.wealth, baseScores.marriage, baseScores.family, baseScores.health],
            name: '命局基础分',
            itemStyle: { color: accent2 },
            areaStyle: { color: 'rgba(74,63,122,0.1)' },
            lineStyle: { color: accent2, width: 2 }
          },
          {
            value: [finalScores.career, finalScores.wealth, finalScores.marriage, finalScores.family, finalScores.health],
            name: '当前最终分',
            itemStyle: { color: accent },
            areaStyle: { color: 'rgba(184,134,11,0.12)' },
            lineStyle: { color: accent, width: 2 }
          }
        ]
      }]
    });
  }

  // --- 分数卡片 ---
  function renderScoreCards() {
    var current = yearlyTrends[selectedYearIdx];
    var scores = current.trend.scores.finalScore;
    var dims = [
      { key: 'career', label: '事业学业', color: accent },
      { key: 'wealth', label: '财运', color: accent2 },
      { key: 'marriage', label: '姻缘', color: '#8b6914' },
      { key: 'health', label: '健康', color: '#6b8e23' },
      { key: 'family', label: '亲情', color: muted }
    ];
    var container = document.getElementById('score-cards');
    container.innerHTML = '';
    dims.forEach(function(d) {
      var score = scores[d.key];
      var level = getTrendLevel(score);
      var card = document.createElement('div');
      card.className = 'score-card';
      card.innerHTML =
        '<div class="dim-label">' + d.label + '</div>' +
        '<div class="dim-score" style="color:' + level.color + '">' + score + '</div>' +
        '<div class="dim-bar" style="background:' + level.color + ';width:' + score + '%"></div>';
      container.appendChild(card);
    });
  }

  // --- 综合指数展示 ---
  function renderComposite() {
    var current = yearlyTrends[selectedYearIdx];
    var idx = current.trend.compositeIndex;
    var level = current.trend.trendLevel;
    var an = current.annual;
    var gc = current.grandCycle;

    var display = document.getElementById('composite-display');
    display.innerHTML =
      '<div class="score" style="color:' + level.color + '">' + idx + '</div>' +
      '<div class="level-badge" style="background:' + level.color + '">' + level.label + '</div>' +
      '<div class="desc">' + current.year + '年（' + current.age + '岁）· ' +
      gc.stem + gc.branch + '大运 · ' + an.stem + an.branch + '流年' +
      (an.isBenming ? ' · 本命年' : '') + '</div>';
  }

  // --- 五行分布 ---
  function renderFiveElements() {
    var current = yearlyTrends[selectedYearIdx];
    var fe = current.trend.fiveElements;
    var counts = fe.counts;
    var maxVal = Math.max.apply(null, Object.values(counts));
    var elements = [
      { key: '金', icon: '⚪', color: '#c0c0c0' },
      { key: '木', icon: '🟢', color: '#6b8e23' },
      { key: '水', icon: '🔵', color: '#4a90d9' },
      { key: '火', icon: '🔴', color: '#cd5c5c' },
      { key: '土', icon: '🟡', color: '#daa520' }
    ];
    var container = document.getElementById('five-elements');
    container.innerHTML = '';
    elements.forEach(function(e) {
      var val = counts[e.key] || 0;
      var pct = Math.round((val / maxVal) * 100);
      var bar = document.createElement('div');
      bar.className = 'fe-bar';
      bar.style.background = e.color + '22';
      bar.innerHTML =
        '<div class="fe-icon">' + e.icon + '</div>' +
        '<div style="color:' + e.color + '">' + e.key + '</div>' +
        '<div class="fe-val">' + val.toFixed(1) + '</div>';
      container.appendChild(bar);
    });
  }

  // --- 趋势走势图 ---
  var trendChart = null;
  function renderTrendChart() {
    if (!trendChart) {
      trendChart = echarts.init(document.getElementById('chart-trend-demo'), null, { renderer: 'svg' });
      window.addEventListener('resize', function() { trendChart.resize(); });
    }

    var years = yearlyTrends.map(function(t) { return t.year + '年'; });
    var compositeData = yearlyTrends.map(function(t) { return t.trend.compositeIndex; });
    var careerData = yearlyTrends.map(function(t) { return t.trend.scores.finalScore.career; });
    var wealthData = yearlyTrends.map(function(t) { return t.trend.scores.finalScore.wealth; });
    var marriageData = yearlyTrends.map(function(t) { return t.trend.scores.finalScore.marriage; });
    var healthData = yearlyTrends.map(function(t) { return t.trend.scores.finalScore.health; });
    var familyData = yearlyTrends.map(function(t) { return t.trend.scores.finalScore.family; });

    // 标记当前选中年
    var markPoint = {
      symbol: 'pin', symbolSize: 40,
      itemStyle: { color: accent },
      data: [{ coord: [selectedYearIdx, compositeData[selectedYearIdx]], value: '当前' }]
    };

    trendChart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, axisPointer: { type: 'cross' } },
      legend: {
        bottom: 0, textStyle: { color: ink, fontSize: 12 },
        data: ['综合指数', '事业', '财运', '姻缘', '健康', '亲情']
      },
      grid: { top: 30, left: 45, right: 20, bottom: 55 },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: rule } },
        axisLabel: { color: muted, fontSize: 11 }
      },
      yAxis: {
        type: 'value', min: 0, max: 100,
        axisLine: { show: false },
        axisLabel: { color: muted, fontSize: 11 },
        splitLine: { lineStyle: { color: rule, type: 'dashed' } }
      },
      series: [
        {
          name: '综合指数', type: 'line', smooth: true,
          data: compositeData,
          itemStyle: { color: accent }, lineStyle: { color: accent, width: 3 },
          areaStyle: { color: 'rgba(184,134,11,0.08)' },
          markPoint: markPoint,
          markLine: {
            silent: true, symbol: 'none',
            lineStyle: { color: accent, type: 'dashed', opacity: 0.3 },
            data: [{ yAxis: 55, label: { formatter: '平线', color: muted, fontSize: 10 } }]
          }
        },
        { name: '事业', type: 'line', smooth: true, data: careerData,
          itemStyle: { color: accent }, lineStyle: { color: accent, width: 1.5, opacity: 0.5 } },
        { name: '财运', type: 'line', smooth: true, data: wealthData,
          itemStyle: { color: accent2 }, lineStyle: { color: accent2, width: 1.5, opacity: 0.5 } },
        { name: '姻缘', type: 'line', smooth: true, data: marriageData,
          itemStyle: { color: '#8b6914' }, lineStyle: { color: '#8b6914', width: 1.5, opacity: 0.5 } },
        { name: '健康', type: 'line', smooth: true, data: healthData,
          itemStyle: { color: '#6b8e23' }, lineStyle: { color: '#6b8e23', width: 1.5, opacity: 0.5 } },
        { name: '亲情', type: 'line', smooth: true, data: familyData,
          itemStyle: { color: muted }, lineStyle: { color: muted, width: 1.5, opacity: 0.5 } }
      ]
    });

    // 点击趋势图切换年份
    trendChart.off('click');
    trendChart.on('click', function(params) {
      if (params.componentIndex === 0 && params.seriesName === '综合指数') {
        selectedYearIdx = params.dataIndex;
        renderAll();
      }
    });
  }

  // --- 解读文字 ---
  function renderNarrative() {
    var current = yearlyTrends[selectedYearIdx];
    var narratives = current.narrative;

    // 综合解读
    var compDiv = document.getElementById('narrative-composite');
    compDiv.innerHTML = narratives.composite;

    // 五维解读
    var dims = [
      { key: 'career', label: '事业学业' },
      { key: 'wealth', label: '财运' },
      { key: 'marriage', label: '姻缘' },
      { key: 'family', label: '亲情' },
      { key: 'health', label: '健康' }
    ];
    var scores = current.trend.scores.finalScore;
    var grid = document.getElementById('narrative-grid');
    grid.innerHTML = '';
    dims.forEach(function(d) {
      var score = scores[d.key];
      var level = getTrendLevel(score);
      var card = document.createElement('div');
      card.className = 'narrative-card';
      card.style.borderLeftColor = level.color;
      card.innerHTML =
        '<div class="nc-header">' +
          '<div class="nc-title">' + d.label + '</div>' +
          '<div class="nc-score" style="background:' + level.color + '">' + score + '</div>' +
        '</div>' +
        '<div class="nc-text">' + narratives[d.key] + '</div>';
      grid.appendChild(card);
    });
  }

  // --- 渲染全部 ---
  function renderAll() {
    renderGCTimeline();
    renderYearSelector();
    renderRadar();
    renderScoreCards();
    renderComposite();
    renderFiveElements();
    renderTrendChart();
    renderNarrative();
  }

  // ============ 初始化 ============
  renderAll();
})();
