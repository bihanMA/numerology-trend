(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  // --- Chart 1: Weight Allocation (Pie) ---
  var chartWeights = echarts.init(document.getElementById('chart-weights'), null, { renderer: 'svg' });
  chartWeights.setOption({
    animation: false,
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      formatter: '{b}: {c}% ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: ink, fontSize: 14 },
      itemGap: 12
    },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['38%', '50%'],
      avoidLabelOverlap: true,
      label: {
        show: true,
        formatter: '{c}%',
        color: ink,
        fontSize: 14,
        fontWeight: 'bold'
      },
      labelLine: { show: true, lineStyle: { color: rule } },
      data: [
        { value: 25, name: '事业学业', itemStyle: { color: accent } },
        { value: 20, name: '财运', itemStyle: { color: accent2 } },
        { value: 20, name: '姻缘', itemStyle: { color: '#8b6914' } },
        { value: 20, name: '健康', itemStyle: { color: '#6b8e23' } },
        { value: 15, name: '亲情', itemStyle: { color: muted } }
      ]
    }]
  });
  window.addEventListener('resize', function() { chartWeights.resize(); });

  // --- Chart 2: Five-Dimension Radar ---
  var chartRadar = echarts.init(document.getElementById('chart-radar'), null, { renderer: 'svg' });
  chartRadar.setOption({
    animation: false,
    tooltip: { appendToBody: true },
    legend: {
      bottom: 0,
      textStyle: { color: ink, fontSize: 13 },
      data: ['命局基础分', '当前最终分']
    },
    radar: {
      indicator: [
        { name: '事业学业', max: 100 },
        { name: '财运', max: 100 },
        { name: '姻缘', max: 100 },
        { name: '亲情', max: 100 },
        { name: '健康', max: 100 }
      ],
      center: ['50%', '48%'],
      radius: '62%',
      axisName: { color: ink, fontSize: 14, fontWeight: 'bold' },
      splitLine: { lineStyle: { color: rule } },
      splitArea: { areaStyle: { color: [bg2, 'transparent'] } },
      axisLine: { lineStyle: { color: rule } }
    },
    series: [{
      type: 'radar',
      data: [
        {
          value: [65, 55, 70, 60, 75],
          name: '命局基础分',
          itemStyle: { color: accent2 },
          areaStyle: { color: 'rgba(74, 63, 122, 0.12)' },
          lineStyle: { color: accent2, width: 2 }
        },
        {
          value: [79, 52, 75, 63, 68],
          name: '当前最终分',
          itemStyle: { color: accent },
          areaStyle: { color: 'rgba(184, 134, 11, 0.15)' },
          lineStyle: { color: accent, width: 2 }
        }
      ]
    }]
  });
  window.addEventListener('resize', function() { chartRadar.resize(); });

  // --- Chart 3: Ten-Year Trend Timeline (Line) ---
  var chartTrend = echarts.init(document.getElementById('chart-trend'), null, { renderer: 'svg' });
  chartTrend.setOption({
    animation: false,
    tooltip: {
      trigger: 'axis',
      appendToBody: true,
      axisPointer: { type: 'cross', crossStyle: { color: rule } }
    },
    legend: {
      bottom: 0,
      textStyle: { color: ink, fontSize: 13 },
      data: ['综合趋势指数', '事业学业', '财运', '姻缘', '健康', '亲情']
    },
    grid: { top: 40, left: 50, right: 30, bottom: 60 },
    xAxis: {
      type: 'category',
      data: ['26岁', '27岁', '28岁', '29岁', '30岁', '31岁', '32岁', '33岁', '34岁', '35岁'],
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisLabel: { color: muted, fontSize: 12 },
      splitLine: { lineStyle: { color: rule, type: 'dashed' } }
    },
    series: [
      {
        name: '综合趋势指数',
        type: 'line',
        smooth: true,
        data: [62, 65, 67.8, 63, 70, 72, 68, 65, 60, 58],
        itemStyle: { color: accent },
        lineStyle: { color: accent, width: 3 },
        areaStyle: { color: 'rgba(184, 134, 11, 0.1)' },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: accent, type: 'dashed', opacity: 0.3 },
          data: [{ yAxis: 55, label: { formatter: '平线', color: muted, fontSize: 11 } }]
        }
      },
      {
        name: '事业学业',
        type: 'line',
        smooth: true,
        data: [72, 75, 79, 74, 82, 85, 80, 77, 71, 68],
        itemStyle: { color: accent },
        lineStyle: { color: accent, width: 1.5, opacity: 0.6 }
      },
      {
        name: '财运',
        type: 'line',
        smooth: true,
        data: [48, 50, 52, 49, 55, 58, 54, 51, 47, 45],
        itemStyle: { color: accent2 },
        lineStyle: { color: accent2, width: 1.5, opacity: 0.6 }
      },
      {
        name: '姻缘',
        type: 'line',
        smooth: true,
        data: [68, 71, 75, 70, 78, 80, 76, 73, 69, 66],
        itemStyle: { color: '#8b6914' },
        lineStyle: { color: '#8b6914', width: 1.5, opacity: 0.6 }
      },
      {
        name: '健康',
        type: 'line',
        smooth: true,
        data: [72, 70, 68, 65, 67, 69, 66, 63, 60, 58],
        itemStyle: { color: '#6b8e23' },
        lineStyle: { color: '#6b8e23', width: 1.5, opacity: 0.6 }
      },
      {
        name: '亲情',
        type: 'line',
        smooth: true,
        data: [58, 60, 63, 61, 65, 67, 64, 62, 59, 57],
        itemStyle: { color: muted },
        lineStyle: { color: muted, width: 1.5, opacity: 0.6 }
      }
    ]
  });
  window.addEventListener('resize', function() { chartTrend.resize(); });

})();
