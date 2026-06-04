/**
 * neko.js — GAMBA ねこ先生AI 共通モジュール
 * 各HTMLファイルから <script src="neko.js"></script> で読み込む。
 * 各HTMLには window.NEKO_CONFIG を定義しておくこと。
 *
 * window.NEKO_CONFIG = {
 *   subject:  '数学II',           // 教科
 *   chapter:  '第1章③',          // 章番号
 *   title:    '分数指数・累乗根', // 単元タイトル
 *   greeting: '分数指数について何でも聞いてね🐱', // 初回あいさつ
 *   quickBtns: [                  // クイック質問ボタン（最大3個）
 *     { label: '分数指数とは？', q: '分数指数とは何か教えて' },
 *     { label: '累乗根とは？',   q: '累乗根とは何か教えて' },
 *     { label: '計算のコツ',     q: '分数指数の計算のコツを教えて' },
 *   ],
 *   pageMap: {  // 現在のページIDと説明文のマッピング
 *     'ex1': '解説①「...」を学習中',
 *     'pr1': '練習問題①「...」に取り組み中',
 *     ...
 *   }
 * };
 */

(function () {
  'use strict';

  // ===== 状態変数 =====
  var fabOpen = false;
  var fabImg = null;
  var fabConv = [];

  // ===== DOM生成：FABボタン・パネル =====
  function createFabHTML() {
    var cfg = window.NEKO_CONFIG || {};
    var greeting = cfg.greeting || 'こんにちは！何でも聞いてね🐱';
    var quickBtns = cfg.quickBtns || [];

    // FABラッパー
    var wrap = document.createElement('div');
    wrap.className = 'fab-wrap';
    wrap.innerHTML =
      '<div id="fab-label" class="fab-label">ねこ先生に質問</div>' +
      '<button class="fab-btn" id="fab-btn">' +
      '  <img id="neko-img" src="" alt="ねこ先生">' +
      '  <div class="fab-ping" style="position:absolute;top:4px;right:4px;width:10px;height:10px;background:#d93652;border-radius:50%;border:2px solid #fff;"></div>' +
      '</button>';
    document.body.appendChild(wrap);

    // パネル
    var panel = document.createElement('div');
    panel.className = 'fab-panel';
    panel.id = 'fab-panel';

    var quickHTML = quickBtns.map(function (b) {
      return '<button class="fab-qbtn" onclick="nekoQ(\'' + b.q.replace(/'/g, "\\'") + '\')">' + b.label + '</button>';
    }).join('');

    panel.innerHTML =
      '<div class="fab-panel-hdr">🐱 ねこ先生AI<button class="fab-close" id="fab-close">✕</button></div>' +
      '<div class="fab-msgs" id="fab-msgs">' +
      '  <div class="ai-msg-a">' + greeting + '</div>' +
      '</div>' +
      '<div class="fab-quick" id="fab-quick">' + quickHTML + '</div>' +
      '<div class="fab-preview" id="fab-preview">' +
      '  <img id="fab-prev-img" src="" alt=""><button class="fab-prev-del" onclick="nekoClearImg()">✕ 削除</button>' +
      '</div>' +
      '<div class="fab-input-row">' +
      '  <label style="cursor:pointer;font-size:1.2rem;" title="画像を添付">📷' +
      '    <input type="file" id="fab-file" accept="image/*" style="display:none" onchange="nekoHandleImg(this)">' +
      '  </label>' +
      '  <input class="fab-inp" id="fab-inp" type="text" placeholder="質問を入力…" onkeydown="if(event.key===\'Enter\')nekoSend()">' +
      '  <button class="fab-sbtn" id="fab-sbtn" onclick="nekoSend()">▶</button>' +
      '</div>';
    document.body.appendChild(panel);

    // 猫画像を読み込む（同階層の cat.jpg を使用、なければ絵文字フォールバック）
    loadCatImage();
  }

  // ===== 猫画像読み込み =====
  function loadCatImage() {
    var img = document.getElementById('neko-img');
    if (!img) return;
    // NEKO_CONFIG に catSrc があればそれを使う
    var cfg = window.NEKO_CONFIG || {};
    if (cfg.catSrc) {
      img.src = cfg.catSrc;
      return;
    }
    // なければ同階層の neko_cat.jpg を試みる
    img.onerror = function () {
      // 画像がなければ絵文字で代替
      var btn = document.getElementById('fab-btn');
      if (btn) {
        btn.innerHTML = '<span style="font-size:2rem;">🐱</span>' +
          '<div class="fab-ping" style="position:absolute;top:4px;right:4px;width:10px;height:10px;background:#d93652;border-radius:50%;border:2px solid #fff;"></div>';
      }
    };
    img.src = 'neko_cat.jpg';
  }

  // ===== FAB開閉 =====
  function toggleFab() {
    fabOpen = !fabOpen;
    var panel = document.getElementById('fab-panel');
    var btn = document.getElementById('fab-btn');
    if (panel) panel.classList.toggle('open', fabOpen);
    if (btn) btn.style.borderColor = fabOpen ? '#6c3fc5' : '#c4b5fd';
  }

  // ===== buildContext：現在の状況を動的に取得 =====
  function buildContext() {
    var cfg = window.NEKO_CONFIG || {};
    var subject = cfg.subject || '数学II';
    var chapter = cfg.chapter || '';
    var title = cfg.title || '';
    var pageMap = cfg.pageMap || {};

    // 現在のアクティブページ
    var pageEl = document.querySelector('.page.active');
    var activePage = pageEl ? pageEl.id.replace('page-', '') : '';
    var situation = pageMap[activePage] || '学習中';

    // 現在表示中の問題文を取得
    var currentQ = '';
    if (pageEl) {
      var qEls = pageEl.querySelectorAll('.q-text, .mini-q-text');
      qEls.forEach(function (el) {
        var txt = el.textContent.trim().slice(0, 100);
        if (txt) currentQ = txt;
      });
    }

    return 'あなたは高校数学の' + title + 'を教えるねこ先生AIです。\n'
      + '【教科・単元】' + subject + ' ' + chapter + ' ' + title + '\n'
      + '【現在の状況】生徒は' + situation + '\n'
      + (currentQ ? '【取り組み中の問題】' + currentQ + '\n' : '')
      + '生徒の質問に対して、今取り組んでいる内容に沿って答えてください。\n'
      + '回答は日本語で親しみやすく（200字以内）。\n'
      + '数式は $...$ で囲んでください（KaTeXでレンダリングされます）。';
  }

  // ===== 画像処理 =====
  window.nekoHandleImg = function (input) {
    var file = input.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      fabImg = e.target.result;
      var prev = document.getElementById('fab-preview');
      var img = document.getElementById('fab-prev-img');
      if (prev && img) { img.src = e.target.result; prev.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
  };

  window.nekoClearImg = function () {
    fabImg = null;
    var prev = document.getElementById('fab-preview');
    var f = document.getElementById('fab-file');
    if (prev) prev.style.display = 'none';
    if (f) f.value = '';
  };

  // ===== 送信 =====
  window.nekoQ = function (msg) { nekoDoFab(msg); };
  window.nekoSend = function () {
    var inp = document.getElementById('fab-inp');
    var msg = inp.value.trim();
    if (!msg && !fabImg) return;
    inp.value = '';
    nekoDoFab(msg);
  };

  async function nekoDoFab(msg) {
    var msgs = document.getElementById('fab-msgs');
    var sbtn = document.getElementById('fab-sbtn');
    if (!msgs || !sbtn) return;
    sbtn.disabled = true;

    // ユーザーメッセージ表示
    var uEl = document.createElement('div'); uEl.className = 'ai-msg-u';
    if (fabImg) {
      var thumb = document.createElement('img');
      thumb.src = fabImg;
      thumb.style.cssText = 'max-height:70px;border-radius:6px;display:block;margin-bottom:4px;max-width:100%;';
      uEl.appendChild(thumb);
    }
    if (msg) { var t = document.createElement('span'); t.textContent = msg; uEl.appendChild(t); }
    msgs.appendChild(uEl);

    // 「考え中…」
    var tEl = document.createElement('div'); tEl.className = 'ai-msg-t'; tEl.textContent = '考え中…';
    msgs.appendChild(tEl);
    msgs.scrollTop = msgs.scrollHeight;

    // APIリクエスト
    var userContent;
    if (fabImg) {
      var m = fabImg.match(/^data:([^;]+);base64,(.+)$/);
      userContent = [
        { type: 'text', text: msg || 'この画像の問題について教えてください。' },
        { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }
      ];
    } else {
      userContent = msg;
    }
    fabConv.push({ role: 'user', content: userContent });
    window.nekoClearImg();

    try {
      var res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: buildContext(),
          messages: fabConv
        })
      });
      var data = await res.json();
      var reply = (data.content && data.content[0] && data.content[0].text) || '申し訳ありません。';
      fabConv.push({ role: 'assistant', content: reply });
      tEl.remove();
      var aEl = document.createElement('div'); aEl.className = 'ai-msg-a'; aEl.textContent = reply;
      msgs.appendChild(aEl);
      msgs.scrollTop = msgs.scrollHeight;

      // KaTeX再レンダリング
      if (window.renderMathInElement) {
        renderMathInElement(aEl, {
          delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
          throwOnError: false
        });
      }
    } catch (e) {
      tEl.textContent = '通信エラーが発生しました。';
    }
    sbtn.disabled = false;
  }

  // ===== 初期化 =====
  document.addEventListener('DOMContentLoaded', function () {
    createFabHTML();
    var btn = document.getElementById('fab-btn');
    var label = document.getElementById('fab-label');
    var closeBtn = document.getElementById('fab-close');
    if (btn) {
      btn.addEventListener('click', toggleFab);
      btn.addEventListener('mouseenter', function () {
        if (label) { label.style.opacity = '1'; label.style.transform = 'translateY(50%) translateX(0)'; }
      });
      btn.addEventListener('mouseleave', function () {
        if (label) { label.style.opacity = '0'; label.style.transform = 'translateY(50%) translateX(6px)'; }
      });
    }
    if (closeBtn) closeBtn.addEventListener('click', toggleFab);
  });

})();
