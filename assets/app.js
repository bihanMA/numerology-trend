/**
 * 命理趋势参考 — 应用控制器
 * 统筹小六壬、八字、紫微斗数三大模块
 */
(function() {
  'use strict';

  // ============ 全局状态 ============
  var state = {
    birthInfo: null,
    baziChart: null,
    grandCycles: null,
    ziweiChart: null,
    xlrCategory: '测吉凶',
    selectedYearIdx: 0,
    yearlyTrends: [],
    radarChart: null,
    trendChart: null,
    radarNeedsRender: false,
    lastXLRResult: null,
    lastXLRInputs: null
  };

  // ============ 工具函数 ============
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function getCSS(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function getBeijingTime() {
    var now = new Date();
    var utc = now.getTime() + now.getTimezoneOffset() * 60000;
    var beijing = new Date(utc + 8 * 3600000);
    return {
      year: beijing.getFullYear(),
      month: beijing.getMonth() + 1,
      day: beijing.getDate(),
      hour: beijing.getHours()
    };
  }

  // ============ 铜钱动画 + 顶部栏 ============
  var PALACE_IDS = ['pg-daan','pg-liulian','pg-suxi','pg-chikou','pg-xiaoji','pg-kongwang'];

  function playCoinSound() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.12, 0.24].forEach(function(delay, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880 - i * 80, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.15);
      });
    } catch(e) {}
  }

  function playCoinAnimation(callback) {
    var overlay = $('coin-overlay');
    var textEl = $('coin-text');
    if (!overlay) { if (callback) callback(); return; }

    overlay.classList.remove('fade-out');
    overlay.classList.add('show');
    playCoinSound();

    var texts = ['铜钱落盘，正在起卦…', '卦象已成'];
    textEl.textContent = texts[0];
    setTimeout(function() { textEl.textContent = texts[1]; }, 1400);

    setTimeout(function() {
      overlay.classList.add('fade-out');
      setTimeout(function() {
        overlay.classList.remove('show', 'fade-out');
        if (callback) callback();
      }, 500);
    }, 2000);
  }

  function setupTopBar() {
    // 语言切换
    var langBtn = $('lang-toggle');
    if (langBtn) {
      langBtn.addEventListener('click', function() {
        I18N.toggle();
      });
    }

    // 设置按钮
    var settingsBtn = $('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function() {
        var modal = $('settings-modal');
        if (!modal) return;
        modal.classList.add('show');
        var urlInput = $('share-url-input');
        if (urlInput) urlInput.value = window.location.href;
        var qrArea = $('settings-qr-area');
        if (qrArea && qrArea.children.length === 0) {
          var img = document.createElement('img');
          img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(window.location.href);
          img.alt = 'QR Code';
          img.style.cssText = 'width:180px;height:180px;border-radius:8px;border:1px solid var(--rule);';
          qrArea.appendChild(img);
        }
      });
    }

    // 设置弹窗关闭
    var settingsClose = $('settings-close');
    if (settingsClose) {
      settingsClose.addEventListener('click', function() {
        $('settings-modal').classList.remove('show');
      });
    }
    var settingsModal = $('settings-modal');
    if (settingsModal) {
      settingsModal.addEventListener('click', function(e) {
        if (e.target === settingsModal) settingsModal.classList.remove('show');
      });
    }
    var shareCopy = $('share-copy-btn');
    if (shareCopy) {
      shareCopy.addEventListener('click', function() {
        var input = $('share-url-input');
        if (input) {
          input.select();
          try { document.execCommand('copy'); } catch(e) {}
          if (navigator.clipboard) {
            navigator.clipboard.writeText(input.value);
          }
          shareCopy.textContent = '已复制';
          setTimeout(function() { shareCopy.textContent = '复制'; }, 2000);
        }
      });
    }

    // 主题颜色切换
    var themeSwatches = document.querySelectorAll('.theme-swatch');
    var themeColors = {
      pink:   { accent: '#9a4a2a', light: '#c47544', accent2: '#6b3a1f', accent2l: '#a06030', rgb: '154,74,42',  rgb2: '107,58,31' },
      green:  { accent: '#3a6a2a', light: '#5a8a3a', accent2: '#2a4a1f', accent2l: '#4a6a30', rgb: '58,106,42',   rgb2: '42,74,31' },
      purple: { accent: '#6a4a8a', light: '#8a6aaa', accent2: '#4a3a6f', accent2l: '#6a5a90', rgb: '106,74,138', rgb2: '74,58,111' },
      blue:   { accent: '#3a5a8a', light: '#5a7aaa', accent2: '#2a3a6f', accent2l: '#4a5a90', rgb: '58,90,138',  rgb2: '42,58,111' },
      orange: { accent: '#b06020', light: '#c47a30', accent2: '#8a4010', accent2l: '#a05a20', rgb: '176,96,32',   rgb2: '138,64,16' },
      teal:   { accent: '#2a7a7a', light: '#3a8a8a', accent2: '#1a5a5a', accent2l: '#2a6a6a', rgb: '42,122,122',  rgb2: '26,90,90' }
    };
    themeSwatches.forEach(function(swatch) {
      swatch.addEventListener('click', function() {
        var themeName = swatch.getAttribute('data-theme');
        var c = themeColors[themeName];
        if (!c) return;
        var root = document.documentElement;
        root.style.setProperty('--accent', c.accent);
        root.style.setProperty('--accent-light', c.light);
        root.style.setProperty('--accent2', c.accent2);
        root.style.setProperty('--accent2-light', c.accent2l);
        root.style.setProperty('--accent-rgb', c.rgb);
        root.style.setProperty('--accent2-rgb', c.rgb2);
        themeSwatches.forEach(function(s) { s.classList.remove('active'); });
        swatch.classList.add('active');
        try { localStorage.setItem('theme-color', themeName); } catch(e) {}
      });
    });
    try {
      var savedTheme = localStorage.getItem('theme-color');
      if (savedTheme && themeColors[savedTheme]) {
        var swatchToActivate = document.querySelector('.theme-swatch[data-theme="' + savedTheme + '"]');
        if (swatchToActivate) swatchToActivate.click();
      }
    } catch(e) {}

    // 背景图片上传
    var bgUploadBtn = $('bg-upload-btn');
    var bgUpload = $('bg-upload');
    var bgResetBtn = $('bg-reset-btn');
    if (bgUploadBtn && bgUpload) {
      bgUploadBtn.addEventListener('click', function() { bgUpload.click(); });
    }
    if (bgUpload) {
      bgUpload.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
          document.body.style.backgroundImage = 'url(' + ev.target.result + ')';
          document.body.style.backgroundSize = 'cover';
          document.body.style.backgroundPosition = 'center';
          document.body.style.backgroundAttachment = 'fixed';
          try { localStorage.setItem('bg-image', ev.target.result); } catch(e) {}
        };
        reader.readAsDataURL(file);
      });
    }
    if (bgResetBtn) {
      bgResetBtn.addEventListener('click', function() {
        document.body.style.backgroundImage = '';
        document.body.style.backgroundSize = '';
        document.body.style.backgroundPosition = '';
        document.body.style.backgroundAttachment = '';
        try { localStorage.removeItem('bg-image'); } catch(e) {}
      });
    }
    try {
      var savedBg = localStorage.getItem('bg-image');
      if (savedBg) {
        document.body.style.backgroundImage = 'url(' + savedBg + ')';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
      }
    } catch(e) {}
  }

  function highlightPalmPalace(palaceName) {
    var map = {
      '大安': 'pg-daan', '留连': 'pg-liulian', '速喜': 'pg-suxi',
      '赤口': 'pg-chikou', '小吉': 'pg-xiaoji', '空亡': 'pg-kongwang'
    };
    PALACE_IDS.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
    var id = map[palaceName];
    if (id) {
      var el = document.getElementById(id);
      if (el) el.classList.add('active');
    }
  }

  // ============ 合盘模块 ============

  function setupCompatibility() {
    var btn = $('btn-compat');
    if (!btn) return;
    btn.addEventListener('click', function() {
      if (!state.baziChart || !state.birthInfo) {
        alert('请先在上方完成本人排盘推演，再进行合盘～');
        return;
      }

      var year = parseInt($('compat-year').value);
      var month = parseInt($('compat-month').value);
      var day = parseInt($('compat-day').value);
      var hour = parseInt($('compat-hour').value);
      var gender = $('compat-gender').value;

      if (!year || !month || !day || isNaN(hour)) {
        alert('另一方生辰信息填写不完整，请检查～');
        return;
      }

      playCoinAnimation(function() {
        try {
          var chartB = buildBaZiChart(year, month, day, hour, gender);
          var infoA = state.birthInfo;
          var infoB = { year: year, month: month, day: day, hour: hour, gender: gender };
          var result = calculateCompatibility(state.baziChart, chartB, infoA, infoB);
          renderCompatibility(result);
        } catch(e) {
          console.error('合盘计算失败:', e);
          $('compat-result-area').innerHTML = '<div class="empty-state"><div class="es-icon">!</div>合盘计算出错了，请检查生辰信息是否正确</div>';
        }
      });
    });
  }

  function renderCompatibility(result) {
    var area = $('compat-result-area');
    if (!area) return;

    var score = result.score;
    var circumference = 2 * Math.PI * 32;
    var dashOffset = circumference * (1 - score / 100);

    var scoreColor = score >= 65 ? '#5a7a3a' : score >= 50 ? '#9a4a2a' : '#a04020';

    var html = '<div class="compat-result">';

    // 评分环
    html += '<div class="compat-score-box">';
    html += '<div class="compat-score-ring">';
    html += '<svg viewBox="0 0 80 80">';
    html += '<circle cx="40" cy="40" r="32" fill="none" stroke="#e8e5e0" stroke-width="4"/>';
    html += '<circle cx="40" cy="40" r="32" fill="none" stroke="' + scoreColor + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + dashOffset + '"/>';
    html += '</svg>';
    html += '<span class="score-num" style="color:' + scoreColor + '">' + score + '</span>';
    html += '</div>';
    html += '<div class="compat-score-label">' + result.levelLabel + '</div>';
    html += '</div>';

    // 双方信息
    html += '<div class="compat-persons">';
    html += '<div class="compat-person"><span class="pname">本人</span> <span class="pdm">' + result.personA.dayMaster + '（' + result.personA.element + '）</span></div>';
    html += '<span class="compat-vs">vs</span>';
    html += '<div class="compat-person"><span class="pname">另一方</span> <span class="pdm">' + result.personB.dayMaster + '（' + result.personB.element + '）</span></div>';
    html += '</div>';

    // 日主关系
    html += '<div class="compat-dm-interaction">';
    html += '<div class="cdi-label">日主关系：' + result.dmRelation.type + '</div>';
    html += result.dmRelation.desc;
    html += '</div>';

    // 板块一：契合的方面
    var harmony = result.sections.harmony;
    html += '<div class="compat-section expanded" id="compat-sec-1">';
    html += '<div class="compat-section-header" data-section="1"><span class="cs-icon">' + harmony.icon + '</span><span class="cs-title">' + harmony.title + '</span><span class="cs-arrow">▼</span></div>';
    html += '<div class="compat-section-body">';
    html += '<div class="compat-section-summary">' + harmony.summary + '</div>';
    html += '<div class="compat-aspects-grid">';
    harmony.aspects.forEach(function(a) {
      html += '<div class="compat-aspect-item">';
      html += '<div class="cai-label">' + a.area + '</div>';
      html += '<div class="cai-detail">' + a.detail + '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // 板块二：不合拍的方面
    var friction = result.sections.friction;
    html += '<div class="compat-section" id="compat-sec-2">';
    html += '<div class="compat-section-header" data-section="2"><span class="cs-icon">' + friction.icon + '</span><span class="cs-title">' + friction.title + '</span><span class="cs-arrow">▼</span></div>';
    html += '<div class="compat-section-body">';
    html += '<div class="compat-section-summary">' + friction.summary + '</div>';
    friction.frictions.forEach(function(f) {
      html += '<div class="compat-friction-item">';
      html += '<div class="cfi-label">' + f.area + '</div>';
      html += '<div class="cfi-detail">' + f.detail + '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    // 板块三：五行互补分析
    var elements = result.sections.elements;
    html += '<div class="compat-section" id="compat-sec-3">';
    html += '<div class="compat-section-header" data-section="3"><span class="cs-icon">' + elements.icon + '</span><span class="cs-title">' + elements.title + '</span><span class="cs-arrow">▼</span></div>';
    html += '<div class="compat-section-body">';
    html += '<div class="compat-section-summary">' + elements.summary + '</div>';

    html += '<div class="compat-dm-interaction"><div class="cdi-label">日主五行互动</div>' + elements.dmInteraction + '</div>';

    html += '<div style="font-size:0.78rem;font-weight:700;color:var(--green);margin:0.5rem 0 0.3rem;">互补的五行</div>';
    elements.complement.forEach(function(c) {
      html += '<div class="compat-element-item comp"><span class="cei-label">' + c.element + '</span> ' + c.detail + '</div>';
    });

    html += '<div style="font-size:0.78rem;font-weight:700;color:var(--accent);margin:0.5rem 0 0.3rem;">互耗的五行</div>';
    elements.consume.forEach(function(c) {
      html += '<div class="compat-element-item cons"><span class="cei-label">' + c.element + '</span> ' + c.detail + '</div>';
    });

    html += '</div>';
    html += '</div>';

    // 板块四：实际磨合建议
    var advice = result.sections.advice;
    html += '<div class="compat-section" id="compat-sec-4">';
    html += '<div class="compat-section-header" data-section="4"><span class="cs-icon">' + advice.icon + '</span><span class="cs-title">' + advice.title + '</span><span class="cs-arrow">▼</span></div>';
    html += '<div class="compat-section-body">';
    html += '<div class="compat-section-summary">' + advice.summary + '</div>';
    html += '<ul class="compat-tips-list">';
    advice.tips.forEach(function(t) {
      html += '<li>' + t + '</li>';
    });
    html += '</ul>';
    html += '</div>';
    html += '</div>';

    // 声明
    html += '<div class="compat-disclaimer">合盘分析仅基于八字五行民俗文化，不构成任何宿命定断。关系好坏重在双方用心经营，仅供参考～</div>';

    html += '</div>';

    area.innerHTML = html;
    area.style.animation = 'compatFadeIn 0.5s ease';

    // 如果当前是繁体模式，转换新渲染的内容
    if (window.I18N && I18N.isTraditional()) {
      I18N.convertElement(area);
    }

    // 绑定折叠/展开
    area.querySelectorAll('.compat-section-header').forEach(function(header) {
      header.addEventListener('click', function() {
        var section = header.parentElement;
        section.classList.toggle('expanded');
      });
    });
  }

  // ============ Tab 通用控制 ============
  function setupTabs(tabBarId) {
    var bar = $(tabBarId);
    if (!bar) return;
    bar.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tabId = btn.getAttribute('data-tab');
        var card = bar.closest('.module-card');
        card.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
        card.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
        btn.classList.add('active');
        var content = $('tab-' + tabId);
        if (content) content.classList.add('active');
        // 重新调整图表大小 - 首次显示时渲染，之后只 resize
        if (tabId === 'bazi-radar') {
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              if (state.radarNeedsRender) {
                state.radarNeedsRender = false;
                renderRadarChart();
                renderTrendChart();
              } else {
                if (state.radarChart) state.radarChart.resize();
                if (state.trendChart) state.trendChart.resize();
              }
            });
          });
        }
      });
    });
  }

  // ============ 小六壬 模块 ============

  function setupXiaoLiuRen() {
    $('xlr-now').addEventListener('click', function() {
      playCoinAnimation(function() {
        var beijing = getBeijingTime();
        var month = beijing.month;
        var day = beijing.day;
        var shichenIdx = getShichenFromHour(beijing.hour);
        var hour = shichenIdx + 1;
        state.lastXLRInputs = { type: 'time' };
        var result = calculateXiaoLiuRen(month, day, hour);
        renderXLRResult(result);
      });
    });

    $('xlr-calc').addEventListener('click', function() {
      playCoinAnimation(function() {
        var n1 = parseInt($('xlr-n1').value) || 1;
        var n2 = parseInt($('xlr-n2').value) || 1;
        var n3 = parseInt($('xlr-n3').value) || 1;
        state.lastXLRInputs = { type: 'numbers', n1: n1, n2: n2, n3: n3 };
        var result = calculateFromThreeNumbers(n1, n2, n3);
        renderXLRResult(result);
      });
    });

    // 再占一卦
    $('xlr-redivine').addEventListener('click', function() {
      playCoinAnimation(function() {
        if (state.lastXLRInputs) {
          var inp = state.lastXLRInputs;
          var result;
          if (inp.type === 'numbers') {
            result = calculateFromThreeNumbers(inp.n1, inp.n2, inp.n3);
          } else {
            var beijing = getBeijingTime();
            var shichenIdx = getShichenFromHour(beijing.hour);
            var hour = shichenIdx + 1;
            result = calculateXiaoLiuRen(beijing.month, beijing.day, hour);
          }
          renderXLRResult(result);
        } else {
          var beijing = getBeijingTime();
          var shichenIdx = getShichenFromHour(beijing.hour);
          var hour = shichenIdx + 1;
          var result = calculateXiaoLiuRen(beijing.month, beijing.day, hour);
          renderXLRResult(result);
        }
      });
    });

    // 随机起卦
    $('xlr-random').addEventListener('click', function() {
      playCoinAnimation(function() {
        var n1 = Math.floor(Math.random() * 9) + 1;
        var n2 = Math.floor(Math.random() * 9) + 1;
        var n3 = Math.floor(Math.random() * 9) + 1;
        $('xlr-n1').value = n1;
        $('xlr-n2').value = n2;
        $('xlr-n3').value = n3;
        var result = calculateFromThreeNumbers(n1, n2, n3);
        renderXLRResult(result);
      });
    });

    // Enter key support
    document.querySelectorAll('.xlr-nums input').forEach(function(inp) {
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') $('xlr-calc').click();
      });
    });

    // Category tabs
    $('xlr-cat-tabs').querySelectorAll('.xlr-cat-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        $('xlr-cat-tabs').querySelectorAll('.xlr-cat-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.xlrCategory = btn.getAttribute('data-cat');
        if (state.lastXLRResult) renderXLRResult(state.lastXLRResult);
      });
    });
  }

  function renderXLRResult(result) {
    state.lastXLRResult = result;
    var narrative = generateXLRNarrative(result, state.xlrCategory);
    var container = $('xlr-result');
    container.innerHTML = '';
    container.classList.remove('result-fade-in');
    void container.offsetWidth;
    container.classList.add('result-fade-in');

    // 高亮掌诀图中的宫位
    highlightPalmPalace(narrative.resultName);

    // 三传过程 (一行排列，含各自解读)
    var transDiv = el('div', 'xlr-three-trans');
    narrative.threeTransmissions.forEach(function(t, idx) {
      var item = el('div', 'xlr-trans-item');
      var jiLevel = '';
      var jiColor = '';
      var score = { '大安': 2, '留连': -1, '速喜': 3, '赤口': -2, '小吉': 2, '空亡': -3 }[t.position.name] || 0;
      if (score >= 2) { jiLevel = '吉'; jiColor = '#5a8a3a'; }
      else if (score === 0) { jiLevel = '中'; jiColor = '#888'; }
      else if (score > 0) { jiLevel = '小吉'; jiColor = '#7a9a5a'; }
      else if (score === -1) { jiLevel = '小阻'; jiColor = '#b08040'; }
      else { jiLevel = '凶'; jiColor = '#a04030'; }

      item.innerHTML =
        '<div class="trans-label">' + t.label + '</div>' +
        '<div class="trans-name" style="color:' + t.position.color + '">' + t.position.name + '</div>' +
        '<div class="trans-meta">' +
          t.position.element + ' · ' + t.position.deity +
          '<span class="trans-level" style="color:' + jiColor + '">' + jiLevel + '</span>' +
        '</div>' +
        '<div class="trans-interp">' + (t.interp ? t.interp.detail : '') + '</div>';
      transDiv.appendChild(item);
      if (idx < 2) {
        transDiv.appendChild(el('div', 'trans-arrow', '→'));
      }
    });
    container.appendChild(transDiv);

    // 趋势分析 (转机判断)
    var trendDiv = el('div', 'xlr-trend');
    var trendColor = narrative.totalScore >= 2 ? '#5a8a3a' : narrative.totalScore <= -2 ? '#a04030' : '#888';
    trendDiv.innerHTML =
      '<div class="trend-header">' +
        '<span class="trend-label">趋势分析</span>' +
        '<span class="trend-tag" style="color:' + trendColor + '">' + narrative.trend + '</span>' +
      '</div>' +
      '<div class="trend-desc">' + narrative.turnDesc + '</div>';
    if (narrative.hasTurn) {
      trendDiv.innerHTML += '<div class="turn-tip">有转机</div>';
    }
    container.appendChild(trendDiv);

    // 主结果 (末传)
    var mainDiv = el('div', 'xlr-main-result');
    var tagsHtml =
      '<span class="xlr-tag" style="background:' + narrative.resultColor + ';color:#fff">' + narrative.resultName + '</span>' +
      '<span class="xlr-tag" style="background:' + getCSS('--bg2') + ';color:' + getCSS('--muted') + '">' +
        narrative.resultDeity + ' · ' + narrative.resultElement + ' · ' + narrative.resultHexagram + '</span>';

    mainDiv.innerHTML =
      '<div class="result-name" style="color:' + narrative.resultColor + '">' + narrative.resultName + '</div>' +
      '<div class="result-tags">' + tagsHtml + '</div>' +
      '<div class="xlr-verse">' + narrative.verse.replace(/\n/g, '<br>') + '</div>';
    container.appendChild(mainDiv);

    // 行动建议
    var adviceDiv = el('div', 'xlr-advice');
    adviceDiv.innerHTML =
      '<div class="advice-title">行动建议</div>' +
      '<div class="advice-detail">' + narrative.actionAdvice + '</div>';
    container.appendChild(adviceDiv);

    // 解读
    var interpDiv = el('div', 'xlr-interp');
    interpDiv.innerHTML =
      '<div class="interp-title">【' + narrative.category + '】' + narrative.resultName +
        '——' + narrative.summary + '</div>' +
      '<div class="interp-detail">' + narrative.interpretation + '</div>' +
      '<div class="xlr-source">依据：「' + narrative.verse.split('\n')[0] +
        '……」（' + narrative.resultName + '断辞）' +
        '（《增补玉匣记·李淳风六壬时课》）</div>';
    container.appendChild(interpDiv);

    // 显示操作按钮
    var actions = $('xlr-actions');
    if (actions) actions.style.display = 'flex';
  }

  // ============ 八字 模块 ============

  function calculateAll() {
    var calType = $('birth-caltype') ? $('birth-caltype').value : 'solar';
    var inputYear = parseInt($('birth-year').value);
    var inputMonth = parseInt($('birth-month').value);
    var inputDay = parseInt($('birth-day').value);
    var hour = parseInt($('birth-hour').value);
    var gender = $('birth-gender').value;
    var trueSolar = $('birth-truesolar') ? $('birth-truesolar').value : 'off';
    var longitude = $('birth-longitude') ? parseFloat($('birth-longitude').value) : 120;

    if (!inputYear || !inputMonth || !inputDay) {
      alert('请填写完整的出生年月日');
      return;
    }

    // 真太阳时修正
    var trueSolarNote = '';
    if (trueSolar === 'on' && longitude !== 120) {
      var correctionMin = (longitude - 120) * 4;
      var correctedHour = hour + correctionMin / 60;
      if (correctedHour < 0) correctedHour += 24;
      if (correctedHour >= 24) correctedHour -= 24;
      var oldShichen = getShichen(hour);
      var newShichen = getShichen(Math.floor(correctedHour));
      if (oldShichen !== newShichen) {
        trueSolarNote = '真太阳时修正：经度' + longitude + '°，时辰由' +
          SHICHEN_NAMES[oldShichen] + '时变为' + SHICHEN_NAMES[newShichen] + '时';
      }
      hour = Math.floor(correctedHour);
    }

    // 时辰临界提醒
    var boundaryNote = '';
    var boundaryHours = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
    for (var bi = 0; bi < boundaryHours.length; bi++) {
      if (Math.abs(hour - boundaryHours[bi]) <= 0.25) {
        boundaryNote = '出生时间接近时辰交界（' + boundaryHours[bi] + ':00），时辰变动会导致全盘改变，请确认准确时间';
        break;
      }
    }

    state.timeBoundaryNote = boundaryNote;
    state.trueSolarNote = trueSolarNote;

    var year, month, day;
    if (calType === 'lunar' && window.LunarCalendar) {
      var solar = LunarCalendar.lunar2solar(inputYear, inputMonth, inputDay, false);
      if (!solar) {
        alert('农历日期转换失败，请检查输入');
        return;
      }
      year = solar.year;
      month = solar.month;
      day = solar.day;
    } else {
      year = inputYear;
      month = inputMonth;
      day = inputDay;
    }

    state.birthInfo = { year: year, month: month, day: day, hour: hour, gender: gender, calType: calType, inputYear: inputYear, inputMonth: inputMonth, inputDay: inputDay };

    // 1. 八字排盘
    state.baziChart = buildBaZiChart(year, month, day, hour, gender);
    state.grandCycles = calculateGrandCycles(state.baziChart);

    // 2. 计算流年趋势
    calculateYearlyTrends();

    // 3. 紫微斗数
    var yearGZ = getYearGanZhi(year, month, day);
    var shichenIdx = getShichen(hour);
    var lunarInfo = state.baziChart.lunarInfo;
    var lunarMonth = lunarInfo ? lunarInfo.month : inputMonth;
    var ziweiLunarDay = lunarInfo ? lunarInfo.day : inputDay;
    state.ziweiChart = buildZiweiChart({
      year: year,
      yearStem: yearGZ.stem,
      yearBranch: yearGZ.branch,
      lunarMonth: lunarMonth,
      lunarDay: ziweiLunarDay,
      hourIdx: shichenIdx,
      gender: gender
    });

    // 渲染所有模块 — 每个独立try-catch防止级联失败
    try { renderBaZiChart(); } catch(e) { console.error('八字排盘渲染失败:', e); }
    try { renderBaZiDaily(); } catch(e) { console.error('当日运势渲染失败:', e); }
    try { renderBaZiDaYun(); } catch(e) { console.error('大运流年渲染失败:', e); }
    try { renderBaZiGuidance(); } catch(e) { console.error('个人指导渲染失败:', e); }
    try { renderBaZiRadar(); } catch(e) { console.error('五维趋势渲染失败:', e); }
    try { renderBaZiLifeReading(); } catch(e) { console.error('八字命理总览渲染失败:', e); }
    try { renderZiWeiChart(); } catch(e) { console.error('紫微斗数排盘渲染失败:', e); }
    try { renderZiWeiDaily(); } catch(e) { console.error('紫微当日运势渲染失败:', e); }
    try { renderZiWeiLifeReading(); } catch(e) { console.error('紫微命理总览渲染失败:', e); }
  }

  function calculateYearlyTrends() {
    var chart = state.baziChart;
    var currentYear = new Date().getFullYear();
    var startYear = currentYear - 5;
    var endYear = currentYear + 5;

    state.yearlyTrends = [];
    for (var y = startYear; y <= endYear; y++) {
      var annual = calculateAnnual(y);
      var age = y - state.birthInfo.year;

      // 找到对应大运
      var gcIdx = 0;
      for (var i = 0; i < state.grandCycles.length; i++) {
        if (age >= state.grandCycles[i].ageStart && age < state.grandCycles[i].ageEnd) {
          gcIdx = i;
          break;
        }
      }
      var gc = state.grandCycles[gcIdx];
      var trend = calculateTrend(chart, gc, annual);
      var narrative = generateNarrative(trend, chart, gc, annual);

      state.yearlyTrends.push({
        year: y, age: age, grandCycleIndex: gcIdx,
        grandCycle: gc, annual: annual,
        trend: trend, narrative: narrative
      });
    }

    state.selectedYearIdx = state.yearlyTrends.findIndex(function(t) { return t.year === currentYear; });
    if (state.selectedYearIdx < 0) state.selectedYearIdx = 0;
  }

  // --- 整体排盘 ---
  function renderBaZiChart() {
    var chart = state.baziChart;
    var pillars = getFullChartInfo(chart);
    var container = $('bazi-chart-area');
    container.innerHTML = '';

    // 时辰临界提醒 & 真太阳时修正提示
    if (state.timeBoundaryNote || state.trueSolarNote) {
      var noteDiv = el('div', 'time-note-box');
      var noteHtml = '';
      if (state.trueSolarNote) noteHtml += '<div class="tn-item">' + state.trueSolarNote + '</div>';
      if (state.timeBoundaryNote) noteHtml += '<div class="tn-item tn-warn">' + state.timeBoundaryNote + '</div>';
      noteDiv.innerHTML = noteHtml;
      container.appendChild(noteDiv);
    }

    // 四柱
    var grid = el('div', 'bazi-pillars');
    var pillarNames = ['年柱', '月柱', '日柱', '时柱'];
    pillars.forEach(function(p, idx) {
      var div = el('div', 'bazi-pillar');
      var hiddenHtml = '';
      if (p.hiddenStems && p.hiddenStems.length > 0) {
        hiddenHtml = p.hiddenStems.map(function(hs) {
          return hs.stem + '(' + hs.tenGod + ')';
        }).join(' ');
      }
      // 按柱位分组神煞 (使用新的byPillar分组)
      var pillarShensha = '';
      var ssByPillar = chart.shenshaByPillar || {};
      var ssList = ssByPillar[pillarNames[idx]] || chart.shensha.filter(function(ss) { return ss.pillar === pillarNames[idx]; });
      if (ssList.length > 0) {
        pillarShensha = ssList.map(function(ss) {
          var cls = ss.type === '吉' ? 'bp-ss-ji' : ss.type === '凶' ? 'bp-ss-xiong' : 'bp-ss-zhong';
          return '<span class="bp-ss ' + cls + '" title="' + (ss.desc || '') + '">' + ss.name + '</span>';
        }).join('');
      }
      div.innerHTML =
        '<div class="bp-label">' + p.name + '</div>' +
        '<div class="bp-stem">' + p.stem + '</div>' +
        '<div class="bp-branch">' + p.branch + '</div>' +
        '<div class="bp-tengod">' + p.tenGod + '</div>' +
        '<div class="bp-element">' + p.stemElement + '/' + p.branchElement + '</div>' +
        '<div class="bp-nayin">' + (p.nayin || '') + '</div>' +
        '<div class="bp-hidden">' + hiddenHtml + '</div>' +
        '<div class="bp-changsheng">' + (p.changSheng || '') + '</div>' +
        '<div class="bp-shensha">' + pillarShensha + '</div>';
      grid.appendChild(div);
    });
    container.appendChild(grid);

    // 格局
    if (typeof determineBaZiPattern === 'function') {
      var pattern = determineBaZiPattern(chart);
      var patternDiv = el('div', 'bazi-pattern-box');
      patternDiv.innerHTML =
        '<div class="bp-pattern-label">格局</div>' +
        '<div class="bp-pattern-main">' + pattern.mainPattern + '</div>' +
        (pattern.description ? '<div class="bp-pattern-desc">' + pattern.description + '</div>' : '') +
        (pattern.secondaryPatterns && pattern.secondaryPatterns.length > 0 ?
          '<div class="bp-pattern-sec">兼：' + pattern.secondaryPatterns.join('、') + '</div>' : '');
      container.appendChild(patternDiv);
    }

    // 农历信息
    if (chart.lunarInfo) {
      var li = chart.lunarInfo;
      var lunarDiv = el('div', 'bazi-lunar-info');
      lunarDiv.innerHTML = '农历：' + (li.monthName || li.month + '月') +
        (li.dayName || li.day + '日') +
        (li.animal ? ' · ' + li.animal + '年' : '');
      container.appendChild(lunarDiv);
    }

    // 基本信息
    var fiveElements = calculateFiveElements(chart);
    fiveElements.dmElement = chart.dayMasterElement;
    var dayMasterInfo = calculateDayMasterStrength(chart, fiveElements);
    var favElements = determineFavorableElements(dayMasterInfo.strength, fiveElements);
    var strengthLabel = {
      'strong': '身旺', 'slightlyStrong': '身偏旺', 'balanced': '中和',
      'slightlyWeak': '身偏弱', 'weak': '身弱'
    }[dayMasterInfo.strength];

    var infoDiv = el('div', 'bazi-info');
    infoDiv.innerHTML =
      '<div class="bazi-info-item"><div class="label">日主</div><div class="value">' +
        chart.dayMaster + '（' + chart.dayMasterElement + '·' + chart.dayMasterYinYang + '）</div></div>' +
      '<div class="bazi-info-item"><div class="label">身强弱</div><div class="value">' + strengthLabel + '</div></div>' +
      '<div class="bazi-info-item"><div class="label">喜用五行</div><div class="value">' +
        favElements.favorable.join('、') + '</div></div>' +
      '<div class="bazi-info-item"><div class="label">忌神五行</div><div class="value">' +
        favElements.unfavorable.join('、') + '</div></div>' +
      '<div class="bazi-info-item"><div class="label">时辰</div><div class="value">' +
        chart.shichenName + '时（' + chart.shichenRange + '）</div></div>' +
      '<div class="bazi-info-item"><div class="label">五行平衡度</div><div class="value">' +
        (fiveElements.balance * 100).toFixed(0) + '%</div></div>';
    container.appendChild(infoDiv);

    // 五行分布
    var feDiv = el('div', 'five-elements-bar');
    var feData = [
      { key: '金', icon: '⚪', color: '#c0c0c0' },
      { key: '木', icon: '🟢', color: '#6b8e23' },
      { key: '水', icon: '🔵', color: '#4a90d9' },
      { key: '火', icon: '🔴', color: '#cd5c5c' },
      { key: '土', icon: '🟡', color: '#daa520' }
    ];
    feData.forEach(function(e) {
      var val = fiveElements.counts[e.key] || 0;
      var bar = el('div', 'fe-item');
      bar.style.background = e.color + '22';
      bar.innerHTML =
        '<div class="fe-icon">' + e.icon + '</div>' +
        '<div style="color:' + e.color + '">' + e.key + '</div>' +
        '<div class="fe-val">' + val.toFixed(1) + '</div>';
      feDiv.appendChild(bar);
    });
    container.appendChild(feDiv);
  }

  // --- 大运流年 ---
  function renderBaZiDaYun() {
    var container = $('bazi-dayun-area');
    container.innerHTML = '';

    // 大运时间轴
    var timeline = el('div', 'gc-timeline');
    var track = el('div', 'gc-track');
    state.grandCycles.forEach(function(gc, idx) {
      var gcYears = state.yearlyTrends.filter(function(t) { return t.grandCycleIndex === idx; });
      var avgIndex = gcYears.length > 0
        ? Math.round(gcYears.reduce(function(s, t) { return s + t.trend.compositeIndex; }, 0) / gcYears.length)
        : 50;
      var level = getTrendLevel(avgIndex || 50);
      var isActive = (idx === state.yearlyTrends[state.selectedYearIdx].grandCycleIndex);

      var item = el('div', 'gc-item' + (isActive ? ' active' : ''));
      item.innerHTML =
        '<div class="gc-age">' + gc.ageStart + '-' + gc.ageEnd + '岁</div>' +
        '<div class="gc-gz">' + gc.stem + gc.branch + '</div>' +
        '<div style="font-size:0.6rem;color:' + getCSS('--muted') + '">第' + gc.index + '运</div>' +
        '<div class="gc-bar" style="background:' + level.color + '"></div>';
      item.addEventListener('click', function() {
        var firstYear = state.yearlyTrends.findIndex(function(t) { return t.grandCycleIndex === idx; });
        if (firstYear >= 0) { state.selectedYearIdx = firstYear; renderBaZiDaYun(); }
      });
      track.appendChild(item);
    });
    timeline.appendChild(track);
    container.appendChild(timeline);

    // 年份选择器
    var yearDiv = el('div', 'year-selector');
    state.yearlyTrends.forEach(function(t, idx) {
      var btn = el('button', 'year-btn' + (idx === state.selectedYearIdx ? ' active' : ''));
      btn.textContent = t.year;
      btn.addEventListener('click', function() { state.selectedYearIdx = idx; renderBaZiDaYun(); });
      yearDiv.appendChild(btn);
    });
    container.appendChild(yearDiv);

    // 当前年详情
    var current = state.yearlyTrends[state.selectedYearIdx];
    var detail = el('div', 'gc-detail');
    var scores = current.trend.scores.finalScore;
    var compIdx = current.trend.compositeIndex;
    var level = current.trend.trendLevel;

    var scoreCards = el('div', 'score-cards');
    var dims = [
      { key: 'career', label: '事业' },
      { key: 'wealth', label: '财运' },
      { key: 'marriage', label: '姻缘' },
      { key: 'family', label: '亲情' },
      { key: 'health', label: '健康' }
    ];
    dims.forEach(function(d) {
      var s = scores[d.key];
      var lvl = getTrendLevel(s);
      var card = el('div', 'score-card');
      card.innerHTML =
        '<div class="sc-label">' + d.label + '</div>' +
        '<div class="sc-score" style="color:' + lvl.color + '">' + s + '</div>' +
        '<div class="sc-bar" style="background:' + lvl.color + ';width:' + s + '%"></div>';
      scoreCards.appendChild(card);
    });

    detail.innerHTML =
      '<div class="gcd-title">' +
        '<span class="gcd-gz">' + current.grandCycle.stem + current.grandCycle.branch + '</span>大运 · ' +
        current.annual.year + '年 ' + current.annual.stem + current.annual.branch + '流年' +
        (current.annual.isBenming ? ' · <span style="color:' + getCSS('--red') + '">本命年</span>' : '') +
      '</div>' +
      '<div style="text-align:center;margin:0.8rem 0">' +
        '<div style="font-family:Lora,serif;font-size:2.5rem;font-weight:700;color:' + level.color + '">' +
          compIdx + '</div>' +
        '<div style="display:inline-block;padding:0.2rem 0.8rem;border-radius:20px;font-size:0.85rem;font-weight:700;color:#fff;background:' + level.color + '">' +
          level.label + '</div>' +
      '</div>';
    detail.appendChild(scoreCards);

    // 解读
    var narrative = current.narrative;
    var narrDiv = el('div', '', '<div style="margin-top:0.8rem;padding:0.8rem;background:' +
      getCSS('--bg') + ';border-radius:8px;font-size:0.85rem;line-height:1.7">' +
      narrative.composite + '</div>');
    detail.appendChild(narrativeGrid(narrative, scores));
    container.appendChild(detail);
  }

  function narrativeGrid(narrative, scores) {
    var grid = el('div', 'guidance-section');
    grid.style.marginTop = '0.8rem';
    var dims = [
      { key: 'career', label: '事业学业' },
      { key: 'wealth', label: '财运' },
      { key: 'marriage', label: '姻缘' },
      { key: 'family', label: '亲情' },
      { key: 'health', label: '健康' }
    ];
    dims.forEach(function(d) {
      var s = scores[d.key];
      var lvl = getTrendLevel(s);
      var card = el('div', 'guidance-card');
      card.style.borderLeftColor = lvl.color;
      card.innerHTML =
        '<div class="gc-title">' + d.label +
          ' <span style="font-family:JetBrainsMono,monospace;padding:0.1rem 0.4rem;border-radius:4px;background:' +
          lvl.color + ';color:#fff;font-size:0.75rem">' + s + '</span></div>' +
        '<div class="gc-text">' + narrative[d.key] + '</div>';
      grid.appendChild(card);
    });
    return grid;
  }

  // --- 个人指导 ---
  function renderBaZiGuidance() {
    var chart = state.baziChart;
    var fiveElements = calculateFiveElements(chart);
    fiveElements.dmElement = chart.dayMasterElement;
    var dayMasterInfo = calculateDayMasterStrength(chart, fiveElements);
    var favElements = determineFavorableElements(dayMasterInfo.strength, fiveElements);

    var trendResult = {
      dayMasterInfo: dayMasterInfo,
      favElements: favElements,
      fiveElements: fiveElements
    };

    var guidance = generatePersonalGuidance(chart, trendResult);
    var container = $('bazi-guidance-area');
    container.innerHTML = '';

    var grid = el('div', 'guidance-section');
    var items = [
      { title: '性格特质', text: guidance.personality, color: getCSS('--accent') },
      { title: '事业指导', text: guidance.career, color: getCSS('--accent2') },
      { title: '财运建议', text: guidance.wealth, color: '#8b6914' },
      { title: '婚姻感情', text: guidance.marriage, color: '#c4623c' },
      { title: '健康养生', text: guidance.health, color: '#6b8e23' },
      { title: '喜忌方位', text: guidance.luckDirection, color: getCSS('--accent2') }
    ];
    items.forEach(function(item) {
      var card = el('div', 'guidance-card');
      card.style.borderLeftColor = item.color;
      card.innerHTML =
        '<div class="gc-title" style="color:' + item.color + '">' + item.title + '</div>' +
        '<div class="gc-text">' + item.text + '</div>';
      grid.appendChild(card);
    });
    container.appendChild(grid);
  }

  // --- 当日运势 ---
  function renderBaZiDaily() {
    var chart = state.baziChart;
    var container = $('bazi-daily-area');
    container.innerHTML = '';

    var daily = calculateBaZiDaily(chart);
    var lvlColors = { '大吉': '#e91e63', '吉': '#4caf50', '平': '#ff9800', '小凶': '#ff5722', '凶': '#f44336' };
    var lvlColor = lvlColors[daily.luckLevel] || getCSS('--accent');

    // 日期头部
    var header = el('div', 'zw-daily-header');
    var monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    var now = new Date();
    header.innerHTML =
      '<div class="dhd-date">' + daily.date + '</div>' +
      '<div class="dhd-gz">' + daily.dayGanzhi + '</div>' +
      '<div class="dhd-palace">日干十神：' + daily.dayTenGod + ' · 月干十神：' + daily.monthTenGod + '</div>';
    container.appendChild(header);

    // 综合评分
    var scoreDiv = el('div', '', '<div style="text-align:center;margin:0.8rem 0">' +
      '<div style="font-family:Lora,serif;font-size:2.5rem;font-weight:700;color:' + lvlColor + '">' +
        daily.score + '</div>' +
      '<div style="display:inline-block;padding:0.2rem 0.8rem;border-radius:20px;font-size:0.85rem;font-weight:700;color:#fff;background:' + lvlColor + '">' +
        daily.luckLevel + '</div>' +
      '<div style="margin-top:0.3rem;font-size:0.78rem;color:' + getCSS('--muted') + '">' +
        daily.factors.join(' · ') + '</div>' +
    '</div>');
    container.appendChild(scoreDiv);

    // 各方面运势
    var grid = el('div', 'zw-fortune-grid');
    var items = [
      { title: '事业工作', text: daily.aspects.career, color: getCSS('--accent2') },
      { title: '财运理财', text: daily.aspects.wealth, color: '#8b6914' },
      { title: '感情姻缘', text: daily.aspects.love, color: '#c4623c' },
      { title: '健康养生', text: daily.aspects.health, color: '#6b8e23' },
      { title: '有利方位', text: daily.aspects.direction, color: getCSS('--accent') },
      { title: '幸运颜色', text: daily.aspects.color, color: getCSS('--accent2') }
    ];
    items.forEach(function(item) {
      var card = el('div', 'zw-fortune-item');
      card.style.borderLeftColor = item.color;
      card.innerHTML =
        '<div class="zfi-title" style="color:' + item.color + '">' + item.title + '</div>' +
        '<div class="zfi-text">' + item.text + '</div>';
      grid.appendChild(card);
    });
    container.appendChild(grid);

    // 来源
    var src = el('div', 'zw-source', '<div style="font-size:0.72rem;color:' +
      getCSS('--muted') + ';margin-top:0.5rem">依据：日干支十神 · 生肖冲合 · 北京时间 · （仅供参考）</div>');
    container.appendChild(src);
  }

  // --- 五维趋势雷达 ---
  function renderBaZiRadar() {
    // Dispose old charts before clearing DOM
    if (state.radarChart) { state.radarChart.dispose(); state.radarChart = null; }
    if (state.trendChart) { state.trendChart.dispose(); state.trendChart = null; }

    var container = $('bazi-radar-area');
    container.innerHTML = '';

    // 年份选择器
    var yearDiv = el('div', 'year-selector');
    state.yearlyTrends.forEach(function(t, idx) {
      var btn = el('button', 'year-btn' + (idx === state.selectedYearIdx ? ' active' : ''));
      btn.textContent = t.year;
      btn.addEventListener('click', function() { state.selectedYearIdx = idx; renderBaZiRadar(); });
      yearDiv.appendChild(btn);
    });
    container.appendChild(yearDiv);

    // 雷达图 + 综合指数
    var grid = el('div', 'dashboard-grid');

    var radarDiv = el('div');
    radarDiv.innerHTML = '<div style="font-weight:700;font-size:0.9rem;margin-bottom:0.5rem">五维趋势雷达</div>' +
      '<div id="chart-radar" style="width:100%;min-height:280px"></div>';
    grid.appendChild(radarDiv);

    var current = state.yearlyTrends[state.selectedYearIdx];
    var compIdx = current.trend.compositeIndex;
    var level = current.trend.trendLevel;

    var compDiv = el('div');
    compDiv.innerHTML =
      '<div style="font-weight:700;font-size:0.9rem;margin-bottom:0.5rem">综合趋势指数</div>' +
      '<div class="composite-display">' +
        '<div class="score" style="color:' + level.color + '">' + compIdx + '</div>' +
        '<div class="level-badge" style="background:' + level.color + '">' + level.label + '</div>' +
        '<div class="desc">' + current.year + '年（' + current.age + '岁）· ' +
          current.grandCycle.stem + current.grandCycle.branch + '大运 · ' +
          current.annual.stem + current.annual.branch + '流年</div>' +
      '</div>';
    grid.appendChild(compDiv);

    container.appendChild(grid);

    // 趋势走势图
    var trendDiv = el('div');
    trendDiv.style.marginTop = '1rem';
    trendDiv.innerHTML = '<div style="font-weight:700;font-size:0.9rem;margin-bottom:0.5rem">十年趋势走势</div>' +
      '<div id="chart-trend" style="width:100%;min-height:300px"></div>';
    container.appendChild(trendDiv);

    // 仅在 tab 可见时渲染图表，否则延迟到 tab 切换时
    var isVisible = $('tab-bazi-radar').classList.contains('active');
    if (isVisible) {
      requestAnimationFrame(function() { renderRadarChart(); renderTrendChart(); });
    } else {
      state.radarNeedsRender = true;
    }
  }

  function renderRadarChart() {
    var current = state.yearlyTrends[state.selectedYearIdx];
    var baseScores = current.trend.scores.baseScore;
    var finalScores = current.trend.scores.finalScore;
    var accent = getCSS('--accent');
    var accent2 = getCSS('--accent2');
    var accentRgb = getCSS('--accent-rgb');
    var accent2Rgb = getCSS('--accent2-rgb');
    var ink = getCSS('--ink');
    var muted = getCSS('--muted');
    var rule = getCSS('--rule');
    var bg2 = getCSS('--bg2');

    var dom = $('chart-radar');
    if (!dom) return;
    if (!state.radarChart) {
      state.radarChart = echarts.init(dom, null, { renderer: 'svg' });
      window.addEventListener('resize', function() { if (state.radarChart) state.radarChart.resize(); });
    }

    state.radarChart.setOption({
      animation: false,
      tooltip: { appendToBody: true },
      legend: { bottom: 0, textStyle: { color: ink, fontSize: 12 }, data: ['命局基础分', '当前最终分'] },
      radar: {
        indicator: [
          { name: '事业', max: 100 }, { name: '财运', max: 100 },
          { name: '姻缘', max: 100 }, { name: '亲情', max: 100 }, { name: '健康', max: 100 }
        ],
        center: ['50%', '45%'], radius: '58%',
        axisName: { color: ink, fontSize: 13, fontWeight: 'bold' },
        splitLine: { lineStyle: { color: rule } },
        splitArea: { areaStyle: { color: [bg2, 'transparent'] } },
        axisLine: { lineStyle: { color: rule } }
      },
      series: [{
        type: 'radar',
        data: [
          { value: [baseScores.career, baseScores.wealth, baseScores.marriage, baseScores.family, baseScores.health],
            name: '命局基础分', itemStyle: { color: accent2 },
            areaStyle: { color: 'rgba(' + accent2Rgb + ',0.1)' }, lineStyle: { color: accent2, width: 2 } },
          { value: [finalScores.career, finalScores.wealth, finalScores.marriage, finalScores.family, finalScores.health],
            name: '当前最终分', itemStyle: { color: accent },
            areaStyle: { color: 'rgba(' + accentRgb + ',0.12)' }, lineStyle: { color: accent, width: 2 } }
        ]
      }]
    });
  }

  function renderTrendChart() {
    var dom = $('chart-trend');
    if (!dom) return;
    var accent = getCSS('--accent');
    var accent2 = getCSS('--accent2');
    var accentRgb = getCSS('--accent-rgb');
    var ink = getCSS('--ink');
    var muted = getCSS('--muted');
    var rule = getCSS('--rule');

    if (!state.trendChart) {
      state.trendChart = echarts.init(dom, null, { renderer: 'svg' });
      window.addEventListener('resize', function() { if (state.trendChart) state.trendChart.resize(); });
    }

    var years = state.yearlyTrends.map(function(t) { return t.year + '年'; });
    var compositeData = state.yearlyTrends.map(function(t) { return t.trend.compositeIndex; });
    var careerData = state.yearlyTrends.map(function(t) { return t.trend.scores.finalScore.career; });
    var wealthData = state.yearlyTrends.map(function(t) { return t.trend.scores.finalScore.wealth; });
    var marriageData = state.yearlyTrends.map(function(t) { return t.trend.scores.finalScore.marriage; });
    var healthData = state.yearlyTrends.map(function(t) { return t.trend.scores.finalScore.health; });
    var familyData = state.yearlyTrends.map(function(t) { return t.trend.scores.finalScore.family; });

    state.trendChart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, axisPointer: { type: 'cross' } },
      legend: { bottom: 0, textStyle: { color: ink, fontSize: 12 },
        data: ['综合指数', '事业', '财运', '姻缘', '健康', '亲情'] },
      grid: { top: 20, left: 40, right: 15, bottom: 55 },
      xAxis: { type: 'category', data: years,
        axisLine: { lineStyle: { color: rule } },
        axisLabel: { color: muted, fontSize: 11 } },
      yAxis: { type: 'value', min: 0, max: 100,
        axisLine: { show: false },
        axisLabel: { color: muted, fontSize: 11 },
        splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { name: '综合指数', type: 'line', smooth: true, data: compositeData,
          itemStyle: { color: accent }, lineStyle: { color: accent, width: 3 },
          areaStyle: { color: 'rgba(' + accentRgb + ',0.08)' },
          markLine: { silent: true, symbol: 'none',
            lineStyle: { color: accent, type: 'dashed', opacity: 0.3 },
            data: [{ yAxis: 55, label: { formatter: '平线', color: muted, fontSize: 10 } }] } },
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

    state.trendChart.off('click');
    state.trendChart.on('click', function(params) {
      if (params.seriesName === '综合指数') {
        state.selectedYearIdx = params.dataIndex;
        renderBaZiRadar();
      }
    });
  }

  // ============ 紫微斗数 模块 ============

  function renderZiWeiChart() {
    var chart = state.ziweiChart;
    var container = $('zw-chart-area');
    container.innerHTML = '';

    // 12宫盘
    var gridDiv = el('div', 'zw-chart-grid');

    // 网格顺序 (row-major, 4 columns):
    // Row 0: pos 3(巳), 4(午), 5(未), 6(申)
    // Row 1: pos 2(辰), center(span 2x2), pos 7(酉)
    // Row 2: pos 1(卯), center(continue), pos 8(戌)
    // Row 3: pos 0(寅), 11(丑), 10(子), 9(亥)

    var gridLayout = [
      { pos: 3, row: 1, col: 1 },
      { pos: 4, row: 1, col: 2 },
      { pos: 5, row: 1, col: 3 },
      { pos: 6, row: 1, col: 4 },
      { pos: 2, row: 2, col: 1 },
      { center: true, row: 2, col: 2 },
      { pos: 7, row: 2, col: 4 },
      { pos: 1, row: 3, col: 1 },
      { pos: 8, row: 3, col: 4 },
      { pos: 0, row: 4, col: 1 },
      { pos: 11, row: 4, col: 2 },
      { pos: 10, row: 4, col: 3 },
      { pos: 9, row: 4, col: 4 }
    ];

    var branches = ZW_BRANCHES;
    var palaceStems = chart.palaceStems;

    // 找到每个位置对应的宫位名
    var posToPalace = {};
    ZW_PALACES.forEach(function(palaceName, i) {
      var pos = (chart.mingGongPos - i + 24) % 12;
      posToPalace[pos] = palaceName;
    });

    gridLayout.forEach(function(item) {
      if (item.center) {
        var centerDiv = el('div', 'zw-cell center');
        centerDiv.style.gridRow = '2 / 4';
        centerDiv.style.gridColumn = '2 / 4';
        var mgBranch = ZW_BRANCHES[chart.mingGongPos];
        centerDiv.innerHTML =
          '<div class="zw-center-info">' +
            '<div class="zw-ci-title">紫微斗数</div>' +
            '<div class="zw-ci-ju">' + chart.wuxingJu.element + chart.wuxingJu.ju + '局</div>' +
            '<div class="zw-ci-mg">命宫：' + palaceStems[mgBranch] + mgBranch + '</div>' +
            '<div class="zw-ci-mg">身宫：' + ZW_BRANCHES[chart.shenGongPos] + '</div>' +
            '<div style="font-size:0.68rem;color:' + getCSS('--muted') + ';margin-top:0.3rem">' +
              state.birthInfo.year + '年 · ' + (state.birthInfo.gender === 'male' ? '男命' : '女命') +
            '</div>' +
          '</div>';
        gridDiv.appendChild(centerDiv);
      } else {
        var pos = item.pos;
        var branch = branches[pos];
        var stem = palaceStems[branch];
        var palaceName = posToPalace[pos] || '';
        var palaceData = chart.palaces[palaceName] || {};
        var starsWithHua = palaceData.starsWithHua || [];
        var auxStars = palaceData.auxStars || [];
        var shaStars = palaceData.shaStars || [];
        var isMing = pos === chart.mingGongPos;
        var isShen = pos === chart.shenGongPos;

        var cellDiv = el('div', 'zw-cell' + (isMing ? ' ming' : '') + (isShen ? ' shen' : ''));
        cellDiv.style.gridRow = item.row;
        cellDiv.style.gridColumn = item.col;

        var starsHtml = starsWithHua.map(function(s) {
          var info = STAR_MEANINGS[s.name] || {};
          var huaHtml = '';
          if (s.hua) {
            var huaClass = s.hua === '化禄' ? 'lu' : s.hua === '化权' ? 'quan' :
              s.hua === '化科' ? 'ke' : 'ji';
            huaHtml = '<span class="zw-star-hua ' + huaClass + '">' + s.hua + '</span>';
          }
          return '<span class="zw-star" style="background:' + (info.color || getCSS('--accent')) +
            '22;color:' + (info.color || getCSS('--accent')) + '">' + s.name + huaHtml + '</span>';
        }).join('');

        var auxHtml = auxStars.map(function(a) {
          return '<span class="zw-aux-star">' + a.name + '</span>';
        }).join('');

        var shaHtml = shaStars.map(function(s) {
          return '<span class="zw-sha-star">' + s.name + '</span>';
        }).join('');

        cellDiv.innerHTML =
          '<div style="display:flex;justify-content:space-between">' +
            '<span class="zw-branch">' + stem + branch + '</span>' +
            (isMing ? '<span style="font-size:0.6rem;color:' + getCSS('--accent') + '">命</span>' : '') +
            (isShen ? '<span style="font-size:0.6rem;color:' + getCSS('--green') + '">身</span>' : '') +
          '</div>' +
          '<div class="zw-palace">' + palaceName + '</div>' +
          '<div class="zw-stars">' + starsHtml + auxHtml + shaHtml + '</div>';
        gridDiv.appendChild(cellDiv);
      }
    });

    container.appendChild(gridDiv);

    // 紫微格局判定
    if (typeof determineZiWeiPattern === 'function') {
      var zwPattern = determineZiWeiPattern(chart);
      var patternDiv = el('div', 'bazi-pattern-box');
      var levelColors = { '吉': '#4caf50', '中': '#ff9800', '平': '#9e9e9e', '凶': '#f44336' };
      var lvlColor = levelColors[zwPattern.mainLevel] || getCSS('--accent');
      var patternsHtml =
        '<div class="bp-pattern-label">紫微格局</div>' +
        '<div class="bp-pattern-main" style="color:' + lvlColor + '">' + zwPattern.mainPattern + '</div>' +
        '<div class="bp-pattern-desc">' + zwPattern.mainDesc + '</div>';
      if (zwPattern.allPatterns && zwPattern.allPatterns.length > 1) {
        patternsHtml += '<div class="bp-pattern-sec">兼：';
        zwPattern.allPatterns.slice(1).forEach(function(p) {
          var pColor = levelColors[p.level] || getCSS('--muted');
          patternsHtml += '<span style="color:' + pColor + '">' + p.name + '</span> ';
        });
        patternsHtml += '</div>';
      }
      patternDiv.innerHTML = patternsHtml;
      container.appendChild(patternDiv);
    }

    // 四化总览
    if (chart.siHuaList && chart.siHuaList.length > 0) {
      var siHuaDiv = el('div', 'zw-sihua-summary');
      var siHuaHtml = '';
      chart.siHuaList.forEach(function(sh) {
        var huaClass = sh.name === '化禄' ? 'lu' : sh.name === '化权' ? 'quan' :
          sh.name === '化科' ? 'ke' : 'ji';
        siHuaHtml += '<span class="zw-sihua-item"><span class="sh-star">' + sh.star +
          '</span><span class="zw-star-hua ' + huaClass + '">' + sh.name +
          '</span> ' + sh.desc + '</span>';
      });
      siHuaDiv.innerHTML = siHuaHtml;
      container.appendChild(siHuaDiv);
    }

    // 整体盘解读
    var narrative = generateChartNarrative(chart);
    var narrDiv = el('div', 'zw-narrative', narrative.general);
    container.appendChild(narrDiv);

    // 深层宫位解读
    var deepDiv = el('div', 'zw-deep-interp');
    deepDiv.innerHTML = '<div class="di-title">十二宫深层解读</div>';
    var keyPalaces = ['命宫','官禄','财帛','夫妻','疾厄','福德','迁移','田宅'];
    var hasDeep = false;
    keyPalaces.forEach(function(pn) {
      var palace = chart.palaces[pn];
      if (palace && palace.interpretation && palace.interpretation.length > 0) {
        hasDeep = true;
        palace.interpretation.forEach(function(interp) {
          var item = el('div', 'di-item');
          item.innerHTML = '<span class="di-star">' + pn + '·' + interp.star + '：</span>' + interp.text;
          deepDiv.appendChild(item);
        });
      }
    });
    if (hasDeep) container.appendChild(deepDiv);

    // 星曜释义（命宫所有主星）
    var starListDiv = el('div', 'guidance-section');
    starListDiv.style.marginTop = '0.8rem';
    var mgStars = chart.palaces['命宫'].stars;
    mgStars.forEach(function(starName) {
      var info = STAR_MEANINGS[starName];
      if (info) {
        var card = el('div', 'guidance-card');
        card.style.borderLeftColor = info.color;
        card.innerHTML =
          '<div class="gc-title" style="color:' + info.color + '">' + starName +
            '（' + info.type + '）</div>' +
          '<div class="gc-text">主' + info.nature + '。' + info.desc + '</div>';
        starListDiv.appendChild(card);
      }
    });
    container.appendChild(starListDiv);
  }

  function renderZiWeiDaily() {
    var chart = state.ziweiChart;
    var container = $('zw-daily-area');
    container.innerHTML = '';

    var fortune = calculateDailyFortune(chart, new Date());

    // 日期头部
    var header = el('div', 'zw-daily-header');
    var now = new Date();
    var monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    header.innerHTML =
      '<div class="dhd-date">' + now.getFullYear() + '年' + monthNames[now.getMonth()] +
        now.getDate() + '日</div>' +
      '<div class="dhd-gz">' + fortune.yearStemBranch + '</div>' +
      '<div class="dhd-palace">流年宫位：' + fortune.yearPalace + ' · 日宫位：' + fortune.dailyPalace + '</div>';
    container.appendChild(header);

    // 主星提示
    if (fortune.stars && fortune.stars.length > 0) {
      var starInfo = el('div', '', '<div style="margin:0.5rem 0;padding:0.5rem;background:' +
        getCSS('--bg') + ';border-radius:8px;font-size:0.82rem">' +
        '<strong>流年主星：</strong>' + fortune.stars.map(function(s) {
          var info = STAR_MEANINGS[s] || {};
          return '<span style="color:' + (info.color || getCSS('--accent')) + ';font-weight:700">' + s + '</span>（' + info.nature + '）';
        }).join('、') + '</div>');
      container.appendChild(starInfo);
    }

    // 运势详情
    var grid = el('div', 'zw-fortune-grid');
    var items = [
      { title: '总运', text: fortune.fortune.general, color: getCSS('--accent') },
      { title: '事业工作', text: fortune.fortune.career, color: getCSS('--accent2') },
      { title: '财运理财', text: fortune.fortune.wealth, color: '#8b6914' },
      { title: '感情姻缘', text: fortune.fortune.love, color: '#c4623c' },
      { title: '健康养生', text: fortune.fortune.health, color: '#6b8e23' }
    ];
    items.forEach(function(item) {
      var card = el('div', 'zw-fortune-item');
      card.style.borderLeftColor = item.color;
      card.innerHTML =
        '<div class="zfi-title" style="color:' + item.color + '">' + item.title + '</div>' +
        '<div class="zfi-text">' + item.text + '</div>';
      grid.appendChild(card);
    });
    container.appendChild(grid);

    // 来源
    var src = el('div', 'zw-source', '<div style="font-size:0.72rem;color:' +
      getCSS('--muted') + ';margin-top:0.5rem">依据：紫微斗数十二宫流转 · 主星化曜 · （仅供参考）</div>');
    container.appendChild(src);
  }

  // ============ 命理总览 - 八字 ============
  function renderBaZiLifeReading() {
    var chart = state.baziChart;
    var container = $('bazi-life-area');
    container.innerHTML = '';

    var reading = generateBaZiLifeReading(chart, state.grandCycles, state.yearlyTrends);

    // 一句话总结
    var summaryBox = el('div', 'life-summary-box');
    summaryBox.innerHTML =
      '<div class="ls-sentence">' + reading.oneSentenceSummary + '</div>' +
      '<div class="ls-meta">' +
        '<span class="ls-meta-item">格局：' + reading.strength + '</span>' +
        '<span class="ls-meta-item">喜用：' + reading.favorableElements.join('、') + '</span>' +
        (reading.missingElements.length > 0 ? '<span class="ls-meta-item">缺：' + reading.missingElements.join('、') + '</span>' : '') +
        '<span class="ls-meta-item">性格：' + reading.personality + '</span>' +
      '</div>';
    if (reading.currentYearTip) {
      summaryBox.innerHTML += '<div class="life-current-year">' + reading.currentYearTip + '</div>';
    }
    container.appendChild(summaryBox);

    // 人生各阶段
    var stagesDiv = el('div', 'life-stages');
    stagesDiv.innerHTML = '<div class="ls-title">人生各阶段运势</div>';
    reading.lifeStages.forEach(function(ls) {
      var item = el('div', 'life-stage-item');
      var iconClass = ls.isFavorable ? 'fav' : 'neutral';
      var tagClass = ls.luckLevel === '吉运' ? 'ji' : 'ping';
      item.innerHTML =
        '<div class="lsi-icon ' + iconClass + '">' + ls.ageRange.split('-')[0] + '</div>' +
        '<div class="lsi-body">' +
          '<div class="lsi-head">' + ls.name + ' · ' + ls.ganzhi +
            ' <span class="lsi-tag ' + tagClass + '">' + ls.luckLevel + '</span>' +
          '</div>' +
          '<div class="lsi-summary">' + ls.summary + '</div>' +
          '<div class="lsi-detail">' + ls.detail + '</div>' +
        '</div>';
      stagesDiv.appendChild(item);
    });
    container.appendChild(stagesDiv);

    // 日常建议
    var dailyDiv = el('div', 'life-daily-advice');
    var da = reading.dailyAdvice;
    var dailyItems = [
      { label: '穿衣颜色', text: da.color },
      { label: '方位出行', text: da.direction },
      { label: '饮食调养', text: da.diet },
      { label: '运动健身', text: da.activity },
      { label: '社交建议', text: da.social },
      { label: '注意事项', text: da.taboo }
    ];
    dailyItems.forEach(function(item) {
      var div = el('div', 'lda-item');
      div.innerHTML = '<div class="lda-label">' + item.label + '</div><div class="lda-text">' + item.text + '</div>';
      dailyDiv.appendChild(div);
    });
    container.appendChild(dailyDiv);

    // 提升命格
    var impDiv = el('div', 'life-improvement');
    impDiv.innerHTML = '<div class="li-title">提升命格方法</div>';
    reading.destinyImprovement.forEach(function(item) {
      var div = el('div', 'li-item');
      div.innerHTML = '<div class="li-cat">' + item.category + '</div><div class="li-text">' + item.advice + '</div>';
      impDiv.appendChild(div);
    });
    container.appendChild(impDiv);
  }

  // ============ 命理总览 - 紫微 ============
  function renderZiWeiLifeReading() {
    var chart = state.ziweiChart;
    var container = $('zw-life-area');
    container.innerHTML = '';

    var reading = generateZiWeiLifeReading(chart);

    // 一句话总结
    var summaryBox = el('div', 'life-summary-box');
    var zwPat = reading.patterns || {};
    var patLevel = zwPat.mainLevel || '';
    var patColor = { '吉': '#4caf50', '中': '#ff9800', '平': '#9e9e9e', '凶': '#f44336' }[patLevel] || getCSS('--accent');
    summaryBox.innerHTML =
      '<div class="ls-sentence">' + reading.oneSentenceSummary + '</div>' +
      '<div class="ls-meta">' +
        '<span class="ls-meta-item">命局：' + reading.wuxingJu + '</span>' +
        '<span class="ls-meta-item">主星：' + reading.mainStar + '</span>' +
        '<span class="ls-meta-item">特质：' + (reading.mainStarInfo.nature || '多变') + '</span>' +
        (zwPat.mainPattern ? '<span class="ls-meta-item" style="color:' + patColor + '">格局：' + zwPat.mainPattern + '</span>' : '') +
      '</div>';
    if (zwPat.mainDesc) {
      summaryBox.innerHTML += '<div class="life-current-year" style="border-left:3px solid ' + patColor + '">' + zwPat.mainDesc + '</div>';
    }
    container.appendChild(summaryBox);

    // 大限各阶段
    var stagesDiv = el('div', 'life-stages');
    stagesDiv.innerHTML = '<div class="ls-title">大限各阶段运势</div>';
    reading.lifeStages.forEach(function(ls) {
      var item = el('div', 'life-stage-item');
      var iconClass = ls.isCurrent ? 'current' : (ls.luckLevel === '吉运' ? 'fav' : 'neutral');
      var tagClass = ls.luckLevel === '吉运' ? 'ji' : ls.luckLevel === '变动运' ? 'change' : 'ping';
      item.innerHTML =
        '<div class="lsi-icon ' + iconClass + '">' + ls.ageRange.split('-')[0] + '</div>' +
        '<div class="lsi-body">' +
          '<div class="lsi-head">' + ls.name + ' · ' + ls.palace + '宫' +
            (ls.isCurrent ? ' <span class="lsi-tag change">当前</span>' : '') +
            ' <span class="lsi-tag ' + tagClass + '">' + ls.luckLevel + '</span>' +
          '</div>' +
          '<div class="lsi-summary">' + ls.summary + '</div>' +
          '<div class="lsi-detail">' + ls.detail + '</div>' +
        '</div>';
      stagesDiv.appendChild(item);
    });
    container.appendChild(stagesDiv);

    // 日常建议
    var da = reading.dailyAdvice;
    var dailyDiv = el('div', 'life-daily-advice');
    var dailyItems = [
      { label: '总运', text: da.general },
      { label: '事业', text: da.career },
      { label: '财运', text: da.wealth },
      { label: '感情', text: da.love },
      { label: '健康', text: da.health },
      { label: '流年宫', text: '当前流年走' + da.palace }
    ];
    dailyItems.forEach(function(item) {
      var div = el('div', 'lda-item');
      div.innerHTML = '<div class="lda-label">' + item.label + '</div><div class="lda-text">' + item.text + '</div>';
      dailyDiv.appendChild(div);
    });
    container.appendChild(dailyDiv);

    // 提升命格
    var impDiv = el('div', 'life-improvement');
    impDiv.innerHTML = '<div class="li-title">提升命格方法</div>';
    reading.destinyImprovement.forEach(function(item) {
      var div = el('div', 'li-item');
      div.innerHTML = '<div class="li-cat">' + item.category + '</div><div class="li-text">' + item.advice + '</div>';
      impDiv.appendChild(div);
    });
    container.appendChild(impDiv);
  }

  // ============ 一键复制 ============
  function copyAllResults() {
    var text = '';
    var chart = state.baziChart;
    if (chart) {
      text += '=== 八字排盘 ===\n';
      text += '日主：' + chart.dayMaster + '(' + chart.dayMasterElement + ')\n';
      var pillars = getFullChartInfo(chart);
      var pNames = ['年柱', '月柱', '日柱', '时柱'];
      pillars.forEach(function(p, idx) {
        text += pNames[idx] + ': ' + p.stem + p.branch + ' (' + p.tenGod + ') 纳音:' + (p.nayin || '') + '\n';
        if (p.hiddenStems && p.hiddenStems.length > 0) {
          text += '  藏干: ' + p.hiddenStems.map(function(hs) { return hs.stem + '(' + hs.tenGod + ')'; }).join(' ') + '\n';
        }
        var ssByP = chart.shenshaByPillar || {};
        var ssList = ssByP[pNames[idx]] || [];
        if (ssList.length > 0) {
          text += '  神煞: ' + ssList.map(function(s) { return s.name; }).join('、') + '\n';
        }
      });
      var pattern = determineBaZiPattern(chart);
      text += '格局: ' + pattern.mainPattern + '\n';
      if (chart.shichenName) text += '时辰: ' + chart.shichenName + '时 (' + chart.shichenRange + ')\n';
      if (state.trueSolarNote) text += state.trueSolarNote + '\n';
      if (state.timeBoundaryNote) text += '注意: ' + state.timeBoundaryNote + '\n';
      text += '\n';
    }
    if (state.ziweiChart) {
      text += '=== 紫微斗数 ===\n';
      var dm = state.baziChart ? state.baziChart.dayMaster : '';
      text += '命宫主星: ' + (state.ziweiChart.palaces && state.ziweiChart.palaces[0] ? (state.ziweiChart.palaces[0].mainStars || []).join('、') : '') + '\n';
      text += '\n';
    }
    if (state.lastXLRResult) {
      var xlr = generateXLRNarrative(state.lastXLRResult, state.xlrCategory || '测吉凶');
      text += '=== 小六壬 ===\n';
      text += '三传: ' + xlr.threeTransmissions.map(function(t) { return t.label + '-' + t.position.name; }).join(' → ') + '\n';
      text += '趋势: ' + xlr.trend + '\n';
      text += '建议: ' + xlr.actionAdvice + '\n';
      text += '\n';
    }
    text += '（全部内容仅传统文化研究参考，不作人生决策依据）\n';

    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      alert('排盘结果已复制到剪贴板');
    } catch(e) {
      alert('复制失败，请手动选中文本');
    }
    document.body.removeChild(ta);
  }

  // ============ 初始化 ============
  function init() {
    setupTopBar();
    I18N.init();
    setupXiaoLiuRen();
    setupCompatibility();
    setupTabs('bazi-tabs');
    setupTabs('zw-tabs');

    $('btn-calculate').addEventListener('click', function() {
      playCoinAnimation(function() {
        calculateAll();
        var beijing = getBeijingTime();
        var shichenIdx = getShichenFromHour(beijing.hour);
        var hour = shichenIdx + 1;
        state.lastXLRInputs = { type: 'time' };
        var result = calculateXiaoLiuRen(beijing.month, beijing.day, hour);
        renderXLRResult(result);
      });
    });

    // 真太阳时开关
    var tsSelect = $('birth-truesolar');
    if (tsSelect) {
      tsSelect.addEventListener('change', function() {
        var lgGroup = $('longitude-group');
        if (lgGroup) lgGroup.style.display = this.value === 'on' ? '' : 'none';
      });
    }

    // 模块折叠
    document.querySelectorAll('.module-header').forEach(function(h) {
      h.addEventListener('click', function() {
        var card = this.parentElement;
        card.classList.toggle('collapsed');
      });
      h.style.cursor = 'pointer';
    });

    // 一键复制
    var copyBtn = $('btn-copy-all');
    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        copyAllResults();
      });
    }

    // 自动排盘
    calculateAll();

    // 自动起卦（北京时间）
    var beijing = getBeijingTime();
    var shichenIdx = getShichenFromHour(beijing.hour);
    var hour = shichenIdx + 1;
    state.lastXLRInputs = { type: 'time' };
    var result = calculateXiaoLiuRen(beijing.month, beijing.day, hour);
    renderXLRResult(result);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
