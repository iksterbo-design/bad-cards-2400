/* ============================================================
   B.A.D CARDS 2400 — FLAGSHIP PRO INTERACTIVE ENGINE
   - Pure Per-Team 3D Holographic Cards + Yu-Gi-Oh! Corner Seal
   - 5 Foil Finishes + Compact Binder View + Search
   - Urban Rivals-Style 4-Round Tactical Hype-Energy Duel Arena
   - Yu-Gi-Oh! Trap / MTG Instant Counterplay Slot
   - 1★ → 3★ → 5★ Evolution Inspector & 4-Card Squad Drawer
   - Custom Card Request Desk & Crew Wall
   ============================================================ */

(() => {
  const DATA = window.BAD_CARDS_DATA;
  const AUDIO = window.badAudio;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SQUAD_KEY = 'bad_cards_2400_squad_v2';
  const WALL_KEY = 'bad_cards_2400_wall_v2';

  let initialSquad = ['tavaris-too-too', 'isaiah-little-bill', 'tyler-davis'];
  try {
    const saved = JSON.parse(localStorage.getItem(SQUAD_KEY) || 'null');
    if (Array.isArray(saved) && saved.length) initialSquad = saved;
  } catch (_) {}

  const state = {
    cards: DATA.cards,
    teamFilter: 'all',
    searchQuery: '',
    compactBinder: false,
    liveAnim: !prefersReducedMotion,
    inspectCardId: null,
    inspectEvoIdx: 2,
    squad: initialSquad,

    // Tactical 4-Round Duel State
    heroId: 'tavaris-too-too',
    oppMode: 'crew',
    oppId: 'tyler-davis',
    round: 1,
    maxRounds: 4,
    heroHp: 14,
    heroMaxHp: 14,
    oppHp: 14,
    oppMaxHp: 14,
    heroEnergy: 12,
    oppEnergy: 12,
    stake: 2,
    armedInstantId: null,
    instantUsed: false,
    duelOver: false,
    wins: 0,
    wallPosts: []
  };

  /* ---------- TOAST ---------- */
  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ---------- 5-POINT STAR HELPER ---------- */
  function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
  }

  /* ---------- SAFARI FALLBACK FOR <dialog closedby="any"> ---------- */
  function initDialogLightDismissFallback() {
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e, dialog) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
        let pressedOutside = false;
        dialog.addEventListener('pointerdown', (e) => { pressedOutside = outside(e, dialog); });
        dialog.addEventListener('pointerup', (e) => { if (pressedOutside && outside(e, dialog)) dialog.close(); });
      }
    }
  }

  /* ---------- BACKGROUND & FIREWORKS ---------- */
  const fireworks = [];
  function initFireworks() {
    const canvas = document.getElementById('fireworks-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    window.addEventListener('resize', () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    });
    function loop() {
      ctx.clearRect(0, 0, w, h);
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const p = fireworks[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.vx *= 0.985;
        p.life -= 0.017;
        if (p.life <= 0) { fireworks.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  function launchFireworks(bursts = 4) {
    if (prefersReducedMotion) return;
    const colors = ['#f5b942', '#ffe28a', '#38bdf8', '#a855f7', '#ff5a1f', '#22c55e', '#ffffff'];
    for (let b = 0; b < bursts; b++) {
      setTimeout(() => {
        const cx = window.innerWidth * (0.2 + Math.random() * 0.6);
        const cy = window.innerHeight * (0.16 + Math.random() * 0.38);
        for (let i = 0; i < 38; i++) {
          const ang = (Math.PI * 2 * i) / 38 + Math.random() * 0.2;
          const spd = 2.2 + Math.random() * 5.2;
          fireworks.push({
            x: cx, y: cy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 1.0,
            size: 1.8 + Math.random() * 2.4,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 0.85 + Math.random() * 0.45
          });
        }
      }, b * 165);
    }
  }

  function initBgCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || prefersReducedMotion) return;
    const ctx = canvas.getContext('2d');
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    window.addEventListener('resize', () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    });
    const motes = Array.from({ length: 60 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: 0.8 + Math.random() * 1.9,
      vx: (Math.random() - 0.5) * 0.35,
      vy: 0.22 + Math.random() * 0.52,
      gold: Math.random() > 0.52,
      a: 0.20 + Math.random() * 0.45
    }));
    function loop() {
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx;
        m.y += m.gold ? -m.vy : m.vy * 0.7;
        if (m.y > h + 8) { m.y = -8; m.x = Math.random() * w; }
        if (m.y < -8) { m.y = h + 8; m.x = Math.random() * w; }
        if (m.x > w + 8) m.x = -8;
        if (m.x < -8) m.x = w + 8;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = m.gold ? `rgba(245, 185, 66, ${m.a})` : `rgba(125, 211, 252, ${m.a * 0.85})`;
        ctx.fill();
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ---------- RENDER 5-CARD VAULT ---------- */
  const fxEngines = [];

  function saveSquad() {
    try { localStorage.setItem(SQUAD_KEY, JSON.stringify(state.squad)); } catch (_) {}
    const countEl = document.getElementById('squad-count');
    if (countEl) countEl.textContent = String(state.squad.length);
  }

  function toggleSquadCard(cardId) {
    const idx = state.squad.indexOf(cardId);
    const card = state.cards.find((c) => c.id === cardId);
    if (idx >= 0) {
      state.squad.splice(idx, 1);
      showToast(`Removed ${card?.shortName || 'card'} from My Squad`);
    } else {
      if (state.squad.length >= 4) {
        showToast('🃏 Squad is full (4/4)! Open My Squad drawer to swap.');
        return;
      }
      state.squad.push(cardId);
      AUDIO.playCardFlip();
      showToast(`✅ Added ${card?.shortName || 'card'} to My Squad (${state.squad.length}/4)!`);
    }
    saveSquad();
    renderCards();
    renderSquadDrawer();
    renderDuelArena();
  }

  function renderCards() {
    const grid = document.getElementById('cards-grid');
    if (!grid) return;
    grid.classList.toggle('is-binder-compact', state.compactBinder);
    grid.innerHTML = '';
    fxEngines.length = 0;

    const q = state.searchQuery.trim().toLowerCase();
    const visible = state.cards.filter((c) => {
      if (state.teamFilter !== 'all' && c.teamKey !== state.teamFilter) return false;
      if (!q) return true;
      const hay = `${c.name} ${c.subtitle} ${c.team} #${c.number} ${c.position} ${c.keywords.join(' ')} ${c.clan}`.toLowerCase();
      return hay.includes(q);
    });

    if (!visible.length) {
      grid.innerHTML = `<div style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted);font-family:var(--font-display);font-size:0.86rem;">No cards matched "${q}". Clear the search or team filter to view all 5 Mythics.</div>`;
      return;
    }

    visible.forEach((card, idx) => {
      const inSquad = state.squad.includes(card.id);
      const article = document.createElement('article');
      article.className = `card-column theme-${card.theme}`;
      article.innerHTML = `
        <div class="card-slab-wrap">
          <div class="slab-label">
            <div class="slab-meta">
              <div style="color:var(--back-accent);font-weight:900;">${card.name} #${card.number}</div>
              <div>${card.cert} &bull; ${card.edition}</div>
            </div>
            <span class="slab-grade-badge">${card.grade}</span>
          </div>

          <div class="holo-card-scene ${state.liveAnim ? 'is-live-anim' : ''}" data-card-id="${card.id}" data-card-idx="${idx}" tabindex="0" role="button" aria-label="Flip ${card.name} number ${card.number} card">
            <div class="holo-card-inner">
              <!-- FRONT -->
              <div class="holo-face holo-front">
                <div class="card-art-wrap">
                  <img class="card-art-img" src="${card.image}" alt="${card.name} #${card.number} ${card.team}" style="object-position:${card.objectPos || 'center 10%'};" />
                  <canvas class="card-fx-canvas" data-fx-theme="${card.fxTheme}" aria-hidden="true"></canvas>
                  <div class="chrome-sweep" style="--sweep-delay:${(idx * 0.95).toFixed(2)}s;" aria-hidden="true"></div>
                  <div class="card-art-vignette"></div>
                  <div class="card-top-bar">
                    <div class="ovr-shield">
                      <div class="ovr-num">${card.ovr}</div>
                      <div class="ovr-pos">${card.position}</div>
                    </div>
                    <div class="card-rarity-stack">
                      <span class="rarity-pill">${card.rarity}</span>
                      <span class="jersey-pill">#${card.number}</span>
                    </div>
                  </div>
                </div>
                <div class="card-front-footer">
                  <div class="card-edition-tag">${card.edition}</div>
                  <div class="card-player-name">${card.name}</div>
                  <div class="card-player-sub">${card.subtitle}</div>
                  <div class="card-mini-stats">
                    ${card.miniStats
                      .map((s) => `
                        <div class="mini-stat ${s.hot ? 'hot' : ''}">
                          <div class="mini-stat-v">${s.v}</div>
                          <div class="mini-stat-k">${s.k}</div>
                        </div>`)
                      .join('')}
                  </div>
                  <div class="card-sig-ability">
                    <span>${card.signatureAbility}</span>
                    <span class="flip-hint">FLIP ↻</span>
                  </div>
                  <div class="bad-card-rim">
                    <span class="bad-set-code">${card.setCode}</span>
                    <span class="bad-holo-seal" title="Authentic B.A.D Cards 1st Edition Corner Seal">B.A.D</span>
                  </div>
                </div>
                <div class="holo-rainbow"></div>
                <div class="holo-glare"></div>
              </div>

              <!-- BACK -->
              <div class="holo-face holo-back">
                <div class="back-header">
                  <div>
                    <div class="back-name">${card.name} #${card.number}</div>
                    <div class="back-sub">${card.team} &bull; ${card.position} &bull; ATK ${card.atk} / DEF ${card.def}</div>
                  </div>
                  <span class="back-serial">${card.rarity}</span>
                </div>

                <div class="back-bio">${card.bio}</div>

                <div class="back-stat-bars">
                  ${card.detailedStats
                    .map((st) => `
                      <div class="stat-row">
                        <span class="stat-label">${st.label}</span>
                        <div class="stat-track"><div class="stat-fill" style="width:${Math.min(100, st.val)}%"></div></div>
                        <span class="stat-val">${st.val}</span>
                      </div>`)
                    .join('')}
                </div>

                <div class="back-moves">
                  ${card.moves
                    .map((m) => `
                      <div class="move-box">
                        <div class="move-title">${m.title}</div>
                        <div class="move-desc">${m.desc}</div>
                      </div>`)
                    .join('')}
                </div>

                <div class="back-combine">
                  ${card.combine
                    .map((c) => `
                      <div class="combine-cell">
                        <div class="combine-v">${c.v}</div>
                        <div class="combine-k">${c.k}</div>
                      </div>`)
                    .join('')}
                </div>

                <div class="back-chem">${card.chemistry}</div>

                <div class="bad-card-rim" style="margin-top:0.1rem;">
                  <span class="bad-set-code">${card.serial}</span>
                  <span class="bad-holo-seal" title="Authentic B.A.D Cards 1st Edition Corner Seal">B.A.D</span>
                </div>
                <div class="holo-glare"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-action-bar">
          <button class="card-mini-btn" data-action="flip" data-card-id="${card.id}" type="button">🔄 Flip</button>
          <button class="card-mini-btn" data-action="inspect" data-card-id="${card.id}" type="button">★ Evolve</button>
          <button class="card-mini-btn ${inSquad ? 'in-squad' : ''}" data-action="squad" data-card-id="${card.id}" type="button">${inSquad ? '✓ In Squad' : '+ Squad'}</button>
          <button class="card-mini-btn" data-action="dl-front" data-card-id="${card.id}" type="button">⬇️ PNG</button>
        </div>
      `;

      grid.appendChild(article);

      const scene = article.querySelector('.holo-card-scene');
      const inner = article.querySelector('.holo-card-inner');
      const fxCanvas = article.querySelector('.card-fx-canvas');

      const toggleFlip = () => {
        scene.classList.remove('is-tilting');
        inner.style.setProperty('--fy', '0px');
        inner.style.setProperty('--rx', '0deg');
        inner.style.setProperty('--ry', '0deg');
        scene.classList.toggle('is-flipped');
        AUDIO.playCardFlip();
      };

      scene.addEventListener('pointermove', (e) => {
        if (scene.classList.contains('is-flipped')) return;
        const rect = scene.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        scene.classList.add('is-tilting');
        inner.style.setProperty('--fy', '0px');
        inner.style.setProperty('--rx', `${((0.5 - y) * 18).toFixed(2)}deg`);
        inner.style.setProperty('--ry', `${((x - 0.5) * 20).toFixed(2)}deg`);
        inner.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        inner.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        inner.style.setProperty('--px', `${((0.5 - x) * 9).toFixed(1)}px`);
        inner.style.setProperty('--py', `${((0.5 - y) * 9).toFixed(1)}px`);
        inner.style.setProperty('--glare-op', '0.56');
      });

      scene.addEventListener('pointerleave', () => {
        scene.classList.remove('is-tilting');
        inner.style.setProperty('--px', '0px');
        inner.style.setProperty('--py', '0px');
        if (!state.liveAnim) {
          inner.style.setProperty('--rx', '0deg');
          inner.style.setProperty('--ry', '0deg');
          inner.style.setProperty('--glare-op', '0.32');
        }
      });

      scene.addEventListener('click', toggleFlip);
      scene.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFlip();
        }
      });

      article.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.action;
          if (act === 'flip') toggleFlip();
          else if (act === 'inspect') openInspectDialog(card.id);
          else if (act === 'squad') toggleSquadCard(card.id);
          else if (act === 'dl-front') exportCardFrontPNG(card.id);
        });
      });

      fxEngines.push(createCardFxEngine(fxCanvas, scene, card.fxTheme, idx));
    });
  }

  /* ---------- PER-TEAM 60FPS CARD FX ENGINE ---------- */
  function createCardFxEngine(canvas, scene, fxTheme, idx) {
    const ctx = canvas.getContext('2d');
    let cw = 340, ch = 360;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cw = Math.round(rect.width);
        ch = Math.round(rect.height);
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    resize();

    const palette = {
      danger: { p1: '#ff3366', p2: '#ffc62f', glow1: 'rgba(255,51,102,', glow2: 'rgba(255,198,47,', stars: false },
      chrome: { p1: '#ffc62f', p2: '#a855f7', glow1: 'rgba(255,198,47,', glow2: 'rgba(168,85,247,', stars: false },
      founder: { p1: '#ffc62f', p2: '#38bdf8', glow1: 'rgba(255,198,47,', glow2: 'rgba(56,189,248,', stars: false },
      bears: { p1: '#ff7b29', p2: '#38bdf8', glow1: 'rgba(255,130,50,', glow2: 'rgba(56,189,248,', stars: false },
      cowboys: { p1: '#ffd166', p2: '#38bdf8', glow1: 'rgba(255,206,92,', glow2: 'rgba(56,189,248,', stars: true }
    }[fxTheme] || { p1: '#ffc62f', p2: '#38bdf8', glow1: 'rgba(255,198,47,', glow2: 'rgba(56,189,248,', stars: false };

    const sparks = Array.from({ length: 28 }, () => ({
      x: Math.random() * cw, y: Math.random() * ch,
      r: 1.0 + Math.random() * 2.0,
      vx: (Math.random() - 0.5) * 0.52,
      vy: 0.4 + Math.random() * 0.88,
      alt: Math.random() > 0.5,
      star: palette.stars && Math.random() > 0.68,
      life: Math.random()
    }));
    const arcs = [];

    return {
      scene, idx, resize,
      step(tick) {
        const flipped = scene.classList.contains('is-flipped');
        ctx.clearRect(0, 0, cw, ch);
        if (flipped || !state.liveAnim) return;

        const pulse = 0.5 + 0.5 * Math.sin(tick * 0.055 + idx);
        const g1 = ctx.createRadialGradient(cw * 0.24, ch * 0.80, 4, cw * 0.24, ch * 0.80, cw * 0.30);
        g1.addColorStop(0, `${palette.glow1}${(0.18 + pulse * 0.14).toFixed(2)})`);
        g1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, cw, ch);

        const g2 = ctx.createRadialGradient(cw * 0.72, ch * 0.58, 4, cw * 0.72, ch * 0.58, cw * 0.26);
        g2.addColorStop(0, `${palette.glow2}${(0.18 + (1 - pulse) * 0.14).toFixed(2)})`);
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, cw, ch);

        for (const s of sparks) {
          s.x += s.vx + Math.sin(tick * 0.035 + s.y * 0.03) * 0.28;
          s.y -= s.vy;
          s.life += 0.012;
          if (s.y < -6 || s.x < -8 || s.x > cw + 8) { s.x = Math.random() * cw; s.y = ch + 6; s.life = 0; }
          ctx.globalAlpha = Math.max(0.16, Math.sin(Math.min(1, s.life) * Math.PI) * 0.85);
          if (s.star) {
            drawStar(ctx, s.x, s.y, 5, s.r * 1.8, s.r * 0.75);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = s.alt ? palette.p1 : palette.p2;
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;

        if ((tick + idx * 7) % 24 === 0 && arcs.length < 4) {
          const fromBall = Math.random() > 0.5;
          let x = fromBall ? cw * (0.12 + Math.random() * 0.2) : cw * (0.62 + Math.random() * 0.26);
          let y = fromBall ? ch * (0.64 + Math.random() * 0.22) : ch * (0.44 + Math.random() * 0.28);
          const pts = [{ x, y }];
          for (let i = 0; i < 6; i++) {
            x += (fromBall ? -1 : 1) * (5 + Math.random() * 13) + (Math.random() - 0.5) * 16;
            y += (Math.random() - 0.58) * 24;
            pts.push({ x, y });
          }
          arcs.push({ pts, life: 1, decay: 0.06, col: fromBall ? palette.p1 : palette.p2 });
        }

        for (let i = arcs.length - 1; i >= 0; i--) {
          const a = arcs[i];
          a.life -= a.decay;
          if (a.life <= 0) { arcs.splice(i, 1); continue; }
          ctx.save();
          ctx.globalAlpha = a.life;
          ctx.lineCap = 'round';
          ctx.beginPath();
          a.pts.forEach((pt, j) => (j === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
          ctx.strokeStyle = a.col;
          ctx.lineWidth = 2.8;
          ctx.shadowBlur = 10;
          ctx.shadowColor = a.col;
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.05;
          ctx.stroke();
          ctx.restore();
        }
      }
    };
  }

  let masterTick = 0;
  function masterAnimLoop(ts) {
    masterTick += 1;
    for (const eng of fxEngines) {
      eng.step(masterTick);
      const sc = eng.scene;
      if (state.liveAnim && !sc.classList.contains('is-tilting') && !sc.classList.contains('is-flipped')) {
        const inner = sc.querySelector('.holo-card-inner');
        if (inner) {
          const phase = ((ts / 4400) + eng.idx * 0.19) % 1;
          const tau = Math.PI * 2;
          inner.style.setProperty('--fy', `${(Math.sin(phase * tau) * -4.5).toFixed(2)}px`);
          inner.style.setProperty('--rx', `${(Math.sin(phase * tau * 2) * 3.8).toFixed(2)}deg`);
          inner.style.setProperty('--ry', `${(Math.sin(phase * tau) * 8.5).toFixed(2)}deg`);
          inner.style.setProperty('--mx', `${(50 + Math.sin(phase * tau) * 28).toFixed(1)}%`);
          inner.style.setProperty('--my', `${(42 + Math.cos(phase * tau) * 20).toFixed(1)}%`);
          inner.style.setProperty('--glare-op', `${(0.28 + Math.abs(Math.sin(phase * tau)) * 0.2).toFixed(2)}`);
        }
      }
    }
    requestAnimationFrame(masterAnimLoop);
  }
  window.addEventListener('resize', () => fxEngines.forEach((e) => e.resize()));

  /* ---------- HIGH-RES PNG EXPORTER (WITH CORNER B.A.D HOLO SEAL) ---------- */
  function drawCornerBadSeal(ctx, W, H, setCode) {
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(34, H - 56);
    ctx.lineTo(W - 34, H - 56);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(214,226,245,0.72)';
    ctx.font = '700 15px Orbitron, Arial, sans-serif';
    ctx.fillText(setCode, 34, H - 28);

    const sx = W - 102, sy = H - 48, sw = 68, sh = 30;
    const sealGrad = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
    sealGrad.addColorStop(0, '#fff4c2');
    sealGrad.addColorStop(0.35, '#f5b942');
    sealGrad.addColorStop(0.65, '#7dd3fc');
    sealGrad.addColorStop(1, '#d99512');
    ctx.fillStyle = sealGrad;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = '#fff8dc';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#070b14';
    ctx.font = '900 15px Orbitron, Arial Black, sans-serif';
    ctx.fillText('B.A.D', sx + sw / 2, sy + 21);
  }

  function getExportColors(card) {
    if (card.theme === 'bears') return { bgDark: '#071124', footer: '#081326', primary: '#ff6b2b', hot: '#ffd3ad', sub: '#a9c0e3', box: 'rgba(19,39,76,0.74)', pill: '#132952', bar1: '#38bdf8' };
    if (card.theme === 'cowboys') return { bgDark: '#041026', footer: '#051430', primary: '#7dd3fc', hot: '#ffffff', sub: '#b7cae6', box: 'rgba(11,42,91,0.74)', pill: '#0d3270', bar1: '#1d63ed' };
    return { bgDark: '#0e0522', footer: '#110628', primary: '#ffc62f', hot: '#ffe58f', sub: '#c8b8eb', box: 'rgba(79,38,131,0.58)', pill: '#4f2683', bar1: '#7c3aed' };
  }

  function exportCardFrontPNG(cardId) {
    const card = state.cards.find((c) => c.id === cardId);
    if (!card) return;
    const canvas = document.createElement('canvas');
    const W = 750, H = 1120;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const col = getExportColors(card);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        ctx.fillStyle = col.bgDark;
        ctx.fillRect(0, 0, W, H);
        const artH = 720;
        const scale = Math.max(W / img.width, artH / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        const yBias = card.theme === 'cowboys' ? 0.22 : 0.10;
        ctx.drawImage(img, (W - dw) / 2, -(dh - artH) * yBias, dw, dh);

        const vig = ctx.createLinearGradient(0, 440, 0, artH);
        vig.addColorStop(0, 'rgba(4,10,24,0)');
        vig.addColorStop(1, col.footer);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 440, W, artH - 440);

        ctx.fillStyle = col.footer;
        ctx.fillRect(0, artH, W, H - artH);
        ctx.fillStyle = col.primary;
        ctx.fillRect(0, artH, W, 5);

        ctx.fillStyle = col.primary;
        ctx.fillRect(30, 30, 114, 120);
        ctx.fillStyle = '#070b14';
        ctx.font = '900 54px Orbitron, Arial Black, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(card.ovr), 87, 94);
        ctx.font = '800 21px Orbitron, Arial, sans-serif';
        ctx.fillText(card.position, 87, 130);

        ctx.fillStyle = 'rgba(8,14,30,0.92)';
        ctx.fillRect(W - 234, 30, 204, 44);
        ctx.strokeStyle = col.primary;
        ctx.lineWidth = 3;
        ctx.strokeRect(W - 234, 30, 204, 44);
        ctx.fillStyle = col.hot;
        ctx.font = '800 19px Orbitron, Arial, sans-serif';
        ctx.fillText(card.rarity, W - 132, 59);

        ctx.fillStyle = col.pill;
        ctx.fillRect(W - 120, 86, 90, 48);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 30px Orbitron, Arial Black, sans-serif';
        ctx.fillText('#' + card.number, W - 75, 120);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#38bdf8';
        ctx.font = '700 19px Orbitron, Arial, sans-serif';
        ctx.fillText(card.edition, 34, artH + 40);
        ctx.fillStyle = col.hot;
        ctx.font = '900 40px Orbitron, Arial Black, sans-serif';
        ctx.fillText(card.name, 34, artH + 92);
        ctx.fillStyle = col.sub;
        ctx.font = '600 23px Rajdhani, Arial, sans-serif';
        ctx.fillText(card.subtitle, 34, artH + 126);

        const boxW = (W - 68 - 36) / 4;
        card.miniStats.forEach((st, i) => {
          const bx = 34 + i * (boxW + 12), by = artH + 148;
          ctx.fillStyle = col.box;
          ctx.fillRect(bx, by, boxW, 80);
          ctx.strokeStyle = col.primary;
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, boxW, 80);
          ctx.textAlign = 'center';
          ctx.fillStyle = col.hot;
          ctx.font = '900 32px Orbitron, Arial Black, sans-serif';
          ctx.fillText(String(st.v), bx + boxW / 2, by + 42);
          ctx.fillStyle = '#e6eeff';
          ctx.font = '700 17px Orbitron, Arial, sans-serif';
          ctx.fillText(st.k, bx + boxW / 2, by + 68);
        });

        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(34, artH + 246, W - 68, 46);
        ctx.strokeStyle = col.primary;
        ctx.strokeRect(34, artH + 246, W - 68, 46);
        ctx.textAlign = 'center';
        ctx.fillStyle = col.hot;
        ctx.font = '700 21px Orbitron, Arial, sans-serif';
        ctx.fillText(card.signatureAbility, W / 2, artH + 277);

        drawCornerBadSeal(ctx, W, H, card.setCode);
        ctx.strokeStyle = col.primary;
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, W - 14, H - 14);

        const a = document.createElement('a');
        a.download = `${card.id}-front-bad-cards-2400.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
        showToast(`⬇️ Saved ${card.name} Front PNG with B.A.D corner seal!`);
      } catch (_) {
        showToast('💡 Open via the live URL to enable one-click PNG export!');
      }
    };
    img.src = card.image;
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxW && i > 0) {
        ctx.fillText(line, x, y);
        line = words[i] + ' ';
        y += lineH;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, y);
  }

  function exportCardBackPNG(cardId) {
    const card = state.cards.find((c) => c.id === cardId);
    if (!card) return;
    const canvas = document.createElement('canvas');
    const W = 750, H = 1120;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const col = getExportColors(card);

    ctx.fillStyle = col.bgDark;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = col.primary;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, W - 14, H - 14);

    ctx.textAlign = 'left';
    ctx.fillStyle = col.hot;
    ctx.font = '900 38px Orbitron, Arial Black, sans-serif';
    ctx.fillText(`${card.name} #${card.number}`, 42, 88);
    ctx.fillStyle = col.sub;
    ctx.font = '700 19px Orbitron, Arial, sans-serif';
    ctx.fillText(`${card.team} • ${card.position} • ATK ${card.atk} / DEF ${card.def}`, 42, 124);

    ctx.fillStyle = col.primary;
    ctx.fillRect(42, 146, W - 84, 3);
    ctx.fillStyle = '#e8f0ff';
    ctx.font = '600 24px Rajdhani, Arial, sans-serif';
    wrapText(ctx, card.bio, 42, 192, W - 84, 32);

    let y = 370;
    card.detailedStats.forEach((st) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = col.sub;
      ctx.font = '700 19px Orbitron, Arial, sans-serif';
      ctx.fillText(st.label.toUpperCase(), 42, y);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(280, y - 16, 336, 16);
      const bg = ctx.createLinearGradient(280, 0, 616, 0);
      bg.addColorStop(0, col.bar1);
      bg.addColorStop(1, col.primary);
      ctx.fillStyle = bg;
      ctx.fillRect(280, y - 16, (336 * Math.min(100, st.val)) / 100, 16);
      ctx.fillStyle = col.hot;
      ctx.font = '900 23px Orbitron, Arial Black, sans-serif';
      ctx.fillText(String(st.val), 638, y);
      y += 48;
    });

    y += 24;
    const cW = (W - 84 - 28) / 3;
    card.combine.forEach((c, i) => {
      const cx = 42 + i * (cW + 14);
      ctx.fillStyle = col.box;
      ctx.fillRect(cx, y, cW, 88);
      ctx.strokeStyle = col.primary;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, y, cW, 88);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px Orbitron, Arial Black, sans-serif';
      ctx.fillText(c.v, cx + cW / 2, y + 44);
      ctx.fillStyle = col.hot;
      ctx.font = '700 16px Orbitron, Arial, sans-serif';
      ctx.fillText(c.k, cx + cW / 2, y + 72);
    });

    y += 136;
    ctx.textAlign = 'left';
    ctx.fillStyle = col.hot;
    ctx.font = '800 20px Orbitron, Arial, sans-serif';
    ctx.fillText('CAREER MILESTONES', 42, y);
    y += 34;
    card.milestones.forEach((m) => {
      ctx.fillStyle = '#e6eeff';
      ctx.font = '600 22px Rajdhani, Arial, sans-serif';
      ctx.fillText('★ ' + m, 42, y);
      y += 34;
    });

    drawCornerBadSeal(ctx, W, H, card.serial);
    const a = document.createElement('a');
    a.download = `${card.id}-back-bad-cards-2400.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    showToast(`⬇️ Saved ${card.name} Back PNG with B.A.D corner seal!`);
  }

  /* ---------- EVOLUTION INSPECTOR, PACK RIPPER & SQUAD DRAWER ---------- */
  function renderInspectorEvo(card) {
    const evo = card.evolutions[state.inspectEvoIdx] || card.evolutions[card.evolutions.length - 1];
    const starsHtml = Array.from({ length: 5 }, (_, i) => (i < evo.stars ? '★' : '<span class="star-dim">★</span>')).join('');
    document.getElementById('inspect-stars').innerHTML = starsHtml;
    document.getElementById('inspect-atkdef').textContent = `ATK ${Math.round(card.atk * (evo.ovr / 99))} / DEF ${Math.round(card.def * (evo.ovr / 99))} • PWR ${evo.power} / DMG ${evo.dmg}`;
    document.getElementById('inspect-evo-note').textContent = `${evo.stage} (${evo.ovr} OVR) — ${evo.note}`;

    const evoBar = document.getElementById('inspect-evo-bar');
    evoBar.innerHTML = card.evolutions
      .map((e, i) => `<button class="chip ${i === state.inspectEvoIdx ? 'active' : ''}" data-evo-idx="${i}" type="button">${'★'.repeat(e.stars)} ${e.stage}</button>`)
      .join('');
    evoBar.querySelectorAll('[data-evo-idx]').forEach((b) => {
      b.addEventListener('click', () => {
        state.inspectEvoIdx = Number(b.dataset.evoIdx);
        renderInspectorEvo(card);
        AUDIO.playCardFlip();
      });
    });
  }

  function openInspectDialog(cardId) {
    const card = state.cards.find((c) => c.id === cardId);
    const dialog = document.getElementById('inspect-dialog');
    if (!card || !dialog) return;
    state.inspectCardId = cardId;
    state.inspectEvoIdx = card.evolutions.length - 1;
    document.getElementById('inspect-img').src = card.image;
    document.getElementById('inspect-img').alt = `${card.name} #${card.number}`;
    document.getElementById('inspect-edition').textContent = `${card.edition} • ${card.clan.toUpperCase()} • ${card.grade}`;
    document.getElementById('inspect-name').textContent = `${card.name} #${card.number}`;
    document.getElementById('inspect-sub').textContent = `${card.team} • ${card.subtitle}`;
    document.getElementById('inspect-keywords').innerHTML = card.keywords.map((k) => `<span class="keyword-pill">${k}</span>`).join('');
    document.getElementById('inspect-quote').textContent = card.quote;
    document.getElementById('inspect-chem').textContent = `${card.chemistry} • Clan Bonus: ${card.clanBonus}`;
    document.getElementById('inspect-set-code').textContent = `${card.setCode} • ${card.serial}`;
    document.getElementById('inspect-milestones').innerHTML = card.milestones.map((m) => `<li>🏆 ${m}</li>`).join('');
    renderInspectorEvo(card);
    dialog.showModal();
    AUDIO.playCardFlip();
  }

  function renderSquadDrawer() {
    const list = document.getElementById('squad-slots-list');
    const synBox = document.getElementById('squad-synergy-box');
    if (!list || !synBox) return;

    const members = state.squad.map((id) => state.cards.find((c) => c.id === id)).filter(Boolean);
    const totalStars = members.reduce((sum, c) => sum + c.stars, 0);
    const vikCount = members.filter((c) => c.teamKey === 'vikings').length;
    const uniqueTeams = new Set(members.map((c) => c.teamKey)).size;

    let synText = `Squad Power: ${members.length}/4 Cards • ${totalStars}/20 ★ Stars. `;
    if (vikCount >= 2) synText += '⚡ VALHALLA CLAN RESONANCE ACTIVE (+2 Duel Power)!';
    else if (uniqueTeams >= 3) synText += '⭐ MULTI-TEAM ALLIANCE ACTIVE (+1 Bonus Clash Damage)!';
    else synText += 'Add 2+ Vikings or 3+ Teams to activate Clan Synergy!';
    synBox.textContent = synText;

    if (!members.length) {
      list.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">No cards in your squad yet. Click <strong>+ Squad</strong> under any card in the vault!</p>`;
      return;
    }

    list.innerHTML = members
      .map((c) => `
        <div class="squad-slot">
          <img src="${c.image}" alt="${c.name}" style="object-position:${c.objectPos || 'center 10%'};" />
          <div style="flex:1;">
            <div style="font-family:var(--font-display);font-size:0.78rem;color:var(--bad-gold-hot);font-weight:800;">${c.name} #${c.number}</div>
            <div style="font-size:0.74rem;color:var(--text-muted);">${c.team} • PWR ${c.duelPower} / DMG ${c.duelDamage} • ${'★'.repeat(c.stars)}</div>
          </div>
          <button class="btn btn-ghost btn-sm" data-remove-squad="${c.id}" type="button">✕</button>
        </div>`)
      .join('');

    list.querySelectorAll('[data-remove-squad]').forEach((b) => {
      b.addEventListener('click', () => toggleSquadCard(b.dataset.removeSquad));
    });
  }

  function initDialogs() {
    const packDialog = document.getElementById('pack-dialog');
    const packSealed = document.getElementById('pack-sealed');
    const packRevealed = document.getElementById('pack-revealed');
    const revealGrid = document.getElementById('pack-reveal-grid');

    const openPack = () => {
      if (!packDialog) return;
      packSealed.hidden = false;
      packRevealed.hidden = true;
      packDialog.showModal();
      AUDIO.playPackCharge();
    };

    document.getElementById('nav-pack-btn')?.addEventListener('click', openPack);
    document.getElementById('hero-pack-btn')?.addEventListener('click', openPack);

    document.getElementById('pack-foil-bag')?.addEventListener('click', () => {
      AUDIO.playMythicFanfare();
      launchFireworks(6);
      packSealed.hidden = true;
      packRevealed.hidden = false;
      revealGrid.innerHTML = state.cards
        .map((c) => `
          <div class="pack-reveal-card">
            <img src="${c.image}" alt="${c.name}" style="object-position:${c.objectPos || 'center 10%'};" />
            <div class="pack-reveal-meta">
              <div style="font-size:0.6rem;color:#7dd3fc;font-family:var(--font-display);">${c.rarity} • ${c.ovr} OVR</div>
              <div style="font-size:0.82rem;color:#ffe28a;font-weight:900;font-family:var(--font-display);margin-top:2px;">${c.name} #${c.number}</div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding:0 4px;">
                <span class="bad-set-code" style="font-size:0.44rem;">${c.setCode}</span>
                <span class="bad-holo-seal" style="height:15px;font-size:0.4rem;">B.A.D</span>
              </div>
            </div>
          </div>`)
        .join('');
    });

    const squadDialog = document.getElementById('squad-dialog');
    document.getElementById('open-squad-btn')?.addEventListener('click', () => {
      renderSquadDrawer();
      squadDialog?.showModal();
    });
    document.getElementById('squad-clear-btn')?.addEventListener('click', () => {
      state.squad = [];
      saveSquad();
      renderCards();
      renderSquadDrawer();
    });
    document.getElementById('squad-launch-duel')?.addEventListener('click', () => {
      if (state.squad.length) {
        state.heroId = state.squad[0];
        resetDuelMatch();
      }
      squadDialog?.close();
      document.getElementById('battle')?.scrollIntoView({ behavior: 'smooth' });
    });

    for (const dlg of document.querySelectorAll('dialog')) {
      dlg.addEventListener('close', () => { dlg.returnValue = ''; });
    }
    document.getElementById('inspect-duel-btn')?.addEventListener('click', () => {
      if (state.inspectCardId) {
        state.heroId = state.inspectCardId;
        resetDuelMatch();
        document.getElementById('inspect-dialog')?.close();
        document.getElementById('battle')?.scrollIntoView({ behavior: 'smooth' });
        showToast(`⚔️ ${getHeroCard().shortName} locked into the 4-Round Duel Arena!`);
      }
    });
    document.getElementById('inspect-dl-front')?.addEventListener('click', () => exportCardFrontPNG(state.inspectCardId));
    document.getElementById('inspect-dl-back')?.addEventListener('click', () => exportCardBackPNG(state.inspectCardId));
  }

  /* ---------- SQUAD SYNERGY COMPUTATION (WIRED INTO DUEL ARENA) ---------- */
  function getSquadSynergy() {
    const members = state.squad.map((id) => state.cards.find((c) => c.id === id)).filter(Boolean);
    const vikCount = members.filter((c) => c.teamKey === 'vikings').length;
    const uniqueTeams = new Set(members.map((c) => c.teamKey)).size;
    if (vikCount >= 2) {
      return { bonusPwr: 2, bonusDmg: 0, label: '⚡ VALHALLA +2 PWR' };
    }
    if (uniqueTeams >= 3) {
      return { bonusPwr: 0, bonusDmg: 1, label: '⭐ ALLIANCE +1 DMG' };
    }
    return { bonusPwr: 0, bonusDmg: 0, label: '★ SYNERGY: NONE' };
  }

  /* ---------- TACTICAL 4-ROUND HYPE-ENERGY DUEL ENGINE ---------- */
  function getHeroCard() {
    return state.cards.find((c) => c.id === state.heroId) || state.cards[0];
  }

  function getOpponent() {
    if (state.oppMode === 'crew') {
      const opp = state.cards.find((c) => c.id === state.oppId && c.id !== state.heroId)
        || state.cards.find((c) => c.id !== state.heroId);
      state.oppId = opp.id;
      return { type: 'crew', name: `${opp.name} #${opp.number}`, image: opp.image, objectPos: opp.objectPos, pwr: opp.duelPower, dmg: opp.duelDamage, maxHp: 14 };
    }
    const r = DATA.rivals.find((rv) => rv.id === state.oppId) || DATA.rivals[0];
    state.oppId = r.id;
    return { type: 'rival', name: r.name, badge: r.badge, pwr: r.duelPower, dmg: r.duelDamage, maxHp: r.hp };
  }

  function appendDuelLog(line) {
    const log = document.getElementById('battle-log');
    if (!log) return;
    const div = document.createElement('div');
    div.textContent = line;
    log.prepend(div);
  }

  function resetDuelMatch() {
    const opp = getOpponent();
    state.round = 1;
    state.heroHp = 14;
    state.heroMaxHp = 14;
    state.oppHp = opp.maxHp;
    state.oppMaxHp = opp.maxHp;
    state.heroEnergy = 12;
    state.oppEnergy = 12;
    state.stake = Math.min(2, state.heroEnergy);
    state.armedInstantId = null;
    state.instantUsed = false;
    state.duelOver = false;
    document.getElementById('hero-fighter-box')?.classList.remove('round-win', 'round-loss');
    document.getElementById('opp-fighter-box')?.classList.remove('round-win', 'round-loss');
    const banner = document.getElementById('round-result-banner');
    if (banner) { banner.textContent = 'STAKE ENERGY & CLASH'; banner.className = 'round-banner'; }
    renderDuelArena();
  }

  function renderEnergyControls() {
    const hero = getHeroCard();
    const syn = getSquadSynergy();
    const effPwr = hero.duelPower + syn.bonusPwr;
    const slider = document.getElementById('stake-slider');
    if (state.stake > state.heroEnergy) state.stake = state.heroEnergy;
    slider.max = String(state.heroEnergy);
    slider.value = String(state.stake);

    const instant = DATA.instants.find((ins) => ins.id === state.armedInstantId);
    const bonusAtk = instant ? instant.bonusAtk : 0;
    const projected = effPwr * (1 + state.stake) + bonusAtk;

    document.getElementById('stake-val-label').textContent = String(state.stake);
    document.getElementById('stake-formula-hint').textContent = `${effPwr} PWR × ${1 + state.stake}${bonusAtk ? ` + ${bonusAtk}` : ''} = ${projected} ATK`;
    document.getElementById('hero-atk-readout').textContent = String(projected);
    document.getElementById('hero-atk-sub').textContent = `Projected: ${effPwr} × (1 + ${state.stake} NRG)${bonusAtk ? ` + ${bonusAtk}` : ''}`;

    const pipsWrap = document.getElementById('energy-pips');
    pipsWrap.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
      const pip = document.createElement('button');
      pip.type = 'button';
      const available = i <= state.heroEnergy;
      pip.className = `energy-pip ${!available ? 'spent' : (i <= state.stake ? 'active' : '')}`;
      pip.disabled = !available || state.duelOver;
      pip.setAttribute('aria-label', `Stake ${i} Hype Energy`);
      pip.addEventListener('click', () => {
        state.stake = (state.stake === i) ? i - 1 : i;
        renderEnergyControls();
      });
      pipsWrap.appendChild(pip);
    }

    // Instant / Trap Picker
    const statusTag = document.getElementById('instant-status-tag');
    if (statusTag) statusTag.textContent = state.instantUsed ? '(USED THIS MATCH)' : '(1 READY)';
    const insWrap = document.getElementById('instant-picker');
    insWrap.innerHTML = DATA.instants
      .map((ins) => `<button class="chip ${state.armedInstantId === ins.id ? 'active' : ''}" data-ins-id="${ins.id}" type="button" ${state.instantUsed ? 'disabled style="opacity:0.45;"' : ''}>${ins.name}</button>`)
      .join('');
    insWrap.querySelectorAll('[data-ins-id]').forEach((b) => {
      b.addEventListener('click', () => {
        if (state.instantUsed || state.duelOver) return;
        const id = b.dataset.insId;
        state.armedInstantId = state.armedInstantId === id ? null : id;
        const cur = DATA.instants.find((x) => x.id === state.armedInstantId);
        document.getElementById('instant-desc').textContent = cur ? `${cur.type}: ${cur.desc}` : 'Optional: Arm a 1-per-match Instant or Trap before playing the round.';
        renderEnergyControls();
        AUDIO.playCardFlip();
      });
    });
  }

  function renderDuelArena() {
    const hero = getHeroCard();
    const opp = getOpponent();

    document.getElementById('duel-round-label').textContent = state.duelOver ? 'MATCH COMPLETE' : `ROUND ${state.round} / ${state.maxRounds}`;
    const dashes = document.querySelectorAll('#round-dashes .round-dash');
    dashes.forEach((d, i) => {
      d.classList.toggle('done', i + 1 < state.round || state.duelOver);
      d.classList.toggle('active', !state.duelOver && i + 1 === state.round);
    });

    document.getElementById('hero-energy-val').textContent = String(state.heroEnergy);
    document.getElementById('opp-energy-val').textContent = String(state.oppEnergy);
    document.getElementById('battle-wins-badge').textContent = `WINS: ${state.wins}`;

    // Pickers
    const fPicker = document.getElementById('fighter-picker');
    fPicker.innerHTML = state.cards
      .map((c) => `<button class="chip ${c.id === state.heroId ? 'active' : ''}" data-pick-hero="${c.id}" type="button">${c.shortName}</button>`)
      .join('');
    fPicker.querySelectorAll('[data-pick-hero]').forEach((b) => {
      b.addEventListener('click', () => { state.heroId = b.dataset.pickHero; resetDuelMatch(); });
    });

    const oPicker = document.getElementById('opponent-picker');
    if (state.oppMode === 'crew') {
      oPicker.innerHTML = state.cards
        .filter((c) => c.id !== state.heroId)
        .map((c) => `<button class="chip ${c.id === state.oppId ? 'active' : ''}" data-pick-opp="${c.id}" type="button">${c.shortName}</button>`)
        .join('');
    } else {
      oPicker.innerHTML = DATA.rivals
        .map((r) => `<button class="chip ${r.id === state.oppId ? 'active' : ''}" data-pick-opp="${r.id}" type="button">${r.badge} ${r.name.split(' ')[0]}</button>`)
        .join('');
    }
    oPicker.querySelectorAll('[data-pick-opp]').forEach((b) => {
      b.addEventListener('click', () => { state.oppId = b.dataset.pickOpp; resetDuelMatch(); });
    });

    const syn = getSquadSynergy();
    const synPill = document.getElementById('duel-synergy-pill');
    if (synPill) synPill.textContent = syn.label;
    document.getElementById('battle-hero-img').src = hero.image;
    document.getElementById('battle-hero-img').style.objectPosition = hero.objectPos || 'center 10%';
    document.getElementById('battle-hero-name').textContent = `${hero.name} #${hero.number}`;
    document.getElementById('hero-pwr-val').textContent = String(hero.duelPower + syn.bonusPwr);
    document.getElementById('hero-dmg-val').textContent = String(hero.duelDamage + syn.bonusDmg);

    const oppVis = document.getElementById('battle-opp-visual');
    oppVis.innerHTML = opp.type === 'crew'
      ? `<img class="fighter-avatar" src="${opp.image}" alt="${opp.name}" style="object-position:${opp.objectPos || 'center 10%'};border-color:#ef4444;" />`
      : `<div class="rival-emblem">${opp.badge}</div>`;
    document.getElementById('battle-opp-name').textContent = opp.name;
    document.getElementById('opp-pwr-val').textContent = String(opp.pwr);
    document.getElementById('opp-dmg-val').textContent = String(opp.dmg);

    if (!state.duelOver) {
      document.getElementById('opp-atk-readout').textContent = '?';
      document.getElementById('opp-atk-readout').classList.remove('gold');
      document.getElementById('opp-atk-sub').textContent = 'Hidden stake';
    }

    document.getElementById('hero-hp-text').textContent = `${state.heroHp} / ${state.heroMaxHp}`;
    document.getElementById('hero-hp-fill').style.width = `${Math.max(0, (state.heroHp / state.heroMaxHp) * 100)}%`;
    document.getElementById('opp-hp-text').textContent = `${state.oppHp} / ${state.oppMaxHp}`;
    document.getElementById('opp-hp-fill').style.width = `${Math.max(0, (state.oppHp / state.oppMaxHp) * 100)}%`;

    const playBtn = document.getElementById('play-round-btn');
    playBtn.textContent = state.duelOver ? '🔄 PLAY AGAIN' : `⚡ PLAY ROUND ${state.round}`;

    renderEnergyControls();
  }

  function playDuelRound() {
    if (state.duelOver) { resetDuelMatch(); return; }
    const hero = getHeroCard();
    const opp = getOpponent();

    // Opponent AI bluffing stake across remaining rounds
    const roundsLeft = state.maxRounds - state.round + 1;
    const maxOppStake = Math.min(state.oppEnergy, roundsLeft === 1 ? state.oppEnergy : Math.min(6, state.oppEnergy));
    const oppStake = roundsLeft === 1
      ? state.oppEnergy
      : Math.min(maxOppStake, Math.max(0, Math.floor(Math.random() * Math.min(6, state.oppEnergy + 1))));

    const usedInstant = (!state.instantUsed && state.armedInstantId)
      ? DATA.instants.find((x) => x.id === state.armedInstantId)
      : null;

    state.heroEnergy = Math.max(0, state.heroEnergy - state.stake - (usedInstant ? usedInstant.drainEnergy : 0));
    state.heroEnergy = Math.min(12, state.heroEnergy);
    state.oppEnergy = Math.max(0, state.oppEnergy - oppStake);

    const syn = getSquadSynergy();
    const heroAtk = (hero.duelPower + syn.bonusPwr) * (1 + state.stake) + (usedInstant ? usedInstant.bonusAtk : 0);
    const oppAtk = opp.pwr * (1 + oppStake);

    if (usedInstant) {
      state.instantUsed = true;
      state.armedInstantId = null;
    }

    const heroBox = document.getElementById('hero-fighter-box');
    const oppBox = document.getElementById('opp-fighter-box');
    const banner = document.getElementById('round-result-banner');

    document.getElementById('hero-atk-readout').textContent = String(heroAtk);
    document.getElementById('opp-atk-readout').textContent = String(oppAtk);
    document.getElementById('opp-atk-sub').textContent = `Staked ${oppStake} NRG (${opp.pwr} × ${1 + oppStake})`;

    if (heroAtk >= oppAtk) {
      const dealt = hero.duelDamage + syn.bonusDmg;
      state.oppHp = Math.max(0, state.oppHp - dealt);
      heroBox.classList.add('round-win'); heroBox.classList.remove('round-loss');
      oppBox.classList.add('round-loss'); oppBox.classList.remove('round-win');
      document.getElementById('hero-atk-readout').classList.add('gold');
      document.getElementById('opp-atk-readout').classList.remove('gold');
      banner.textContent = `ROUND WON! ${heroAtk} > ${oppAtk} (-${dealt} LIFE)`;
      banner.className = 'round-banner win';
      AUDIO.playImpact(true);
      appendDuelLog(`⚡ R${state.round}: ${hero.shortName} (${heroAtk} ATK, ${state.stake} NRG${usedInstant ? ` + ${usedInstant.name}` : ''}) crushed ${opp.name} (${oppAtk} ATK, ${oppStake} NRG) for -${dealt} Life!`);
    } else {
      const blocked = usedInstant ? usedInstant.blockDmg : 0;
      const taken = Math.max(1, opp.dmg - blocked);
      state.heroHp = Math.max(0, state.heroHp - taken);
      oppBox.classList.add('round-win'); oppBox.classList.remove('round-loss');
      heroBox.classList.add('round-loss'); heroBox.classList.remove('round-win');
      document.getElementById('opp-atk-readout').classList.add('gold');
      document.getElementById('hero-atk-readout').classList.remove('gold');
      banner.textContent = `ROUND LOST ${heroAtk} < ${oppAtk} (-${taken} LIFE)`;
      banner.className = 'round-banner loss';
      AUDIO.playImpact(false);
      appendDuelLog(`🔥 R${state.round}: ${opp.name} (${oppAtk} ATK, ${oppStake} NRG) out-bluffed ${hero.shortName} (${heroAtk} ATK) for -${taken} Life${blocked ? ` (Trap blocked ${blocked}!)` : ''}!`);
    }

    if (state.oppHp <= 0 || state.heroHp <= 0 || state.round >= state.maxRounds) {
      state.duelOver = true;
      if (state.oppHp <= 0 || state.heroHp >= state.oppHp) {
        state.wins += 1;
        AUDIO.playMythicFanfare();
        launchFireworks(5);
        appendDuelLog(`🏆 MATCH VICTORY! ${hero.name} wins ${state.heroHp}–${state.oppHp}!`);
        showToast(`🏆 ${hero.shortName} WON THE 4-ROUND DUEL!`);
      } else {
        appendDuelLog(`😮 ${opp.name} took the match ${state.oppHp}–${state.heroHp}! Tap Play Again for a rematch!`);
      }
    } else {
      state.round += 1;
      state.stake = Math.min(state.stake, state.heroEnergy);
    }

    document.getElementById('hero-hp-text').textContent = `${state.heroHp} / ${state.heroMaxHp}`;
    document.getElementById('hero-hp-fill').style.width = `${Math.max(0, (state.heroHp / state.heroMaxHp) * 100)}%`;
    document.getElementById('opp-hp-text').textContent = `${state.oppHp} / ${state.oppMaxHp}`;
    document.getElementById('opp-hp-fill').style.width = `${Math.max(0, (state.oppHp / state.oppMaxHp) * 100)}%`;
    document.getElementById('hero-energy-val').textContent = String(state.heroEnergy);
    document.getElementById('opp-energy-val').textContent = String(state.oppEnergy);
    document.getElementById('battle-wins-badge').textContent = `WINS: ${state.wins}`;
    document.getElementById('duel-round-label').textContent = state.duelOver ? 'MATCH COMPLETE' : `ROUND ${state.round} / ${state.maxRounds}`;
    document.getElementById('play-round-btn').textContent = state.duelOver ? '🔄 PLAY AGAIN' : `⚡ PLAY ROUND ${state.round}`;
    renderEnergyControls();
  }

  /* ---------- REQUEST DESK & CREW WALL ---------- */
  function initRequestDesk() {
    const buildSummary = () => {
      const name = document.getElementById('req-name').value.trim() || 'Player';
      const nick = document.getElementById('req-nick').value.trim();
      const team = document.getElementById('req-team').value.trim() || 'NFL Team';
      const num = document.getElementById('req-num').value.trim() || '#00';
      const move = document.getElementById('req-move').value.trim() || 'Clutch X-Factor';
      return `B.A.D CARDS 2400 — CUSTOM CARD ORDER\nPlayer: ${name}${nick ? ` aka "${nick}"` : ''}\nTeam: ${team}\nJersey & Pos: ${num}\nSignature Move/Quote: ${move}\n(Attach 1 clear selfie photo!)`;
    };

    document.getElementById('request-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = buildSummary();
      try {
        await navigator.clipboard.writeText(text);
        showToast('📋 Copied card order! Text it + a selfie to Isaiah!');
      } catch (_) {
        showToast('✨ Order ready — tap Email to B.A.D Studio to send!');
      }
      AUDIO.playCardFlip();
    });

    document.getElementById('req-email-btn')?.addEventListener('click', () => {
      const subject = encodeURIComponent('Custom B.A.D Card 2400 Request');
      const body = encodeURIComponent(buildSummary());
      window.location.href = `mailto:iksterbo@gmail.com?subject=${subject}&body=${body}`;
    });
  }

  function initWall() {
    try {
      const saved = JSON.parse(localStorage.getItem(WALL_KEY) || 'null');
      state.wallPosts = Array.isArray(saved) && saved.length ? saved : [...DATA.initialWall];
    } catch (_) {
      state.wallPosts = [...DATA.initialWall];
    }
    renderWall();

    document.getElementById('wall-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const [author, badge] = document.getElementById('wall-author-select').value.split('|');
      const msgEl = document.getElementById('wall-msg');
      const text = msgEl.value.trim();
      if (!text) return;
      state.wallPosts.unshift({ author, badge, time: 'JUST NOW', text });
      state.wallPosts = state.wallPosts.slice(0, 20);
      try { localStorage.setItem(WALL_KEY, JSON.stringify(state.wallPosts)); } catch (_) {}
      msgEl.value = '';
      renderWall();
      AUDIO.playCardFlip();
      showToast(`🔥 Posted as ${author}!`);
    });
  }

  function renderWall() {
    const feed = document.getElementById('wall-feed');
    if (!feed) return;
    feed.innerHTML = '';
    state.wallPosts.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'wall-post';
      const head = document.createElement('div');
      head.className = 'wall-post-head';
      const auth = document.createElement('span');
      auth.className = 'wall-author';
      auth.textContent = p.author;
      const meta = document.createElement('span');
      meta.className = 'wall-meta';
      meta.textContent = `${p.badge} • ${p.time}`;
      const body = document.createElement('p');
      body.textContent = p.text;
      head.append(auth, meta);
      card.append(head, body);
      feed.appendChild(card);
    });
  }

  /* ---------- TOOLBAR & CONTROLS ---------- */
  function initControls() {
    document.getElementById('copy-share-btn')?.addEventListener('click', async () => {
      const url = window.location.protocol.startsWith('http') && !window.location.hostname.includes('127.0.0.1')
        ? window.location.href
        : DATA.siteUrl;
      try {
        await navigator.clipboard.writeText(url);
        showToast(`🔗 Live link copied: ${url}`);
      } catch (_) {
        showToast(`🔗 Share link: ${url}`);
      }
    });

    document.querySelectorAll('[data-team-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.teamFilter = btn.dataset.teamFilter;
        document.querySelectorAll('[data-team-filter]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderCards();
      });
    });

    document.getElementById('vault-search')?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderCards();
    });

    document.querySelectorAll('[data-foil-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.body.setAttribute('data-foil', btn.dataset.foilBtn);
        document.querySelectorAll('[data-foil-btn]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        AUDIO.playCardFlip();
      });
    });

    document.getElementById('toggle-view-btn')?.addEventListener('click', (e) => {
      state.compactBinder = !state.compactBinder;
      e.currentTarget.textContent = state.compactBinder ? '🗂️ Binder View: Compact' : '🗂️ Binder View: Full';
      renderCards();
    });

    const animBtn = document.getElementById('toggle-anim-btn');
    const syncAnimBtn = () => {
      if (animBtn) animBtn.textContent = state.liveAnim ? '⏸ Pause Live 3D' : '▶ Play Live 3D';
    };
    syncAnimBtn();
    animBtn?.addEventListener('click', () => {
      state.liveAnim = !state.liveAnim;
      syncAnimBtn();
      document.querySelectorAll('.holo-card-scene').forEach((sc) => {
        sc.classList.toggle('is-live-anim', state.liveAnim);
        if (!state.liveAnim && !sc.classList.contains('is-flipped')) {
          const inner = sc.querySelector('.holo-card-inner');
          inner?.style.setProperty('--fy', '0px');
          inner?.style.setProperty('--rx', '0deg');
          inner?.style.setProperty('--ry', '0deg');
        }
      });
      showToast(state.liveAnim ? '▶ Live 3D animation playing' : '⏸ Live 3D paused — tilt manually with pointer');
    });

    document.getElementById('toggle-slab-btn')?.addEventListener('click', (e) => {
      const on = document.body.classList.toggle('slab-mode');
      e.currentTarget.textContent = on ? '💎 B.A.D 10 Slab: ON' : '💎 B.A.D 10 Slab: OFF';
      AUDIO.playCardFlip();
    });

    document.getElementById('mute-btn')?.addEventListener('click', (e) => {
      const muted = AUDIO.toggleMute();
      e.currentTarget.textContent = muted ? '🔇 Muted' : '🔊 Sound';
    });

    document.querySelectorAll('[data-opp-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.oppMode = btn.dataset.oppMode;
        document.querySelectorAll('[data-opp-mode]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        resetDuelMatch();
      });
    });

    document.getElementById('stake-slider')?.addEventListener('input', (e) => {
      state.stake = Number(e.target.value);
      renderEnergyControls();
    });

    document.getElementById('play-round-btn')?.addEventListener('click', playDuelRound);
    document.getElementById('battle-reset-btn')?.addEventListener('click', () => {
      resetDuelMatch();
      appendDuelLog('🔄 Fresh 4-Round Match started — 12 Hype Energy & 1 Instant/Trap ready!');
    });
  }

  /* ---------- BOOT ---------- */
  saveSquad();
  initDialogLightDismissFallback();
  initBgCanvas();
  initFireworks();
  initControls();
  initDialogs();
  renderCards();
  resetDuelMatch();
  initRequestDesk();
  initWall();
  requestAnimationFrame(masterAnimLoop);
})();
