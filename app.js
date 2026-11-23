/* ============================================================
   B.A.D CARDS 2400 — FLAGSHIP PRO INTERACTIVE ENGINE (v2.0)
   - 3-Stage Visual Mascot Evolutions (L1 Rookie -> L2 Awakened -> L3 MAX)
   - Digimon TCG: Shared Memory Gauge, Live Mid-Match Evolution,
     Inherited Skills Stack & 4-Card End-Zone Security Shields
   - Urban Rivals: 4-Card Squad Hand, Pillz Bluffing, Fury Mode,
     Clan Resonance & Revenge Comebacks
   - Yu-Gi-Oh!: Face-Down Traps, Mirror Sack, Foil Tiers & B.A.D Seal
   - MTG: Active Combat Keywords (Haste, Double Strike, Ward, Commander)
   - Collector XP Rank, 8 Achievement Trophies, Comparator & Evo Showcase
   ============================================================ */

(() => {
  const DATA = window.BAD_CARDS_DATA;
  const AUDIO = window.badAudio;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SQUAD_KEY = 'bad_cards_2400_squad_v7';
  const WALL_KEY = 'bad_cards_2400_wall_v6';
  const LEVELS_KEY = 'bad_cards_2400_levels_v2';
  const PROFILE_KEY = 'bad_cards_2400_profile_v1';

  let initialSquad = ['justin-porky', 'jerry-mack', 'david-da-boss', 'isaiah-little-bill'];
  try {
    const saved = JSON.parse(localStorage.getItem(SQUAD_KEY) || 'null');
    if (Array.isArray(saved)) {
      const valid = saved.filter((id) => DATA.cards.some((c) => c.id === id)).slice(0, 4);
      if (valid.length) initialSquad = valid;
    }
  } catch (_) {}

  let initialLevels = {};
  DATA.cards.forEach((c) => { initialLevels[c.id] = 3; });
  try {
    const savedLvls = JSON.parse(localStorage.getItem(LEVELS_KEY) || 'null');
    if (savedLvls && typeof savedLvls === 'object') {
      Object.keys(savedLvls).forEach((k) => {
        const v = Number(savedLvls[k]);
        if (v >= 1 && v <= 3) initialLevels[k] = v;
      });
    }
  } catch (_) {}

  let initialProfile = { xp: 0, wins: 0, streak: 0, trophies: [] };
  try {
    const savedProf = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    if (savedProf && typeof savedProf === 'object') {
      initialProfile = {
        xp: Number(savedProf.xp) || 0,
        wins: Number(savedProf.wins) || 0,
        streak: Number(savedProf.streak) || 0,
        trophies: Array.isArray(savedProf.trophies) ? savedProf.trophies : []
      };
    }
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
    cardLevels: initialLevels,
    profile: initialProfile,
    evolvingCards: new Set(),
    showcaseRunning: false,

    // Tactical 4-Round TCG Duel State
    duelFormat: 'ascension', // 'ascension' (start L1 & digivolve live) | 'max'
    oppMode: 'crew',         // 'crew' | 'rivals'
    hand: [],                // 4 card IDs for Urban Rivals hand
    usedCards: new Set(),
    heroId: 'justin-porky',
    oppId: 'jared-jroc',
    duelLevels: {},          // per-card active level inside current duel
    duelBonusAtk: 0,         // When-Evolving bonus ATK for current round
    evolvedThisRound: false,
    revengeActive: false,
    memory: 2,               // Shared Digimon Memory Gauge: +5 (You) .. 0 .. -5 (Opp)
    round: 1,
    maxRounds: 4,
    heroHp: 14,
    heroMaxHp: 14,
    oppHp: 14,
    oppMaxHp: 14,
    heroShields: 4,
    oppShields: 4,
    heroEnergy: 12,
    oppEnergy: 12,
    stake: 2,
    furyActive: false,
    armedInstantId: null,
    instantUsed: false,
    duelOver: false,
    wallPosts: []
  };

  /* ---------- HELPERS: LEVEL & EVOLUTION ARTWORK ---------- */
  function getCardLevel(card) {
    const lvl = Number(state.cardLevels[card.id] || 3);
    return Math.min(3, Math.max(1, lvl));
  }

  function getCardEvoAt(card, lvl) {
    const clamped = Math.min(3, Math.max(1, Number(lvl || 3)));
    return card.evolutions[clamped - 1] || card.evolutions[card.evolutions.length - 1];
  }

  function getCardEvo(card) {
    return getCardEvoAt(card, getCardLevel(card));
  }

  function getEvoImage(card, lvl) {
    const evo = getCardEvoAt(card, lvl);
    return (evo && evo.image) || card.image;
  }

  function getEvoVisualFx(card, lvl) {
    const evo = getCardEvoAt(card, lvl);
    return (evo && evo.visualFx) || 'base';
  }

  /* ---------- PROFILE, XP RANKS & TROPHIES ---------- */
  const RANKS = [
    { min: 0, name: '★ ROOKIE COLLECTOR', next: 200 },
    { min: 200, name: '⚡ PRO DUELIST', next: 450 },
    { min: 450, name: '🔥 GRIDIRON STRATEGIST', next: 800 },
    { min: 800, name: '👑 B.A.D 2400 LEGEND', next: 1200 },
    { min: 1200, name: '💎 HALL OF FAME DIVINITY', next: 1200 }
  ];

  function saveProfile() {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile)); } catch (_) {}
  }

  function renderProfileBar() {
    const xp = state.profile.xp;
    let rank = RANKS[0];
    for (const r of RANKS) {
      if (xp >= r.min) rank = r;
    }
    const pct = rank.next > rank.min
      ? Math.min(100, Math.round(((xp - rank.min) / (rank.next - rank.min)) * 100))
      : 100;

    const pill = document.getElementById('profile-rank-pill');
    const xpLbl = document.getElementById('profile-xp-label');
    const xpFill = document.getElementById('profile-xp-fill');
    const streakLbl = document.getElementById('profile-streak-label');
    const trophyCnt = document.getElementById('trophy-count');

    if (pill) pill.textContent = rank.name;
    if (xpLbl) xpLbl.textContent = rank.next > rank.min ? `${xp} / ${rank.next} XP` : `${xp} XP (MAX)`;
    if (xpFill) xpFill.style.width = `${pct}%`;
    if (streakLbl) streakLbl.textContent = `WINS: ${state.profile.wins} • STREAK: ${state.profile.streak}`;
    if (trophyCnt) trophyCnt.textContent = String(state.profile.trophies.length);
  }

  function awardXp(amount) {
    state.profile.xp += amount;
    saveProfile();
    renderProfileBar();
  }

  function unlockTrophy(id) {
    if (state.profile.trophies.includes(id)) return;
    const ach = (DATA.achievements || []).find((a) => a.id === id);
    if (!ach) return;
    state.profile.trophies.push(id);
    state.profile.xp += ach.xp;
    saveProfile();
    renderProfileBar();
    showToast(`🏆 TROPHY UNLOCKED: ${ach.icon} ${ach.name} (+${ach.xp} XP)!`);
  }

  function renderTrophyDialog() {
    const grid = document.getElementById('trophy-grid');
    const summary = document.getElementById('trophy-summary');
    if (!grid || !summary) return;
    const total = (DATA.achievements || []).length;
    summary.textContent = `Total XP: ${state.profile.xp} • Match Wins: ${state.profile.wins} • Active Streak: ${state.profile.streak} • Trophies Unlocked: ${state.profile.trophies.length}/${total}`;
    grid.innerHTML = (DATA.achievements || [])
      .map((a) => {
        const unlocked = state.profile.trophies.includes(a.id);
        return `
        <div class="trophy-card ${unlocked ? 'unlocked' : ''}">
          <div style="font-size:1.45rem;margin-bottom:0.25rem;">${unlocked ? a.icon : '🔒'}</div>
          <div style="font-family:var(--font-display);font-size:0.74rem;font-weight:900;color:${unlocked ? '#ffe28a' : '#94a3b8'};">${a.name}</div>
          <div style="font-size:0.76rem;color:#cbd5e1;margin:0.22rem 0 0.38rem;">${a.desc}</div>
          <div style="font-family:var(--font-mono);font-size:0.64rem;color:${unlocked ? '#86efac' : '#64748b'};">${unlocked ? `✓ UNLOCKED (+${a.xp} XP)` : `+${a.xp} XP`}</div>
        </div>`;
      })
      .join('');
  }

  /* ---------- TOAST ---------- */
  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
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
      if (!document.hidden && fireworks.length) {
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
        if (!fireworks.length) ctx.clearRect(0, 0, w, h);
      }
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
      if (!document.hidden) {
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
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ---------- RENDER 8-CARD VAULT ---------- */
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
    buildDuelHand();
    renderDuelArena();
  }

  function saveCardLevels() {
    try { localStorage.setItem(LEVELS_KEY, JSON.stringify(state.cardLevels)); } catch (_) {}
  }

  function syncToolbarLevelChips() {
    const vals = state.cards.map((c) => getCardLevel(c));
    const allSame = vals.every((v) => v === vals[0]) ? vals[0] : null;
    document.querySelectorAll('[data-all-level]').forEach((b) => {
      const active = allSame !== null && Number(b.dataset.allLevel) === allSame;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }

  function triggerEvoFlash(cardIds) {
    cardIds.forEach((id) => state.evolvingCards.add(id));
    setTimeout(() => {
      cardIds.forEach((id) => state.evolvingCards.delete(id));
    }, 700);
  }

  function updateSingleCardDOM(cardId) {
    const card = state.cards.find((c) => c.id === cardId);
    const scene = document.querySelector(`.holo-card-scene[data-card-id="${cardId}"]`);
    if (!card || !scene) { renderCards(); return; }
    const article = scene.closest('.card-column');
    if (!article) { renderCards(); return; }

    const lvl = getCardLevel(card);
    const evo = getCardEvo(card);
    const evoImg = getEvoImage(card, lvl);
    const evoFx = getEvoVisualFx(card, lvl);
    const statDelta = typeof evo.statDelta === 'number' ? evo.statDelta : 0;
    const atkMult = typeof evo.atkMult === 'number' ? evo.atkMult : 1;
    const liveAtk = Math.round(card.atk * atkMult);
    const liveDef = Math.round(card.def * atkMult);
    const tierLabel = lvl === 3 ? '⚡ LVL 3 MAX' : (lvl === 2 ? '✦ LVL 2 AWAKENED' : 'LVL 1 ROOKIE');

    article.dataset.level = String(lvl);
    scene.classList.remove('is-evolving');
    void scene.offsetWidth;
    scene.classList.add('is-evolving');
    setTimeout(() => scene.classList.remove('is-evolving'), 700);

    const img = article.querySelector('.card-art-img');
    if (img) {
      img.src = evoImg;
      img.dataset.visualFx = evoFx;
      img.alt = `${card.name} #${card.number} ${card.team} Level ${lvl} ${evo.stage}`;
    }
    const ovrEl = article.querySelector('.ovr-num');
    if (ovrEl) ovrEl.textContent = String(evo.ovr);
    const rarityEl = article.querySelector('.rarity-pill');
    if (rarityEl) rarityEl.textContent = lvl === 3 ? card.rarity : `LVL ${lvl} • ${evo.stage.split(' ')[0]}`;
    const tierEl = article.querySelector('.card-tier-stamp');
    if (tierEl) tierEl.textContent = tierLabel;
    const banner = article.querySelector('.mascot-crest-banner');
    if (banner) {
      banner.title = evo.mascotTrait || evo.note;
      const spans = banner.querySelectorAll('span');
      if (spans[0]) spans[0].textContent = evo.mascotBadge || `LVL ${lvl} • ${evo.stage}`;
      if (spans[1]) spans[1].textContent = '★'.repeat(evo.stars);
    }
    const edEl = article.querySelector('.card-edition-tag');
    if (edEl) edEl.textContent = lvl === 3 ? `${card.edition} • APEX MASCOT` : `LVL ${lvl} / 3 • ${evo.stage.toUpperCase()}`;
    const subEl = article.querySelector('.card-player-sub');
    if (subEl) subEl.textContent = lvl === 3 ? `${evo.stage} • ${card.mascot || card.team}` : card.subtitle;
    const sigEl = article.querySelector('.card-sig-ability span');
    if (sigEl) sigEl.textContent = evo.onEvolve ? evo.onEvolve.label : card.signatureAbility;

    const miniEls = article.querySelectorAll('.mini-stat');
    card.miniStats.forEach((s, i) => {
      const box = miniEls[i];
      if (!box) return;
      const val = Math.max(70, Math.min(100, s.v + statDelta));
      box.classList.toggle('hot', Boolean(s.hot && lvl === 3));
      const vEl = box.querySelector('.mini-stat-v');
      if (vEl) vEl.textContent = String(val);
    });

    const backSub = article.querySelector('.back-sub');
    if (backSub) backSub.textContent = `${card.team} • LVL ${lvl} • ATK ${liveAtk} / DEF ${liveDef}`;
    const backSer = article.querySelector('.back-serial');
    if (backSer) backSer.textContent = lvl === 3 ? 'LVL 3 MAX' : `LVL ${lvl}/3`;
    const backBio = article.querySelector('.back-bio');
    if (backBio) backBio.innerHTML = `<strong>${evo.mascotBadge}:</strong> ${evo.mascotTrait || card.bio}`;
    const backChem = article.querySelector('.back-chem');
    if (backChem) backChem.textContent = evo.inherited ? `🧬 ${evo.inherited}` : card.chemistry;
    const statRows = article.querySelectorAll('.back-stat-bars .stat-row');
    card.detailedStats.forEach((st, i) => {
      const row = statRows[i];
      if (!row) return;
      const val = Math.max(70, Math.min(100, st.val + statDelta));
      const fill = row.querySelector('.stat-fill');
      const vEl = row.querySelector('.stat-val');
      if (fill) fill.style.width = `${val}%`;
      if (vEl) vEl.textContent = String(val);
    });
    const slabSub = article.querySelector('.slab-meta div:last-child');
    if (slabSub) slabSub.textContent = `${card.cert} • LVL ${lvl} ${evo.stage}`;

    article.querySelectorAll('[data-set-lvl]').forEach((b) => {
      const active = Number(b.dataset.setLvl) === lvl;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }

  function setCardLevel(cardId, lvl) {
    const card = state.cards.find((c) => c.id === cardId);
    if (!card) return;
    const clamped = Math.min(3, Math.max(1, Number(lvl)));
    state.cardLevels[cardId] = clamped;
    saveCardLevels();
    const evo = getCardEvo(card);
    updateSingleCardDOM(cardId);
    renderSquadDrawer();
    if (state.duelFormat === 'max') {
      state.duelLevels[cardId] = clamped;
      renderDuelArena();
    }
    syncToolbarLevelChips();
    unlockTrophy('first-evo');
    if (state.cards.every((c) => getCardLevel(c) === 3)) unlockTrophy('max-vault');
    if (clamped === 3) {
      AUDIO.playEvolve(3);
      launchFireworks(4);
      showToast(`⚡ ${card.shortName} ASCENDED TO LVL 3 MAX: ${evo.stage.toUpperCase()}!`);
    } else if (clamped === 2) {
      AUDIO.playEvolve(2);
      showToast(`✨ ${card.shortName} EVOLVED TO LVL 2: ${evo.stage.toUpperCase()}!`);
    } else {
      AUDIO.playCardFlip();
      showToast(`${card.shortName} set to LVL 1 (${evo.stage})`);
    }
  }

  function setAllCardsLevel(lvl, silent = false) {
    const clamped = Math.min(3, Math.max(1, Number(lvl)));
    state.cards.forEach((c) => {
      state.cardLevels[c.id] = clamped;
      if (state.duelFormat === 'max') state.duelLevels[c.id] = clamped;
      updateSingleCardDOM(c.id);
    });
    saveCardLevels();
    renderSquadDrawer();
    renderDuelArena();
    syncToolbarLevelChips();
    unlockTrophy('first-evo');
    if (clamped === 3) {
      unlockTrophy('max-vault');
      AUDIO.playEvolve(3);
      launchFireworks(6);
      if (!silent) showToast(`⚡ ALL ${state.cards.length} CARDS ASCENDED TO LEVEL 3 APEX MASCOT FORM!`);
    } else if (clamped === 2) {
      AUDIO.playEvolve(2);
      if (!silent) showToast(`✨ ALL ${state.cards.length} CARDS EVOLVED TO LEVEL 2 AWAKENED ARMOR!`);
    } else {
      AUDIO.playCardFlip();
      if (!silent) showToast(`All ${state.cards.length} cards set to Level 1 Rookie Base Form`);
    }
  }

  function runEvolutionShowcase() {
    if (state.showcaseRunning) return;
    state.showcaseRunning = true;
    const btn = document.getElementById('evo-showcase-btn');
    if (btn) btn.disabled = true;
    document.getElementById('vault')?.scrollIntoView({ behavior: 'smooth' });
    setAllCardsLevel(1, true);
    showToast('🎬 STAGE 1 / 3 — BASE ROOKIE FORMS');
    setTimeout(() => {
      setAllCardsLevel(2, true);
      showToast('⚡ STAGE 2 / 3 — AWAKENED MASCOT ARMOR!');
    }, 1450);
    setTimeout(() => {
      setAllCardsLevel(3, true);
      showToast('👑 STAGE 3 / 3 — LEVEL 3 MAX APEX MASCOT ASCENSION!!');
      state.showcaseRunning = false;
      if (btn) btn.disabled = false;
    }, 3000);
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
      const evoNames = c.evolutions.map((e) => `${e.stage} ${e.mascotBadge || ''}`).join(' ');
      const hay = `${c.name} ${c.subtitle} ${c.team} #${c.number} ${c.position} ${c.keywords.join(' ')} ${c.clan} ${c.mascot || ''} ${evoNames}`.toLowerCase();
      return hay.includes(q);
    });

    if (!visible.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:2.5rem 1rem;color:var(--text-muted);font-family:var(--font-display);font-size:0.86rem;display:flex;flex-direction:column;align-items:center;gap:0.85rem;';
      const msg = document.createElement('p');
      msg.textContent = `No cards matched "${state.searchQuery.trim()}". Clear the search or team filter to view all ${state.cards.length} Mythics.`;
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'btn btn-gold btn-sm';
      resetBtn.textContent = 'Reset Vault Filters';
      resetBtn.addEventListener('click', () => {
        state.teamFilter = 'all';
        state.searchQuery = '';
        const searchEl = document.getElementById('vault-search');
        if (searchEl) searchEl.value = '';
        document.querySelectorAll('[data-team-filter]').forEach((b) => {
          const isAll = b.dataset.teamFilter === 'all';
          b.classList.toggle('active', isAll);
          b.setAttribute('aria-pressed', String(isAll));
        });
        renderCards();
      });
      empty.append(msg, resetBtn);
      grid.appendChild(empty);
      return;
    }

    visible.forEach((card, idx) => {
      const inSquad = state.squad.includes(card.id);
      const lvl = getCardLevel(card);
      const evo = getCardEvo(card);
      const evoImg = getEvoImage(card, lvl);
      const evoFx = getEvoVisualFx(card, lvl);
      const statDelta = typeof evo.statDelta === 'number' ? evo.statDelta : 0;
      const atkMult = typeof evo.atkMult === 'number' ? evo.atkMult : 1;
      const liveAtk = Math.round(card.atk * atkMult);
      const liveDef = Math.round(card.def * atkMult);
      const starsStr = '★'.repeat(evo.stars);
      const tierLabel = lvl === 3 ? '⚡ LVL 3 MAX' : (lvl === 2 ? '✦ LVL 2 AWAKENED' : 'LVL 1 ROOKIE');
      const isEvoFlash = state.evolvingCards.has(card.id);

      const article = document.createElement('article');
      article.className = `card-column theme-${card.theme}`;
      article.dataset.level = String(lvl);
      article.innerHTML = `
        <div class="card-slab-wrap">
          <div class="slab-label">
            <div class="slab-meta">
              <div style="color:var(--back-accent);font-weight:900;">${card.name} #${card.number}</div>
              <div>${card.cert} &bull; LVL ${lvl} ${evo.stage}</div>
            </div>
            <span class="slab-grade-badge">${card.grade}</span>
          </div>

          <div class="holo-card-scene ${state.liveAnim ? 'is-live-anim' : ''} ${isEvoFlash ? 'is-evolving' : ''}" data-card-id="${card.id}" data-card-idx="${idx}" tabindex="0" role="button" aria-pressed="false" aria-label="Flip ${card.name} number ${card.number} card">
            <div class="evo-burst-ring" aria-hidden="true"></div>
            <div class="holo-card-inner">
              <!-- FRONT -->
              <div class="holo-face holo-front">
                <div class="card-art-wrap">
                  <img class="card-art-img" src="${evoImg}" data-visual-fx="${evoFx}" alt="${card.name} #${card.number} ${card.team} Level ${lvl} ${evo.stage}" decoding="async" ${idx < 3 ? 'fetchpriority="high"' : ''} style="object-position:${card.objectPos || 'center 10%'};" />
                  <canvas class="card-fx-canvas" data-fx-theme="${card.fxTheme}" aria-hidden="true"></canvas>
                  <div class="chrome-sweep" style="--sweep-delay:${(idx * 0.95).toFixed(2)}s;" aria-hidden="true"></div>
                  <div class="card-art-vignette"></div>
                  <div class="card-top-bar">
                    <div class="ovr-shield">
                      <div class="ovr-num">${evo.ovr}</div>
                      <div class="ovr-pos">${card.position}</div>
                    </div>
                    <div class="card-rarity-stack">
                      <span class="rarity-pill">${lvl === 3 ? card.rarity : `LVL ${lvl} • ${evo.stage.split(' ')[0]}`}</span>
                      <span class="jersey-pill">#${card.number}</span>
                      <span class="card-tier-stamp">${tierLabel}</span>
                    </div>
                  </div>
                  <div class="mascot-crest-banner" title="${evo.mascotTrait || evo.note}">
                    <span>${evo.mascotBadge || `LVL ${lvl} • ${evo.stage}`}</span>
                    <span class="mascot-crest-stars">${starsStr}</span>
                  </div>
                </div>
                <div class="card-front-footer">
                  <div class="card-edition-tag">${lvl === 3 ? `${card.edition} • APEX MASCOT` : `LVL ${lvl} / 3 • ${evo.stage.toUpperCase()}`}</div>
                  <div class="card-player-name">${card.name}</div>
                  <div class="card-player-sub">${lvl === 3 ? `${evo.stage} • ${card.mascot || card.team}` : card.subtitle}</div>
                  <div class="card-mini-stats">
                    ${card.miniStats
                      .map((s) => {
                        const val = Math.max(70, Math.min(100, s.v + statDelta));
                        return `
                        <div class="mini-stat ${s.hot && lvl === 3 ? 'hot' : ''}">
                          <div class="mini-stat-v">${val}</div>
                          <div class="mini-stat-k">${s.k}</div>
                        </div>`;
                      })
                      .join('')}
                  </div>
                  <div class="card-sig-ability">
                    <span>${evo.onEvolve ? evo.onEvolve.label : card.signatureAbility}</span>
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
                    <div class="back-sub">${card.team} &bull; LVL ${lvl} &bull; ATK ${liveAtk} / DEF ${liveDef}</div>
                  </div>
                  <span class="back-serial">${lvl === 3 ? 'LVL 3 MAX' : `LVL ${lvl}/3`}</span>
                </div>

                <div class="back-bio"><strong>${evo.mascotBadge}:</strong> ${evo.mascotTrait || card.bio}</div>

                <div class="back-stat-bars">
                  ${card.detailedStats
                    .map((st) => {
                      const val = Math.max(70, Math.min(100, st.val + statDelta));
                      return `
                      <div class="stat-row">
                        <span class="stat-label">${st.label}</span>
                        <div class="stat-track"><div class="stat-fill" style="width:${val}%"></div></div>
                        <span class="stat-val">${val}</span>
                      </div>`;
                    })
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

                <div class="back-chem">${evo.inherited ? `🧬 ${evo.inherited}` : card.chemistry}</div>

                <div class="bad-card-rim" style="margin-top:0.1rem;">
                  <span class="bad-set-code">${card.serial}</span>
                  <span class="bad-holo-seal" title="Authentic B.A.D Cards 1st Edition Corner Seal">B.A.D</span>
                </div>
                <div class="holo-glare"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-level-bar" role="group" aria-label="Upgrade ${card.name} level">
          <button class="lvl-pill ${lvl === 1 ? 'active' : ''}" data-set-lvl="1" data-card-id="${card.id}" type="button" aria-pressed="${lvl === 1}">★ LVL 1</button>
          <button class="lvl-pill ${lvl === 2 ? 'active' : ''}" data-set-lvl="2" data-card-id="${card.id}" type="button" aria-pressed="${lvl === 2}">★★★ LVL 2</button>
          <button class="lvl-pill is-max ${lvl === 3 ? 'active' : ''}" data-set-lvl="3" data-card-id="${card.id}" type="button" aria-pressed="${lvl === 3}">⚡ LVL 3 MAX</button>
        </div>

        <div class="card-action-bar">
          <button class="card-mini-btn" data-action="flip" data-card-id="${card.id}" type="button" aria-label="Flip ${card.name}">🔄 Flip</button>
          <button class="card-mini-btn" data-action="inspect" data-card-id="${card.id}" type="button" aria-label="Mascot details for ${card.name}">★ Evolve Tree</button>
          <button class="card-mini-btn ${inSquad ? 'in-squad' : ''}" data-action="squad" data-card-id="${card.id}" type="button" aria-pressed="${inSquad}" aria-label="${inSquad ? 'In Squad' : 'Squad'} — ${card.name}">${inSquad ? '✓ In Squad' : '+ Squad'}</button>
          <button class="card-mini-btn" data-action="dl-front" data-card-id="${card.id}" type="button" aria-label="PNG export for ${card.name}">⬇️ PNG</button>
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
        const flipped = scene.classList.toggle('is-flipped');
        scene.setAttribute('aria-pressed', String(flipped));
        AUDIO.playCardFlip();
      };

      const resetTilt = () => {
        scene.classList.remove('is-tilting');
        inner.style.setProperty('--px', '0px');
        inner.style.setProperty('--py', '0px');
        if (!state.liveAnim) {
          inner.style.setProperty('--rx', '0deg');
          inner.style.setProperty('--ry', '0deg');
          inner.style.setProperty('--glare-op', '0.32');
        }
      };

      scene.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch' || scene.classList.contains('is-flipped')) return;
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

      scene.addEventListener('pointerleave', resetTilt);
      scene.addEventListener('pointercancel', resetTilt);
      scene.addEventListener('click', toggleFlip);
      scene.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); toggleFlip(); }
        else if (e.key === ' ') { e.preventDefault(); }
      });
      scene.addEventListener('keyup', (e) => { if (e.key === ' ') toggleFlip(); });

      article.querySelectorAll('[data-set-lvl]').forEach((btn) => {
        btn.addEventListener('click', () => setCardLevel(card.id, Number(btn.dataset.setLvl)));
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

      fxEngines.push(createCardFxEngine(fxCanvas, scene, card.fxTheme, idx, lvl));
    });
  }

  /* ---------- PER-TEAM & PER-LEVEL 60FPS CARD FX ENGINE ---------- */
  function createCardFxEngine(canvas, scene, fxTheme, idx, level = 3) {
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
      cowboys: { p1: '#ffd166', p2: '#38bdf8', glow1: 'rgba(255,206,92,', glow2: 'rgba(56,189,248,', stars: true },
      patriots: { p1: '#e31837', p2: '#e2e8f0', glow1: 'rgba(227,24,55,', glow2: 'rgba(203,213,225,', stars: true },
      packers: { p1: '#ffb612', p2: '#22c55e', glow1: 'rgba(255,182,18,', glow2: 'rgba(34,197,94,', stars: true },
      'packers-boss': { p1: '#ffe066', p2: '#34d399', glow1: 'rgba(255,224,102,', glow2: 'rgba(52,211,153,', stars: true },
      'packers-leap': { p1: '#34d399', p2: '#fde047', glow1: 'rgba(52,211,153,', glow2: 'rgba(253,224,71,', stars: true }
    }[fxTheme] || { p1: '#ffc62f', p2: '#38bdf8', glow1: 'rgba(255,198,47,', glow2: 'rgba(56,189,248,', stars: false };

    const sparkCount = level === 3 ? 28 : (level === 2 ? 16 : 8);
    const sparks = Array.from({ length: sparkCount }, () => ({
      x: Math.random() * cw, y: Math.random() * ch,
      r: (level === 3 ? 1.3 : (level === 2 ? 1.0 : 0.8)) + Math.random() * (level === 3 ? 1.9 : 1.3),
      vx: (Math.random() - 0.5) * 0.35,
      vy: (level === 3 ? 0.45 : (level === 2 ? 0.32 : 0.22)) + Math.random() * 0.55,
      alt: Math.random() > 0.5,
      star: (palette.stars || level === 3) && Math.random() > (level === 3 ? 0.58 : 0.78),
      life: Math.random()
    }));

    let inView = true;
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        if (entries[0]) inView = entries[0].isIntersecting;
      }, { rootMargin: '120px' });
      obs.observe(scene);
    }

    return {
      scene, idx, resize,
      isVisible() { return inView; },
      step(tick) {
        if (!inView) return;
        const flipped = scene.classList.contains('is-flipped');
        ctx.clearRect(0, 0, cw, ch);
        if (flipped || !state.liveAnim) return;

        const glowMult = level === 3 ? 0.85 : (level === 2 ? 0.55 : 0.28);
        const pulse = 0.5 + 0.5 * Math.sin(tick * 0.025 + idx);
        const g1 = ctx.createRadialGradient(cw * 0.24, ch * 0.80, 4, cw * 0.24, ch * 0.80, cw * 0.30);
        g1.addColorStop(0, `${palette.glow1}${((0.12 + pulse * 0.08) * glowMult).toFixed(2)})`);
        g1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, cw, ch);

        const g2 = ctx.createRadialGradient(cw * 0.72, ch * 0.58, 4, cw * 0.72, ch * 0.58, cw * 0.26);
        g2.addColorStop(0, `${palette.glow2}${((0.12 + (1 - pulse) * 0.08) * glowMult).toFixed(2)})`);
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, cw, ch);

        for (const s of sparks) {
          s.x += s.vx + Math.sin(tick * 0.02 + s.y * 0.025) * 0.18;
          s.y -= s.vy;
          s.life += 0.008;
          if (s.y < -6 || s.x < -8 || s.x > cw + 8) { s.x = Math.random() * cw; s.y = ch + 6; s.life = 0; }
          ctx.globalAlpha = Math.max(0.12, Math.sin(Math.min(1, s.life) * Math.PI) * (level === 3 ? 0.78 : 0.56));
          if (s.star) {
            drawStar(ctx, s.x, s.y, 5, s.r * 1.7, s.r * 0.7);
            ctx.fillStyle = level === 3 ? '#fffbeb' : '#ffffff';
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = s.alt ? palette.p1 : palette.p2;
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }
    };
  }

  let masterTick = 0;
  function masterAnimLoop(ts) {
    if (!document.hidden) {
      masterTick += 1;
      const drawCanvas = (masterTick % 2) === 0;
      for (const eng of fxEngines) {
        if (!eng.isVisible()) continue;
        if (drawCanvas) eng.step(masterTick);
        const sc = eng.scene;
        if (state.liveAnim && !sc.classList.contains('is-tilting') && !sc.classList.contains('is-flipped')) {
          const inner = sc.querySelector('.holo-card-inner');
          if (inner) {
            const phase = ((ts / 6200) + eng.idx * 0.19) % 1;
            const tau = Math.PI * 2;
            inner.style.setProperty('--fy', `${(Math.sin(phase * tau) * -2.8).toFixed(2)}px`);
            inner.style.setProperty('--rx', `${(Math.sin(phase * tau * 2) * 2.1).toFixed(2)}deg`);
            inner.style.setProperty('--ry', `${(Math.sin(phase * tau) * 4.8).toFixed(2)}deg`);
            inner.style.setProperty('--mx', `${(50 + Math.sin(phase * tau) * 24).toFixed(1)}%`);
            inner.style.setProperty('--my', `${(44 + Math.cos(phase * tau) * 16).toFixed(1)}%`);
            inner.style.setProperty('--glare-op', `${(0.18 + Math.abs(Math.sin(phase * tau)) * 0.14).toFixed(2)}`);
          }
        }
      }
    }
    requestAnimationFrame(masterAnimLoop);
  }
  window.addEventListener('resize', () => fxEngines.forEach((e) => e.resize()));

  /* ---------- HIGH-RES PNG EXPORTER (LEVEL-AWARE ARTWORK + CORNER SEAL) ---------- */
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
    if (card.theme === 'bears') return { bgDark: '#071124', footer: '#081326', primary: '#ff6b2b', hot: '#ffd3ad', sub: '#a9c0e3', box: 'rgba(19,39,76,0.74)', pill: '#132952', bar1: '#38bdf8', ovrText: '#070b14' };
    if (card.theme === 'cowboys') return { bgDark: '#041026', footer: '#051430', primary: '#7dd3fc', hot: '#ffffff', sub: '#b7cae6', box: 'rgba(11,42,91,0.74)', pill: '#0d3270', bar1: '#1d63ed', ovrText: '#070b14' };
    if (card.theme === 'patriots') return { bgDark: '#020b1c', footer: '#021430', primary: '#e31837', hot: '#ffffff', sub: '#b5c7e0', box: 'rgba(0,30,66,0.82)', pill: '#c8102e', bar1: '#1d4ed8', ovrText: '#ffffff' };
    if (card.theme === 'packers') return { bgDark: '#04140d', footer: '#061f14', primary: '#ffb612', hot: '#fff3c4', sub: '#b5dec9', box: 'rgba(20,59,42,0.82)', pill: '#183b2c', bar1: '#22c55e', ovrText: '#061b11' };
    if (card.theme === 'packers-boss') return { bgDark: '#030d09', footer: '#051a12', primary: '#ffe066', hot: '#fef9c3', sub: '#a7f3d0', box: 'rgba(10,36,24,0.86)', pill: '#0d2b1f', bar1: '#10b981', ovrText: '#04140d' };
    if (card.theme === 'packers-leap') return { bgDark: '#031510', footer: '#062a1e', primary: '#34d399', hot: '#fde047', sub: '#a7f3d0', box: 'rgba(8,48,34,0.84)', pill: '#0f4c35', bar1: '#fde047', ovrText: '#041b13' };
    return { bgDark: '#0e0522', footer: '#110628', primary: '#ffc62f', hot: '#ffe58f', sub: '#c8b8eb', box: 'rgba(79,38,131,0.58)', pill: '#4f2683', bar1: '#7c3aed', ovrText: '#070b14' };
  }

  function exportCardFrontPNG(cardId) {
    const card = state.cards.find((c) => c.id === cardId);
    if (!card) return;
    const lvl = getCardLevel(card);
    const evo = getCardEvo(card);
    const statDelta = typeof evo.statDelta === 'number' ? evo.statDelta : 0;
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
        const posMatch = String(card.objectPos || '').match(/(\d+(?:\.\d+)?)%/);
        const yBias = posMatch ? (Number(posMatch[1]) / 100) : 0.10;
        ctx.drawImage(img, (W - dw) / 2, -(dh - artH) * yBias, dw, dh);

        const vig = ctx.createLinearGradient(0, 440, 0, artH);
        vig.addColorStop(0, 'rgba(4,10,24,0)');
        vig.addColorStop(1, col.footer);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 440, W, artH - 440);

        ctx.fillStyle = 'rgba(6,12,26,0.92)';
        ctx.fillRect(30, artH - 54, W - 60, 38);
        ctx.strokeStyle = col.primary;
        ctx.lineWidth = 2;
        ctx.strokeRect(30, artH - 54, W - 60, 38);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fffbeb';
        ctx.font = '800 17px Orbitron, Arial, sans-serif';
        ctx.fillText(evo.mascotBadge || `LVL ${lvl} • ${evo.stage}`, 46, artH - 29);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('★'.repeat(evo.stars), W - 46, artH - 29);

        ctx.fillStyle = col.footer;
        ctx.fillRect(0, artH, W, H - artH);
        ctx.fillStyle = col.primary;
        ctx.fillRect(0, artH, W, 5);

        ctx.fillStyle = col.primary;
        ctx.fillRect(30, 30, 114, 120);
        ctx.fillStyle = col.ovrText || '#070b14';
        ctx.font = '900 54px Orbitron, Arial Black, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(evo.ovr), 87, 94);
        ctx.font = '800 21px Orbitron, Arial, sans-serif';
        ctx.fillText(card.position, 87, 130);

        ctx.fillStyle = 'rgba(8,14,30,0.92)';
        ctx.fillRect(W - 234, 30, 204, 44);
        ctx.strokeStyle = col.primary;
        ctx.lineWidth = 3;
        ctx.strokeRect(W - 234, 30, 204, 44);
        ctx.fillStyle = col.hot;
        ctx.font = '800 19px Orbitron, Arial, sans-serif';
        ctx.fillText(lvl === 3 ? card.rarity : `LVL ${lvl} • ${evo.stage.split(' ')[0]}`, W - 132, 59);

        ctx.fillStyle = col.pill;
        ctx.fillRect(W - 120, 86, 90, 48);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 30px Orbitron, Arial Black, sans-serif';
        ctx.fillText('#' + card.number, W - 75, 120);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#38bdf8';
        ctx.font = '700 19px Orbitron, Arial, sans-serif';
        ctx.fillText(lvl === 3 ? `${card.edition} • APEX MASCOT` : `LVL ${lvl} / 3 • ${evo.stage.toUpperCase()}`, 34, artH + 40);
        ctx.fillStyle = col.hot;
        ctx.font = '900 40px Orbitron, Arial Black, sans-serif';
        ctx.fillText(card.name, 34, artH + 92);
        ctx.fillStyle = col.sub;
        ctx.font = '600 23px Rajdhani, Arial, sans-serif';
        ctx.fillText(lvl === 3 ? `${evo.stage} • ${card.mascot || card.team}` : card.subtitle, 34, artH + 126);

        const boxW = (W - 68 - 36) / 4;
        card.miniStats.forEach((st, i) => {
          const val = Math.max(70, Math.min(100, st.v + statDelta));
          const bx = 34 + i * (boxW + 12), by = artH + 148;
          ctx.fillStyle = col.box;
          ctx.fillRect(bx, by, boxW, 80);
          ctx.strokeStyle = col.primary;
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, boxW, 80);
          ctx.textAlign = 'center';
          ctx.fillStyle = col.hot;
          ctx.font = '900 32px Orbitron, Arial Black, sans-serif';
          ctx.fillText(String(val), bx + boxW / 2, by + 42);
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
        ctx.font = '700 20px Orbitron, Arial, sans-serif';
        ctx.fillText(evo.onEvolve ? evo.onEvolve.label : card.signatureAbility, W / 2, artH + 277);

        drawCornerBadSeal(ctx, W, H, card.setCode);
        ctx.strokeStyle = lvl === 3 ? '#ffe28a' : col.primary;
        ctx.lineWidth = lvl === 3 ? 16 : 12;
        ctx.strokeRect(8, 8, W - 16, H - 16);

        const a = document.createElement('a');
        a.download = `${card.id}-lvl${lvl}-front-bad-cards-2400.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
        showToast(`⬇️ Saved ${card.name} (LVL ${lvl}) Front PNG with B.A.D seal!`);
      } catch (_) {
        showToast('💡 Open via the live URL to enable one-click PNG export!');
      }
    };
    img.src = getEvoImage(card, lvl);
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
    const lvl = getCardLevel(card);
    const evo = getCardEvo(card);
    const statDelta = typeof evo.statDelta === 'number' ? evo.statDelta : 0;
    const atkMult = typeof evo.atkMult === 'number' ? evo.atkMult : 1;
    const liveAtk = Math.round(card.atk * atkMult);
    const liveDef = Math.round(card.def * atkMult);
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
    ctx.font = '700 18px Orbitron, Arial, sans-serif';
    ctx.fillText(`${card.team} • LVL ${lvl} (${evo.ovr} OVR) • ATK ${liveAtk} / DEF ${liveDef}`, 42, 124);

    ctx.fillStyle = col.primary;
    ctx.fillRect(42, 146, W - 84, 3);
    ctx.fillStyle = '#e8f0ff';
    ctx.font = '600 23px Rajdhani, Arial, sans-serif';
    wrapText(ctx, `${evo.mascotBadge}: ${evo.mascotTrait || card.bio}`, 42, 188, W - 84, 30);

    let y = 370;
    card.detailedStats.forEach((st) => {
      const val = Math.max(70, Math.min(100, st.val + statDelta));
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
      ctx.fillRect(280, y - 16, (336 * val) / 100, 16);
      ctx.fillStyle = col.hot;
      ctx.font = '900 23px Orbitron, Arial Black, sans-serif';
      ctx.fillText(String(val), 638, y);
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
    a.download = `${card.id}-lvl${lvl}-back-bad-cards-2400.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    showToast(`⬇️ Saved ${card.name} (LVL ${lvl}) Back PNG with B.A.D seal!`);
  }

  /* ---------- EVOLUTION INSPECTOR, PACK RIPPER, COMPARATOR & SQUAD DRAWER ---------- */
  function renderInspectorEvo(card) {
    const lvl = state.inspectEvoIdx + 1;
    const evo = card.evolutions[state.inspectEvoIdx] || card.evolutions[card.evolutions.length - 1];
    const starsEl = document.getElementById('inspect-stars');
    const starsHtml = Array.from({ length: 5 }, (_, i) => (i < evo.stars ? '<span aria-hidden="true">★</span>' : '<span class="star-dim" aria-hidden="true">★</span>')).join('');
    const mult = typeof evo.atkMult === 'number' ? evo.atkMult : (evo.ovr / 99);

    const imgEl = document.getElementById('inspect-img');
    if (imgEl) {
      imgEl.src = getEvoImage(card, lvl);
      imgEl.alt = `${card.name} #${card.number} Level ${lvl} ${evo.stage}`;
      imgEl.dataset.visualFx = getEvoVisualFx(card, lvl);
      imgEl.style.objectPosition = card.objectPos || 'center 10%';
    }

    starsEl.innerHTML = starsHtml;
    starsEl.setAttribute('aria-label', `${evo.stars} out of 5 stars`);
    document.getElementById('inspect-atkdef').textContent = `ATK ${Math.round(card.atk * mult)} / DEF ${Math.round(card.def * mult)} • PWR ${evo.power} / DMG ${evo.dmg}`;
    document.getElementById('inspect-evo-note').textContent = `${evo.mascotBadge || `LVL ${evo.level}`} (${evo.ovr} OVR) — ${evo.mascotTrait || evo.note}`;

    // 3-Stage Side-by-Side Evolution Visual Preview Strip
    const trioEl = document.getElementById('inspect-evo-trio');
    if (trioEl) {
      trioEl.innerHTML = card.evolutions
        .map((e, i) => `
          <button class="evo-trio-card ${i === state.inspectEvoIdx ? 'active' : ''}" data-trio-idx="${i}" type="button" aria-pressed="${i === state.inspectEvoIdx}">
            <img src="${e.image || card.image}" data-visual-fx="${e.visualFx || 'base'}" alt="Level ${i + 1} ${e.stage}" decoding="async" style="object-position:${card.objectPos || 'center 10%'};" />
            <div class="evo-trio-lbl">${i === 2 ? '⚡ LVL 3 MAX' : `LVL ${i + 1} (${e.ovr})`}</div>
            <div class="evo-trio-stage">${e.stage}</div>
          </button>`)
        .join('');
      trioEl.querySelectorAll('[data-trio-idx]').forEach((b) => {
        b.addEventListener('click', () => {
          state.inspectEvoIdx = Number(b.dataset.trioIdx);
          setCardLevel(card.id, state.inspectEvoIdx + 1);
          renderInspectorEvo(card);
        });
      });
    }

    // Inherited & When-Evolving Digimon Skill Readout
    const skillsEl = document.getElementById('inspect-evo-skills');
    if (skillsEl) {
      const chips = [];
      if (evo.onEvolve) chips.push(`<div class="inherited-chip" style="border-left-color:#38bdf8;background:rgba(56,189,248,0.14);color:#e0f2fe;"><strong>WHEN EVOLVING (-${evo.evolveCost} MEM):</strong> ${evo.onEvolve.label}</div>`);
      if (evo.inherited) chips.push(`<div class="inherited-chip"><strong>🧬 DIGIVOLUTION SOURCE:</strong> ${evo.inherited}</div>`);
      if (lvl === 3) {
        const lower = card.evolutions.slice(0, 2).filter((e) => e.inherited).map((e) => e.inherited.replace('Inherited: ', '')).join(' + ');
        if (lower) chips.push(`<div class="inherited-chip"><strong>🧬 STACKED L1+L2 INHERITED:</strong> ${lower}</div>`);
      }
      skillsEl.innerHTML = chips.join('');
    }

    const evoBar = document.getElementById('inspect-evo-bar');
    evoBar.innerHTML = card.evolutions
      .map((e, i) => `<button class="chip ${i === state.inspectEvoIdx ? 'active' : ''}" data-evo-idx="${i}" type="button" aria-pressed="${i === state.inspectEvoIdx}">${i === 2 ? '⚡ ' : ''}${'★'.repeat(e.stars)} LVL ${i + 1}: ${e.stage}</button>`)
      .join('');
    evoBar.querySelectorAll('[data-evo-idx]').forEach((b) => {
      b.addEventListener('click', () => {
        state.inspectEvoIdx = Number(b.dataset.evoIdx);
        setCardLevel(card.id, state.inspectEvoIdx + 1);
        renderInspectorEvo(card);
      });
    });
  }

  function openInspectDialog(cardId) {
    const card = state.cards.find((c) => c.id === cardId);
    const dialog = document.getElementById('inspect-dialog');
    if (!card || !dialog) return;
    state.inspectCardId = cardId;
    state.inspectEvoIdx = getCardLevel(card) - 1;
    document.getElementById('inspect-edition').textContent = `${card.edition} • ${card.clan.toUpperCase()} • MASCOT: ${(card.mascot || card.team).toUpperCase()}`;
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

  function renderCompareDialog() {
    const selA = document.getElementById('compare-select-a');
    const selB = document.getElementById('compare-select-b');
    const grid = document.getElementById('compare-grid');
    if (!selA || !selB || !grid) return;

    if (!selA.options.length) {
      const opts = state.cards.map((c) => `<option value="${c.id}">${c.name} #${c.number} (${c.team})</option>`).join('');
      selA.innerHTML = opts;
      selB.innerHTML = opts;
      selA.value = 'david-da-boss';
      selB.value = 'karl-danger';
    }

    const cardA = state.cards.find((c) => c.id === selA.value) || state.cards[0];
    const cardB = state.cards.find((c) => c.id === selB.value) || state.cards[1];
    const lvlA = getCardLevel(cardA);
    const lvlB = getCardLevel(cardB);
    const evoA = getCardEvoAt(cardA, lvlA);
    const evoB = getCardEvoAt(cardB, lvlB);
    const atkA = Math.round(cardA.atk * (evoA.atkMult || 1));
    const atkB = Math.round(cardB.atk * (evoB.atkMult || 1));
    const defA = Math.round(cardA.def * (evoA.atkMult || 1));
    const defB = Math.round(cardB.def * (evoB.atkMult || 1));

    const buildCol = (c, lvl, evo, atk, def, oppOvr, oppPwr, oppDmg, oppAtk, oppDef) => `
      <div class="compare-card-box">
        <div style="font-family:var(--font-display);font-size:0.9rem;font-weight:900;color:#ffe28a;">${c.name} #${c.number}</div>
        <div style="font-size:0.74rem;color:#7dd3fc;">LVL ${lvl} • ${evo.stage}</div>
        <img src="${getEvoImage(c, lvl)}" data-visual-fx="${getEvoVisualFx(c, lvl)}" alt="${c.name}" decoding="async" style="object-position:${c.objectPos || 'center 10%'};" />
        <div class="compare-stat-list">
          <div class="compare-stat-line ${evo.ovr > oppOvr ? 'win' : ''}"><span>OVR Rating</span><strong>${evo.ovr}</strong></div>
          <div class="compare-stat-line ${evo.power > oppPwr ? 'win' : ''}"><span>Duel Power</span><strong>${evo.power}</strong></div>
          <div class="compare-stat-line ${evo.dmg > oppDmg ? 'win' : ''}"><span>Clash Damage</span><strong>${evo.dmg}</strong></div>
          <div class="compare-stat-line ${atk > oppAtk ? 'win' : ''}"><span>Yu-Gi-Oh! ATK</span><strong>${atk}</strong></div>
          <div class="compare-stat-line ${def > oppDef ? 'win' : ''}"><span>Yu-Gi-Oh! DEF</span><strong>${def}</strong></div>
          <div class="compare-stat-line"><span>Keywords</span><strong>${c.keywords.join(', ')}</strong></div>
          <div class="compare-stat-line"><span>Mascot</span><strong>${c.mascot}</strong></div>
        </div>
      </div>`;

    grid.innerHTML =
      buildCol(cardA, lvlA, evoA, atkA, defA, evoB.ovr, evoB.power, evoB.dmg, atkB, defB) +
      buildCol(cardB, lvlB, evoB, atkB, defB, evoA.ovr, evoA.power, evoA.dmg, atkA, defA);
  }

  function renderSquadDrawer() {
    const list = document.getElementById('squad-slots-list');
    const synBox = document.getElementById('squad-synergy-box');
    if (!list || !synBox) return;

    const members = state.squad.map((id) => state.cards.find((c) => c.id === id)).filter(Boolean);
    const totalStars = members.reduce((sum, c) => sum + getCardEvo(c).stars, 0);
    const vikCount = members.filter((c) => c.teamKey === 'vikings').length;
    const packCount = members.filter((c) => c.teamKey === 'packers').length;
    const uniqueTeams = new Set(members.map((c) => c.teamKey)).size;

    let synText = `Squad Power: ${members.length}/4 Cards • ${totalStars}/20 ★ Stars. `;
    if (vikCount >= 3) synText += '⚡ VALHALLA TRIO DYNASTY ACTIVE (+3 Duel Power & +1 Clash Damage)!';
    else if (packCount >= 3) synText += '🧀 TITLETOWN TRIO DYNASTY ACTIVE (+3 Duel Power & +1 Clash Damage)!';
    else if (vikCount >= 2) synText += '⚡ VALHALLA CLAN RESONANCE ACTIVE (+2 Duel Power)!';
    else if (packCount >= 2) synText += '🧀 TITLETOWN TUNDRA RESONANCE ACTIVE (+2 Duel Power)!';
    else if (uniqueTeams >= 3) synText += '⭐ MULTI-TEAM ALLIANCE ACTIVE (+1 Bonus Clash Damage)!';
    else synText += 'Add 2+ Vikings, 2+ Packers, or 3+ Teams to activate Clan Synergy!';
    synBox.textContent = synText;

    if (!members.length) {
      list.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">No cards in your squad yet. Click <strong>+ Squad</strong> under any card in the vault!</p>`;
      return;
    }

    list.innerHTML = members
      .map((c) => {
        const lvl = getCardLevel(c);
        const evo = getCardEvo(c);
        return `
        <div class="squad-slot">
          <img src="${getEvoImage(c, lvl)}" alt="${c.name}" decoding="async" style="object-position:${c.objectPos || 'center 10%'};" />
          <div style="flex:1;">
            <div style="font-family:var(--font-display);font-size:0.78rem;color:var(--bad-gold-hot);font-weight:800;">${c.name} #${c.number} • LVL ${lvl}</div>
            <div style="font-size:0.74rem;color:var(--text-muted);">${evo.stage} • PWR ${evo.power} / DMG ${evo.dmg} • ${'★'.repeat(evo.stars)}</div>
          </div>
          <button class="btn btn-ghost btn-sm" data-remove-squad="${c.id}" type="button" aria-label="Remove ${c.name} from My Squad">✕</button>
        </div>`;
      })
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
      unlockTrophy('pack-ripper');
      packSealed.hidden = true;
      packRevealed.hidden = false;
      revealGrid.innerHTML = state.cards
        .map((c) => {
          const evo = getCardEvoAt(c, 3);
          return `
          <button class="pack-reveal-card" data-pack-inspect="${c.id}" type="button" aria-label="Inspect ${c.name} #${c.number}">
            <img src="${getEvoImage(c, 3)}" data-visual-fx="${getEvoVisualFx(c, 3)}" alt="${c.name} Level 3 MAX" decoding="async" style="object-position:${c.objectPos || 'center 10%'};" />
            <div class="pack-reveal-meta">
              <div style="font-size:0.56rem;color:#7dd3fc;font-family:var(--font-display);">${evo.mascotBadge || 'LVL 3 MAX'} • ${evo.ovr} OVR</div>
              <div style="font-size:0.8rem;color:#ffe28a;font-weight:900;font-family:var(--font-display);margin-top:2px;">${c.name} #${c.number}</div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding:0 4px;">
                <span class="bad-set-code" style="font-size:0.44rem;">${c.setCode}</span>
                <span class="bad-holo-seal" style="height:15px;font-size:0.4rem;">B.A.D</span>
              </div>
            </div>
          </button>`;
        })
        .join('');
      revealGrid.querySelectorAll('[data-pack-inspect]').forEach((btn) => {
        btn.addEventListener('click', () => {
          packDialog?.close();
          openInspectDialog(btn.dataset.packInspect);
        });
      });
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
      buildDuelHand();
      renderDuelArena();
      showToast('Cleared My Squad');
    });
    document.getElementById('squad-launch-duel')?.addEventListener('click', () => {
      if (state.squad.length) state.heroId = state.squad[0];
      resetDuelMatch();
      squadDialog?.close();
      document.getElementById('battle')?.scrollIntoView({ behavior: 'smooth' });
    });

    const trophyDialog = document.getElementById('trophy-dialog');
    document.getElementById('open-trophy-btn')?.addEventListener('click', () => {
      renderTrophyDialog();
      trophyDialog?.showModal();
    });

    const compareDialog = document.getElementById('compare-dialog');
    const openCompare = () => {
      renderCompareDialog();
      compareDialog?.showModal();
    };
    document.getElementById('open-compare-btn')?.addEventListener('click', openCompare);
    document.getElementById('open-compare-hero-btn')?.addEventListener('click', openCompare);
    document.getElementById('compare-select-a')?.addEventListener('change', renderCompareDialog);
    document.getElementById('compare-select-b')?.addEventListener('change', renderCompareDialog);

    for (const dlg of document.querySelectorAll('dialog')) {
      dlg.addEventListener('close', () => { dlg.returnValue = ''; });
    }
    document.getElementById('inspect-duel-btn')?.addEventListener('click', () => {
      if (state.inspectCardId) {
        if (!state.squad.includes(state.inspectCardId)) {
          state.squad = [state.inspectCardId, ...state.squad].slice(0, 4);
          saveSquad();
        }
        state.heroId = state.inspectCardId;
        resetDuelMatch();
        document.getElementById('inspect-dialog')?.close();
        document.getElementById('battle')?.scrollIntoView({ behavior: 'smooth' });
        showToast(`⚔️ ${getHeroCard().shortName} locked into your 4-Card Duel Hand!`);
      }
    });
    document.getElementById('inspect-dl-front')?.addEventListener('click', () => exportCardFrontPNG(state.inspectCardId));
    document.getElementById('inspect-dl-back')?.addEventListener('click', () => exportCardBackPNG(state.inspectCardId));
  }

  /* ---------- SQUAD SYNERGY + MTG KEYWORDS ENGINE ---------- */
  function getSquadSynergy() {
    const members = state.hand.map((id) => state.cards.find((c) => c.id === id)).filter(Boolean);
    const vikCount = members.filter((c) => c.teamKey === 'vikings').length;
    const packCount = members.filter((c) => c.teamKey === 'packers').length;
    const uniqueTeams = new Set(members.map((c) => c.teamKey)).size;
    const hasCommander = members.some((c) => c.keywords.includes('Commander'));
    let bonusPwr = hasCommander ? 1 : 0;
    let bonusDmg = 0;
    let label = hasCommander ? '👑 COMMANDER +1 PWR' : '★ SYNERGY: NONE';

    if (vikCount >= 3) {
      bonusPwr += 3;
      bonusDmg += 1;
      label = `⚡ VALHALLA TRIO +${bonusPwr} PWR / +1 DMG`;
    } else if (packCount >= 3) {
      bonusPwr += 3;
      bonusDmg += 1;
      label = `🧀 TITLETOWN TRIO +${bonusPwr} PWR / +1 DMG`;
    } else if (vikCount >= 2) {
      bonusPwr += 2;
      label = `⚡ VALHALLA +${bonusPwr} PWR`;
    } else if (packCount >= 2) {
      bonusPwr += 2;
      label = `🧀 TITLETOWN +${bonusPwr} PWR`;
    } else if (uniqueTeams >= 3) {
      bonusDmg += 1;
      label = bonusPwr ? `⭐ ALLIANCE +${bonusPwr} PWR / +1 DMG` : '⭐ ALLIANCE +1 DMG';
    }
    return { bonusPwr, bonusDmg, label };
  }

  function getActiveKeywordBonuses(card, duelLvl) {
    const kw = card.keywords || [];
    let bonusAtk = 0;
    let bonusDmg = 0;
    let dmgReduce = 0;
    let drainOnWin = 0;
    let extraShieldBreak = 0;
    const notes = [];

    if ((kw.includes('Haste') || kw.includes('Blitz')) && state.round === 1) {
      bonusAtk += 4;
      notes.push('Haste/Blitz (+4 ATK R1)');
    }
    if ((kw.includes('Gunslinger') || kw.includes('Launch')) && state.stake >= 2) {
      bonusAtk += 6;
      notes.push('Gunslinger/Launch (+6 ATK)');
    }
    if (kw.includes('Ward')) {
      dmgReduce += 1;
      notes.push('Ward (-1 Incoming DMG)');
    }
    if (kw.includes('Double Strike')) {
      extraShieldBreak += 1;
      notes.push('Double Strike (+1 Shield Break on 15+ win)');
    }
    if (kw.includes('Menace') || kw.includes('Intimidate')) {
      drainOnWin += 1;
      notes.push('Intimidate (-1 Opp NRG on win)');
    }

    // Inherited Digimon passives stacked when evolved above L1
    if (duelLvl >= 2) {
      if (card.id === 'karl-danger') notes.push('Inherited L1 (+1 Blitz PWR)');
      if (card.id === 'jared-jroc') { bonusAtk += 4; notes.push('Inherited L1 (+4 Haste ATK)'); }
      if (card.id === 'tyler-davis') { dmgReduce += 1; notes.push('Inherited L1 (Ward -1 DMG)'); }
      if (card.id === 'jerry-mack') { bonusAtk += 5; notes.push('Inherited L1 (+5 Gunslinger ATK)'); }
      if (card.id === 'tavaris-too-too') { bonusDmg += 1; notes.push('Inherited L1 (+1 Clash DMG)'); }
      if (card.id === 'david-da-boss') { bonusAtk += 3; notes.push('Inherited L1 (Boss Pressure)'); }
      if (card.id === 'justin-porky') { bonusAtk += 4; notes.push('Inherited L1 (+4 Lambeau Haste)'); }
    }
    if (duelLvl >= 3) {
      if (card.id === 'jared-jroc' || card.id === 'jerry-mack' || card.id === 'justin-porky') { bonusDmg += 1; notes.push('Inherited L2 (+1 DMG)'); }
      if (card.id === 'karl-danger') { drainOnWin += 1; notes.push('Inherited L2 (-1 Opp NRG)'); }
      if (card.id === 'shawn-elon') { bonusAtk += 6; notes.push('Inherited L2 (+6 Hyperloop ATK)'); }
      if (card.id === 'tavaris-too-too') { extraShieldBreak += 1; notes.push('Inherited L2 (Double Strike)'); }
    }
    return { bonusAtk, bonusDmg, dmgReduce, drainOnWin, extraShieldBreak, notes };
  }

  /* ---------- TACTICAL 4-ROUND DIGIMON × URBAN RIVALS DUEL ENGINE ---------- */
  function buildDuelHand() {
    const hand = [...state.squad];
    for (const c of state.cards) {
      if (hand.length >= 4) break;
      if (!hand.includes(c.id)) hand.push(c.id);
    }
    state.hand = hand.slice(0, 4);
    if (!state.hand.includes(state.heroId) || state.usedCards.has(state.heroId)) {
      const next = state.hand.find((id) => !state.usedCards.has(id)) || state.hand[0];
      state.heroId = next;
    }
    state.cards.forEach((c) => {
      if (!state.duelLevels[c.id]) {
        state.duelLevels[c.id] = state.duelFormat === 'ascension' ? 1 : getCardLevel(c);
      }
    });
  }

  function getDuelLevel(cardId) {
    if (state.duelFormat === 'max') {
      const c = state.cards.find((x) => x.id === cardId);
      return c ? getCardLevel(c) : 3;
    }
    return state.duelLevels[cardId] || 1;
  }

  function getHeroCard() {
    return state.cards.find((c) => c.id === state.heroId) || state.cards[0];
  }

  function getOpponent() {
    if (state.oppMode === 'crew') {
      const opp = state.cards.find((c) => c.id === state.oppId && c.id !== state.heroId)
        || state.cards.find((c) => c.id !== state.heroId);
      state.oppId = opp.id;
      const oppLvl = state.duelFormat === 'ascension' ? Math.min(3, Math.max(1, state.round)) : getCardLevel(opp);
      const oppEvo = getCardEvoAt(opp, oppLvl);
      return {
        type: 'crew',
        id: opp.id,
        name: `${opp.name} #${opp.number}`,
        image: getEvoImage(opp, oppLvl),
        visualFx: getEvoVisualFx(opp, oppLvl),
        objectPos: opp.objectPos,
        lvl: oppLvl,
        pwr: oppEvo.power,
        dmg: oppEvo.dmg,
        maxHp: 14,
        mascotBadge: oppEvo.mascotBadge,
        evo: oppEvo
      };
    }
    const r = DATA.rivals.find((rv) => rv.id === state.oppId) || DATA.rivals[0];
    state.oppId = r.id;
    return {
      type: 'rival',
      id: r.id,
      name: r.name,
      badge: r.badge,
      ovr: r.ovr,
      lvl: 2,
      pwr: r.duelPower,
      dmg: r.duelDamage,
      maxHp: r.hp,
      mascotBadge: `${r.badge} NFL RIVAL • ${r.ovr} OVR`
    };
  }

  function appendDuelLog(line) {
    const log = document.getElementById('battle-log');
    if (!log) return;
    const div = document.createElement('div');
    div.textContent = line;
    log.prepend(div);
  }

  function resetDuelMatch() {
    state.usedCards.clear();
    state.duelLevels = {};
    state.cards.forEach((c) => {
      state.duelLevels[c.id] = state.duelFormat === 'ascension' ? 1 : getCardLevel(c);
    });
    buildDuelHand();
    const opp = getOpponent();
    state.round = 1;
    state.heroHp = 14;
    state.heroMaxHp = 14;
    state.oppHp = opp.maxHp;
    state.oppMaxHp = opp.maxHp;
    state.heroShields = 4;
    state.oppShields = 4;
    state.memory = 2;
    state.heroEnergy = 12;
    state.oppEnergy = 12;
    state.stake = Math.min(2, state.heroEnergy);
    state.furyActive = false;
    state.duelBonusAtk = 0;
    state.evolvedThisRound = false;
    state.revengeActive = false;
    state.armedInstantId = null;
    state.instantUsed = false;
    state.duelOver = false;
    document.getElementById('hero-fighter-box')?.classList.remove('round-win', 'round-loss');
    document.getElementById('opp-fighter-box')?.classList.remove('round-win', 'round-loss');
    const banner = document.getElementById('round-result-banner');
    if (banner) { banner.textContent = 'STAKE ENERGY & CLASH'; banner.className = 'round-banner'; }
    const insDesc = document.getElementById('instant-desc');
    if (insDesc) insDesc.textContent = 'Optional: Set 1 Face-Down Trap or Instant spell before playing the round.';
    renderDuelArena();
  }

  function shiftMemory(delta) {
    state.memory = Math.max(-5, Math.min(5, state.memory + delta));
  }

  function renderMemoryGauge() {
    const track = document.getElementById('memory-track');
    const lbl = document.getElementById('memory-readout-label');
    if (!track || !lbl) return;
    const values = [5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5];
    track.innerHTML = values
      .map((v) => {
        const side = v > 0 ? 'side-hero' : (v < 0 ? 'side-opp' : 'side-zero');
        const active = v === state.memory ? 'active' : '';
        return `<div class="mem-node ${side} ${active}">${Math.abs(v)}</div>`;
      })
      .join('');
    if (state.memory > 0) lbl.textContent = `SHARED MEMORY: +${state.memory} YOU (NEXT ROUND +${state.memory >= 3 ? 2 : 1} NRG)`;
    else if (state.memory < 0) lbl.textContent = `SHARED MEMORY: +${Math.abs(state.memory)} OPP (OPP COUNTER +${Math.abs(state.memory) >= 3 ? 2 : 1} NRG)`;
    else lbl.textContent = 'SHARED MEMORY: 0 (NEUTRAL)';
    track.setAttribute('aria-label', lbl.textContent);
  }

  function renderSecurityStacks() {
    const heroSec = document.getElementById('hero-security-stack');
    const oppSec = document.getElementById('opp-security-stack');
    if (heroSec) {
      heroSec.innerHTML = Array.from({ length: 4 }, (_, i) => {
        const intact = i < state.heroShields;
        return `<div class="sec-shield ${intact ? '' : 'broken'}">${intact ? '🛡️ B.A.D' : '💥'}</div>`;
      }).join('');
    }
    if (oppSec) {
      oppSec.innerHTML = Array.from({ length: 4 }, (_, i) => {
        const intact = i < state.oppShields;
        return `<div class="sec-shield opp ${intact ? '' : 'broken'}">${intact ? '🛡️ SEC' : '💥'}</div>`;
      }).join('');
    }
    const hc = document.getElementById('hero-sec-count');
    const oc = document.getElementById('opp-sec-count');
    if (hc) hc.textContent = `${state.heroShields} / 4`;
    if (oc) oc.textContent = `${state.oppShields} / 4`;
  }

  function triggerSecurityCheck(defender) {
    const triggers = DATA.securityTriggers || [];
    if (!triggers.length) return;
    const pick = triggers[Math.floor(Math.random() * triggers.length)];
    AUDIO.playShieldBreak();
    if (defender === 'opp') {
      if (pick.type === 'drain_attacker') {
        state.heroEnergy = Math.max(0, state.heroEnergy - pick.val);
        appendDuelLog(`🛡️ OPP SECURITY CHECK: ${pick.icon} ${pick.name} — You lost ${pick.val} NRG!`);
      } else if (pick.type === 'boost_defender') {
        state.oppEnergy = Math.min(12, state.oppEnergy + pick.val);
        shiftMemory(-pick.val);
        appendDuelLog(`🛡️ OPP SECURITY CHECK: ${pick.icon} ${pick.name} — Opp gained +${pick.val} NRG & +${pick.val} Memory!`);
      } else if (pick.type === 'counter_dmg') {
        state.heroHp = Math.max(1, state.heroHp - pick.val);
        appendDuelLog(`🛡️ OPP SECURITY CHECK: ${pick.icon} ${pick.name} — Opp dealt ${pick.val} retaliation damage!`);
      } else if (pick.type === 'heal_defender') {
        state.oppHp = Math.min(state.oppMaxHp, state.oppHp + pick.val);
        appendDuelLog(`🛡️ OPP SECURITY CHECK: ${pick.icon} ${pick.name} — Opp recovered +${pick.val} Life!`);
      } else {
        appendDuelLog(`🛡️ OPP SECURITY CHECK: ${pick.icon} ${pick.desc}`);
      }
    } else {
      if (pick.type === 'drain_attacker') {
        state.oppEnergy = Math.max(0, state.oppEnergy - pick.val);
        appendDuelLog(`🛡️ YOUR SECURITY CHECK: ${pick.icon} ${pick.name} — Opp lost ${pick.val} NRG!`);
      } else if (pick.type === 'boost_defender') {
        state.heroEnergy = Math.min(12, state.heroEnergy + pick.val);
        shiftMemory(pick.val);
        appendDuelLog(`🛡️ YOUR SECURITY CHECK: ${pick.icon} ${pick.name} — You gained +${pick.val} NRG & +${pick.val} Memory!`);
      } else if (pick.type === 'counter_dmg') {
        state.oppHp = Math.max(1, state.oppHp - pick.val);
        appendDuelLog(`🛡️ YOUR SECURITY CHECK: ${pick.icon} ${pick.name} — You dealt ${pick.val} retaliation damage!`);
      } else if (pick.type === 'heal_defender') {
        state.heroHp = Math.min(state.heroMaxHp, state.heroHp + pick.val);
        appendDuelLog(`🛡️ YOUR SECURITY CHECK: ${pick.icon} ${pick.name} — You recovered +${pick.val} Life!`);
      } else {
        appendDuelLog(`🛡️ YOUR SECURITY CHECK: ${pick.icon} ${pick.desc}`);
      }
    }
  }

  function digivolveActiveHero() {
    if (state.duelOver || state.duelFormat !== 'ascension') return;
    const hero = getHeroCard();
    const curLvl = getDuelLevel(hero.id);
    if (curLvl >= 3) return;
    const nextLvl = curLvl + 1;
    const nextEvo = getCardEvoAt(hero, nextLvl);
    const memCost = nextEvo.evolveCost || 2;

    state.duelLevels[hero.id] = nextLvl;
    state.evolvedThisRound = true;
    shiftMemory(-memCost);
    AUDIO.playEvolve(nextLvl);
    if (nextLvl === 3) launchFireworks(4);

    // Apply Digimon "When Evolving" burst effect!
    const eff = nextEvo.onEvolve;
    let effNote = '';
    if (eff) {
      effNote = ` — ${eff.label}`;
      if (eff.effect === 'drain') state.oppEnergy = Math.max(0, state.oppEnergy - eff.val);
      else if (eff.effect === 'burst_drain') {
        state.duelBonusAtk += eff.atk || 0;
        state.oppEnergy = Math.max(0, state.oppEnergy - (eff.val || 1));
      } else if (eff.effect === 'atk') state.duelBonusAtk += eff.atk || 0;
      else if (eff.effect === 'energy') state.heroEnergy = Math.min(12, state.heroEnergy + (eff.val || 2));
      else if (eff.effect === 'founder_decree') {
        state.heroEnergy = Math.min(12, state.heroEnergy + (eff.val || 2));
        state.heroHp = Math.min(state.heroMaxHp, state.heroHp + (eff.heal || 2));
      } else if (eff.effect === 'heal') state.heroHp = Math.min(state.heroMaxHp, state.heroHp + (eff.val || 2));
      else if (eff.effect === 'grizzly') {
        state.heroHp = Math.min(state.heroMaxHp, state.heroHp + (eff.heal || 3));
        state.duelBonusAtk += eff.atk || 8;
      } else if (eff.effect === 'atk_energy') {
        state.duelBonusAtk += eff.atk || 8;
        state.heroEnergy = Math.min(12, state.heroEnergy + (eff.val || 1));
      } else if (eff.effect === 'pierce_shield' || eff.effect === 'pierce_atk') {
        state.duelBonusAtk += eff.atk || 0;
        if (state.oppShields > 0) {
          state.oppShields = Math.max(0, state.oppShields - 1);
          triggerSecurityCheck('opp');
          unlockTrophy('shield-breaker');
        }
      }
    }

    // Inherited L1 Energy refund for Isaiah
    if (hero.id === 'isaiah-little-bill' && nextLvl >= 2) {
      state.heroEnergy = Math.min(12, state.heroEnergy + 1);
    }

    appendDuelLog(`🧬 LIVE DIGIVOLUTION! ${hero.shortName} ascended to LVL ${nextLvl} [${nextEvo.stage}] (-${memCost} Memory)${effNote}`);
    showToast(`🧬 ${hero.shortName} ASCENDED TO LVL ${nextLvl}: ${nextEvo.stage.toUpperCase()}!`);
    unlockTrophy('mid-match-evo');
    awardXp(25);
    renderDuelArena();
  }

  function renderEnergyControls() {
    const hero = getHeroCard();
    const heroLvl = getDuelLevel(hero.id);
    const heroEvo = getCardEvoAt(hero, heroLvl);
    const syn = getSquadSynergy();
    const kw = getActiveKeywordBonuses(hero, heroLvl);
    const revengePwr = state.revengeActive ? 2 : 0;
    const effPwr = heroEvo.power + syn.bonusPwr + revengePwr;

    const furyCost = state.furyActive ? 3 : 0;
    const maxStakeAllowed = Math.max(0, state.heroEnergy - furyCost);
    if (state.stake > maxStakeAllowed) state.stake = maxStakeAllowed;

    const slider = document.getElementById('stake-slider');
    slider.max = String(maxStakeAllowed);
    slider.value = String(state.stake);

    const instant = DATA.instants.find((ins) => ins.id === state.armedInstantId);
    const bonusAtk = (instant ? instant.bonusAtk : 0) + state.duelBonusAtk + kw.bonusAtk;
    const projected = effPwr * (1 + state.stake) + bonusAtk;
    const projDmg = heroEvo.dmg + syn.bonusDmg + kw.bonusDmg + (state.furyActive ? 2 : 0);

    document.getElementById('hero-pwr-val').textContent = String(effPwr);
    document.getElementById('hero-dmg-val').textContent = String(projDmg);
    document.getElementById('stake-val-label').textContent = `${state.stake}${state.furyActive ? ' + 3 FURY' : ''}`;
    document.getElementById('stake-formula-hint').textContent = `${effPwr} PWR × ${1 + state.stake}${bonusAtk ? ` + ${bonusAtk}` : ''} = ${projected} ATK`;
    document.getElementById('hero-atk-readout').textContent = String(projected);
    document.getElementById('hero-atk-sub').textContent = `Projected: ${effPwr} × (1 + ${state.stake} NRG)${bonusAtk ? ` + ${bonusAtk}` : ''}`;

    const kwHint = document.getElementById('keyword-active-hint');
    if (kwHint) kwHint.textContent = kw.notes.length ? `✨ Active: ${kw.notes.join(' • ')}` : '';

    // Fury toggle button
    const furyBtn = document.getElementById('fury-toggle-btn');
    if (furyBtn) {
      const canFury = state.heroEnergy >= 3 && !state.duelOver;
      if (!canFury) state.furyActive = false;
      furyBtn.disabled = !canFury;
      furyBtn.classList.toggle('active', state.furyActive);
      furyBtn.setAttribute('aria-pressed', String(state.furyActive));
      furyBtn.textContent = state.furyActive ? '🔥 FURY: ARMED! (-3 NRG → +2 DMG)' : '🔥 FURY: OFF (+3 NRG → +2 DMG)';
    }

    // Trap Zone Indicator
    const trapBadge = document.getElementById('trap-zone-badge');
    if (trapBadge) {
      if (instant) {
        trapBadge.classList.add('armed');
        trapBadge.textContent = `🪤 FACE-DOWN SET: ${instant.type}`;
      } else if (state.instantUsed) {
        trapBadge.classList.remove('armed');
        trapBadge.textContent = '🪤 TRAP ZONE: SPENT';
      } else {
        trapBadge.classList.remove('armed');
        trapBadge.textContent = '🪤 TRAP ZONE: EMPTY';
      }
    }

    const pipsWrap = document.getElementById('energy-pips');
    pipsWrap.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
      const pip = document.createElement('button');
      pip.type = 'button';
      const available = i <= maxStakeAllowed;
      const isSelected = available && i <= state.stake;
      pip.className = `energy-pip ${!available ? 'spent' : (isSelected ? 'active' : '')}`;
      pip.disabled = !available || state.duelOver;
      pip.setAttribute('aria-pressed', String(isSelected));
      pip.setAttribute('aria-label', `Stake ${i} Hype Energy`);
      pip.title = `Stake ${i} NRG`;
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
      .map((ins) => `<button class="chip ${state.armedInstantId === ins.id ? 'active' : ''}" data-ins-id="${ins.id}" type="button" aria-pressed="${state.armedInstantId === ins.id}" ${state.instantUsed ? 'disabled style="opacity:0.45;"' : ''}>${ins.name}</button>`)
      .join('');
    insWrap.querySelectorAll('[data-ins-id]').forEach((b) => {
      b.addEventListener('click', () => {
        if (state.instantUsed || state.duelOver) return;
        const id = b.dataset.insId;
        state.armedInstantId = state.armedInstantId === id ? null : id;
        const cur = DATA.instants.find((x) => x.id === state.armedInstantId);
        document.getElementById('instant-desc').textContent = cur ? `${cur.type}: ${cur.desc}` : 'Optional: Set 1 Face-Down Trap or Instant spell before playing the round.';
        renderEnergyControls();
        AUDIO.playCardFlip();
      });
    });
  }

  function renderDuelArena() {
    buildDuelHand();
    const hero = getHeroCard();
    const heroLvl = getDuelLevel(hero.id);
    const heroEvo = getCardEvoAt(hero, heroLvl);
    const opp = getOpponent();

    document.getElementById('duel-round-label').textContent = state.duelOver ? 'MATCH COMPLETE' : `ROUND ${state.round} / ${state.maxRounds}`;
    document.querySelectorAll('#round-dashes .round-dash').forEach((d, i) => {
      d.classList.toggle('done', i + 1 < state.round || state.duelOver);
      d.classList.toggle('active', !state.duelOver && i + 1 === state.round);
    });

    document.getElementById('hero-energy-val').textContent = String(state.heroEnergy);
    document.getElementById('opp-energy-val').textContent = String(state.oppEnergy);
    document.getElementById('battle-wins-badge').textContent = `WINS: ${state.profile.wins}`;

    renderMemoryGauge();
    renderSecurityStacks();

    // 4-Card Urban Rivals Hand Grid
    const handGrid = document.getElementById('duel-hand-grid');
    if (handGrid) {
      handGrid.innerHTML = state.hand
        .map((id) => {
          const c = state.cards.find((x) => x.id === id);
          if (!c) return '';
          const lvl = getDuelLevel(id);
          const evo = getCardEvoAt(c, lvl);
          const spent = state.usedCards.has(id);
          const selected = id === state.heroId && !spent;
          return `
            <button class="hand-card-btn ${selected ? 'selected' : ''} ${spent ? 'spent' : ''}" data-hand-id="${id}" type="button" ${spent || state.duelOver ? 'disabled' : ''} aria-pressed="${selected}">
              <img src="${getEvoImage(c, lvl)}" alt="${c.shortName}" decoding="async" style="object-position:${c.objectPos || 'center 10%'};" />
              <div class="hand-card-meta">
                <div class="hand-card-name">${c.shortName}</div>
                <div class="hand-card-stats">${spent ? '✓ PLAYED' : `L${lvl} • PWR ${evo.power} • DMG ${evo.dmg}`}</div>
              </div>
            </button>`;
        })
        .join('');
      handGrid.querySelectorAll('[data-hand-id]').forEach((b) => {
        b.addEventListener('click', () => {
          const id = b.dataset.handId;
          if (state.usedCards.has(id) || state.duelOver) return;
          state.heroId = id;
          state.duelBonusAtk = 0;
          state.evolvedThisRound = false;
          AUDIO.playCardFlip();
          renderDuelArena();
        });
      });
    }

    const revTag = document.getElementById('hand-revenge-tag');
    if (revTag) {
      revTag.textContent = state.revengeActive
        ? '🔥 URBAN RIVALS REVENGE ACTIVE (+2 PWR THIS ROUND!)'
        : `${4 - state.usedCards.size} unused card(s) left in hand • Clan bonuses active`;
      revTag.style.color = state.revengeActive ? '#f5b942' : '#94a3b8';
    }

    // Opponent picker
    const oPicker = document.getElementById('opponent-picker');
    if (state.oppMode === 'crew') {
      oPicker.innerHTML = state.cards
        .filter((c) => c.id !== state.heroId)
        .map((c) => `<button class="chip ${c.id === state.oppId ? 'active' : ''}" data-pick-opp="${c.id}" type="button" aria-pressed="${c.id === state.oppId}">${c.shortName}</button>`)
        .join('');
    } else {
      oPicker.innerHTML = DATA.rivals
        .map((r) => `<button class="chip ${r.id === state.oppId ? 'active' : ''}" data-pick-opp="${r.id}" type="button" aria-pressed="${r.id === state.oppId}">${r.badge} ${r.name.split(' ')[0]}</button>`)
        .join('');
    }
    oPicker.querySelectorAll('[data-pick-opp]').forEach((b) => {
      b.addEventListener('click', () => { state.oppId = b.dataset.pickOpp; resetDuelMatch(); });
    });

    const syn = getSquadSynergy();
    const synPill = document.getElementById('duel-synergy-pill');
    if (synPill) synPill.textContent = syn.label;

    const heroImg = document.getElementById('battle-hero-img');
    heroImg.src = getEvoImage(hero, heroLvl);
    heroImg.dataset.visualFx = getEvoVisualFx(hero, heroLvl);
    heroImg.style.objectPosition = hero.objectPos || 'center 10%';
    document.getElementById('battle-hero-name').textContent = `${hero.name} #${hero.number}`;
    document.getElementById('battle-hero-mascot').textContent = heroEvo.mascotBadge || `LVL ${heroLvl} • ${heroEvo.stage}`;

    // Mid-Match Digivolution Button Bar
    const evoBar = document.getElementById('battle-evo-bar');
    if (evoBar) {
      if (state.duelFormat === 'ascension' && !state.duelOver && heroLvl < 3) {
        const nextLvl = heroLvl + 1;
        const nextEvo = getCardEvoAt(hero, nextLvl);
        evoBar.innerHTML = `<button id="live-digivolve-btn" class="battle-evo-btn" type="button">${nextLvl === 3 ? '👑 ASCEND TO LVL 3 MAX' : '⚡ DIGIVOLVE TO LVL 2'} (-${nextEvo.evolveCost} MEM)</button>`;
        document.getElementById('live-digivolve-btn')?.addEventListener('click', digivolveActiveHero);
      } else if (heroLvl === 3) {
        evoBar.innerHTML = `<span style="font-family:var(--font-display);font-size:0.58rem;color:#ffe28a;">👑 APEX MASCOT FORM ACTIVE</span>`;
      } else {
        evoBar.innerHTML = '';
      }
    }

    // Stacked Inherited Skills (Digimon!)
    const inhStack = document.getElementById('hero-inherited-stack');
    if (inhStack) {
      const stacked = [];
      for (let l = 1; l < heroLvl; l++) {
        const prev = getCardEvoAt(hero, l);
        if (prev.inherited) stacked.push(`<div class="inherited-chip">🧬 L${l} ${prev.inherited}</div>`);
      }
      if (state.duelBonusAtk > 0) {
        stacked.push(`<div class="inherited-chip" style="border-left-color:#38bdf8;color:#bae6fd;">⚡ When-Evolving Surge: +${state.duelBonusAtk} ATK</div>`);
      }
      inhStack.innerHTML = stacked.join('');
    }

    // Opponent Fighter Visuals
    const oppVis = document.getElementById('battle-opp-visual');
    oppVis.innerHTML = opp.type === 'crew'
      ? `<img class="fighter-avatar" src="${opp.image}" data-visual-fx="${opp.visualFx || 'base'}" alt="${opp.name}" decoding="async" style="object-position:${opp.objectPos || 'center 10%'};border-color:#ef4444;" />`
      : `<div class="rival-emblem">${opp.badge}</div>`;
    document.getElementById('battle-opp-name').textContent = opp.name;
    document.getElementById('battle-opp-mascot').textContent = opp.mascotBadge || '';
    document.getElementById('opp-pwr-val').textContent = String(opp.pwr);
    document.getElementById('opp-dmg-val').textContent = String(opp.dmg);

    const oppInh = document.getElementById('opp-inherited-stack');
    if (oppInh) {
      oppInh.innerHTML = opp.type === 'crew' && opp.lvl >= 2
        ? `<div class="inherited-chip" style="border-left-color:#ef4444;background:rgba(239,68,68,0.12);color:#fecaca;">🧬 Opponent Ascended to LVL ${opp.lvl}</div>`
        : '';
    }

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
    const heroLvl = getDuelLevel(hero.id);
    const heroEvo = getCardEvoAt(hero, heroLvl);
    const opp = getOpponent();
    const syn = getSquadSynergy();
    const kw = getActiveKeywordBonuses(hero, heroLvl);

    const roundsLeft = state.maxRounds - state.round + 1;
    const maxOppStake = Math.min(state.oppEnergy, roundsLeft === 1 ? state.oppEnergy : Math.min(6, state.oppEnergy));
    const oppStake = roundsLeft === 1
      ? state.oppEnergy
      : Math.min(maxOppStake, Math.max(0, Math.floor(Math.random() * Math.min(6, state.oppEnergy + 1))));

    const usedInstant = (!state.instantUsed && state.armedInstantId)
      ? DATA.instants.find((x) => x.id === state.armedInstantId)
      : null;

    const furyCost = state.furyActive ? 3 : 0;
    const totalSpent = state.stake + furyCost + (usedInstant ? usedInstant.drainEnergy : 0);
    state.heroEnergy = Math.max(0, Math.min(12, state.heroEnergy - totalSpent));
    // Shawn Inherited L1 refund when staking 2+
    if (hero.id === 'shawn-elon' && state.stake >= 2 && heroLvl >= 2) {
      state.heroEnergy = Math.min(12, state.heroEnergy + 1);
    }
    state.oppEnergy = Math.max(0, state.oppEnergy - oppStake);

    const revengePwr = state.revengeActive ? 2 : 0;
    const effPwr = heroEvo.power + syn.bonusPwr + revengePwr;
    const heroAtk = effPwr * (1 + state.stake) + (usedInstant ? usedInstant.bonusAtk : 0) + state.duelBonusAtk + kw.bonusAtk;
    const oppAtk = opp.pwr * (1 + oppStake);

    if (usedInstant) {
      state.instantUsed = true;
      state.armedInstantId = null;
      unlockTrophy('trap-master');
    }

    const heroBox = document.getElementById('hero-fighter-box');
    const oppBox = document.getElementById('opp-fighter-box');
    const banner = document.getElementById('round-result-banner');

    document.getElementById('hero-atk-readout').textContent = String(heroAtk);
    document.getElementById('opp-atk-readout').textContent = String(oppAtk);
    document.getElementById('opp-atk-sub').textContent = `Staked ${oppStake} NRG (${opp.pwr} × ${1 + oppStake})`;

    if (heroAtk >= oppAtk) {
      const dealt = heroEvo.dmg + syn.bonusDmg + kw.bonusDmg + (state.furyActive ? 2 : 0);
      state.oppHp = Math.max(0, state.oppHp - dealt);
      state.revengeActive = false;
      if (kw.drainOnWin > 0) state.oppEnergy = Math.max(0, state.oppEnergy - kw.drainOnWin);
      shiftMemory(1);

      // Shatter Digimon Security Shields!
      let shieldsBroken = 1;
      if ((heroAtk - oppAtk >= 15 && kw.extraShieldBreak > 0) || state.furyActive) {
        shieldsBroken = Math.min(2, state.oppShields);
      }
      for (let s = 0; s < shieldsBroken; s++) {
        if (state.oppShields > 0) {
          state.oppShields -= 1;
          unlockTrophy('shield-breaker');
          triggerSecurityCheck('opp');
        }
      }

      if (state.furyActive) unlockTrophy('fury-clash');

      heroBox.classList.add('round-win'); heroBox.classList.remove('round-loss');
      oppBox.classList.add('round-loss'); oppBox.classList.remove('round-win');
      document.getElementById('hero-atk-readout').classList.add('gold');
      document.getElementById('opp-atk-readout').classList.remove('gold');
      const isTie = heroAtk === oppAtk;
      banner.textContent = `${isTie ? 'TIEBREAKER WON!' : 'ROUND WON!'} ${heroAtk} ${isTie ? '=' : '>'} ${oppAtk} (-${dealt} LIFE • -${shieldsBroken} SHIELD)`;
      banner.className = 'round-banner win';
      AUDIO.playImpact(true);
      appendDuelLog(`⚡ R${state.round}: ${hero.shortName} [L${heroLvl} ${heroEvo.stage}] (${heroAtk} ATK${state.furyActive ? ' + 🔥FURY' : ''}${usedInstant ? ` + ${usedInstant.name}` : ''}) crushed ${opp.name} (${oppAtk} ATK) for -${dealt} Life & shattered ${shieldsBroken} Shield(s)!`);
    } else {
      const blocked = (usedInstant ? usedInstant.blockDmg : 0) + kw.dmgReduce;
      const taken = Math.max(1, opp.dmg - blocked);
      state.heroHp = Math.max(0, state.heroHp - taken);
      state.revengeActive = true;
      shiftMemory(1); // Revenge momentum bounce

      // Yu-Gi-Oh! Mirror Sack Trap Reflection
      if (usedInstant && usedInstant.reflectDmg) {
        state.oppHp = Math.max(0, state.oppHp - usedInstant.reflectDmg);
        shiftMemory(2);
        appendDuelLog(`🪞 TRAP ACTIVATED! Mirror Sack reflected ${usedInstant.reflectDmg} DMG back to ${opp.name} & shifted +2 Memory!`);
      }

      if (state.heroShields > 0) {
        state.heroShields -= 1;
        triggerSecurityCheck('hero');
      }

      oppBox.classList.add('round-win'); oppBox.classList.remove('round-loss');
      heroBox.classList.add('round-loss'); heroBox.classList.remove('round-win');
      document.getElementById('opp-atk-readout').classList.add('gold');
      document.getElementById('hero-atk-readout').classList.remove('gold');
      banner.textContent = `ROUND LOST ${heroAtk} < ${oppAtk} (-${taken} LIFE • REVENGE ARMED)`;
      banner.className = 'round-banner loss';
      AUDIO.playImpact(false);
      appendDuelLog(`🔥 R${state.round}: ${opp.name} (${oppAtk} ATK, ${oppStake} NRG) out-bluffed ${hero.shortName} (${heroAtk} ATK) for -${taken} Life${blocked ? ` (Blocked ${blocked}!)` : ''}! Revenge armed for next round!`);
    }

    // Mark card as played in Urban Rivals 4-Card Hand
    state.usedCards.add(hero.id);
    state.furyActive = false;
    state.duelBonusAtk = 0;
    state.evolvedThisRound = false;

    const koVictory = state.oppHp <= 0 || state.oppShields <= 0;
    const koLoss = state.heroHp <= 0 || state.heroShields <= 0;

    if (koVictory || koLoss || state.round >= state.maxRounds) {
      state.duelOver = true;
      const heroWon = koVictory || (!koLoss && (state.heroHp > state.oppHp || (state.heroHp === state.oppHp && state.heroShields >= state.oppShields)));
      if (heroWon) {
        state.profile.wins += 1;
        state.profile.streak += 1;
        saveProfile();
        awardXp(60);
        unlockTrophy('first-win');
        AUDIO.playMythicFanfare();
        launchFireworks(6);
        appendDuelLog(`🏆 MATCH VICTORY! ${hero.name} seals the win (${state.heroHp} Life / ${state.heroShields} Shields vs ${state.oppHp} Life / ${state.oppShields} Shields)! +60 XP!`);
        showToast(`🏆 DUEL VICTORY! +60 XP (Streak: ${state.profile.streak})`);
      } else {
        state.profile.streak = 0;
        saveProfile();
        renderProfileBar();
        appendDuelLog(`😮 ${opp.name} took the match! Tap Play Again to run it back!`);
      }
    } else {
      state.round += 1;
      // Memory Gauge grants bonus next-round NRG!
      if (state.memory > 0) {
        const bonus = state.memory >= 3 ? 2 : 1;
        state.heroEnergy = Math.min(12, state.heroEnergy + bonus);
        appendDuelLog(`⚡ MEMORY ADVANTAGE (+${state.memory}): You gained +${bonus} Hype Energy for Round ${state.round}!`);
      } else if (state.memory < 0) {
        const bonus = Math.abs(state.memory) >= 3 ? 2 : 1;
        state.oppEnergy = Math.min(12, state.oppEnergy + bonus);
        appendDuelLog(`⚠️ OPP MEMORY COUNTER (+${Math.abs(state.memory)}): Opponent gained +${bonus} Hype Energy for Round ${state.round}!`);
      }
      // Auto-select next unused card in 4-Card Hand
      const nextHero = state.hand.find((id) => !state.usedCards.has(id));
      if (nextHero) state.heroId = nextHero;
      state.stake = Math.min(state.stake, state.heroEnergy);
    }

    renderDuelArena();
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
      awardXp(10);
      showToast(`🔥 Posted as ${author}! (+10 XP)`);
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

    document.getElementById('evo-showcase-btn')?.addEventListener('click', runEvolutionShowcase);

    document.querySelectorAll('[data-team-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.teamFilter = btn.dataset.teamFilter;
        document.querySelectorAll('[data-team-filter]').forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        renderCards();
      });
    });

    document.getElementById('vault-search')?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderCards();
    });

    document.querySelectorAll('[data-all-level]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setAllCardsLevel(Number(btn.dataset.allLevel));
      });
    });

    document.querySelectorAll('[data-foil-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.body.setAttribute('data-foil', btn.dataset.foilBtn);
        document.querySelectorAll('[data-foil-btn]').forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        AUDIO.playCardFlip();
      });
    });

    document.getElementById('toggle-view-btn')?.addEventListener('click', (e) => {
      state.compactBinder = !state.compactBinder;
      e.currentTarget.textContent = state.compactBinder ? '🗂️ Binder View: Compact' : '🗂️ Binder View: Full';
      e.currentTarget.setAttribute('aria-pressed', String(state.compactBinder));
      renderCards();
    });

    const animBtn = document.getElementById('toggle-anim-btn');
    const syncAnimBtn = () => {
      if (animBtn) {
        animBtn.textContent = state.liveAnim ? '⏸ Pause Live 3D' : '▶ Play Live 3D';
      }
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
      e.currentTarget.setAttribute('aria-pressed', String(on));
      AUDIO.playCardFlip();
    });

    document.getElementById('mute-btn')?.addEventListener('click', (e) => {
      const muted = AUDIO.toggleMute();
      e.currentTarget.textContent = muted ? '🔇 Muted' : '🔊 Sound';
    });

    document.querySelectorAll('[data-duel-format]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.duelFormat = btn.dataset.duelFormat;
        document.querySelectorAll('[data-duel-format]').forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        resetDuelMatch();
        showToast(state.duelFormat === 'ascension' ? '🧬 Digimon Ascension Mode: Start L1 & evolve live!' : '⚡ Max Blitz Mode: Using your Vault levels!');
      });
    });

    document.querySelectorAll('[data-opp-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.oppMode = btn.dataset.oppMode;
        document.querySelectorAll('[data-opp-mode]').forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        resetDuelMatch();
      });
    });

    document.getElementById('fury-toggle-btn')?.addEventListener('click', () => {
      if (state.heroEnergy < 3 || state.duelOver) return;
      state.furyActive = !state.furyActive;
      if (state.furyActive) AUDIO.playFury();
      else AUDIO.playCardFlip();
      renderEnergyControls();
    });

    document.getElementById('stake-slider')?.addEventListener('input', (e) => {
      state.stake = Number(e.target.value);
      renderEnergyControls();
    });

    document.getElementById('play-round-btn')?.addEventListener('click', playDuelRound);
    document.getElementById('battle-reset-btn')?.addEventListener('click', () => {
      resetDuelMatch();
      appendDuelLog('🔄 Fresh 4-Round TCG Match started — 4-Card Hand, 4 Security Shields, Memory +2, & 1 Trap ready!');
    });
  }

  /* ---------- BOOT ---------- */
  saveSquad();
  renderProfileBar();
  initDialogLightDismissFallback();
  initBgCanvas();
  initFireworks();
  initControls();
  initDialogs();
  syncToolbarLevelChips();
  renderCards();
  resetDuelMatch();
  initRequestDesk();
  initWall();
  requestAnimationFrame(masterAnimLoop);
})();
