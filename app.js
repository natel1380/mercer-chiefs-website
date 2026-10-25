// Mercer Chiefs Hockey Club - Modern Interactive Application Logic
import {
  CLUB_INFO,
  LIVE_TICKER_GAMES,
  JUNIOR_TEAMS,
  NCDC_ROSTER,
  NCDC_SCHEDULE,
  NCDC_STANDINGS,
  PREMIER_ROSTER,
  PREMIER_SCHEDULE,
  PREMIER_STANDINGS,
  COLLEGE_COMMITMENTS,
  COACHING_STAFF,
  YOUTH_TEAMS,
  CLUB_NEWS
} from './data/chiefs-data.js';

// Admin Storage & Dynamic Sync Helpers
export function getStoredHiddenTeams() {
  try {
    const raw = localStorage.getItem('mercer_hidden_teams');
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return [];
}

export function getStoredSectionVisibility() {
  try {
    const raw = localStorage.getItem('mercer_section_visibility');
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return {};
}

export function getStoredClubNews() {
  try {
    const raw = localStorage.getItem('mercer_club_news');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Auto-migrate away from old placeholder fake news to authentic Facebook news
        const isLegacyFake = parsed.some(a => a.title && (a.title.includes('Surges to 1st Place') || a.title.includes('Unleashes 12-Goal')));
        if (!isLegacyFake) {
          // Merge in any new default releases from CLUB_NEWS that are not yet in storage
          const existingIds = new Set(parsed.map(p => p.id));
          const existingTitles = new Set(parsed.map(p => (p.title || '').toLowerCase().trim()));
          let hasNew = false;
          for (let i = CLUB_NEWS.length - 1; i >= 0; i--) {
            const def = CLUB_NEWS[i];
            const normTitle = (def.title || '').toLowerCase().trim();
            if (!existingIds.has(def.id) && !existingTitles.has(normTitle)) {
              parsed.unshift(def);
              existingIds.add(def.id);
              existingTitles.add(normTitle);
              hasNew = true;
            }
          }
          // Always ensure articles are sorted newest first by date
          parsed.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
          if (hasNew) {
            try {
              localStorage.setItem('mercer_club_news', JSON.stringify(parsed));
            } catch (e) { }
          }
          return parsed;
        }
      }
    }
  } catch (e) { }
  return CLUB_NEWS;
}

export function getStoredAlumniCommitments() {
  try {
    const raw = localStorage.getItem('mercer_alumni_commitments');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { }
  return COLLEGE_COMMITMENTS;
}

export function getActiveSeasonConfig() {
  try {
    const raw = localStorage.getItem('mercer_season_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          seasonLabel: parsed.seasonLabel || '2026/27',
          thfSeasonId: parsed.thfSeasonId || '190',
          ahfSeasonId: parsed.ahfSeasonId || '190',
          usphlSeasonId: parsed.usphlSeasonId || '67',
          ncdcTeamId: parsed.ncdcTeamId || '112',
          premierTeamId: parsed.premierTeamId || '459',
          ncdcCoach: parsed.ncdcCoach !== undefined ? parsed.ncdcCoach : 'Rob Broderick',
          premierCoach: parsed.premierCoach !== undefined ? parsed.premierCoach : ''
        };
      }
    }
  } catch (e) { }
  return {
    seasonLabel: '2026/27',
    thfSeasonId: '190',
    ahfSeasonId: '190',
    usphlSeasonId: '67',
    ncdcTeamId: '112',
    premierTeamId: '459',
    ncdcCoach: 'Rob Broderick',
    premierCoach: ''
  };
}

export function applyVerifiedYouthResults(teams) {
  return teams;
}

export function getAllYouthTeams() {
  let baseTeams = [...YOUTH_TEAMS];

  // Try loading synced youth data feed
  try {
    const rawSynced = localStorage.getItem('mercer_synced_youth_data');
    if (rawSynced) {
      const parsed = JSON.parse(rawSynced);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasResults = parsed.some(t => Array.isArray(t.recentResults) && t.recentResults.length > 0);
        if (hasResults) {
          baseTeams = parsed;
        } else {
          // If cleared/empty during testing, remove the bad key so full verified results restore immediately
          localStorage.removeItem('mercer_synced_youth_data');
        }
      }
    }
  } catch (e) { }

  // Try merging admin configured teams (custom coach or team ID) without wiping results
  try {
    const rawConfigured = localStorage.getItem('mercer_configured_teams');
    if (rawConfigured) {
      const parsed = JSON.parse(rawConfigured);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasValidResults = parsed.some(t => Array.isArray(t.recentResults) && t.recentResults.length > 0);
        if (!hasValidResults) {
          // Clean up cleared/empty rollover override so full game results are restored
          localStorage.removeItem('mercer_configured_teams');
        } else {
          baseTeams = baseTeams.map(bt => {
            const cfg = parsed.find(c => c.id === bt.id);
            if (!cfg) return bt;
            return {
              ...bt,
              headCoach: cfg.headCoach || bt.headCoach,
              teamId: cfg.teamId || bt.teamId,
              tier: cfg.tier || bt.tier,
              league: cfg.league || bt.league,
              record: (cfg.record && cfg.record !== '0-0-0') ? cfg.record : bt.record,
              rank: (cfg.rank && cfg.rank !== 'Pre-Season') ? cfg.rank : bt.rank,
              standingSummary: (cfg.standingSummary && !cfg.standingSummary.includes('Pre-Season')) ? cfg.standingSummary : bt.standingSummary,
              recentResults: (Array.isArray(cfg.recentResults) && cfg.recentResults.length > 0) ? cfg.recentResults : bt.recentResults,
              upcomingSchedule: (Array.isArray(cfg.upcomingSchedule) && cfg.upcomingSchedule.length > 0) ? cfg.upcomingSchedule : bt.upcomingSchedule
            };
          });
        }
      }
    }
  } catch (e) { }

  // Auto-resolve verified youth results (such as Oct 16 18U Premier AAA 6-2 Win vs Hitmen)
  baseTeams = applyVerifiedYouthResults(baseTeams);
  return baseTeams;
}

export function getActiveYouthTeams() {
  const all = getAllYouthTeams();
  const hidden = getStoredHiddenTeams();
  if (Array.isArray(hidden) && hidden.length > 0) {
    return all.filter(t => !hidden.includes(t.id));
  }
  return all;
}

// Application State
const state = {
  currentJuniorTeam: 'ncdc', // 'ncdc' | 'premier'
  currentTab: 'roster',
  rosterFilter: 'all',
  rosterSearch: '',
  scheduleFilter: 'all',
  selectedYouthTeam: getActiveYouthTeams()[0]?.id || YOUTH_TEAMS[0].id,
  youthIntegrationMode: 'native', // 'native' | 'timetoscore' | 'iframe'
  youthTierFilter: 'all', // 'all' | 'ahf' | 'thf'
  youthSchedSubTab: 'upcoming', // 'upcoming' | 'results'
  youthWidgetTab: '1', // '1' (schedule) | '2' (roster)
  selectedPlayer: null
};

export function applyVerifiedResults(baseJunior, baseTicker) {
  // Pure pass-through: site is driven 100% by live feeds (junior-feed.json and youth-feed.json)
  return { junior: baseJunior, ticker: baseTicker };
}

export function getStoredJuniorTeams() {
  let data = null;
  try {
    const raw = localStorage.getItem('mercer_synced_junior_data');
    if (raw) {
      data = JSON.parse(raw);
    }
  } catch (e) { }

  if (!data || typeof data !== 'object') {
    data = JUNIOR_TEAMS;
  }
  return data;
}

export function getStoredTickerGames() {
  let ticker = null;
  try {
    const raw = localStorage.getItem('mercer_synced_ticker_data');
    if (raw) {
      ticker = JSON.parse(raw);
    }
  } catch (e) {}

  if (!Array.isArray(ticker) || ticker.length === 0) {
    ticker = LIVE_TICKER_GAMES;
  }
  return ticker;
}

export function refreshJuniorDataUI() {
  try {
    initTicker();
    setupCountdown();
    if (typeof renderRoster === 'function') renderRoster();
    if (typeof renderSchedule === 'function') renderSchedule();
    if (typeof initStandings === 'function') initStandings();
    if (typeof initLeaders === 'function') initLeaders();
  } catch (e) {
    console.debug('Error refreshing junior data UI:', e);
  }
}

// Cross-tab and live sync event listener
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (!e.key || e.key.includes('mercer_synced_junior') || e.key.includes('mercer_synced_ticker') || e.key.includes('mercer_last_sync')) {
      refreshJuniorDataUI();
    }
    if (!e.key || e.key.includes('mercer_site_content') || e.key.includes('mercer_section_visibility') || e.key.includes('mercer_junior_hub') || e.key.includes('mercer_youth_hub') || e.key.includes('mercer_hidden_teams') || e.key.includes('mercer_visibility_updated')) {
      initSiteContent();
      if (typeof updateHeroLeagueBadgesVisibility === 'function') {
        updateHeroLeagueBadgesVisibility();
      }
    }
  });

  try {
    const bc = new BroadcastChannel('mercer_visibility_channel');
    bc.onmessage = () => {
      initSiteContent();
      if (typeof updateHeroLeagueBadgesVisibility === 'function') {
        updateHeroLeagueBadgesVisibility();
      }
    };
  } catch (e) {}

  window.addEventListener('mercer:datasync', () => {
    refreshJuniorDataUI();
    initSiteContent();
    if (typeof updateHeroLeagueBadgesVisibility === 'function') {
      updateHeroLeagueBadgesVisibility();
    }
  });
}

export function getCurrentJuniorData() {
  const allJunior = getStoredJuniorTeams();
  const data = allJunior[state.currentJuniorTeam] || allJunior.ncdc || JUNIOR_TEAMS.ncdc;
  const cfg = getActiveSeasonConfig();
  if (state.currentJuniorTeam === 'premier') {
    return {
      ...data,
      teamId: cfg.premierTeamId || data.teamId,
      headCoach: cfg.premierCoach || data.headCoach || 'Staff',
      usphlUrl: `https://usphl.com/premier/game-center/teams/?team=${cfg.premierTeamId || 459}&season=${cfg.usphlSeasonId || 67}`
    };
  } else if (state.currentJuniorTeam === 'ncdc') {
    return {
      ...data,
      teamId: cfg.ncdcTeamId || data.teamId,
      headCoach: cfg.ncdcCoach || data.headCoach || 'Rob Broderick',
      usphlUrl: `https://usphl.com/ncdc/game-center/teams/?team=${cfg.ncdcTeamId || 112}&season=${cfg.usphlSeasonId || 67}`
    };
  }
  return data;
}

// Initialize Application
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initTicker();
    initJuniorTeamSwitcher();
    initNcdcTabs();
    initRoster();
    initSchedule();
    initStandings();
    initLeaders();
    initCommitments();
    initStaff();
    initYouthHub();
    initNews();
    initModals();
    initMobileNav();
    initNavbarScrollSpy();
    setupCountdown();
    initSiteContent();
    initAutoBackgroundSync();
  });
}

/* ==========================================================================
   1. TICKER & COUNTDOWN
   ========================================================================== */
function initTicker() {
  const track = document.getElementById('ticker-track');
  const container = document.getElementById('ticker-track-container');
  const prevBtn = document.getElementById('ticker-prev-btn');
  const nextBtn = document.getElementById('ticker-next-btn');
  if (!track) return;

  const games = getStoredTickerGames();
  track.innerHTML = games.map(game => {
    if (game.status === 'FINAL') {
      return `
        <div class="ticker-item" data-id="${game.id}">
          <span class="badge-status final">FINAL</span>
          <span class="ticker-teams">${game.away} ${game.awayScore} @ ${game.home} ${game.homeScore}</span>
          <span style="color: var(--text-muted); font-size: 0.72rem;">${game.date}</span>
        </div>
      `;
    } else {
      return `
        <div class="ticker-item" data-id="${game.id}">
          <span class="badge-status upcoming">NEXT</span>
          <span class="ticker-teams">${game.away} vs ${game.home}</span>
          <span style="color: var(--chiefs-gold); font-size: 0.75rem; font-weight: 600;">${game.date}</span>
        </div>
      `;
    }
  }).join('');

  initTickerDrag(track, container, prevBtn, nextBtn);
}

function initTickerDrag(track, container, prevBtn, nextBtn) {
  if (!track) return;

  function updateScrollState() {
    if (!container) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const canLeft = track.scrollLeft > 6;
    const canRight = track.scrollLeft < maxScroll - 6;

    container.classList.toggle('can-scroll-left', canLeft);
    container.classList.toggle('can-scroll-right', canRight);

    if (prevBtn) prevBtn.classList.toggle('visible', canLeft);
    if (nextBtn) nextBtn.classList.toggle('visible', canRight);
  }

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let velocity = 0;
  let lastX = 0;
  let lastTime = 0;
  let momentumID = null;
  let totalDragDist = 0;

  track.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDown = true;
    track.classList.add('is-dragging');
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
    lastX = e.pageX;
    lastTime = Date.now();
    velocity = 0;
    totalDragDist = 0;
    if (momentumID) cancelAnimationFrame(momentumID);
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    track.classList.remove('is-dragging');

    // Smooth momentum glide on mouse release
    if (Math.abs(velocity) > 0.35) {
      let currentVelocity = velocity * 14;
      const decay = 0.94;

      function momentumLoop() {
        if (Math.abs(currentVelocity) < 0.2) return;
        track.scrollLeft -= currentVelocity;
        currentVelocity *= decay;
        updateScrollState();
        momentumID = requestAnimationFrame(momentumLoop);
      }
      momentumID = requestAnimationFrame(momentumLoop);
    }
  });

  track.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX);
    track.scrollLeft = scrollLeft - walk;

    const now = Date.now();
    const dt = now - lastTime || 16;
    const dx = e.pageX - lastX;
    velocity = dx / dt;
    lastX = e.pageX;
    lastTime = now;
    totalDragDist += Math.abs(dx);

    updateScrollState();
  });

  // Prevent accidental clicks on items when dragged
  track.addEventListener('click', (e) => {
    if (totalDragDist > 6) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Wheel horizontal scrolling conversion
  track.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      track.scrollLeft += e.deltaY * 0.9;
      updateScrollState();
    }
  }, { passive: false });

  // Update on scroll & resize
  track.addEventListener('scroll', updateScrollState, { passive: true });

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      track.scrollBy({ left: -320, behavior: 'smooth' });
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      track.scrollBy({ left: 320, behavior: 'smooth' });
    });
  }

  // Initial calculation after render
  setTimeout(updateScrollState, 80);
  window.addEventListener('resize', updateScrollState);
}

function parseGameDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const cleanTime = (timeStr || '5:30 PM EDT').replace('EDT', '-0400').replace('EST', '-0500');
  const d = new Date(dateStr + ' ' + cleanTime);
  if (!isNaN(d.getTime())) return d;
  return new Date(dateStr);
}

function setupCountdown() {
  const cdElement = document.getElementById('next-game-timer');
  if (!cdElement) return;

  function getNextNcdcGame() {
    const allJunior = getStoredJuniorTeams();
    const ncdcSchedule = (allJunior && allJunior.ncdc && allJunior.ncdc.schedule) || (JUNIOR_TEAMS && JUNIOR_TEAMS.ncdc && JUNIOR_TEAMS.ncdc.schedule) || NCDC_SCHEDULE || [];
    const now = new Date();

    for (const game of ncdcSchedule) {
      if (game.status === 'UPCOMING' && game.date) {
        const gameDate = parseGameDateTime(game.date, game.time);
        if (gameDate && gameDate > now) {
          return { targetDate: gameDate, game };
        }
      }
    }
    // Fallback: Next regular season matchup vs Jersey Hitmen
    const fallback = new Date('2026-10-18T13:30:00-04:00');
    return { targetDate: fallback, game: { opponent: 'Jersey Hitmen', time: '1:30 PM EDT' } };
  }

  function update() {
    const nextGameInfo = getNextNcdcGame();
    if (!nextGameInfo) {
      cdElement.textContent = "Season Complete";
      return;
    }

    const { targetDate, game } = nextGameInfo;
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
      // If game started within last 3 hours, show GAME ON / LIVE NOW
      if (diff > -1000 * 60 * 60 * 3) {
        cdElement.textContent = `GAME DAY! Puck drops ${game?.time || '5:30 PM'}`;
      } else {
        cdElement.textContent = "FINAL";
      }
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    const isToday = targetDate.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = targetDate.toDateString() === tomorrow.toDateString();

    let timeStr = '';
    if (days > 0) {
      timeStr = `${days}d ${hours}h ${mins}m <span class="timer-secs">${secs}s</span>`;
    } else {
      timeStr = `${hours}h ${mins}m <span class="timer-secs">${secs}s</span>`;
    }

    if (isToday) {
      cdElement.innerHTML = `${timeStr} <span class="timer-day-badge">(Today)</span>`;
    } else if (isTomorrow) {
      cdElement.innerHTML = `${timeStr} <span class="timer-day-badge">(Tomorrow)</span>`;
    } else {
      cdElement.innerHTML = timeStr;
    }
  }
  update();
  setInterval(update, 1000);
}

function initAutoBackgroundSync() {
  const FB_SYNC_INTERVAL_MS = 60 * 60 * 1000;

  async function checkAndSync() {
    try {
      const lastFbSyncRaw = localStorage.getItem('mercer_auto_fb_sync_ts');
      const lastFbSync = lastFbSyncRaw ? new Date(lastFbSyncRaw).getTime() : 0;
      const now = Date.now();

      const stored = getStoredJuniorTeams();

      // 1. Check if Facebook Meta Graph API token is configured (throttled to 1 hour to respect Meta API rate limits)
      let fbConfig = null;
      try {
        const rawCfg = localStorage.getItem('mercer_fb_config');
        if (rawCfg) fbConfig = JSON.parse(rawCfg);
      } catch (e) {}

      // Silent Facebook Sync if API Token is configured
      if (fbConfig && fbConfig.accessToken && fbConfig.accessToken.trim() && (now - lastFbSync >= FB_SYNC_INTERVAL_MS)) {
        try {
          const pageId = (fbConfig.pageId || 'mercerchiefshockey').trim();
          const token = fbConfig.accessToken.trim();
          const graphUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/feed?fields=id,message,created_time,full_picture,permalink_url,attachments{media,description,title}&limit=12&access_token=${encodeURIComponent(token)}`;
          
          const graphResp = await fetch(graphUrl);
          if (graphResp.ok) {
            const graphJson = await graphResp.json();
            if (graphJson.data && Array.isArray(graphJson.data) && graphJson.data.length > 0) {
              const currentNews = getStoredClubNews();
              const existingIds = new Set(currentNews.map(a => a.id));
              let added = false;

              for (const item of graphJson.data) {
                const postId = `fb-${item.id}`;
                if (!existingIds.has(postId)) {
                  const msg = item.message || '';
                  let title = '';
                  const firstLine = msg.split('\n')[0].replace(/^[#\s]+/, '').trim();
                  if (firstLine.length > 5 && firstLine.length <= 80) {
                    title = firstLine;
                  } else if (firstLine.length > 80) {
                    title = firstLine.slice(0, 77) + '...';
                  } else {
                    title = `Mercer Chiefs Club Update (${new Date(item.created_time).toLocaleDateString()})`;
                  }

                  const upperMsg = msg.toUpperCase();
                  let category = 'Club News';
                  if (upperMsg.includes('NCDC')) category = 'NCDC Junior';
                  else if (upperMsg.includes('PREMIER') || upperMsg.includes('USPHL')) category = 'USPHL Premier';
                  else if (/\b(18U|16U|15U|14U|13U|12U|10U|YOUTH|AAA)\b/i.test(msg)) category = 'Youth AAA';

                  const postDate = new Date(item.created_time).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  const mediaImg = item.full_picture || 
                                   item.attachments?.data?.[0]?.media?.image?.src || 
                                   'assets/images/hero-action.jpg';

                  const permalink = item.permalink_url || `https://www.facebook.com/${item.id}`;

                  currentNews.unshift({
                    id: postId,
                    title,
                    date: postDate,
                    category,
                    readTime: '2 min read',
                    summary: msg.length > 220 ? msg.slice(0, 217) + '...' : (msg || 'Click to view post details on Facebook.'),
                    image: mediaImg,
                    source: 'facebook',
                    sourceUrl: permalink,
                    link: permalink,
                    credit: msg.toLowerCase().includes('heather') ? "Heather O'Connell Photography" : "Mercer Chiefs Hockey"
                  });
                  existingIds.add(postId);
                  added = true;
                }
              }

              if (added) {
                currentNews.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                localStorage.setItem('mercer_club_news', JSON.stringify(currentNews));
                initNews();
              }
              localStorage.setItem('mercer_auto_fb_sync_ts', new Date().toISOString());
            }
          }
        } catch (fbErr) {
          console.debug('Background FB auto-sync skipped:', fbErr);
        }
      } else if (!fbConfig || !fbConfig.accessToken) {
        // Fallback when no Meta token configured yet:
        // Silently check if data/facebook-feed.json has new posts published to the server
        try {
          const resp = await fetch('data/facebook-feed.json?t=' + Date.now());
          if (resp.ok) {
            const json = await resp.json();
            if (json.posts && Array.isArray(json.posts) && json.posts.length > 0) {
              const currentNews = getStoredClubNews();
              const existingIds = new Set(currentNews.map(a => a.id));
              let added = false;
              for (const post of json.posts) {
                if (!existingIds.has(post.id)) {
                  currentNews.unshift(post);
                  existingIds.add(post.id);
                  added = true;
                }
              }
              if (added) {
                currentNews.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                localStorage.setItem('mercer_club_news', JSON.stringify(currentNews));
                initNews();
              }
            }
          }
        } catch (feedErr) {
          console.debug('Static feed auto-check skipped:', feedErr);
        }
      }

      // 2. Automated Junior Team Data Sync (Fetches verified feed from GitHub Actions)
      try {
        const jrResp = await fetch('data/junior-feed.json?t=' + Date.now());
        if (jrResp.ok) {
          const jrFeed = await jrResp.json();
          if (jrFeed && jrFeed.ncdc && jrFeed.premier) {
            const feedTs = jrFeed.lastSynced ? new Date(jrFeed.lastSynced).getTime() : 0;
            const storedTs = localStorage.getItem('mercer_last_sync_timestamp') ? new Date(localStorage.getItem('mercer_last_sync_timestamp')).getTime() : 0;

            let storedData = null;
            try {
              const raw = localStorage.getItem('mercer_synced_junior_data');
              if (raw) storedData = JSON.parse(raw);
            } catch (e) {}

            const rosterChanged = !storedData ||
              jrFeed.ncdc?.roster?.length !== storedData.ncdc?.roster?.length ||
              jrFeed.premier?.roster?.length !== storedData.premier?.roster?.length;

            if (feedTs !== storedTs || rosterChanged || !localStorage.getItem('mercer_synced_junior_data')) {
              const updatedJunior = {
                ncdc: jrFeed.ncdc,
                premier: jrFeed.premier
              };
              localStorage.setItem('mercer_synced_junior_data', JSON.stringify(updatedJunior));
              if (jrFeed.ticker) {
                localStorage.setItem('mercer_synced_ticker_data', JSON.stringify(jrFeed.ticker));
              }
              localStorage.setItem('mercer_last_sync_timestamp', jrFeed.lastSynced || new Date().toISOString());
              refreshJuniorDataUI();
              console.log('[AUTO-SYNC] Junior team standings, scores, box scores, and player stats updated from live feed.');
            }
          }
        }
      } catch (jrErr) {
        console.debug('Junior feed background auto-sync skipped:', jrErr);
      }

      // 3. Automated Youth Team Data Sync
      try {
        const youthResp = await fetch('data/youth-feed.json?t=' + Date.now());
        if (youthResp.ok) {
          const youthFeed = await youthResp.json();
          if (youthFeed && Array.isArray(youthFeed.teams) && youthFeed.teams.length > 0) {
            const feedTs = youthFeed.lastSynced ? new Date(youthFeed.lastSynced).getTime() : 0;
            const storedTs = localStorage.getItem('mercer_youth_last_sync') ? new Date(localStorage.getItem('mercer_youth_last_sync')).getTime() : 0;

            if (feedTs !== storedTs || !localStorage.getItem('mercer_synced_youth_data')) {
              localStorage.setItem('mercer_synced_youth_data', JSON.stringify(youthFeed.teams));
              localStorage.setItem('mercer_youth_last_sync', youthFeed.lastSynced || new Date().toISOString());
              if (typeof renderYouthDisplay === 'function') renderYouthDisplay();
              console.log('[AUTO-SYNC] Youth team rosters, schedules, and stats updated.');
            }
          }
        }
      } catch (youthErr) {
        console.debug('Youth feed background auto-sync skipped:', youthErr);
      }

      // 4. Automated Site Config & Team Visibility Sync
      try {
        const cfgResp = await fetch('data/site-config.json?t=' + Date.now());
        if (cfgResp.ok) {
          const cfg = await cfgResp.json();
          if (cfg) {
            if (cfg.juniorHubVisible !== undefined) {
              localStorage.setItem('mercer_junior_hub_visible', String(cfg.juniorHubVisible));
            }
            if (cfg.youthHubVisible !== undefined) {
              localStorage.setItem('mercer_youth_hub_visible', String(cfg.youthHubVisible));
            }
            if (Array.isArray(cfg.hiddenTeams)) {
              const currentHidden = getStoredHiddenTeams();
              if (JSON.stringify(currentHidden) !== JSON.stringify(cfg.hiddenTeams)) {
                localStorage.setItem('mercer_hidden_teams', JSON.stringify(cfg.hiddenTeams));
                if (typeof populateYouthDropdown === 'function') populateYouthDropdown();
                if (typeof renderYouthDisplay === 'function') renderYouthDisplay();
                console.log('[AUTO-SYNC] Updated global team visibility preferences from site-config.json.');
              }
            }
          }
        }
      } catch (cfgErr) {
        console.debug('Site config sync skipped:', cfgErr);
      }

      // 5. Automated Site Content Sync (Tryouts, Camps, Rink, Program Commercial, Modals)
      try {
        await initSiteContent();
      } catch (contentErr) {
        console.debug('Site content sync skipped:', contentErr);
      }

      localStorage.setItem('mercer_auto_sync_ts', new Date().toISOString());
    } catch (err) {
      console.debug('Background auto-sync error:', err);
    }
  }

  // Run initial check after DOM load settles (300ms in background)
  setTimeout(checkAndSync, 300);

  // Check periodically every 5 minutes while page is active
  setInterval(checkAndSync, 5 * 60 * 1000);
}

/* ==========================================================================
   DYNAMIC SITE CONTENT & CMS RENDERER
   ========================================================================== */
export async function initSiteContent() {
  // 1. Try local cache first for instant 0ms render
  try {
    const cached = localStorage.getItem('mercer_site_content');
    if (cached) {
      applySiteContent(JSON.parse(cached));
    }
  } catch (e) {}

  // 2. Fetch fresh content from server
  try {
    const res = await fetch('data/site-content.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      
      // Preserve active section visibility preferences from storage
      const storedVis = getStoredSectionVisibility();
      if (!data.sections) data.sections = {};
      Object.keys(storedVis).forEach(k => {
        data.sections[k] = storedVis[k];
        if (k === 'hero' && data.hero) data.hero.enabled = storedVis[k];
        if (k === 'camps' && data.camps) data.camps.enabled = storedVis[k];
        if (k === 'tryouts' && data.tryouts) data.tryouts.enabled = storedVis[k];
        if (k === 'arena' && data.arena) data.arena.enabled = storedVis[k];
        if (k === 'video' && data.program) data.program.enabled = storedVis[k];
        if (k === 'news' && data.news) data.news.enabled = storedVis[k];
        if (k === 'ticker' && data.ticker) data.ticker.enabled = storedVis[k];
        if (k === 'juniorHub' && data.juniorHub) data.juniorHub.enabled = storedVis[k];
        if (k === 'youthHub' && data.youthHub) data.youthHub.enabled = storedVis[k];
      });

      applySiteContent(data);
      localStorage.setItem('mercer_site_content', JSON.stringify(data));
    }
  } catch (err) {
    console.debug('Site content fetch skipped:', err);
  }
}

/* ==========================================================================
   DYNAMIC HERO LEAGUE BADGES VISIBILITY
   ========================================================================== */
export function updateHeroLeagueBadgesVisibility(content) {
  let activeContent = content;
  if (!activeContent) {
    try {
      const raw = localStorage.getItem('mercer_site_content');
      if (raw) activeContent = JSON.parse(raw);
    } catch (e) {}
  }

  const storedVis = getStoredSectionVisibility();
  const sec = activeContent?.sections || {};

  // 1. Junior Hub visibility
  let isJuniorVisible = true;
  if (storedVis.juniorHub !== undefined) {
    isJuniorVisible = !!storedVis.juniorHub;
  } else if (activeContent?.juniorHub?.enabled !== undefined) {
    isJuniorVisible = !!activeContent.juniorHub.enabled;
  } else if (sec.juniorHub !== undefined) {
    isJuniorVisible = !!sec.juniorHub;
  } else {
    try {
      const storedJunior = localStorage.getItem('mercer_junior_hub_visible');
      if (storedJunior !== null) isJuniorVisible = storedJunior === 'true';
      else if (activeContent?.juniorHubVisible !== undefined) isJuniorVisible = !!activeContent.juniorHubVisible;
    } catch (e) {}
  }

  // 2. Youth Hub visibility
  let isYouthVisible = true;
  if (storedVis.youthHub !== undefined) {
    isYouthVisible = !!storedVis.youthHub;
  } else if (activeContent?.youthHub?.enabled !== undefined) {
    isYouthVisible = !!activeContent.youthHub.enabled;
  } else if (sec.youthHub !== undefined) {
    isYouthVisible = !!sec.youthHub;
  } else {
    try {
      const storedYouth = localStorage.getItem('mercer_youth_hub_visible');
      if (storedYouth !== null) isYouthVisible = storedYouth === 'true';
      else if (activeContent?.youthHubVisible !== undefined) isYouthVisible = !!activeContent.youthHubVisible;
    } catch (e) {}
  }

  // 3. Hidden teams preferences
  const hiddenTeams = getStoredHiddenTeams();

  // 4. Junior individual teams visibility
  const isNcdcVisible = isJuniorVisible && !hiddenTeams.includes('ncdc');
  const isPremierVisible = isJuniorVisible && !hiddenTeams.includes('premier');

  // 5. Youth Tier 1 (THF) and Tier 2 (AHF) visibility
  const allYouth = getAllYouthTeams();
  const thfTeams = allYouth.filter(t => t.leagueId === 5 || (t.league && t.league.includes('THF')));
  const ahfTeams = allYouth.filter(t => t.leagueId === 4 || (t.league && t.league.includes('AHF')));

  const hasVisibleThf = thfTeams.some(t => !hiddenTeams.includes(t.id));
  const hasVisibleAhf = ahfTeams.some(t => !hiddenTeams.includes(t.id));

  // If Youth Hub is hidden, both Youth league labels are hidden.
  // If Youth Hub is visible, THF shows if any THF team is visible; AHF shows if any AHF team is visible.
  const isThfBadgeVisible = isYouthVisible && hasVisibleThf;
  const isAhfBadgeVisible = isYouthVisible && hasVisibleAhf;

  // 6. DOM elements
  const bNcdc = document.getElementById('hero-badge-ncdc');
  const bPremier = document.getElementById('hero-badge-premier');
  const bAhf = document.getElementById('hero-badge-ahf');
  const bThf = document.getElementById('hero-badge-thf');
  const badgesContainer = document.getElementById('hero-league-badges');

  if (bNcdc) bNcdc.style.display = isNcdcVisible ? '' : 'none';
  if (bPremier) bPremier.style.display = isPremierVisible ? '' : 'none';
  if (bAhf) bAhf.style.display = isAhfBadgeVisible ? '' : 'none';
  if (bThf) bThf.style.display = isThfBadgeVisible ? '' : 'none';

  if (badgesContainer) {
    const anyBadgeVisible = isNcdcVisible || isPremierVisible || isAhfBadgeVisible || isThfBadgeVisible;
    badgesContainer.style.display = anyBadgeVisible ? '' : 'none';
  }

  // Also dynamically update Youth Hub tier pills if rendered
  const pillThf = document.querySelector('.tier-pill[data-tier="thf"]');
  const pillAhf = document.querySelector('.tier-pill[data-tier="ahf"]');
  if (pillThf) pillThf.style.display = hasVisibleThf ? '' : 'none';
  if (pillAhf) pillAhf.style.display = hasVisibleAhf ? '' : 'none';
}
window.updateHeroLeagueBadgesVisibility = updateHeroLeagueBadgesVisibility;

export function applySiteContent(content) {
  if (!content) return;

  const storedVis = getStoredSectionVisibility();
  const sec = content.sections || {};

  // 1. Live Section & Hub Visibility Controls
  const isHeroVisible = storedVis.hero !== undefined ? storedVis.hero : (content.hero?.enabled ?? sec.hero ?? true);
  const heroEl = document.getElementById('hero-section');
  if (heroEl) heroEl.style.display = isHeroVisible ? '' : 'none';

  // Junior Hub Visibility
  let isJuniorVisible = true;
  if (storedVis.juniorHub !== undefined) {
    isJuniorVisible = !!storedVis.juniorHub;
  } else if (content.juniorHub?.enabled !== undefined) {
    isJuniorVisible = !!content.juniorHub.enabled;
  } else if (sec.juniorHub !== undefined) {
    isJuniorVisible = !!sec.juniorHub;
  } else {
    try {
      const storedJunior = localStorage.getItem('mercer_junior_hub_visible');
      if (storedJunior !== null) isJuniorVisible = storedJunior === 'true';
      else if (content.juniorHubVisible !== undefined) isJuniorVisible = !!content.juniorHubVisible;
    } catch (e) {}
  }
  const juniorHubEl = document.getElementById('ncdc-hub');
  if (juniorHubEl) juniorHubEl.style.display = isJuniorVisible ? '' : 'none';
  const juniorNav = document.getElementById('nav-link-ncdc')?.closest('li');
  if (juniorNav) juniorNav.style.display = isJuniorVisible ? '' : 'none';

  // Youth Hub Visibility
  let isYouthVisible = true;
  if (storedVis.youthHub !== undefined) {
    isYouthVisible = !!storedVis.youthHub;
  } else if (content.youthHub?.enabled !== undefined) {
    isYouthVisible = !!content.youthHub.enabled;
  } else if (sec.youthHub !== undefined) {
    isYouthVisible = !!sec.youthHub;
  } else {
    try {
      const storedYouth = localStorage.getItem('mercer_youth_hub_visible');
      if (storedYouth !== null) isYouthVisible = storedYouth === 'true';
      else if (content.youthHubVisible !== undefined) isYouthVisible = !!content.youthHubVisible;
    } catch (e) {}
  }
  const youthHubEl = document.getElementById('youth-hub');
  if (youthHubEl) youthHubEl.style.display = isYouthVisible ? '' : 'none';
  const youthNav = document.getElementById('nav-link-youth')?.closest('li');
  if (youthNav) youthNav.style.display = isYouthVisible ? '' : 'none';

  // Program Video Visibility
  const isVideoVisible = storedVis.video !== undefined ? storedVis.video : (content.program?.enabled ?? content.video?.enabled ?? sec.video ?? true);
  const videoEl = document.getElementById('program-video-section');
  if (videoEl) videoEl.style.display = isVideoVisible ? '' : 'none';

  // Tryouts & Camps Visibility
  const isTryoutsVisible = storedVis.tryouts !== undefined ? storedVis.tryouts : (content.tryouts?.enabled ?? sec.tryouts ?? true);
  const isCampsVisible = storedVis.camps !== undefined ? storedVis.camps : (content.camps?.enabled ?? sec.camps ?? true);
  const tryoutsSection = document.getElementById('tryouts-section');
  const tryoutsNav = document.getElementById('nav-link-tryouts');
  const tryoutsNavLi = tryoutsNav?.closest('li');
  const tryoutsGrid = tryoutsSection?.querySelector('.tryouts-grid');
  const tryoutsHeader = tryoutsSection?.querySelector('.section-header');
  const campsContainer = document.getElementById('camps-container');

  if (tryoutsSection) {
    if (!isTryoutsVisible && !isCampsVisible) {
      tryoutsSection.style.display = 'none';
      if (tryoutsNavLi) tryoutsNavLi.style.display = 'none';
    } else {
      tryoutsSection.style.display = '';
      if (tryoutsNavLi) tryoutsNavLi.style.display = '';
      if (tryoutsGrid) tryoutsGrid.style.display = isTryoutsVisible ? '' : 'none';
      if (tryoutsHeader) tryoutsHeader.style.display = isTryoutsVisible ? '' : 'none';

      if (tryoutsNav) {
        if (isTryoutsVisible && isCampsVisible) {
          tryoutsNav.textContent = 'Tryouts & Camps';
        } else if (isTryoutsVisible) {
          tryoutsNav.textContent = 'Tryouts';
        } else {
          tryoutsNav.textContent = 'Camps & Clinics';
        }
      }
    }
  }

  // Handle camps container visibility directly
  if (campsContainer) {
    campsContainer.style.display = isCampsVisible ? '' : 'none';
  }

  // Top header CTA Tryouts buttons
  const navTryoutBtn = document.getElementById('nav-tryout-btn');
  if (navTryoutBtn) navTryoutBtn.style.display = isTryoutsVisible ? '' : 'none';
  const mobileTryoutBtn = document.getElementById('mobile-tryout-btn');
  if (mobileTryoutBtn) mobileTryoutBtn.style.display = isTryoutsVisible ? '' : 'none';

  // Arena Visibility
  const isArenaVisible = storedVis.arena !== undefined ? storedVis.arena : (content.arena?.enabled ?? sec.arena ?? true);
  const arenaEl = document.getElementById('arena-section');
  if (arenaEl) arenaEl.style.display = isArenaVisible ? '' : 'none';
  const arenaNav = document.getElementById('nav-link-arena')?.closest('li');
  if (arenaNav) arenaNav.style.display = isArenaVisible ? '' : 'none';

  // News Visibility
  const isNewsVisible = storedVis.news !== undefined ? storedVis.news : (content.news?.enabled ?? sec.news ?? true);
  const newsEl = document.getElementById('news-section');
  if (newsEl) newsEl.style.display = isNewsVisible ? '' : 'none';
  const newsNav = document.getElementById('nav-link-news')?.closest('li');
  if (newsNav) newsNav.style.display = isNewsVisible ? '' : 'none';

  // Ticker Visibility
  const isTickerVisible = storedVis.ticker !== undefined ? storedVis.ticker : (content.ticker?.enabled ?? sec.ticker ?? true);
  const tickerEl = document.getElementById('live-scoreboard-ribbon') || document.getElementById('ticker-bar');
  if (tickerEl) tickerEl.style.display = isTickerVisible ? '' : 'none';

  // 0. Top Hero Showcase & Banner
  if (content.hero) {
    const h = content.hero;
    const backdrop = document.getElementById('hero-backdrop-img');
    if (backdrop && h.backdropImage) backdrop.src = h.backdropImage;

    const line1 = document.getElementById('hero-headline-line1');
    if (line1 && h.headlineLine1) line1.textContent = h.headlineLine1;

    const grad = document.getElementById('hero-headline-gradient');
    if (grad && h.headlineGradient) grad.textContent = h.headlineGradient;

    const desc = document.getElementById('hero-description');
    if (desc && h.description) desc.textContent = h.description;

    const pBtn = document.getElementById('hero-explore-ncdc-btn');
    if (pBtn) {
      if (!isJuniorVisible) {
        if (isYouthVisible) {
          pBtn.innerHTML = `Explore Teams <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6" /></svg>`;
          pBtn.href = '#youth-hub';
        } else if (isTryoutsVisible || isCampsVisible) {
          pBtn.innerHTML = `Tryouts & Camps <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6" /></svg>`;
          pBtn.href = '#tryouts-section';
        } else {
          pBtn.innerHTML = `Explore Facility <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6" /></svg>`;
          pBtn.href = '#arena-section';
        }
      } else {
        if (h.primaryBtnText) {
          pBtn.innerHTML = `${h.primaryBtnText} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6" /></svg>`;
        }
        if (h.primaryBtnUrl) pBtn.href = h.primaryBtnUrl;
      }
    }

    const sBtn = document.getElementById('hero-gamesheet-btn');
    if (sBtn) {
      if (!isYouthVisible) {
        sBtn.style.display = isJuniorVisible ? 'none' : '';
      } else {
        sBtn.style.display = '';
        if (h.secondaryBtnText) {
          sBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--chiefs-gold)" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> ${h.secondaryBtnText}`;
        }
        if (h.secondaryBtnUrl) sBtn.href = h.secondaryBtnUrl;
      }
    }

    const s1Num = document.getElementById('hero-stat1-num');
    const s1Lbl = document.getElementById('hero-stat1-lbl');
    if (s1Num && h.stat1Num) s1Num.textContent = h.stat1Num;
    if (s1Lbl && h.stat1Label) s1Lbl.textContent = h.stat1Label;

    const s2Num = document.getElementById('hero-stat2-num');
    const s2Lbl = document.getElementById('hero-stat2-lbl');
    if (s2Num && h.stat2Num) s2Num.textContent = h.stat2Num;
    if (s2Lbl && h.stat2Label) s2Lbl.textContent = h.stat2Label;

    const s3Num = document.getElementById('hero-stat3-num');
    const s3Lbl = document.getElementById('hero-stat3-lbl');
    if (s3Num && h.stat3Num) s3Num.textContent = h.stat3Num;
    if (s3Lbl && h.stat3Label) s3Lbl.textContent = h.stat3Label;

    const s4Num = document.getElementById('hero-stat4-num');
    const s4Lbl = document.getElementById('hero-stat4-lbl');
    if (s4Num && h.stat4Num) s4Num.textContent = h.stat4Num;
    if (s4Lbl && h.stat4Label) s4Lbl.textContent = h.stat4Label;
  }

  // Update Hero League Badges
  updateHeroLeagueBadgesVisibility(content);

  // 1. Program Video & Commercial
  if (content.program) {
    const p = content.program;
    const tag = document.getElementById('prog-section-tag');
    if (tag && p.sectionTag) tag.textContent = p.sectionTag;
    const title = document.getElementById('prog-section-title');
    if (title && p.title) title.innerHTML = p.title.replace('Defined', '<span>Defined</span>');
    const sub = document.getElementById('prog-section-subtitle');
    if (sub && p.subtitle) sub.textContent = p.subtitle;

    if (p.youtubeVideoId) {
      const iframe = document.getElementById('prog-video-iframe');
      if (iframe) {
        const currentSrc = iframe.getAttribute('src') || '';
        const newSrc = `https://www.youtube-nocookie.com/embed/${p.youtubeVideoId}?rel=0&modestbranding=1`;
        if (!currentSrc.includes(p.youtubeVideoId)) {
          iframe.src = newSrc;
        }
      }
      const ytLink = document.getElementById('prog-video-yt-link');
      if (ytLink) ytLink.href = `https://www.youtube.com/watch?v=${p.youtubeVideoId}`;
    }

    const srcTitle = document.getElementById('prog-source-title');
    if (srcTitle && p.sourceTitle) srcTitle.textContent = p.sourceTitle;
    const srcSub = document.getElementById('prog-source-sub');
    if (srcSub && p.sourceLocation) srcSub.textContent = p.sourceLocation;

    if (Array.isArray(p.pillars) && p.pillars.length === 4) {
      const pillarCards = document.querySelectorAll('#prog-pillars-grid .video-pillar-card');
      p.pillars.forEach((pill, idx) => {
        if (pillarCards[idx]) {
          const h4 = pillarCards[idx].querySelector('h4');
          const desc = pillarCards[idx].querySelector('p');
          if (h4 && pill.title) h4.textContent = pill.title;
          if (desc && pill.desc) desc.textContent = pill.desc;
        }
      });
    }

    const callout = document.getElementById('prog-callout-text');
    if (callout && p.calloutText) callout.textContent = p.calloutText;
  }

  // 2. Tryouts Section
  if (content.tryouts) {
    const t = content.tryouts;
    const tag = document.getElementById('tryouts-section-tag');
    if (tag && t.sectionTag) tag.textContent = t.sectionTag;
    const title = document.getElementById('tryouts-section-title');
    if (title && t.title) title.innerHTML = t.title.replace('Chiefs Tradition', '<span>Chiefs Tradition</span>');
    const sub = document.getElementById('tryouts-section-subtitle');
    if (sub && t.subtitle) sub.textContent = t.subtitle;

    // Tier 1
    if (t.tier1) {
      const t1 = t.tier1;
      const badge = document.getElementById('tier1-badge');
      if (badge && t1.badge) badge.textContent = t1.badge;
      const cardTitle = document.getElementById('tier1-title');
      if (cardTitle && t1.title) cardTitle.textContent = t1.title;
      const cardDesc = document.getElementById('tier1-desc');
      if (cardDesc && t1.desc) cardDesc.textContent = t1.desc;
      const years = document.getElementById('tier1-years');
      if (years && t1.birthYears) years.textContent = t1.birthYears;
      const arena = document.getElementById('tier1-arena');
      if (arena && t1.arena) arena.textContent = t1.arena;
      const showcase = document.getElementById('tier1-showcases');
      if (showcase && t1.showcaseSchedule) showcase.textContent = t1.showcaseSchedule;
      const equip = document.getElementById('tier1-equipment');
      if (equip && t1.equipment) equip.textContent = t1.equipment;

      const regBtn = document.getElementById('tier1-reg-btn');
      if (regBtn) {
        if (t1.registerButtonText) regBtn.textContent = t1.registerButtonText;
        if (t1.registerUrl && t1.registerUrl.trim()) {
          regBtn.onclick = () => window.open(t1.registerUrl.trim(), '_blank');
        } else {
          regBtn.onclick = () => window.openTryoutModal();
        }
      }
    }

    // Tier 2
    if (t.tier2) {
      const t2 = t.tier2;
      const badge = document.getElementById('tier2-badge');
      if (badge && t2.badge) badge.textContent = t2.badge;
      const cardTitle = document.getElementById('tier2-title');
      if (cardTitle && t2.title) cardTitle.textContent = t2.title;
      const cardDesc = document.getElementById('tier2-desc');
      if (cardDesc && t2.desc) cardDesc.textContent = t2.desc;
      const years = document.getElementById('tier2-years');
      if (years && t2.birthYears) years.textContent = t2.birthYears;
      const divisions = document.getElementById('tier2-divisions');
      if (divisions && t2.divisions) divisions.textContent = t2.divisions;
      const goalies = document.getElementById('tier2-goaltending');
      if (goalies && t2.goaltending) goalies.textContent = t2.goaltending;
      const tournaments = document.getElementById('tier2-tournaments');
      if (tournaments && t2.tournaments) tournaments.textContent = t2.tournaments;

      const regBtn = document.getElementById('tier2-reg-btn');
      if (regBtn) {
        if (t2.registerButtonText) regBtn.textContent = t2.registerButtonText;
        if (t2.registerUrl && t2.registerUrl.trim()) {
          regBtn.onclick = () => window.open(t2.registerUrl.trim(), '_blank');
        } else {
          regBtn.onclick = () => window.openTryoutModal();
        }
      }
    }
  }

  // 3. Camps & Clinics
  if (campsContainer) {
    if (isCampsVisible && content.camps && Array.isArray(content.camps.items) && content.camps.items.length > 0) {
      const c = content.camps;
      campsContainer.innerHTML = `
        <div class="camps-showcase" style="margin-top: 3.5rem; padding-top: 3rem; border-top: 1px solid var(--border-subtle);">
          <div class="section-header" style="text-align: center; margin-bottom: 2rem;">
            <div class="section-tag">${c.sectionTag || 'Player Development & Skills'}</div>
            <h3 class="section-title" style="font-size: 2rem; color: #fff;">${c.title || 'Camps & Clinics'}</h3>
            <p class="section-subtitle">${c.subtitle || ''}</p>
          </div>
          <div class="camps-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
            ${c.items.map(item => `
              <div class="tryout-card" style="display: flex; flex-direction: column; justify-content: space-between; border-color: rgba(245, 166, 35, 0.25);">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <span class="tryout-badge" style="background: rgba(245, 166, 35, 0.15); color: var(--chiefs-gold); border-color: rgba(245, 166, 35, 0.4);">${item.badge || 'Clinic'}</span>
                    <span style="font-weight: 800; color: #fff; font-size: 1.1rem;">${item.price || ''}</span>
                  </div>
                  <h3 class="tryout-title" style="font-size: 1.25rem; margin-bottom: 0.5rem;">${item.title}</h3>
                  <p class="tryout-desc" style="margin-bottom: 1rem; font-size: 0.88rem;">${item.desc || ''}</p>
                  <ul class="tryout-details-list" style="margin-bottom: 1.5rem;">
                    <li>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
                      <strong>Dates:</strong> <span>${item.dates || 'TBD'}</span>
                    </li>
                    <li>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
                      <strong>Ages:</strong> <span>${item.ages || 'All Ages'}</span>
                    </li>
                    <li>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
                      <strong>Location:</strong> <span>${item.location || 'Ice Land Arena'}</span>
                    </li>
                  </ul>
                </div>
                <a href="${item.registerUrl || 'javascript:void(0)'}" ${item.registerUrl ? 'target="_blank"' : ''} class="btn-primary" style="text-align: center; justify-content: center; width: 100%;">
                  Register for Camp ↗
                </a>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      campsContainer.style.display = '';
    } else {
      campsContainer.innerHTML = '';
      campsContainer.style.display = 'none';
    }
  }

  // 4. Arena & Facilities (Smart Multi-Rink Support)
  if (content.arena) {
    const a = content.arena;

    // Determine rinks list (support both array of rinks or fallback legacy single object)
    let rinks = [];
    if (Array.isArray(a.rinks) && a.rinks.length > 0) {
      rinks = a.rinks;
    } else if (a.title) {
      rinks = [{
        name: a.title,
        tag: a.tag || 'Home Facility',
        desc: a.desc || '',
        address: a.address || '',
        phone: a.phone || '',
        mapUrl: a.mapUrl || '',
        amenities: Array.isArray(a.amenities) ? a.amenities : []
      }];
    }

    const isSingleRink = rinks.length <= 1;
    const dynamicNavLabel = isSingleRink ? 'Home Rink' : 'Home Rinks';
    const dynamicTag = isSingleRink ? 'Home Facility' : 'Home Facilities';
    const dynamicSectionTitle = isSingleRink ? 'Home Rink & Facility' : 'Home Rinks & Facilities';

    const tag = document.getElementById('arena-facility-tag');
    if (tag) {
      tag.textContent = (a.sectionTag && a.sectionTag !== 'Home Facilities' && a.sectionTag !== 'Home Facility') ? a.sectionTag : dynamicTag;
    }

    const title = document.getElementById('arena-section-title');
    if (title) {
      title.textContent = (a.sectionTitle && a.sectionTitle !== 'Home Rinks & Facilities' && a.sectionTitle !== 'Home Rink & Facility' && a.sectionTitle !== 'Home Rink/s & Facilities') ? a.sectionTitle : dynamicSectionTitle;
    }

    const subtitle = document.getElementById('arena-section-subtitle');
    if (subtitle && a.sectionSubtitle) subtitle.textContent = a.sectionSubtitle;

    const navLink = document.getElementById('nav-link-arena');
    if (navLink) {
      // Dynamic smart labeling: 1 rink => "Home Rink", multiple => "Home Rinks"
      if (!a.navLabel || a.navLabel === 'Home Rink/s' || a.navLabel === 'Home Rink' || a.navLabel === 'Home Rinks') {
        navLink.textContent = dynamicNavLabel;
      } else {
        navLink.textContent = a.navLabel;
      }
    }

    const rinksContainer = document.getElementById('arena-rinks-container');
    if (rinksContainer && rinks.length > 0) {
      rinksContainer.innerHTML = rinks.map((rink) => {
        const parts = (rink.address || '').split(',');
        const line1 = parts[0]?.trim() || rink.address || '';
        const line2 = parts.slice(1).join(',').trim() || '';
        const amenities = Array.isArray(rink.amenities) ? rink.amenities : [];

        return `
          <div class="arena-card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                <span class="tryout-badge" style="background: rgba(245, 166, 35, 0.15); color: var(--chiefs-gold); border-color: rgba(245, 166, 35, 0.4);">${rink.tag || 'Home Facility'}</span>
                ${rink.phone ? `<a href="tel:${String(rink.phone).replace(/[^0-9]/g, '')}" style="color: var(--text-muted); font-size: 0.85rem; text-decoration: none;">📞 ${rink.phone}</a>` : ''}
              </div>
              <h3 style="font-size: 1.5rem; color: #fff; margin-bottom: 0.75rem;">${rink.name || 'Ice Arena'}</h3>
              <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.92rem; margin-bottom: 1.25rem;">
                ${rink.desc || ''}
              </p>

              ${amenities.length > 0 ? `
                <div class="arena-amenities-grid" style="margin: 1rem 0 1.5rem 0;">
                  ${amenities.map(item => `
                    <div class="amenity-item" style="padding: 0.55rem 0.75rem; font-size: 0.84rem;">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--chiefs-gold)" stroke-width="2" style="flex-shrink: 0;">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      <span>${item}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            <div style="margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
              <div>
                <div style="font-weight: 700; color: #fff; font-size: 0.92rem;">${line1}</div>
                ${line2 ? `<div style="font-size: 0.84rem; color: var(--text-secondary);">${line2}</div>` : ''}
              </div>
              ${rink.mapUrl ? `
                <a href="${rink.mapUrl}" target="_blank" class="btn-secondary" style="font-size: 0.82rem; padding: 0.45rem 0.9rem;">
                  Get Directions ↗
                </a>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    // Broadcast card
    const bTag = document.getElementById('arena-broadcast-tag');
    if (bTag && a.broadcastTag) bTag.textContent = a.broadcastTag;
    const bTitle = document.getElementById('arena-broadcast-title');
    if (bTitle && a.broadcastTitle) bTitle.textContent = a.broadcastTitle;
    const bDesc = document.getElementById('arena-broadcast-desc');
    if (bDesc && a.broadcastDesc) bDesc.textContent = a.broadcastDesc;
    const bLink = document.getElementById('arena-broadcast-link');
    if (bLink && a.broadcastUrl) bLink.href = a.broadcastUrl;
  }

  // 5. Billet Modal
  if (content.billetModal) {
    const b = content.billetModal;
    const gold = document.getElementById('billet-modal-gold-tag');
    if (gold && b.goldTag) gold.textContent = b.goldTag;
    const title = document.getElementById('billet-modal-title');
    if (title && b.title) title.textContent = b.title;
    const desc = document.getElementById('billet-modal-desc');
    if (desc && b.desc) desc.textContent = b.desc;
    const stipend = document.getElementById('billet-modal-stipend');
    if (stipend && b.stipend) stipend.textContent = b.stipend;
    const perk1 = document.getElementById('billet-modal-perk1');
    if (perk1 && b.perk1) perk1.textContent = b.perk1;
    const perk2 = document.getElementById('billet-modal-perk2');
    if (perk2 && b.perk2) perk2.textContent = b.perk2;
  }

  // 6. Tryout Modal & Dynamic Evaluation / Camp Buttons
  if (content.tryoutModal) {
    const tr = content.tryoutModal;
    const gold = document.getElementById('tryout-modal-gold-tag');
    if (gold && tr.goldTag) gold.textContent = tr.goldTag;
    const title = document.getElementById('tryout-modal-title');
    if (title && tr.title) title.textContent = tr.title;
    const desc = document.getElementById('tryout-modal-desc');
    if (desc && tr.desc) {
      desc.textContent = tr.desc;
      desc.style.whiteSpace = 'pre-line';
    }

    // Dynamic Button Label across Website (Video Section callout, Navbar, Mobile Nav)
    const buttonLabel = (tr.buttonText || tr.title || '').trim();
    if (buttonLabel) {
      const progBtn = document.getElementById('prog-tryout-btn');
      if (progBtn) progBtn.textContent = buttonLabel;

      const navBtn = document.getElementById('nav-tryout-btn');
      if (navBtn) navBtn.textContent = buttonLabel;

      const mobBtn = document.getElementById('mobile-tryout-btn');
      if (mobBtn) {
        mobBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          ${buttonLabel}
        `;
      }
    }

    // Modal Display: External Registration Link vs. Built-in Internal Form
    const extContainer = document.getElementById('tryout-modal-external-container');
    const extLink = document.getElementById('tryout-modal-external-link');
    const form = document.getElementById('tryout-register-form');
    const submitBtn = document.getElementById('tryout-submit-btn');

    const extUrl = (tr.externalRegisterUrl || '').trim();
    if (extUrl) {
      if (extContainer) extContainer.style.display = 'block';
      if (form) form.style.display = 'none';
      if (extLink) {
        extLink.href = extUrl;
        const targetTitle = tr.title || 'Registration';
        const linkText = targetTitle.toLowerCase().includes('register')
          ? targetTitle
          : `Register for ${targetTitle}`;
        extLink.innerHTML = `${linkText} &nearr;`;
      }
    } else {
      if (extContainer) extContainer.style.display = 'none';
      if (form) form.style.display = 'block';
      if (submitBtn && tr.title) {
        submitBtn.textContent = `Complete ${tr.title} Registration`;
      }
    }
  }

  // 7. Club Branding & Theme (Colors, Logos, Names)
  if (content.branding) {
    applyClubBranding(content.branding);
  }

  // 8. Coaching Staff & Front Office Directory
  if (Array.isArray(content.staff) && content.staff.length > 0) {
    initStaff();
  }

  // 9. Published News Articles (Shared Across All Visitors)
  if (Array.isArray(content.newsArticles) && content.newsArticles.length > 0) {
    try {
      localStorage.setItem('mercer_club_news', JSON.stringify(content.newsArticles));
      initNews();
    } catch (e) {}
  }

  // 10. Hero League Badges Visibility
  updateHeroLeagueBadgesVisibility(content);
}

export function hexToRgba(hex, alpha) {
  if (!hex) return '';
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  if (isNaN(num)) return '';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function adjustHex(hex, percent) {
  if (!hex) return '';
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 255) + Math.round(255 * (percent / 100));
  let b = (num & 255) + Math.round(255 * (percent / 100));
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function applyClubBranding(b) {
  if (!b) return;

  // 1. Color Palette Tokens & Dynamic CSS Variables
  if (b.colors) {
    const root = document.documentElement;
    const { primary, accent, bgDeep, bgCard } = b.colors;

    if (primary) {
      root.style.setProperty('--chiefs-red', primary);
      root.style.setProperty('--chiefs-red-dark', adjustHex(primary, -22));
      root.style.setProperty('--chiefs-red-hover', adjustHex(primary, 15));
      root.style.setProperty('--chiefs-red-glow', hexToRgba(primary, 0.45));
      root.style.setProperty('--border-glow-red', hexToRgba(primary, 0.45));
    }

    if (accent) {
      root.style.setProperty('--chiefs-gold', accent);
      root.style.setProperty('--chiefs-gold-dark', adjustHex(accent, -22));
      root.style.setProperty('--chiefs-gold-light', adjustHex(accent, 20));
      root.style.setProperty('--chiefs-gold-glow', hexToRgba(accent, 0.4));
      root.style.setProperty('--chiefs-gold-muted', hexToRgba(accent, 0.15));
      root.style.setProperty('--border-glow-gold', hexToRgba(accent, 0.4));
      root.style.setProperty('--text-accent', accent);
    }

    if (bgDeep) {
      root.style.setProperty('--bg-deep', bgDeep);
      root.style.setProperty('--bg-surface', adjustHex(bgDeep, 6));
    }

    if (bgCard) {
      root.style.setProperty('--bg-card', hexToRgba(bgCard, 0.88));
      root.style.setProperty('--bg-card-hover', hexToRgba(adjustHex(bgCard, 8), 0.94));
    }
  }

  // 2. Logos & Icons
  if (b.crestLogo) {
    const brandLogo = document.getElementById('site-brand-logo');
    if (brandLogo) brandLogo.src = b.crestLogo;
    const progCrest = document.getElementById('prog-crest-logo');
    if (progCrest) progCrest.src = b.crestLogo;
    const footerCrest = document.getElementById('footer-crest-logo');
    if (footerCrest) footerCrest.src = b.crestLogo;
    document.querySelectorAll('.modal-crest-logo').forEach(img => img.src = b.crestLogo);
  } else if (b.wordmarkLogo) {
    const brandLogo = document.getElementById('site-brand-logo');
    if (brandLogo) brandLogo.src = b.wordmarkLogo;
  }

  // Wordmark banner support (hero / secondary brand elements)
  if (b.wordmarkLogo) {
    const heroWordmark = document.getElementById('hero-wordmark-logo');
    if (heroWordmark) {
      heroWordmark.src = b.wordmarkLogo;
      heroWordmark.style.display = 'inline-block';
    }
  }

  if (b.favicon) {
    const fav = document.getElementById('site-favicon');
    if (fav) fav.href = b.favicon;
  }

  // 3. Club Names & Typography
  const brandWordmark = document.getElementById('site-brand-wordmark');
  const navTitle = document.getElementById('site-brand-title');
  const headerMode = b.headerLogoMode || 'text';
  const sty = b.shortNameStyle || {};

  if (navTitle) {
    const ffMap = {
      'Outfit': "'Outfit', sans-serif",
      'Teko': "'Teko', sans-serif",
      'Bebas Neue': "'Bebas Neue', sans-serif",
      'Montserrat': "'Montserrat', sans-serif",
      'Inter': "'Inter', sans-serif",
      'Impact': "Impact, 'Arial Black', sans-serif"
    };

    if (sty.fontFamily) navTitle.style.fontFamily = ffMap[sty.fontFamily] || sty.fontFamily;
    if (sty.fontSize) navTitle.style.fontSize = sty.fontSize;
    if (sty.fontStyle) navTitle.style.fontStyle = sty.fontStyle;
    if (sty.textTransform) navTitle.style.textTransform = sty.textTransform;
    if (sty.color) navTitle.style.color = sty.color;

    const shadowType = sty.shadowType || 'subtle';
    const glowCol = sty.glowColor || (b.colors && b.colors.primary) || '#BD323B';
    if (shadowType === 'none') {
      navTitle.style.textShadow = 'none';
    } else if (shadowType === 'subtle') {
      navTitle.style.textShadow = '0 2px 8px rgba(0, 0, 0, 0.6)';
    } else if (shadowType === 'deep') {
      navTitle.style.textShadow = '0 3px 12px rgba(0, 0, 0, 0.9)';
    } else if (shadowType === 'glow' || shadowType === 'glow-red' || shadowType === 'glow-gold') {
      const activeGlow = (shadowType === 'glow-red') ? '#BD323B' : ((shadowType === 'glow-gold') ? '#F5A623' : glowCol);
      try {
        navTitle.style.textShadow = `0 0 12px ${hexToRgba(activeGlow, 0.8)}`;
      } catch (e) {
        navTitle.style.textShadow = `0 0 12px ${activeGlow}`;
      }
    }

    const tt = sty.textTransform || 'uppercase';
    const rawShort = b.shortName || 'CHIEFS';
    const formattedShort = (tt === 'none') ? rawShort : ((tt === 'uppercase') ? rawShort.toUpperCase() : rawShort);

    if (brandWordmark) {
      if (headerMode === 'wordmark_text' && b.wordmarkLogo) {
        brandWordmark.src = b.wordmarkLogo;
        brandWordmark.style.display = 'inline-block';
        brandWordmark.style.height = '32px';
        brandWordmark.style.maxWidth = '150px';
        if (b.shortName && b.shortName.trim()) {
          navTitle.style.display = 'inline-block';
          navTitle.textContent = formattedShort;
          const nudge = sty.verticalOffset !== undefined ? sty.verticalOffset : 2.5;
          navTitle.style.transform = `translateY(${nudge}px)`;
        } else {
          navTitle.style.display = 'none';
          navTitle.style.transform = 'none';
        }
      } else if (headerMode === 'wordmark_only' && b.wordmarkLogo) {
        brandWordmark.src = b.wordmarkLogo;
        brandWordmark.style.display = 'inline-block';
        brandWordmark.style.height = '38px';
        brandWordmark.style.maxWidth = '180px';
        navTitle.style.display = 'none';
        navTitle.style.transform = 'none';
      } else {
        // 'text' mode: clean standard typography
        brandWordmark.style.display = 'none';
        navTitle.style.display = 'inline-block';
        navTitle.textContent = formattedShort;
        navTitle.style.transform = 'none';
      }
    } else {
      navTitle.textContent = formattedShort;
    }
  }

  const footerTitle = document.getElementById('footer-brand-title');
  if (footerTitle) {
    const fullClub = (b.clubName && b.clubName.toLowerCase().includes('chiefs')) 
      ? b.clubName 
      : ((b.shortName && b.shortName.toLowerCase() !== 'chiefs') ? b.shortName : 'MERCER CHIEFS');
    footerTitle.textContent = fullClub.toUpperCase();
  }

  if (b.tagline) {
    const navSub = document.getElementById('site-brand-sub');
    if (navSub) navSub.textContent = b.tagline.toUpperCase();
  }

  if (b.founded && b.shortName) {
    const footerSub = document.getElementById('footer-brand-sub');
    if (footerSub) footerSub.textContent = `HOCKEY CLUB • EST. ${b.founded}`;
  }

  if (b.description) {
    const footerDesc = document.getElementById('footer-brand-desc');
    if (footerDesc) footerDesc.textContent = b.description;
  }

  if (b.clubName) {
    document.title = `${b.clubName} | Official Website`;
    const copyEl = document.getElementById('footer-copyright-text');
    if (copyEl) {
      const year = new Date().getFullYear();
      copyEl.textContent = `© ${year} ${b.clubName}. All rights reserved. Member of Black Bear Sports Group.`;
    }
  }
}

/* ==========================================================================
   2. JUNIOR TEAM SELECTOR (NCDC vs USPHL PREMIER)
   ========================================================================== */
function initJuniorTeamSwitcher() {
  const switchBtns = document.querySelectorAll('.team-switch-btn[data-team]');
  switchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const teamKey = btn.dataset.team;
      if (state.currentJuniorTeam === teamKey) return;

      switchBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      state.currentJuniorTeam = teamKey;

      const teamData = getCurrentJuniorData();

      // Update Section Header Tag, Title, and Subtitle
      const tagImg = document.getElementById('junior-hub-tag-img');
      const tagText = document.getElementById('junior-hub-tag-text');
      const titleSpan = document.getElementById('junior-hub-title-span');
      const subtitle = document.getElementById('junior-hub-subtitle');

      if (teamKey === 'premier') {
        if (tagImg) tagImg.src = 'assets/images/usphl-premier-logo.png';
        if (tagText) tagText.textContent = 'USPHL Premier Junior Hockey';
        if (titleSpan) titleSpan.textContent = 'Premier Center';
        if (subtitle) subtitle.textContent = 'Official 2026-27 USPHL Premier roster, schedule, results, standings, player bios and headshots.';
      } else {
        if (tagImg) tagImg.src = 'assets/images/ncdc-logo.png';
        if (tagText) tagText.textContent = 'NCDC Tier II Tuition-Free Junior Hockey';
        if (titleSpan) titleSpan.textContent = 'NCDC Center';
        if (subtitle) subtitle.textContent = 'Official 2026-27 NCDC roster, schedule, results, standings, player bios and headshots.';
      }

      // Reset filters and search for clean UX
      state.rosterFilter = 'all';
      state.rosterSearch = '';
      const searchInput = document.getElementById('roster-search');
      if (searchInput) searchInput.value = '';
      document.querySelectorAll('.filter-btn[data-pos]').forEach(b => {
        b.classList.toggle('active', b.dataset.pos === 'all');
      });

      // Re-render components
      renderRoster();
      renderSchedule();
      initStandings();
      initLeaders();
    });
  });
}

/* ==========================================================================
   2b. JUNIOR TABS CONTROLLER
   ========================================================================== */
function initNcdcTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn[data-tab]');
  const tabsBar = document.getElementById('ncdc-tabs-bar');
  const wrapper = document.getElementById('junior-tabs-wrapper');

  function updateTabsScrollIndicator() {
    if (!tabsBar || !wrapper) return;
    const maxScroll = tabsBar.scrollWidth - tabsBar.clientWidth;
    if (maxScroll <= 4) {
      wrapper.classList.remove('can-scroll-left', 'can-scroll-right');
      return;
    }
    wrapper.classList.toggle('can-scroll-left', tabsBar.scrollLeft > 6);
    wrapper.classList.toggle('can-scroll-right', tabsBar.scrollLeft < maxScroll - 6);
  }

  if (tabsBar) {
    tabsBar.addEventListener('scroll', updateTabsScrollIndicator, { passive: true });
    window.addEventListener('resize', updateTabsScrollIndicator, { passive: true });
    setTimeout(updateTabsScrollIndicator, 120);
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentTab = btn.dataset.tab;

      // Smoothly center tab only if the tab bar has horizontal overflow
      if (tabsBar && tabsBar.scrollWidth > tabsBar.clientWidth + 8) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }

      document.querySelectorAll('.tab-content-panel').forEach(panel => {
        panel.classList.remove('active');
      });
      const activePanel = document.getElementById(`panel-${state.currentTab}`);
      if (activePanel) activePanel.classList.add('active');

      setTimeout(updateTabsScrollIndicator, 250);
    });
  });

  window.switchJuniorTab = function (tabName) {
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (tabBtn) {
      tabBtn.click();
    }
  };
}

/* ==========================================================================
   3. NCDC ROSTER
   ========================================================================== */
function initRoster() {
  const filterBtns = document.querySelectorAll('.filter-btn[data-pos]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.rosterFilter = btn.dataset.pos;
      renderRoster();
    });
  });

  const searchInput = document.getElementById('roster-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.rosterSearch = e.target.value.toLowerCase().trim();
      renderRoster();
    });
  }

  renderRoster();
}

function renderRoster() {
  const container = document.getElementById('roster-cards-container');
  if (!container) return;

  const currentRoster = getCurrentJuniorData().roster;

  const filtered = currentRoster.filter(player => {
    const matchesPos = state.rosterFilter === 'all' || player.position === state.rosterFilter;
    const matchesSearch = !state.rosterSearch ||
      player.name.toLowerCase().includes(state.rosterSearch) ||
      player.hometown.toLowerCase().includes(state.rosterSearch) ||
      player.number.toString().includes(state.rosterSearch);
    return matchesPos && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
        <p style="color: var(--text-secondary); font-size: 1.1rem;">No players found matching your criteria.</p>
        <button class="btn-secondary" style="margin-top: 1rem;" id="clear-filters-btn">Reset Filters</button>
      </div>
    `;
    document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
      state.rosterFilter = 'all';
      state.rosterSearch = '';
      const input = document.getElementById('roster-search');
      if (input) input.value = '';
      document.querySelectorAll('.filter-btn[data-pos]').forEach(b => {
        b.classList.toggle('active', b.dataset.pos === 'all');
      });
      renderRoster();
    });
    return;
  }

  container.innerHTML = filtered.map(player => {
    const isGoalie = player.position === 'G';
    const isCommitted = Boolean(player.commitment);
    const shootsCatchesText = isGoalie
      ? `Catches ${player.shoots || 'L'}`
      : `Shoots ${player.shoots || 'L'}`;

    return `
      <div class="player-card" data-number="${player.number}">
        <div class="player-card-header">
          <div class="player-headshot-wrap">
            <img src="${player.headshot || 'assets/images/player-placeholder-circle.png'}" 
                 alt="${player.name}" 
                 class="player-headshot-img"
                 onerror="this.onerror=null; this.src='assets/images/player-placeholder-circle.png';">
          </div>
          <div class="player-title-info">
            <div class="player-num-name-row">
              <span class="player-number">#${player.number}</span>
              <h3 class="player-name">${player.name}</h3>
            </div>
            <div class="player-meta">
              <span class="player-pos-tag">${isGoalie ? 'G' : player.position}</span>
              <span class="meta-separator">•</span>
              <span>${shootsCatchesText}</span>
              <span class="meta-separator">•</span>
              <span>${player.height} / ${player.weight}</span>
            </div>
            <div class="player-submeta">
              <span>${player.hometown}</span>
              ${player.birthYear ? `<span class="meta-separator">•</span><span>b. ${player.birthYear}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="player-stats-row">
          ${isGoalie ? `
            <div>
              <div class="mini-stat-val">${player.gp}</div>
              <div class="mini-stat-lbl">GP</div>
            </div>
            <div>
              <div class="mini-stat-val">${player.w}-${player.l}</div>
              <div class="mini-stat-lbl">W-L</div>
            </div>
            <div>
              <div class="mini-stat-val">${player.gaa}</div>
              <div class="mini-stat-lbl">GAA</div>
            </div>
            <div>
              <div class="mini-stat-val" style="color: var(--chiefs-gold);">${player.svPct}</div>
              <div class="mini-stat-lbl">SV%</div>
            </div>
          ` : `
            <div>
              <div class="mini-stat-val">${player.gp}</div>
              <div class="mini-stat-lbl">GP</div>
            </div>
            <div>
              <div class="mini-stat-val">${player.g}</div>
              <div class="mini-stat-lbl">G</div>
            </div>
            <div>
              <div class="mini-stat-val">${player.a}</div>
              <div class="mini-stat-lbl">A</div>
            </div>
            <div>
              <div class="mini-stat-val" style="color: var(--chiefs-gold);">${player.pts}</div>
              <div class="mini-stat-lbl">PTS</div>
            </div>
          `}
        </div>

        ${player.commitment ? `
          <div class="player-commit-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            <span>${player.commitment}</span>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Add click listeners to player cards
  container.querySelectorAll('.player-card').forEach(card => {
    card.addEventListener('click', () => {
      const num = parseInt(card.dataset.number, 10);
      const player = currentRoster.find(p => p.number === num);
      if (player) openPlayerModal(player);
    });
  });
}

function openPlayerModal(player) {
  const modal = document.getElementById('player-bio-modal');
  if (!modal) return;

  const isGoalie = player.position === 'G';
  const modalContent = document.getElementById('player-bio-content');
  if (!modalContent) return;

  const teamData = getCurrentJuniorData();
  const shootsCatchesText = isGoalie ? `Catches ${player.shoots || 'L'}` : `Shoots ${player.shoots || 'L'}`;
  const posFull = isGoalie ? 'Goaltender' : player.position === 'D' ? 'Defenseman' : 'Forward';

  modalContent.innerHTML = `
    <div class="modal-player-bio-header">
      <div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;">
        <div class="modal-player-headshot">
          <img src="${player.fullPhoto || player.headshot || 'assets/images/player-placeholder-circle.png'}" 
               alt="${player.name}"
               onerror="this.onerror=null; this.src='assets/images/player-placeholder-circle.png';">
        </div>
        <div>
          <div style="display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
            <span class="modal-player-number">#${player.number}</span>
            <h2 style="font-family: var(--font-heading); font-size: 2.2rem; font-weight: 800; color: #fff; line-height: 1.1; margin: 0;">${player.name}</h2>
          </div>
          <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; margin-top: 0.35rem;">
            <span class="modal-team-tag">
              ${teamData.name} • ${posFull}
            </span>
          </div>
        </div>
      </div>
      <img src="${teamData.logo || 'assets/images/mercer-chiefs-crest.png'}" 
           alt="League Logo" style="height: 56px; width: auto; object-fit: contain; opacity: 0.9;">
    </div>

    <!-- Official Bio Attributes Grid -->
    <div class="modal-bio-grid">
      <div>
        <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Hometown</div>
        <div style="font-size: 0.95rem; font-weight: 700; color: #fff; margin-top: 0.2rem;">${player.hometown}</div>
      </div>
      <div>
        <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Date of Birth</div>
        <div style="font-size: 0.95rem; font-weight: 700; color: #fff; margin-top: 0.2rem;">${player.dob || player.birthYear}</div>
      </div>
      <div>
        <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Height & Weight</div>
        <div style="font-size: 0.95rem; font-weight: 700; color: #fff; margin-top: 0.2rem;">${player.height}, ${player.weight}</div>
      </div>
      <div>
        <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">${isGoalie ? 'Catches' : 'Shoots'}</div>
        <div style="font-size: 0.95rem; font-weight: 700; color: var(--chiefs-gold); margin-top: 0.2rem;">${player.shoots || 'L'}</div>
      </div>
    </div>

    <!-- Official Season Statistics -->
    <div style="margin-bottom: 1.5rem;">
      <h4 style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
        <span style="display: inline-block; width: 4px; height: 16px; background: var(--chiefs-red); border-radius: 2px;"></span>
        Official 2026-27 Season Statistics
      </h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 0.75rem; background: rgba(0,0,0,0.45); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); text-align: center;">
        ${isGoalie ? `
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #fff;">${player.gp}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">GP</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #fff;">${player.w}-${player.l}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">W-L</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #fff;">${player.gaa}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">GAA</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: var(--chiefs-gold);">${player.svPct}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">SV%</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #fff;">${player.sv}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Saves</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #cbd5e1;">${player.sa}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Shots</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #cbd5e1;">${player.so || 0}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">SO</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #cbd5e1;">${player.pim || 0}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">PIM</div>
          </div>
        ` : `
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #fff;">${player.gp}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">GP</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #fff;">${player.g}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Goals</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #fff;">${player.a}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Assists</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: var(--chiefs-gold);">${player.pts}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">PTS</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #cbd5e1;">${player.pim || 0}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">PIM</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #cbd5e1;">${player.ppg || 0}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">PPG</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #cbd5e1;">${player.shg || 0}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">SHG</div>
          </div>
          <div>
            <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; color: #cbd5e1;">${player.gwg || 0}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">GWG</div>
          </div>
        `}
      </div>
    </div>

    ${player.commitment ? `
      <div style="background: rgba(245, 166, 35, 0.1); border: 1px solid rgba(245, 166, 35, 0.3); border-radius: var(--radius-md); padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
        <div>
          <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--chiefs-gold);">College Commitment</span>
          <p style="font-size: 1.1rem; font-weight: 700; color: #fff; margin-top: 0.2rem;">${player.commitment}</p>
        </div>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--chiefs-gold)" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
      </div>
    ` : ''}

    <div style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: flex-end;">
      <button class="btn-secondary" onclick="document.getElementById('player-bio-modal').classList.remove('open')">Close</button>
      <button class="btn-primary" onclick="openScoutModalWithPlayer('${player.name}')">Request Scout Package</button>
    </div>
  `;

  modal.classList.add('open');
}

/* ==========================================================================
   4. JUNIOR SCHEDULE & RESULTS
   ========================================================================== */
function initSchedule() {
  const filterBtns = document.querySelectorAll('.schedule-filter-btn[data-filter]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.scheduleFilter = btn.dataset.filter;
      renderSchedule();
    });
  });

  renderSchedule();
}

const OPPONENT_LOGOS = {
  'bassano beavers': 'assets/images/logos/bassano-beavers.png',
  'bassano-beavers': 'assets/images/logos/bassano-beavers.png',
  'bjb': 'assets/images/logos/boston-jr-bruins.png',
  'bjr': 'assets/images/logos/boston-jr-rangers.png',
  'bjt': 'assets/images/logos/boston-jr-terriers.png',
  'boston jr bruins': 'assets/images/logos/boston-jr-bruins.png',
  'boston jr rangers': 'assets/images/logos/boston-jr-rangers.png',
  'boston jr terriers': 'assets/images/logos/boston-jr-terriers.png',
  'boston jr. rangers': 'assets/images/logos/boston-jr-rangers.png',
  'boston-jr-bruins': 'assets/images/logos/boston-jr-bruins.png',
  'boston-jr-rangers': 'assets/images/logos/boston-jr-rangers.png',
  'boston-jr-terriers': 'assets/images/logos/boston-jr-terriers.png',
  'bremerton sockeyes': 'assets/images/logos/bremerton-sockeyes.png',
  'bremerton-sockeyes': 'assets/images/logos/bremerton-sockeyes.png',
  'brs': 'assets/images/logos/bremerton-sockeyes.png',
  'bsb': 'assets/images/logos/bassano-beavers.png',
  'ca': 'assets/images/logos/cyclones-academy.png',
  'calgary bandits': 'assets/images/logos/calgary-bandits.png',
  'calgary-bandits': 'assets/images/logos/calgary-bandits.png',
  'carolina junior hurricanes': 'assets/images/logos/carolina-junior-hurricanes.png',
  'carolina-junior-hurricanes': 'assets/images/logos/carolina-junior-hurricanes.png',
  'casper warbirds': 'assets/images/logos/casper-warbirds.png',
  'casper-warbirds': 'assets/images/logos/casper-warbirds.png',
  'cc': 'assets/images/logos/connecticut-chiefs.png',
  'charleston colonials': 'assets/images/logos/charleston-colonials.png',
  'charleston-colonials': 'assets/images/logos/charleston-colonials.png',
  'charlotte rush': 'assets/images/logos/charlotte-rush.png',
  'charlotte-rush': 'assets/images/logos/charlotte-rush.png',
  'chc': 'assets/images/logos/claresholm-cowboys.png',
  'chestermere mustangs': 'assets/images/logos/chestermere-mustangs.png',
  'chestermere-mustangs': 'assets/images/logos/chestermere-mustangs.png',
  'chicago crush': 'assets/images/logos/chicago-crush.png',
  'chicago union': 'assets/images/logos/chicago-union.png',
  'chicago-crush': 'assets/images/logos/chicago-crush.png',
  'chicago-union': 'assets/images/logos/chicago-union.png',
  'chiefs': 'assets/images/logos/mercer-chiefs-junior.png',
  'cin': 'assets/images/logos/cincinnati-cyclones.png',
  'cincinnati cyclones': 'assets/images/logos/cincinnati-cyclones.png',
  'cincinnati-cyclones': 'assets/images/logos/cincinnati-cyclones.png',
  'cjh': 'assets/images/logos/carolina-junior-hurricanes.png',
  'cjr': 'assets/images/logos/connecticut-junior-rangers.png',
  'claresholm cowboys': 'assets/images/logos/claresholm-cowboys.png',
  'claresholm-cowboys': 'assets/images/logos/claresholm-cowboys.png',
  'clg': 'assets/images/logos/calgary-bandits.png',
  'cm': 'assets/images/logos/columbus-mavericks.png',
  'columbus mavericks': 'assets/images/logos/columbus-mavericks.png',
  'columbus-mavericks': 'assets/images/logos/columbus-mavericks.png',
  'connecticut chiefs': 'assets/images/logos/connecticut-chiefs.png',
  'connecticut junior rangers': 'assets/images/logos/connecticut-junior-rangers.png',
  'connecticut roughriders': 'assets/images/logos/connecticut-roughriders.png',
  'connecticut-chiefs': 'assets/images/logos/connecticut-chiefs.png',
  'connecticut-junior-rangers': 'assets/images/logos/connecticut-junior-rangers.png',
  'connecticut-roughriders': 'assets/images/logos/connecticut-roughriders.png',
  'coral springs jr cats': 'assets/images/logos/coral-springs-jr-cats.png',
  'coral springs jr. cats': 'assets/images/logos/coral-springs-jr-cats.png',
  'coral-springs-jr-cats': 'assets/images/logos/coral-springs-jr-cats.png',
  'cr': 'assets/images/logos/charlotte-rush.png',
  'cru': 'assets/images/logos/chicago-crush.png',
  'csc': 'assets/images/logos/coral-springs-jr-cats.png',
  'ct jr rangers': 'assets/images/logos/connecticut-junior-rangers.png',
  'ct junior rangers': 'assets/images/logos/connecticut-junior-rangers.png',
  'ctr': 'assets/images/logos/connecticut-roughriders.png',
  'cu': 'assets/images/logos/chicago-union.png',
  'cus': 'assets/images/logos/universel-sherbrooke.png',
  'cwb': 'assets/images/logos/casper-warbirds.png',
  'cyc': 'assets/images/logos/northern-cyclones.png',
  'cyclones academy': 'assets/images/logos/cyclones-academy.png',
  'cyclones-academy': 'assets/images/logos/cyclones-academy.png',
  'danville iron': 'assets/images/logos/danville-iron.png',
  'danville-iron': 'assets/images/logos/danville-iron.png',
  'del': 'assets/images/logos/dells-ducks.png',
  'dells ducks': 'assets/images/logos/dells-ducks.png',
  'dells-ducks': 'assets/images/logos/dells-ducks.png',
  'deux-montagnes ravens': 'assets/images/logos/deux-montagnes-ravens.png',
  'deux-montagnes-ravens': 'assets/images/logos/deux-montagnes-ravens.png',
  'deuxmontagnes ravens': 'assets/images/logos/deux-montagnes-ravens.png',
  'di': 'assets/images/logos/danville-iron.png',
  'dmr': 'assets/images/logos/deux-montagnes-ravens.png',
  'fcf': 'assets/images/logos/fresh-coast-freeze.png',
  'fi': 'assets/images/logos/flint-icelanders.png',
  'fjb': 'assets/images/logos/florida-junior-blades.png',
  'fle': 'assets/images/logos/florida-eels.png',
  'flint icelanders': 'assets/images/logos/flint-icelanders.png',
  'flint-icelanders': 'assets/images/logos/flint-icelanders.png',
  'florida eels': 'assets/images/logos/florida-eels.png',
  'florida junior blades': 'assets/images/logos/florida-junior-blades.png',
  'florida surge': 'assets/images/logos/florida-surge.png',
  'florida-eels': 'assets/images/logos/florida-eels.png',
  'florida-junior-blades': 'assets/images/logos/florida-junior-blades.png',
  'florida-surge': 'assets/images/logos/florida-surge.png',
  'fm': 'assets/images/logos/fresno-monsters.png',
  'fort wayne spacemen': 'assets/images/logos/fort-wayne-spacemen.png',
  'fort-wayne-spacemen': 'assets/images/logos/fort-wayne-spacemen.png',
  'fresh coast freeze': 'assets/images/logos/fresh-coast-freeze.png',
  'fresh-coast-freeze': 'assets/images/logos/fresh-coast-freeze.png',
  'fresno monsters': 'assets/images/logos/fresno-monsters.png',
  'fresno-monsters': 'assets/images/logos/fresno-monsters.png',
  'fs': 'assets/images/logos/florida-surge.png',
  'fws': 'assets/images/logos/fort-wayne-spacemen.png',
  'gat': 'assets/images/logos/universel-coll-ge-gatineau.png',
  'hampton roads whalers': 'assets/images/logos/hampton-roads-whalers.png',
  'hampton-roads-whalers': 'assets/images/logos/hampton-roads-whalers.png',
  'hanna havoc': 'assets/images/logos/hanna-havoc.png',
  'hanna-havoc': 'assets/images/logos/hanna-havoc.png',
  'hh': 'assets/images/logos/hudson-havoc.png',
  'hit': 'assets/images/logos/jersey-hitmen.png',
  'hk': 'assets/images/logos/hudson-knights.png',
  'hnh': 'assets/images/logos/hanna-havoc.png',
  'hrw': 'assets/images/logos/hampton-roads-whalers.png',
  'hudson havoc': 'assets/images/logos/hudson-havoc.png',
  'hudson knights': 'assets/images/logos/hudson-knights.png',
  'hudson-havoc': 'assets/images/logos/hudson-havoc.png',
  'hudson-knights': 'assets/images/logos/hudson-knights.png',
  'icy': 'assets/images/logos/iron-county-yeti.png',
  'ihc': 'assets/images/logos/islanders-hockey-club.png',
  'iron county yeti': 'assets/images/logos/iron-county-yeti.png',
  'iron-county-yeti': 'assets/images/logos/iron-county-yeti.png',
  'islanders hockey club': 'assets/images/logos/islanders-hockey-club.png',
  'islanders-hockey-club': 'assets/images/logos/islanders-hockey-club.png',
  'jersey hitmen': 'assets/images/logos/jersey-hitmen.png',
  'jersey-hitmen': 'assets/images/logos/jersey-hitmen.png',
  'kingston wranglers': 'assets/images/logos/kingston-wranglers.png',
  'kingston-wranglers': 'assets/images/logos/kingston-wranglers.png',
  'kinni spirit': 'assets/images/logos/kinni-spirit.png',
  'kinni-spirit': 'assets/images/logos/kinni-spirit.png',
  'ks': 'assets/images/logos/kinni-spirit.png',
  'kwr': 'assets/images/logos/kingston-wranglers.png',
  'lake tahoe lakers': 'assets/images/logos/lake-tahoe-lakers.png',
  'lake-tahoe-lakers': 'assets/images/logos/lake-tahoe-lakers.png',
  'lbb': 'assets/images/logos/long-beach-bombers.png',
  'lewiston maineiacs': 'assets/images/logos/lewiston-maineiacs.png',
  'lewiston-maineiacs': 'assets/images/logos/lewiston-maineiacs.png',
  'long beach bombers': 'assets/images/logos/long-beach-bombers.png',
  'long-beach-bombers': 'assets/images/logos/long-beach-bombers.png',
  'ltl': 'assets/images/logos/lake-tahoe-lakers.png',
  'lwm': 'assets/images/logos/lewiston-maineiacs.png',
  'mbo': 'assets/images/logos/minnesota-blue-ox.png',
  'mbv': 'assets/images/logos/montreal-black-vees.png',
  'mccall smokejumpers': 'assets/images/logos/mccall-smokejumpers.png',
  'mccall-smokejumpers': 'assets/images/logos/mccall-smokejumpers.png',
  'mcs': 'assets/images/logos/mccall-smokejumpers.png',
  'mercer chiefs': 'assets/images/logos/mercer-chiefs-junior.png',
  'mercer chiefs (ncdc)': 'assets/images/logos/mercer-chiefs-junior.png',
  'mercer chiefs (premier)': 'assets/images/logos/mercer-chiefs-junior.png',
  'metro jets': 'assets/images/logos/metro-jets.png',
  'metro-jets': 'assets/images/logos/metro-jets.png',
  'minnesota blue ox': 'assets/images/logos/minnesota-blue-ox.png',
  'minnesota mullets': 'assets/images/logos/minnesota-mullets.png',
  'minnesota squatch': 'assets/images/logos/minnesota-squatch.png',
  'minnesota-blue-ox': 'assets/images/logos/minnesota-blue-ox.png',
  'minnesota-mullets': 'assets/images/logos/minnesota-mullets.png',
  'minnesota-squatch': 'assets/images/logos/minnesota-squatch.png',
  'mj': 'assets/images/logos/metro-jets.png',
  'mjd': 'assets/images/logos/mjdp.png',
  'mjdp': 'assets/images/logos/mjdp.png',
  'montreal black vees': 'assets/images/logos/montreal-black-vees.png',
  'montreal-black-vees': 'assets/images/logos/montreal-black-vees.png',
  'msq': 'assets/images/logos/minnesota-squatch.png',
  'mul': 'assets/images/logos/minnesota-mullets.png',
  'new': 'assets/images/logos/new-england-wolves.png',
  'new england wolves': 'assets/images/logos/new-england-wolves.png',
  'new jersey renegades': 'assets/images/logos/new-jersey-renegades.png',
  'new york dynamo': 'assets/images/logos/new-york-dynamo.png',
  'new-england-wolves': 'assets/images/logos/new-england-wolves.png',
  'new-jersey-renegades': 'assets/images/logos/new-jersey-renegades.png',
  'new-york-dynamo': 'assets/images/logos/new-york-dynamo.png',
  'nj renegades': 'assets/images/logos/new-jersey-renegades.png',
  'njr': 'assets/images/logos/new-jersey-renegades.png',
  'nmp': 'assets/images/logos/northern-maine-pioneers.png',
  'northern cyclones': 'assets/images/logos/northern-cyclones.png',
  'northern cylones': 'assets/images/logos/northern-cyclones.png',
  'northern maine pioneers': 'assets/images/logos/northern-maine-pioneers.png',
  'northern-cyclones': 'assets/images/logos/northern-cyclones.png',
  'northern-maine-pioneers': 'assets/images/logos/northern-maine-pioneers.png',
  'northwest express': 'assets/images/logos/northwest-express.png',
  'northwest-express': 'assets/images/logos/northwest-express.png',
  'nwe': 'assets/images/logos/northwest-express.png',
  'nyd': 'assets/images/logos/new-york-dynamo.png',
  'ojr': 'assets/images/logos/ontario-jr-reign.png',
  'olcn': 'assets/images/logos/olcn-scouts.png',
  'olcn scouts': 'assets/images/logos/olcn-scouts.png',
  'olcn-scouts': 'assets/images/logos/olcn-scouts.png',
  'ontario jr reign': 'assets/images/logos/ontario-jr-reign.png',
  'ontario-jr-reign': 'assets/images/logos/ontario-jr-reign.png',
  'ottawa valley centennials': 'assets/images/logos/ottawa-valley-centennials.png',
  'ottawa-valley-centennials': 'assets/images/logos/ottawa-valley-centennials.png',
  'ovc': 'assets/images/logos/ottawa-valley-centennials.png',
  'p-a-l-junior-islanders': 'assets/images/logos/p-a-l-junior-islanders.png',
  'p.a.l. junior islanders': 'assets/images/logos/p-a-l-junior-islanders.png',
  'pab': 'assets/images/logos/perth-andover-bearcats.png',
  'pal': 'assets/images/logos/p-a-l-junior-islanders.png',
  'pal jr islanders': 'assets/images/logos/p-a-l-junior-islanders.png',
  'pal junior islanders': 'assets/images/logos/p-a-l-junior-islanders.png',
  'park city outliers': 'assets/images/logos/park-city-outliers.png',
  'park-city-outliers': 'assets/images/logos/park-city-outliers.png',
  'pco': 'assets/images/logos/park-city-outliers.png',
  'perth-andover bearcats': 'assets/images/logos/perth-andover-bearcats.png',
  'perth-andover-bearcats': 'assets/images/logos/perth-andover-bearcats.png',
  'perthandover bearcats': 'assets/images/logos/perth-andover-bearcats.png',
  'pic': 'assets/images/logos/springfield-pics.png',
  'potomac patriots': 'assets/images/logos/potomac-patriots.png',
  'potomac-patriots': 'assets/images/logos/potomac-patriots.png',
  'pp': 'assets/images/logos/potomac-patriots.png',
  'qu': 'assets/images/logos/quebec-universel.png',
  'quebec universel': 'assets/images/logos/quebec-universel.png',
  'quebec-universel': 'assets/images/logos/quebec-universel.png',
  'rbg': 'assets/images/logos/red-bank-generals.png',
  'red bank generals': 'assets/images/logos/red-bank-generals.png',
  'red river spartans': 'assets/images/logos/red-river-spartans.png',
  'red-bank-generals': 'assets/images/logos/red-bank-generals.png',
  'red-river-spartans': 'assets/images/logos/red-river-spartans.png',
  'rhc': 'assets/images/logos/rockets-hockey-club.png',
  'rock springs miners': 'assets/images/logos/rock-springs-miners.png',
  'rock-springs-miners': 'assets/images/logos/rock-springs-miners.png',
  'rockets hc': 'assets/images/logos/rockets-hockey-club.png',
  'rockets hockey club': 'assets/images/logos/rockets-hockey-club.png',
  'rockets-hockey-club': 'assets/images/logos/rockets-hockey-club.png',
  'rogue valley royals': 'assets/images/logos/rogue-valley-royals.png',
  'rogue-valley-royals': 'assets/images/logos/rogue-valley-royals.png',
  'rrs': 'assets/images/logos/red-river-spartans.png',
  'rsm': 'assets/images/logos/rock-springs-miners.png',
  'rvr': 'assets/images/logos/rogue-valley-royals.png',
  'salt lake ghost riders': 'assets/images/logos/salt-lake-ghost-riders.png',
  'salt-lake-ghost-riders': 'assets/images/logos/salt-lake-ghost-riders.png',
  'san diego sabers': 'assets/images/logos/san-diego-sabers.png',
  'san-diego-sabers': 'assets/images/logos/san-diego-sabers.png',
  'santa clarita lakers': 'assets/images/logos/santa-clarita-lakers.png',
  'santa-clarita-lakers': 'assets/images/logos/santa-clarita-lakers.png',
  'scl': 'assets/images/logos/santa-clarita-lakers.png',
  'sds': 'assets/images/logos/san-diego-sabers.png',
  'sl': 'assets/images/logos/syracuse-lightning.png',
  'sla': 'assets/images/logos/st-lazare-avalanche.png',
  'slgr': 'assets/images/logos/salt-lake-ghost-riders.png',
  'sll': 'assets/images/logos/somang-hockey.png',
  'somang hockey': 'assets/images/logos/somang-hockey.png',
  'somang-hockey': 'assets/images/logos/somang-hockey.png',
  'south shore kings': 'assets/images/logos/south-shore-kings.png',
  'south-shore-kings': 'assets/images/logos/south-shore-kings.png',
  'springfield pics': 'assets/images/logos/springfield-pics.png',
  'springfield-pics': 'assets/images/logos/springfield-pics.png',
  'ssk': 'assets/images/logos/south-shore-kings.png',
  'ssm': 'assets/images/logos/st-stephen-county-moose.png',
  'st stephen county moose': 'assets/images/logos/st-stephen-county-moose.png',
  'st-lazare avalanche': 'assets/images/logos/st-lazare-avalanche.png',
  'st-lazare-avalanche': 'assets/images/logos/st-lazare-avalanche.png',
  'st-stephen-county-moose': 'assets/images/logos/st-stephen-county-moose.png',
  'st. stephen county moose': 'assets/images/logos/st-stephen-county-moose.png',
  'stlazare avalanche': 'assets/images/logos/st-lazare-avalanche.png',
  'syracuse lightning': 'assets/images/logos/syracuse-lightning.png',
  'syracuse-lightning': 'assets/images/logos/syracuse-lightning.png',
  'tampa bay juniors': 'assets/images/logos/tampa-bay-juniors.png',
  'tampa-bay-juniors': 'assets/images/logos/tampa-bay-juniors.png',
  'tbj': 'assets/images/logos/tampa-bay-juniors.png',
  'tc': 'assets/images/logos/toledo-cherokee.png',
  'thc': 'assets/images/logos/thunder-hockey-club.png',
  'three hills titans': 'assets/images/logos/three-hills-titans.png',
  'three-hills-titans': 'assets/images/logos/three-hills-titans.png',
  'tht': 'assets/images/logos/three-hills-titans.png',
  'thunder hockey club': 'assets/images/logos/thunder-hockey-club.png',
  'thunder-hockey-club': 'assets/images/logos/thunder-hockey-club.png',
  'toledo cherokee': 'assets/images/logos/toledo-cherokee.png',
  'toledo-cherokee': 'assets/images/logos/toledo-cherokee.png',
  'typhoon hockey club': 'assets/images/logos/typhoon-hockey-club.png',
  'typhoon-hockey-club': 'assets/images/logos/typhoon-hockey-club.png',
  'universel college gatineau': 'assets/images/logos/universel-coll-ge-gatineau.png',
  'universel collge gatineau': 'assets/images/logos/universel-coll-ge-gatineau.png',
  'universel collège gatineau': 'assets/images/logos/universel-coll-ge-gatineau.png',
  'universel sherbrooke': 'assets/images/logos/universel-sherbrooke.png',
  'universel-coll-ge-gatineau': 'assets/images/logos/universel-coll-ge-gatineau.png',
  'universel-sherbrooke': 'assets/images/logos/universel-sherbrooke.png',
  'utc': 'assets/images/logos/utica-jr-comets.png',
  'utica jr comets': 'assets/images/logos/utica-jr-comets.png',
  'utica jr. comets': 'assets/images/logos/utica-jr-comets.png',
  'utica-jr-comets': 'assets/images/logos/utica-jr-comets.png',
  'ventura vikings': 'assets/images/logos/ventura-vikings.png',
  'ventura-vikings': 'assets/images/logos/ventura-vikings.png',
  'vermont universel': 'assets/images/logos/vermont-universel.png',
  'vermont-universel': 'assets/images/logos/vermont-universel.png',
  'vernal oilers': 'assets/images/logos/vernal-oilers.png',
  'vernal-oilers': 'assets/images/logos/vernal-oilers.png',
  'vo': 'assets/images/logos/vernal-oilers.png',
  'vu': 'assets/images/logos/vermont-universel.png',
  'vv': 'assets/images/logos/ventura-vikings.png',
  'wbs': 'assets/images/logos/wilkes-barre-scranton-knights.png',
  'wbs knights': 'assets/images/logos/wilkes-barre-scranton-knights.png',
  'wcw': 'assets/images/logos/west-chester-wolves.png',
  'west chester wolves': 'assets/images/logos/west-chester-wolves.png',
  'west-chester-wolves': 'assets/images/logos/west-chester-wolves.png',
  'wilkes-barre scranton knights': 'assets/images/logos/wilkes-barre-scranton-knights.png',
  'wilkes-barre-scranton-knights': 'assets/images/logos/wilkes-barre-scranton-knights.png',
  'wilkesbarre scranton knights': 'assets/images/logos/wilkes-barre-scranton-knights.png',
  'wisconsin rapids riverkings': 'assets/images/logos/wisconsin-rapids-riverkings.png',
  'wisconsin-rapids-riverkings': 'assets/images/logos/wisconsin-rapids-riverkings.png',
  'wjr': 'assets/images/logos/worcester-railers-jhc.png',
  'woodstock warriors': 'assets/images/logos/woodstock-warriors.png',
  'woodstock-warriors': 'assets/images/logos/woodstock-warriors.png',
  'worcester jr railers': 'assets/images/logos/worcester-railers-jhc.png',
  'worcester railers': 'assets/images/logos/worcester-railers-jhc.png',
  'worcester railers jhc': 'assets/images/logos/worcester-railers-jhc.png',
  'worcester-railers-jhc': 'assets/images/logos/worcester-railers-jhc.png',
  'worchester railers': 'assets/images/logos/worcester-railers-jhc.png',
  'wrr': 'assets/images/logos/wisconsin-rapids-riverkings.png',
  'ww': 'assets/images/logos/woodstock-warriors.png',
  'ya': 'assets/images/logos/yorktown-admirals.png',
  'yorktown admirals': 'assets/images/logos/yorktown-admirals.png',
  'yorktown-admirals': 'assets/images/logos/yorktown-admirals.png'
};

export function getTeamLogo(teamName, explicitLogo) {
  if (explicitLogo) return explicitLogo;
  if (!teamName) return 'assets/images/logos/mercer-chiefs-junior.png';
  const clean = teamName.toLowerCase().trim();
  if (clean.includes('mercer') || clean.includes('chiefs')) {
    return 'assets/images/logos/mercer-chiefs-junior.png';
  }
  if (OPPONENT_LOGOS[clean]) return OPPONENT_LOGOS[clean];
  for (const [key, path] of Object.entries(OPPONENT_LOGOS)) {
    if (key.length >= 4 && (clean.includes(key) || key.includes(clean))) {
      return path;
    }
  }
  return 'assets/images/logos/mercer-chiefs-junior.png';
}

export const RINK_LOCATIONS = {
  'Ice Land Black Bear': { rink: 'Ice Land Skating Center', city: 'Hamilton', state: 'NJ' },
  'Ice Land Black Bear Rink': { rink: 'Ice Land Skating Center', city: 'Hamilton', state: 'NJ' },
  'Ice Land Black Bear Rink 1': { rink: 'Ice Land Skating Center', city: 'Hamilton', state: 'NJ' },
  'Ice Land Black Bear Rink 2': { rink: 'Ice Land Skating Center', city: 'Hamilton', state: 'NJ' },
  'Ice Land Phantoms Rink': { rink: 'Ice Land Skating Center (Phantoms)', city: 'Hamilton', state: 'NJ' },
  'Ice Land Skating Center': { rink: 'Ice Land Skating Center', city: 'Hamilton', state: 'NJ' },
  'Bridgewater Sports Arena Red': { rink: 'Bridgewater Sports Arena', city: 'Bridgewater', state: 'NJ' },
  'Chelsea Piers North': { rink: 'Chelsea Piers CT', city: 'Stamford', state: 'CT' },
  'Chelsea Piers CT South Rink': { rink: 'Chelsea Piers CT', city: 'Stamford', state: 'CT' },
  'Chelsea Piers Stamford': { rink: 'Chelsea Piers CT', city: 'Stamford', state: 'CT' },
  'Cyclones Arena Rink 1': { rink: 'Cyclones Arena (Rink 1)', city: 'Hudson', state: 'NH' },
  'Cyclones Arena Rink 2': { rink: 'Cyclones Arena (Rink 2)', city: 'Hudson', state: 'NH' },
  'Foxboro Sports Center Rink 1': { rink: 'Foxboro Sports Center', city: 'Foxborough', state: 'MA' },
  'Ice Vault Rink 1': { rink: 'Ice Vault Arena (Rink 1)', city: 'Wayne', state: 'NJ' },
  'Ice Vault Rink 2': { rink: 'Ice Vault Arena (Rink 2)', city: 'Wayne', state: 'NJ' },
  'Ice Vault Rink 3': { rink: 'Ice Vault Arena (Rink 3)', city: 'Wayne', state: 'NJ' },
  'Northwell Health Ice Center': { rink: 'Northwell Health Ice Center', city: 'East Meadow', state: 'NY' },
  'Northwell Ice Center Arbor': { rink: 'Northwell Health Ice Center (Arbor)', city: 'East Meadow', state: 'NY' },
  'Northwell Ice Center Torrey': { rink: 'Northwell Health Ice Center (Torrey)', city: 'East Meadow', state: 'NY' },
  'PNY Sports Arena': { rink: 'PNY Sports Arena', city: 'West Chester', state: 'PA' },
  'PNY Arena Main Rink': { rink: 'PNY Sports Arena', city: 'West Chester', state: 'PA' },
  'Red Bank Armory': { rink: 'Red Bank Armory', city: 'Red Bank', state: 'NJ' },
  'Revolution Ice Centre Rink 1': { rink: 'Revolution Ice Centre', city: 'Pittston', state: 'PA' },
  'Revolution Ice Centre Rink 2': { rink: 'Revolution Ice Centre', city: 'Pittston', state: 'PA' },
  'Skate 3 Ice Arena Red': { rink: 'Skate 3 Ice Arena', city: 'Tyngsborough', state: 'MA' },
  'SportsCare Arena': { rink: 'SportsCare Arena', city: 'Randolph', state: 'NJ' },
  'The Rinx at Hauppauge': { rink: 'The Rinx at Hauppauge', city: 'Hauppauge', state: 'NY' },
  'The Rinx North': { rink: 'The Rinx', city: 'Hauppauge', state: 'NY' }
};

export function getGameVenueDisplay(game) {
  const loc = RINK_LOCATIONS[game.rink] || RINK_LOCATIONS[game.rink?.trim()];
  const city = game.city || loc?.city;
  const state = game.state || loc?.state;
  const rinkName = loc?.rink || game.rink || 'Ice Land Skating Center';

  if (city && state) {
    return `${rinkName} • ${city}, ${state}`;
  } else if (city) {
    return `${rinkName} • ${city}`;
  }
  return rinkName;
}

function renderSchedule() {
  const container = document.getElementById('schedule-list-container');
  if (!container) return;

  const currentSchedule = getCurrentJuniorData().schedule;

  const filtered = currentSchedule.filter(game => {
    if (state.scheduleFilter === 'all') return true;
    if (state.scheduleFilter === 'home') return game.location === 'Home';
    if (state.scheduleFilter === 'away') return game.location === 'Away';
    if (state.scheduleFilter === 'final') return game.status.startsWith('FINAL');
    if (state.scheduleFilter === 'upcoming') return game.status === 'UPCOMING';
    return true;
  });

  container.innerHTML = filtered.map(game => {
    const isWin = game.result === 'W';
    const isUpcoming = game.status === 'UPCOMING';
    const oppLogo = getTeamLogo(game.opponent);
    const gameId = game.gmNumber || (game.id && String(game.id).match(/\d+/)?.[0]);
    const scoresheetUrl = game.scoresheetUrl || (gameId ? `https://stats.usphl.timetoscore.com/generate-scorecard.php?game_id=${gameId}` : null);
    const venueDisplay = getGameVenueDisplay(game);

    return `
      <div class="schedule-card">
        <div class="game-date-col">
          <span class="game-date">${game.date}</span>
          <span class="game-location-badge">${game.location} Game • ${game.time || game.status}</span>
        </div>

        <div class="game-matchup-col">
          <img src="${oppLogo}" class="schedule-opp-logo" alt="${game.opponent}" onerror="this.src='assets/images/logos/mercer-chiefs-junior.png';">
          <div>
            <div class="matchup-teams">
              ${game.location === 'Home' ? `Mercer Chiefs vs ${game.opponent}` : `Mercer Chiefs @ ${game.opponent}`}
            </div>
            <div class="matchup-sub">${venueDisplay}</div>
          </div>
        </div>

        <div class="game-score-col">
          ${isUpcoming ? `
            <span class="badge-status upcoming" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">UPCOMING</span>
          ` : `
            <div class="score-pill ${isWin ? 'win' : 'loss'}">
              ${game.result} ${game.chiefsScore} - ${game.oppScore}
            </div>
          `}
        </div>

        <div class="game-action-col">
          ${isUpcoming ? `
            <a href="https://blackbearsports.tv/" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding: 0.45rem 0.95rem; font-size: 0.8rem;">
              Watch Live
            </a>
          ` : `
            ${scoresheetUrl ? `
              <a href="${scoresheetUrl}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="padding: 0.45rem 0.95rem; font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;" title="Official USPHL Scoresheet for Game #${gameId}">
                <span>Scoresheet</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            ` : `
              <span class="btn-secondary" style="padding: 0.45rem 0.95rem; font-size: 0.8rem; opacity: 0.6; cursor: default;">
                Scoresheet
              </span>
            `}
          `}
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   5. JUNIOR STANDINGS
   ========================================================================== */
function initStandings() {
  const tbody = document.getElementById('standings-tbody');
  if (!tbody) return;

  const currentStandings = getCurrentJuniorData().standings;

  tbody.innerHTML = currentStandings.map(team => {
    const logoUrl = team.logo || getTeamLogo(team.team);
    return `
      <tr class="${team.isChiefs ? 'chiefs-row' : ''}">
        <td><strong>${team.rank}</strong></td>
        <td>
          <div class="standings-team-cell">
            <img src="${logoUrl}" class="standings-team-logo" alt="${team.team}" onerror="this.src='assets/images/logos/mercer-chiefs-junior.png';">
            <span>${team.team}</span>
          </div>
        </td>
        <td>${team.gp}</td>
        <td>${team.w}</td>
        <td>${team.l}</td>
        <td>${team.otl}</td>
        <td><strong style="color: var(--chiefs-gold); font-size: 1.05rem;">${team.pts}</strong></td>
        <td>${team.gf}</td>
        <td>${team.ga}</td>
        <td style="color: ${team.diff.startsWith('+') ? '#4ade80' : '#f87171'}; font-weight: 600;">${team.diff}</td>
        <td><span class="badge-status ${team.streak.includes('W') ? 'final' : 'upcoming'}">${team.streak}</span></td>
        <td>${team.pct}</td>
      </tr>
    `;
  }).join('');
}

/* ==========================================================================
   6. JUNIOR TEAM LEADERS
   ========================================================================== */
function initLeaders() {
  const pointsContainer = document.getElementById('leaders-points-container');
  const goalieContainer = document.getElementById('leaders-goalie-container');
  const currentRoster = getCurrentJuniorData().roster;

  if (pointsContainer) {
    const skaters = currentRoster.filter(p => p.position !== 'G').sort((a, b) => b.pts - a.pts).slice(0, 5);
    pointsContainer.innerHTML = skaters.map((p, idx) => `
      <div class="leader-row-item" data-number="${p.number}">
        <div class="leader-player-col">
          <span class="leader-rank-num ${idx === 0 ? 'top-rank' : ''}">#${idx + 1}</span>
          <img src="${p.headshot || 'assets/images/player-placeholder-circle.png'}" 
               class="leader-headshot-img" 
               alt="${p.name}" 
               onerror="this.src='assets/images/player-placeholder-circle.png';">
          <div class="leader-meta-wrap">
            <div class="leader-name-row">
              <span class="leader-player-name">${p.name}</span>
              <span class="leader-num-pos">#${p.number} • ${p.position}</span>
            </div>
            <div class="leader-stats-sub">${p.g}G, ${p.a}A in ${p.gp} GP</div>
          </div>
        </div>
        <div class="leader-stat-box">
          <div class="leader-stat-val">${p.pts}</div>
          <div class="leader-stat-lbl">Points</div>
        </div>
      </div>
    `).join('');
  }

  if (goalieContainer) {
    const goalies = currentRoster.filter(p => p.position === 'G').sort((a, b) => b.w - a.w);
    goalieContainer.innerHTML = goalies.map((g, idx) => `
      <div class="leader-row-item" data-number="${g.number}">
        <div class="leader-player-col">
          <span class="leader-rank-num ${idx === 0 ? 'top-rank' : ''}">#${idx + 1}</span>
          <img src="${g.headshot || 'assets/images/player-placeholder-circle.png'}" 
               class="leader-headshot-img goalie" 
               alt="${g.name}" 
               onerror="this.src='assets/images/player-placeholder-circle.png';">
          <div class="leader-meta-wrap">
            <div class="leader-name-row">
              <span class="leader-player-name">${g.name}</span>
              <span class="leader-num-pos">#${g.number}</span>
            </div>
            <div class="leader-stats-sub">${g.w} Wins • ${g.so || 0} SO • ${g.gp} GP</div>
          </div>
        </div>
        <div class="leader-stat-box">
          <div class="leader-stat-val">${g.svPct}</div>
          <div class="leader-stat-lbl">SV% • ${g.gaa} GAA</div>
        </div>
      </div>
    `).join('');
  }

  // Add click to open bio modal on leader row items
  document.querySelectorAll('.leader-row-item[data-number]').forEach(row => {
    row.addEventListener('click', () => {
      const num = parseInt(row.dataset.number, 10);
      const player = currentRoster.find(p => p.number === num);
      if (player) openPlayerModal(player);
    });
  });
}

/* ==========================================================================
   7. COLLEGE COMMITMENTS & ALUMNI
   ========================================================================== */
const commitmentFilterState = {
  category: 'all', // 'all' | 'd1' | 'pro' | 'd3'
  searchQuery: ''
};

function renderCommitmentsCards() {
  const container = document.getElementById('commitments-grid');
  if (!container) return;

  const query = commitmentFilterState.searchQuery.toLowerCase().trim();
  const cat = commitmentFilterState.category;

  const allCommitments = getStoredAlumniCommitments();

  const filtered = allCommitments.filter(item => {
    // Category check
    let matchesCat = true;
    if (cat === 'd1') {
      matchesCat = item.category === 'd1';
    } else if (cat === 'pro') {
      matchesCat = item.isPro || item.category === 'pro' || !!item.draftInfo;
    } else if (cat === 'd3') {
      matchesCat = item.category === 'd3';
    }

    if (!matchesCat) return false;

    // Search query check
    if (!query) return true;

    const nameMatch = (item.name || '').toLowerCase().includes(query);
    const collegeMatch = (item.college || '').toLowerCase().includes(query);
    const proMatch = (item.proTeam || '').toLowerCase().includes(query);
    const juniorMatch = (item.juniorTeam || '').toLowerCase().includes(query);
    const confMatch = (item.conference || '').toLowerCase().includes(query);
    const badgeMatch = (item.badge || '').toLowerCase().includes(query);

    return nameMatch || collegeMatch || proMatch || juniorMatch || confMatch || badgeMatch;
  });

  if (filtered.length === 0) {
    const escapedQuery = commitmentFilterState.searchQuery.replace(/[&<>"']/g, '');
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); backdrop-filter: var(--glass-blur);">
        <p style="font-size: 1.15rem; color: #fff; font-weight: 700; margin-bottom: 0.5rem;">No alumni found matching "${escapedQuery}"</p>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">Try adjusting your search terms or clearing the filter.</p>
        <button class="btn-secondary" id="reset-commitments-search" style="font-size: 0.85rem; padding: 0.5rem 1.25rem;">Reset Filter & Search</button>
      </div>
    `;
    const resetBtn = document.getElementById('reset-commitments-search');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        commitmentFilterState.searchQuery = '';
        commitmentFilterState.category = 'all';
        const searchInput = document.getElementById('commitments-search');
        if (searchInput) searchInput.value = '';
        document.querySelectorAll('#commitments-filter-pills .filter-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.filter === 'all');
        });
        renderCommitmentsCards();
      });
    }
    return;
  }

  container.innerHTML = filtered.map(item => {
    const isPro = item.isPro || item.category === 'pro' || !!item.draftInfo;
    const divClass = item.category === 'pro' ? 'pro' : item.category === 'd3' ? 'd3' : item.category === 'junior' ? 'junior' : '';

    // Special badge
    let badgeHtml = '';
    if (item.badge) {
      const bType = item.badgeType || (isPro ? 'pro' : 'default');
      let icon = '🎓';
      if (bType === 'cup') icon = '🏆';
      else if (bType === 'draft') icon = '⭐';
      else if (bType === 'olympic') icon = '🇺🇸';
      else if (bType === 'champ') icon = '🏆';
      else if (bType === 'pro') icon = '🏒';
      else if (bType === 'd3') icon = '🎖️';

      badgeHtml = `<div class="commit-special-badge ${bType}">${icon} ${item.badge}</div>`;
    }

    // Pathway list
    let pathwayHtml = '';
    const hasJunior = item.juniorTeam && item.juniorTeam.trim().length > 0;
    const hasPro = (item.proTeam && item.proTeam.trim().length > 0) || item.draftInfo;

    if (hasJunior || hasPro) {
      pathwayHtml = `
        <div class="commit-pathway-list">
          ${hasJunior ? `<div class="commit-path-row"><span class="path-lbl">Junior:</span> ${item.juniorTeam}</div>` : ''}
          ${item.draftInfo ? `<div class="commit-path-row pro"><span class="path-lbl">Draft:</span> ${item.draftInfo}</div>` : ''}
          ${item.proTeam ? `<div class="commit-path-row pro"><span class="path-lbl">Pro:</span> ${item.proTeam}</div>` : ''}
        </div>
      `;
    }

    return `
      <div class="commit-card ${isPro ? 'is-pro-card' : ''}">
        <div class="commit-header">
          <span class="commit-division ${divClass}">${item.division}</span>
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">${item.conference}</span>
        </div>

        ${badgeHtml}

        <div class="commit-college">${item.college}</div>
        <div class="commit-player-name">${item.name}</div>

        ${pathwayHtml}

        <p class="commit-highlight">"${item.highlight || item.quote || 'Mercer Chiefs Alumni'}"</p>
      </div>
    `;
  }).join('');
}

function initCommitments() {
  const container = document.getElementById('commitments-grid');
  if (!container) return;

  // Filter pills
  const filterPills = document.querySelectorAll('#commitments-filter-pills .filter-btn');
  filterPills.forEach(btn => {
    btn.addEventListener('click', () => {
      filterPills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      commitmentFilterState.category = btn.dataset.filter || 'all';
      renderCommitmentsCards();
    });
  });

  // Search input
  const searchInput = document.getElementById('commitments-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      commitmentFilterState.searchQuery = e.target.value;
      renderCommitmentsCards();
    });
  }

  // Initial render
  renderCommitmentsCards();
}

/* ==========================================================================
   8. COACHING STAFF DIRECTORY
   ========================================================================== */
export function getActiveStaffMembers() {
  try {
    const raw = localStorage.getItem('mercer_site_content');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.staff) && parsed.staff.length > 0) {
        return parsed.staff;
      }
    }
  } catch (e) {}
  return COACHING_STAFF;
}

export function initStaff() {
  const container = document.getElementById('staff-grid');
  if (!container) return;

  const staffList = getActiveStaffMembers();

  container.innerHTML = staffList.map(staff => `
    <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 2rem; backdrop-filter: var(--glass-blur); display: flex; flex-direction: column;">
      <div style="display: flex; align-items: center; gap: 1.25rem; margin-bottom: 1.25rem;">
        <img src="${staff.photo || 'assets/images/mercer-chiefs-crest.png'}" alt="${staff.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--chiefs-red); box-shadow: 0 0 14px var(--chiefs-red-glow);">
        <div>
          <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--chiefs-gold);">${staff.badge || 'Staff'}</span>
          <h3 style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; color: #fff;">${staff.name}</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${staff.role || ''}</p>
        </div>
      </div>

      <p style="color: #cbd5e1; font-size: 0.92rem; line-height: 1.6; margin-bottom: 1.5rem; flex-grow: 1;">${staff.bio || ''}</p>

      <a href="${staff.email ? 'mailto:' + staff.email : 'javascript:void(0)'}" class="btn-secondary" style="font-size: 0.85rem; padding: 0.5rem 1rem; width: 100%; text-align: center; justify-content: center;">
        Contact Coach
      </a>
    </div>
  `).join('');
}
window.initStaff = initStaff;

/* ==========================================================================
   9. YOUTH TEAMS & GAMESHEET / TIMETOSCORE HUB
   ========================================================================== */
function initYouthHub() {
  const select = document.getElementById('youth-team-select');
  if (!select) return;

  function populateYouthDropdown() {
    const activeTeams = getActiveYouthTeams();
    const filter = state.youthTierFilter; // 'all' | 'ahf' | 'thf'
    const ahfTeams = activeTeams.filter(t => t.leagueId === 4 || (t.league && t.league.includes('AHF')) || (t.tier && t.tier.includes('Tier II')));
    const thfTeams = activeTeams.filter(t => t.leagueId === 5 || (t.league && t.league.includes('THF')) || (t.tier && /\bTier (I|1)\b/i.test(t.tier) && !t.tier.includes('Tier II')));

    // Dynamically show/hide youth hub tier filter pills
    const pillThf = document.querySelector('.tier-pill[data-tier="thf"]');
    const pillAhf = document.querySelector('.tier-pill[data-tier="ahf"]');
    if (pillThf) pillThf.style.display = thfTeams.length > 0 ? '' : 'none';
    if (pillAhf) pillAhf.style.display = ahfTeams.length > 0 ? '' : 'none';

    let html = '';
    if (filter === 'all' || filter === 'ahf') {
      if (ahfTeams.length > 0) {
        html += `<optgroup label="Tier II — Atlantic Hockey Federation (AHF)">`;
        html += ahfTeams.map(t => `<option value="${t.id}" ${t.id === state.selectedYouthTeam ? 'selected' : ''}>${t.name}</option>`).join('');
        html += `</optgroup>`;
      }
    }
    if (filter === 'all' || filter === 'thf') {
      if (thfTeams.length > 0) {
        html += `<optgroup label="Tier I AAA — Tier 1 Hockey Federation (THF)">`;
        html += thfTeams.map(t => `<option value="${t.id}" ${t.id === state.selectedYouthTeam ? 'selected' : ''}>${t.name}</option>`).join('');
        html += `</optgroup>`;
      }
    }

    if (!html) {
      html = `<option value="">No visible teams in this category</option>`;
    }

    select.innerHTML = html;

    // Check if currently selected team is still visible
    const availableTeams = filter === 'all' ? activeTeams : filter === 'ahf' ? ahfTeams : thfTeams;
    const exists = availableTeams.some(t => t.id === state.selectedYouthTeam);
    if (!exists && availableTeams.length > 0) {
      state.selectedYouthTeam = availableTeams[0].id;
      select.value = state.selectedYouthTeam;
    }
  }
  window.populateYouthDropdown = populateYouthDropdown;

  // Tier pills
  const tierPills = document.querySelectorAll('.tier-pill[data-tier]');
  tierPills.forEach(pill => {
    pill.addEventListener('click', () => {
      tierPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.youthTierFilter = pill.dataset.tier;
      populateYouthDropdown();
      renderYouthDisplay();
    });
  });

  populateYouthDropdown();

  select.addEventListener('change', (e) => {
    state.selectedYouthTeam = e.target.value;
    renderYouthDisplay();
  });

  const modeBtns = document.querySelectorAll('.mode-btn[data-mode]');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.youthIntegrationMode = btn.dataset.mode;
      renderYouthDisplay();
    });
  });

  window.setYouthSchedSubTab = function (tab) {
    state.youthSchedSubTab = tab;
    renderYouthDisplay();
  };

  window.setYouthWidgetTab = function (tab) {
    state.youthWidgetTab = tab;
    renderYouthDisplay();
  };

  renderYouthDisplay();
}

function renderYouthDisplay() {
  const container = document.getElementById('gamesheet-display-container');
  if (!container) return;

  const activeTeams = getActiveYouthTeams();
  const currentTeam = activeTeams.find(t => t.id === state.selectedYouthTeam) || activeTeams[0] || YOUTH_TEAMS[0];
  const isAHF = currentTeam.tier?.includes('AHF') || (currentTeam.league && currentTeam.league.includes('AHF')) || currentTeam.leagueId === 4;
  const leagueLogo = isAHF ? 'assets/images/ahf-logo.png' : 'assets/images/thf-logo.png';
  const leagueName = isAHF ? 'Atlantic Hockey Federation (AHF)' : 'Tier 1 Hockey Federation (THF)';
  const leagueTierBadge = isAHF ? 'Tier II Travel Hockey' : 'Tier 1 AAA National Bound';
  const seasonCfg = getActiveSeasonConfig();
  const currentTeamSeasonId = isAHF ? seasonCfg.ahfSeasonId : seasonCfg.thfSeasonId;
  const officialRosterUrl = currentTeam.officialUrl || (isAHF
    ? `https://atlantichockeyfederation.com/team-page/?team=${currentTeam.teamId}&season=${seasonCfg.ahfSeasonId}&stat_class=1`
    : `https://www.tier1hockeyfederation.com/team-pages/?team=${currentTeam.teamId}&season=${seasonCfg.thfSeasonId}&stat_class=1`);

  if (state.youthIntegrationMode === 'native') {
    // Mode 1: Native Fast Chiefs Hub
    container.innerHTML = `
      <div class="native-youth-view">
        <div class="youth-team-header-card">
          <div style="display: flex; align-items: center; gap: 1.25rem;">
            <img src="${leagueLogo}" alt="${leagueName}" style="height: 48px; width: auto; object-fit: contain;">
            <div>
              <h2 class="youth-team-title">${currentTeam.name}</h2>
              <div class="youth-team-meta">
                <span><strong>Head Coach:</strong> ${currentTeam.headCoach}</span>
                <span><strong>League:</strong> ${leagueName}</span>
                <span><strong>Home Rinks:</strong> Ice Land (Hamilton) & ProSkate</span>
              </div>
            </div>
          </div>
          <div class="youth-team-badges">
            <span class="pill-badge" style="background: rgba(245, 166, 35, 0.15); border-color: rgba(245, 166, 35, 0.35); color: #ffbe4a;">Record: ${currentTeam.record}</span>
            <span class="pill-badge">${currentTeam.rank}</span>
            <span class="pill-badge" style="background: rgba(189, 50, 59, 0.2); border-color: rgba(189, 50, 59, 0.4); color: #ff858d;">${leagueTierBadge}</span>
          </div>
        </div>

        <div class="youth-two-col">
          <!-- Schedule & Results -->
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
              <h3 class="subpanel-title" style="margin-bottom: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--chiefs-gold)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Schedule & Results
              </h3>
              <div style="display: inline-flex; background: rgba(0,0,0,0.45); padding: 0.2rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <button type="button" onclick="window.setYouthSchedSubTab('upcoming')" style="padding: 0.35rem 0.85rem; font-size: 0.76rem; font-weight: 700; border: none; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s; ${state.youthSchedSubTab === 'upcoming' ? 'background: var(--chiefs-red); color: #fff;' : 'background: transparent; color: var(--text-muted);'}">
                  Upcoming (${(currentTeam.upcomingSchedule || []).length})
                </button>
                <button type="button" onclick="window.setYouthSchedSubTab('results')" style="padding: 0.35rem 0.85rem; font-size: 0.76rem; font-weight: 700; border: none; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s; ${state.youthSchedSubTab === 'results' ? 'background: var(--chiefs-red); color: #fff;' : 'background: transparent; color: var(--text-muted);'}">
                  Results (${(currentTeam.recentResults || []).length})
                </button>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.65rem; max-height: 580px; overflow-y: auto; padding-right: 0.35rem;">
              ${state.youthSchedSubTab === 'upcoming' ? `
                ${(currentTeam.upcomingSchedule && currentTeam.upcomingSchedule.length > 0) ? currentTeam.upcomingSchedule.map(g => `
                  <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.9rem 1.15rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; transition: background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                    <div style="min-width: 0;">
                      <div style="font-weight: 700; color: #fff; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${g.loc === 'Home' ? 'Chiefs vs ' : 'Chiefs @ '}${g.opp}
                      </div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">
                        ${g.rink} • ${g.time || 'TBD'}
                      </div>
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                      <span style="font-weight: 700; color: #fff; font-size: 0.82rem; display: block;">${g.date}</span>
                      <span style="display: inline-block; font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 4px; margin-top: 0.2rem; ${g.loc === 'Home' ? 'background: rgba(245, 166, 35, 0.15); color: #f59e0b; border: 1px solid rgba(245, 166, 35, 0.3);' : 'background: rgba(255, 255, 255, 0.08); color: #e2e8f0; border: 1px solid rgba(255, 255, 255, 0.15);'}">
                        ${g.loc} Game
                      </span>
                    </div>
                  </div>
                `).join('') : `
                  <div style="padding: 2rem; text-align: center; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
                    No upcoming regular league matches scheduled currently. Check recent results or the official league portal.
                  </div>
                `}
              ` : `
                ${(currentTeam.recentResults && currentTeam.recentResults.length > 0) ? currentTeam.recentResults.map(g => {
      const isWin = g.outcome === 'W';
      const isTie = g.outcome === 'T';
      const outcomeBg = isWin ? 'rgba(34, 197, 94, 0.18)' : (isTie ? 'rgba(234, 179, 8, 0.18)' : 'rgba(239, 68, 68, 0.18)');
      const outcomeBorder = isWin ? 'rgba(34, 197, 94, 0.4)' : (isTie ? 'rgba(234, 179, 8, 0.4)' : 'rgba(239, 68, 68, 0.4)');
      const outcomeColor = isWin ? '#4ade80' : (isTie ? '#facc15' : '#f87171');
      return `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.9rem 1.15rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; transition: background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                      <div style="min-width: 0;">
                        <div style="font-weight: 700; color: #fff; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${g.loc === 'Home' ? 'Chiefs vs ' : 'Chiefs @ '}${g.opp}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">
                          ${g.rink} • ${g.date}
                        </div>
                      </div>
                      <div style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem;">
                        <span style="display: inline-block; font-family: monospace; font-size: 0.85rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 4px; background: ${outcomeBg}; border: 1px solid ${outcomeBorder}; color: ${outcomeColor};">
                          ${g.outcome} ${g.score}
                        </span>
                        ${g.scoresheetUrl ? `
                          <a href="${g.scoresheetUrl}" target="_blank" style="font-size: 0.68rem; color: var(--chiefs-gold); text-decoration: none; display: inline-flex; align-items: center; gap: 0.2rem;" title="Official GameSheet Scorecard">
                            Scorecard ↗
                          </a>
                        ` : ''}
                      </div>
                    </div>
                  `;
    }).join('') : `
                  <div style="padding: 2rem; text-align: center; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
                    No completed match results recorded yet for the 2026/27 season.
                  </div>
                `}
              `}
            </div>
          </div>

          <!-- Roster -->
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
              <h3 class="subpanel-title" style="margin-bottom: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--chiefs-red)" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Official 2026/27 Roster
              </h3>
              <span class="pill-badge" style="background: rgba(189, 50, 59, 0.15); border-color: rgba(189, 50, 59, 0.35); color: #f87171; font-size: 0.75rem;">
                ${(currentTeam.roster || currentTeam.sampleRoster || []).length} Verified Players
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1.25rem; max-height: 580px; overflow-y: auto; padding-right: 0.35rem;">
              <!-- Skaters -->
              <div>
                <div style="font-size: 0.82rem; font-weight: 700; color: var(--chiefs-gold); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                  <span>Skaters (${(currentTeam.roster || currentTeam.sampleRoster || []).filter(p => p.pos !== 'G').length})</span>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">GP • G • A • PTS • PIM</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.45rem;">
                  ${(currentTeam.roster || currentTeam.sampleRoster || []).filter(p => p.pos !== 'G').map(p => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.9rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.07)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; color: var(--chiefs-red); width: 28px; text-align: center;">#${p.no}</span>
                        <div>
                          <div style="font-weight: 700; color: #fff; font-size: 0.9rem;">${p.name}</div>
                        </div>
                      </div>
                      <div style="text-align: right;">
                        <div style="font-size: 0.85rem; font-weight: 700; color: #e2e8f0; font-family: monospace;">
                          <span style="color: var(--chiefs-gold); font-family: var(--font-sans); font-size: 0.75rem; font-weight: 600; margin-right: 0.4rem;">${p.pos || 'F/D'}</span>
                          ${p.gp ?? '—'} <span style="color: var(--text-muted);">GP</span> • <span style="color: #fff; font-weight: 800;">${p.pts ?? (p.g + p.a) ?? '—'}</span> <span style="color: var(--text-muted);">PTS</span>
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">
                          ${p.g ?? 0}G, ${p.a ?? 0}A • ${p.pim ?? 0} PIM
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Goalies -->
              ${(currentTeam.roster || currentTeam.sampleRoster || []).filter(p => p.pos === 'G').length > 0 ? `
                <div>
                  <div style="font-size: 0.82rem; font-weight: 700; color: var(--chiefs-gold); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                    <span>Goalies (${(currentTeam.roster || currentTeam.sampleRoster || []).filter(p => p.pos === 'G').length})</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">GP • W-L-OTL • GAA • SV%</span>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 0.45rem;">
                    ${(currentTeam.roster || currentTeam.sampleRoster || []).filter(p => p.pos === 'G').map(p => `
                      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.9rem; background: rgba(245, 166, 35, 0.04); border: 1px solid rgba(245, 166, 35, 0.18); border-radius: var(--radius-md); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(245, 166, 35, 0.08)'" onmouseout="this.style.background='rgba(245, 166, 35, 0.04)'">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                          <span style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; color: var(--chiefs-gold); width: 28px; text-align: center;">#${p.no}</span>
                          <div>
                            <div style="font-weight: 700; color: #fff; font-size: 0.9rem;">${p.name}</div>
                          </div>
                        </div>
                        <div style="text-align: right;">
                          <div style="font-size: 0.85rem; font-weight: 700; color: #e2e8f0; font-family: monospace;">
                            <span style="color: var(--chiefs-gold); font-family: var(--font-sans); font-size: 0.75rem; font-weight: 600; margin-right: 0.4rem;">G</span>
                            ${p.gp ?? '—'} <span style="color: var(--text-muted);">GP</span> • <span style="color: #fff; font-weight: 800;">${p.gaa ?? '—'}</span> <span style="color: var(--text-muted);">GAA</span>
                          </div>
                          <div style="font-size: 0.7rem; color: var(--text-muted);">
                            ${p.w ?? 0}-${p.l ?? 0}-${p.otl ?? 0} • ${p.svPct ? p.svPct + ' SV%' : '—'}${p.so ? ' • ' + p.so + ' SO' : ''}
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <div style="margin-top: 2.5rem; padding: 1.25rem; background: rgba(0,0,0,0.3); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <img src="${leagueLogo}" style="height: 36px; width: auto; object-fit: contain;" alt="${leagueName}">
            <span style="font-size: 0.88rem; color: #cbd5e1;"><strong>${leagueName}</strong> Official Standing: <strong>${currentTeam.standingSummary}</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <a href="${officialRosterUrl}" target="_blank" class="btn-secondary" style="font-size: 0.82rem; padding: 0.45rem 1rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem;">
              <span>Official League Page ↗</span>
            </a>
            <button class="btn-primary" style="font-size: 0.82rem; padding: 0.45rem 1rem;" onclick="document.querySelector('.mode-btn[data-mode=\\'timetoscore\\']').click()">
              Launch Live GameSheet Widget
            </button>
          </div>
        </div>
      </div>
    `;
  } else if (state.youthIntegrationMode === 'timetoscore') {
    // Mode 2: Official Live TimeToScore / GameSheet Widget Container in Isolated Sandbox
    const teamId = currentTeam.teamId || "10310";
    const leagueId = currentTeam.leagueId || "5";
    const seasonId = currentTeam.seasonId || currentTeamSeasonId;
    const currentWidgetTab = state.youthWidgetTab || "1"; // "1": Schedule, "2": Roster

    container.innerHTML = `
      <div class="timetoscore-widget-wrapper" style="padding: 1.5rem; background: #0A0C11;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--chiefs-gold); text-transform: uppercase;">Official GameSheet / TimeToScore Live Feed</span>
            <h3 style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; color: #fff; margin-top: 0.2rem;">${currentTeam.name} — Live Data Engine</h3>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <div style="display: inline-flex; background: rgba(0,0,0,0.5); padding: 0.2rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <button type="button" onclick="window.setYouthWidgetTab('1')" style="padding: 0.35rem 0.85rem; font-size: 0.76rem; font-weight: 700; border: none; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s; ${currentWidgetTab === '1' ? 'background: var(--chiefs-gold); color: #000;' : 'background: transparent; color: var(--text-muted);'}">
                Schedule & Results
              </button>
              <button type="button" onclick="window.setYouthWidgetTab('2')" style="padding: 0.35rem 0.85rem; font-size: 0.76rem; font-weight: 700; border: none; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s; ${currentWidgetTab === '2' ? 'background: var(--chiefs-gold); color: #000;' : 'background: transparent; color: var(--text-muted);'}">
                Team Roster
              </button>
            </div>
            <a href="${officialRosterUrl}" target="_blank" class="btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.75rem; text-decoration: none;">
              Open in League Portal ↗
            </a>
          </div>
        </div>

        <iframe id="tts-sandbox-frame"
                style="width: 100%; min-height: 650px; border: none; border-radius: var(--radius-md); background: #0E1017;"
                title="TimeToScore Live Widget">
        </iframe>
      </div>
    `;

    setTimeout(() => {
      const frame = document.getElementById('tts-sandbox-frame');
      if (frame && frame.contentWindow) {
        const doc = frame.contentWindow.document;
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <script>
              try {
                window.history.replaceState(null, '', '?team=${teamId}&season=${seasonId}&stat_class=1&tab=${currentWidgetTab}');
              } catch(e) {}
            </script>
            <style>
              :root {
                --brand-primary: #BD323B;
                --brand-primary-dark: #8c1e25;
                --brand-dark: #ffffff;
                --brand-on-primary: #ffffff;
                --bg: #0E1017;
                --text: #e2e8f0;
                --muted: #94a3b8;
                --border: rgba(255, 255, 255, 0.12);
                --row-stripe: rgba(255, 255, 255, 0.04);
                --row-hover: rgba(189, 50, 59, 0.18);
              }
              body {
                margin: 0;
                padding: 1rem;
                background-color: #0E1017;
                color: #e2e8f0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              }
              .team-app {
                background-color: #0E1017 !important;
                color: #e2e8f0 !important;
              }
              .team-header {
                background-color: #171A23 !important;
                border-radius: 8px;
              }
              .sched-list, .roster-table {
                background-color: #11141B !important;
                color: #e2e8f0 !important;
              }
              .sched-row {
                border-bottom-color: rgba(255, 255, 255, 0.08) !important;
              }
              .sched-opp-name, .sched-date-day, .sched-score {
                color: #ffffff !important;
              }
            </style>
          </head>
          <body>
            <div id="team-root"
                 data-team="${teamId}"
                 data-league="${leagueId}"
                 data-season="${seasonId}"
                 data-stat-class="1"
                 data-tab="${currentWidgetTab}"
                 data-customer=""
                 data-api-base="https://api.blackbear.timetoscore.com/"
                 data-api-key="web"
                 data-api-secret="a6GxF7qcfPnP5l44o8uMs5PHwqGHr9SQ">
            </div>
            <script src="https://cdn.timetoscore.com/team/loader.js"><\/script>
          </body>
          </html>
        `);
        doc.close();
      }
    }, 50);
  } else if (state.youthIntegrationMode === 'iframe') {
    // Mode 3: Direct League Center Iframe
    const teamId = currentTeam.teamId || "10310";
    const iframeUrl = isAHF
      ? `https://atlantichockeyfederation.com/team-page/?team=${teamId}&season=${seasonCfg.ahfSeasonId}&stat_class=1&tab=${state.youthWidgetTab === '2' ? 'roster' : 'schedule'}`
      : `https://www.tier1hockeyfederation.com/team-pages/?team=${teamId}&season=${seasonCfg.thfSeasonId}&stat_class=1&tab=${state.youthWidgetTab === '2' ? 'roster' : 'schedule'}`;
    container.innerHTML = `
      <div class="iframe-wrapper">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.5rem; background: #08090C; border-bottom: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 0.5rem;">
          <span style="font-size: 0.85rem; font-weight: 600; color: #fff;">Embedded League Center: ${currentTeam.name} (Season ${seasonCfg.seasonLabel})</span>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button class="btn-secondary" style="font-size: 0.72rem; padding: 0.3rem 0.7rem; ${state.youthWidgetTab === '1' ? 'border-color: var(--chiefs-gold); color: var(--chiefs-gold);' : ''}" onclick="window.setYouthWidgetTab('1')">Schedule</button>
            <button class="btn-secondary" style="font-size: 0.72rem; padding: 0.3rem 0.7rem; ${state.youthWidgetTab === '2' ? 'border-color: var(--chiefs-gold); color: var(--chiefs-gold);' : ''}" onclick="window.setYouthWidgetTab('2')">Roster</button>
            <a href="${iframeUrl}" target="_blank" class="btn-secondary" style="font-size: 0.72rem; padding: 0.3rem 0.7rem; text-decoration: none;">Open in New Tab ↗</a>
          </div>
        </div>
        <iframe src="${iframeUrl}" title="League Game Center Frame" sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
      </div>
    `;
  }
}

/* ==========================================================================
   10. CLUB NEWS
   ========================================================================== */
let currentNewsIndex = 0;
let newsAutoRotateTimer = null;

function updateNewsCarouselDots() {
  const dotsContainer = document.getElementById('news-carousel-dots');
  const track = document.getElementById('club-news-grid');
  if (!dotsContainer || !track) return;

  const cards = track.querySelectorAll('.news-carousel-card');
  if (cards.length === 0) return;

  const isMobile = window.innerWidth <= 580;
  const isTablet = window.innerWidth <= 900;
  const visibleCards = isMobile ? 1 : (isTablet ? 2 : (window.innerWidth <= 1200 ? 3 : 4));
  const numSteps = Math.max(1, cards.length - (visibleCards - 1));

  dotsContainer.innerHTML = Array.from({ length: numSteps }, (_, i) => `
    <button type="button" class="news-dot ${i === currentNewsIndex ? 'active' : ''}" 
      onclick="window.goToNewsSlide(${i})" 
      aria-label="Go to slide ${i + 1}"></button>
  `).join('');
}

window.rotateNewsCarousel = function (direction) {
  const track = document.getElementById('club-news-grid');
  if (!track) return;
  const cards = track.querySelectorAll('.news-carousel-card');
  if (cards.length === 0) return;

  const isMobile = window.innerWidth <= 580;
  const isTablet = window.innerWidth <= 900;
  const visibleCards = isMobile ? 1 : (isTablet ? 2 : (window.innerWidth <= 1200 ? 3 : 4));
  const numSteps = Math.max(1, cards.length - (visibleCards - 1));

  currentNewsIndex = currentNewsIndex + direction;
  if (currentNewsIndex >= numSteps) {
    currentNewsIndex = 0;
  } else if (currentNewsIndex < 0) {
    currentNewsIndex = numSteps - 1;
  }

  const firstCard = cards[0];
  const stepWidth = firstCard.offsetWidth + 24;

  track.scrollTo({
    left: currentNewsIndex * stepWidth,
    behavior: 'smooth'
  });

  updateNewsCarouselDots();
};

window.goToNewsSlide = function (index) {
  const track = document.getElementById('club-news-grid');
  if (!track) return;
  const cards = track.querySelectorAll('.news-carousel-card');
  if (cards.length === 0) return;

  currentNewsIndex = index;
  const firstCard = cards[0];
  const stepWidth = firstCard.offsetWidth + 24;

  track.scrollTo({
    left: currentNewsIndex * stepWidth,
    behavior: 'smooth'
  });

  updateNewsCarouselDots();
};

function setupNewsCarouselAutoRotate() {
  const wrapper = document.querySelector('.news-carousel-wrapper');
  if (!wrapper) return;

  if (newsAutoRotateTimer) clearInterval(newsAutoRotateTimer);

  newsAutoRotateTimer = setInterval(() => {
    window.rotateNewsCarousel(1);
  }, 5500); // 5.5s per rotation

  wrapper.addEventListener('mouseenter', () => {
    if (newsAutoRotateTimer) clearInterval(newsAutoRotateTimer);
  });
  wrapper.addEventListener('mouseleave', () => {
    if (newsAutoRotateTimer) clearInterval(newsAutoRotateTimer);
    newsAutoRotateTimer = setInterval(() => {
      window.rotateNewsCarousel(1);
    }, 5500);
  });
}

function initNews() {
  const container = document.getElementById('club-news-grid');
  if (!container) return;

  const newsList = getStoredClubNews();

  container.innerHTML = newsList.map(news => {
    const isInstagram = news.source === 'instagram';
    const isFacebook = news.source === 'facebook';
    const isShop = news.link && news.link.includes('breakaway');

    return `
    <article class="news-carousel-card" onclick="window.openNewsArticle('${news.id}')">
      <div style="height: 195px; width: 100%; overflow: hidden; position: relative; background: #08090C;">
        <img src="${news.image}" alt="${news.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;" onerror="this.src='assets/images/hero-action.jpg'">
        
        <div style="position: absolute; top: 0.75rem; left: 0.75rem; display: flex; gap: 0.35rem; flex-wrap: wrap;">
          <span style="background: rgba(8,9,12,0.88); backdrop-filter: var(--glass-blur); border: 1px solid rgba(245,166,35,0.4); border-radius: var(--radius-full); padding: 0.2rem 0.65rem; font-size: 0.7rem; font-weight: 700; color: var(--chiefs-gold); text-transform: uppercase;">
            ${news.category}
          </span>
          ${isInstagram ? `
            <span style="background: linear-gradient(135deg, #f09433, #dc2743, #bc1888); backdrop-filter: var(--glass-blur); border-radius: var(--radius-full); padding: 0.2rem 0.55rem; font-size: 0.68rem; font-weight: 700; color: #fff; display: inline-flex; align-items: center; gap: 0.25rem; box-shadow: 0 2px 8px rgba(220, 39, 67, 0.4);">
              <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              ${news.account || 'Instagram'}
            </span>
          ` : isFacebook ? `
            <span style="background: rgba(24, 119, 242, 0.92); backdrop-filter: var(--glass-blur); border-radius: var(--radius-full); padding: 0.2rem 0.55rem; font-size: 0.68rem; font-weight: 700; color: #fff; display: inline-flex; align-items: center; gap: 0.25rem;">
              <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </span>
          ` : ''}
        </div>
      </div>

      <div style="padding: 1.35rem; display: flex; flex-direction: column; flex-grow: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.45rem;">
          <span>${news.date}</span>
          ${news.credit ? `<span style="font-size: 0.68rem; color: #94a3b8; font-style: italic;">📷 ${news.credit.replace('Photography', 'Photo')}</span>` : ''}
        </div>

        <h3 style="font-family: var(--font-heading); font-size: 1.08rem; font-weight: 800; color: #fff; line-height: 1.35; margin-bottom: 0.6rem;">
          ${news.title}
        </h3>

        <p style="color: var(--text-secondary); font-size: 0.84rem; line-height: 1.5; margin-bottom: 1.1rem; flex-grow: 1;">
          ${news.summary}
        </p>

        <div style="display: flex; gap: 0.5rem; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.85rem; margin-top: auto;" onclick="event.stopPropagation()">
          <button type="button" class="btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem;" onclick="window.openNewsArticle('${news.id}')">
            Read Story →
          </button>
          ${isInstagram ? `
            <a href="${news.link || news.sourceUrl || 'https://www.instagram.com/mercerchiefshockey/'}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.65rem; color: #f472b6; border-color: rgba(220, 39, 67, 0.4); display: inline-flex; align-items: center; gap: 0.3rem;">
              <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              View ↗
            </a>
          ` : isFacebook ? `
            <a href="${news.link || news.sourceUrl || 'https://www.facebook.com/mercerchiefshockey'}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.65rem; color: #93c5fd; border-color: rgba(24, 119, 242, 0.4); display: inline-flex; align-items: center; gap: 0.3rem;">
              <svg width="11" height="11" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              ${isShop ? 'Shop ↗' : 'View ↗'}
            </a>
          ` : ''}
        </div>
      </div>
    </article>
    `;
  }).join('');

  updateNewsCarouselDots();
  setupNewsCarouselAutoRotate();

  let scrollTimeout;
  container.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const cards = container.querySelectorAll('.news-carousel-card');
      if (cards.length === 0) return;
      const stepWidth = cards[0].offsetWidth + 24;
      const newIdx = Math.round(container.scrollLeft / stepWidth);
      if (newIdx !== currentNewsIndex) {
        currentNewsIndex = newIdx;
        updateNewsCarouselDots();
      }
    }, 100);
  }, { passive: true });

  window.addEventListener('resize', updateNewsCarouselDots);
}

window.openNewsArticle = function (articleId) {
  const newsList = getStoredClubNews();
  const art = newsList.find(a => a.id === articleId);
  if (!art) return;

  const modal = document.getElementById('article-reader-modal');
  if (!modal) {
    alert(`${art.title}\n\n${art.summary}`);
    return;
  }

  const imgEl = document.getElementById('reader-modal-img');
  if (imgEl) imgEl.src = art.image || 'assets/images/hero-action.jpg';

  const catEl = document.getElementById('reader-modal-category');
  if (catEl) catEl.textContent = art.category || 'Club News';

  const dateEl = document.getElementById('reader-modal-date');
  if (dateEl) dateEl.textContent = `${art.date} • ${art.readTime || '2 min read'}`;

  const titleEl = document.getElementById('reader-modal-title');
  if (titleEl) titleEl.textContent = art.title;

  const summaryEl = document.getElementById('reader-modal-summary');
  if (summaryEl) summaryEl.textContent = art.summary;

  const creditEl = document.getElementById('reader-modal-credit');
  if (creditEl) {
    if (art.credit) {
      creditEl.textContent = `Photography: ${art.credit}`;
      creditEl.style.display = 'block';
    } else {
      creditEl.style.display = 'none';
    }
  }

  const fbBtn = document.getElementById('reader-modal-fb-btn');
  if (fbBtn) {
    const isIg = art.source === 'instagram';
    const isFb = art.source === 'facebook';
    const targetUrl = art.link || art.sourceUrl || (isIg ? 'https://www.instagram.com/mercerchiefshockey/' : 'https://www.facebook.com/mercerchiefshockey');
    fbBtn.href = targetUrl;

    if (isIg) {
      fbBtn.style.background = 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';
      fbBtn.style.borderColor = 'transparent';
      fbBtn.style.color = '#fff';
      const accName = art.account ? ` (${art.account})` : '';
      fbBtn.innerHTML = `
        <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        View on Instagram${accName} ↗
      `;
    } else if (art.link && art.link.includes('breakaway')) {
      fbBtn.style.background = 'var(--chiefs-gold)';
      fbBtn.style.borderColor = 'var(--chiefs-gold)';
      fbBtn.style.color = '#000';
      fbBtn.innerHTML = '🛒 Visit Mercer Chiefs Team Store ↗';
    } else {
      fbBtn.style.background = 'linear-gradient(135deg, #1877F2, #0A53BE)';
      fbBtn.style.borderColor = '#1877F2';
      fbBtn.style.color = '#fff';
      fbBtn.innerHTML = '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> View on Mercer Chiefs Facebook ↗';
    }
  }

  modal.classList.add('open');
};

window.closeNewsArticle = function () {
  const modal = document.getElementById('article-reader-modal');
  if (modal) modal.classList.remove('open');
};

// Cross-tab auto-refresh when updated via Admin Portal
window.addEventListener('storage', () => {
  initNews();
  if (typeof window.populateYouthDropdown === 'function') {
    window.populateYouthDropdown();
  }
  renderYouthDisplay();
  if (typeof renderCommitmentsCards === 'function') {
    renderCommitmentsCards();
  }
  initSiteContent();
  if (typeof updateHeroLeagueBadgesVisibility === 'function') {
    updateHeroLeagueBadgesVisibility();
  }
});

/* ==========================================================================
   11. MODALS & FORMS
   ========================================================================== */
function initModals() {
  // Close buttons
  document.querySelectorAll('.modal-close-btn, .modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el) {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
      }
    });
  });

  // Pre-filled mailto helper
  function openPreFilledMailto(toEmail, subject, bodyText) {
    const cleanTo = String(toEmail).replace(/\s+/g, '');
    const mailtoUrl = `mailto:${encodeURIComponent(cleanTo).replace(/%2C/g, ',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    const tempLink = document.createElement('a');
    tempLink.href = mailtoUrl;
    tempLink.style.display = 'none';
    document.body.appendChild(tempLink);
    tempLink.click();
    setTimeout(() => {
      if (tempLink.parentNode) tempLink.parentNode.removeChild(tempLink);
    }, 1000);
  }

  // 1. Scout Inquiry Form submission
  const scoutForm = document.getElementById('scout-inquiry-form');
  if (scoutForm) {
    scoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('scout-name')?.value.trim() || 'Scout';
      const org = document.getElementById('scout-org')?.value.trim() || 'N/A';
      const email = document.getElementById('scout-email')?.value.trim() || 'N/A';
      const phone = document.getElementById('scout-phone')?.value.trim() || 'N/A';
      const player = document.getElementById('scout-target-player')?.value.trim() || 'All Roster Prospects';
      const notes = document.getElementById('scout-notes')?.value.trim() || 'Requesting complete scouting evaluation package and game video.';

      const targetEmails = 'mercerjuniorhockey@gmail.com,recruiting@mercerchiefs.com';
      const subject = `Scout Inquiry: ${player} - ${org} (${name})`;
      const body = `Dear Coach Broderick & Mercer Chiefs Scouting Staff,\n\nI am submitting a player evaluation and recruiting inquiry:\n\n• Scout Name: ${name}\n• College / Pro Organization: ${org}\n• Email: ${email}\n• Phone: ${phone}\n• Player(s) of Interest: ${player}\n\nInquiry Details / Request:\n${notes}\n\nThank you,\n${name}`;

      openPreFilledMailto(targetEmails, subject, body);

      alert(`Thank you, ${name}! Opening your email client with your scouting questionnaire pre-filled for Coach Broderick and Head Scout Ryan Kosecki. Please click 'Send' in your mail program.`);
      document.getElementById('scout-inquiry-modal')?.classList.remove('open');
      scoutForm.reset();
    });
  }

  // 2. Billet Form submission
  const billetForm = document.getElementById('billet-app-form');
  if (billetForm) {
    billetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const hostName = document.getElementById('billet-host-name')?.value.trim() || 'Prospective Host Family';
      const phone = document.getElementById('billet-phone')?.value.trim() || 'N/A';
      const email = document.getElementById('billet-email')?.value.trim() || 'N/A';
      const town = document.getElementById('billet-town')?.value.trim() || 'N/A';
      const roomsSelect = document.getElementById('billet-rooms');
      const roomsText = roomsSelect?.options[roomsSelect.selectedIndex]?.text || roomsSelect?.value || '1 Private Bedroom';

      let coordEmail = 'billet@mercerchiefshockey.com';
      try {
        const raw = localStorage.getItem('mercer_site_content');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.billetModal?.coordinatorEmail) {
            coordEmail = parsed.billetModal.coordinatorEmail;
          }
        }
      } catch (err) {}

      const subject = `Mercer Chiefs Billet Family Application - ${hostName}`;
      const body = `Dear Mercer Chiefs Billeting Staff & Coordinator,\n\nI would like to apply to host a junior player for the 2026/27 season:\n\n• Primary Contact: ${hostName}\n• Phone Number: ${phone}\n• Email Address: ${email}\n• Town / Township: ${town}\n• Accommodations: ${roomsText}\n\nPlease let us know the next steps for a family interview, home visit, and orientation.\n\nThank you,\n${hostName}`;

      openPreFilledMailto(coordEmail, subject, body);

      alert(`Thank you, ${hostName}! Opening your email client to send your billet host application directly to Coordinator Heather O'Connell (${coordEmail}). Please click 'Send' in your mail program.`);
      document.getElementById('billet-modal')?.classList.remove('open');
      billetForm.reset();
    });
  }

  // 3. Tryout Registration Form submission
  const tryoutForm = document.getElementById('tryout-register-form');
  if (tryoutForm) {
    tryoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const playerName = document.getElementById('player-reg-name')?.value.trim() || 'Player';
      const birthYear = document.getElementById('player-reg-by')?.value.trim() || '2012';
      const position = document.getElementById('player-pos')?.value.trim() || 'Forward';
      const tierTargetSelect = document.getElementById('player-tier-target');
      const tierTarget = tierTargetSelect?.options[tierTargetSelect.selectedIndex]?.text || 'Tier 1 AAA (THF)';
      const parentName = document.getElementById('parent-name')?.value.trim() || 'Parent';
      const parentEmail = document.getElementById('parent-email')?.value.trim() || 'N/A';
      const lastTeam = document.getElementById('last-team')?.value.trim() || 'N/A';

      const targetEmails = 'mercerjuniorhockey@gmail.com,heather@ice-land.com';
      const subject = `Tryout Evaluation Registration: ${playerName} (${birthYear} ${position})`;
      const body = `Dear Mercer Chiefs Hockey Operations,\n\nPlease find our evaluation registration details for upcoming 2026/27 tryouts at Ice Land Arena:\n\n• Player Name: ${playerName}\n• Birth Year: ${birthYear}\n• Position: ${position}\n• Target Level: ${tierTarget}\n• Parent / Guardian: ${parentName}\n• Parent Email: ${parentEmail}\n• 2025/26 Previous Team: ${lastTeam}\n\nPlease reply with our evaluation session ice times, check-in instructions, and jersey assignment.\n\nThank you,\n${parentName}`;

      openPreFilledMailto(targetEmails, subject, body);

      alert(`Thank you, ${parentName}! Opening your email client with ${playerName}'s tryout registration pre-filled for Mercer Chiefs Hockey Operations. Please click 'Send' in your mail program.`);
      document.getElementById('tryout-modal')?.classList.remove('open');
      tryoutForm.reset();
    });
  }
}

// Global modal triggers for HTML buttons
window.openScoutModalWithPlayer = function (playerName) {
  document.getElementById('player-bio-modal')?.classList.remove('open');
  const modal = document.getElementById('scout-inquiry-modal');
  if (!modal) return;
  const targetField = document.getElementById('scout-target-player');
  if (targetField && playerName) {
    targetField.value = playerName;
  }
  modal.classList.add('open');
};

window.openBilletModal = function () {
  document.getElementById('billet-modal')?.classList.add('open');
};

window.openTryoutModal = function () {
  document.getElementById('tryout-modal')?.classList.add('open');
};

window.closeMobileNav = function () {
  const toggle = document.getElementById('mobile-nav-toggle');
  const navMenu = document.getElementById('site-nav-menu');
  if (navMenu) {
    navMenu.classList.remove('open');
    navMenu.style.display = '';
  }
  if (toggle) {
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
};

/* ==========================================================================
   12. MOBILE NAVIGATION
   ========================================================================== */
function initMobileNav() {
  const toggle = document.getElementById('mobile-nav-toggle');
  const navMenu = document.getElementById('site-nav-menu');

  if (toggle && navMenu) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenu.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navMenu.style.display = '';
    });

    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        window.closeMobileNav();
      });
    });

    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('open') && !navMenu.contains(e.target) && !toggle.contains(e.target)) {
        window.closeMobileNav();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 880) {
        window.closeMobileNav();
      }
    });
  }
}

/* ==========================================================================
   13. NAVBAR SCROLL SPY & ACTIVE HIGHLIGHT CONTROLLER
   ========================================================================== */
function initNavbarScrollSpy() {
  const navMenu = document.getElementById('site-nav-menu');
  if (!navMenu) return;

  const NAV_ITEMS = [
    { sectionId: 'ncdc-hub', linkId: 'nav-link-ncdc' },
    { sectionId: 'youth-hub', linkId: 'nav-link-youth' },
    { sectionId: 'tryouts-section', linkId: 'nav-link-tryouts' },
    { sectionId: 'arena-section', linkId: 'nav-link-arena' },
    { sectionId: 'news-section', linkId: 'nav-link-news' }
  ];

  const navLinks = navMenu.querySelectorAll('.nav-link');
  let isManualScroll = false;
  let manualScrollTimer = null;

  function setActiveNavLink(targetId) {
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (targetId && (href === `#${targetId}` || link.id === targetId)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  function updateActiveSection() {
    if (isManualScroll) return;

    const header = document.getElementById('site-header');
    const headerHeight = header ? header.offsetHeight : 80;
    const scrollPos = window.scrollY;
    const threshold = headerHeight + 120; // 200px trigger line below top

    // 1. If reached bottom of document, activate the last nav item ('news-section')
    const scrollBottom = window.innerHeight + scrollPos;
    const documentHeight = document.documentElement.scrollHeight;
    if (scrollBottom >= documentHeight - 60) {
      setActiveNavLink('news-section');
      return;
    }

    // 2. If above the first section (e.g. Hero section at top of page)
    const firstSec = document.getElementById(NAV_ITEMS[0].sectionId);
    if (firstSec && scrollPos + threshold < firstSec.offsetTop) {
      setActiveNavLink(null);
      return;
    }

    // 3. Find the current active section (last section whose offsetTop is <= scrollPos + threshold)
    let currentSectionId = null;
    for (const item of NAV_ITEMS) {
      const el = document.getElementById(item.sectionId);
      if (el && el.offsetTop <= scrollPos + threshold) {
        currentSectionId = item.sectionId;
      }
    }

    if (currentSectionId) {
      setActiveNavLink(currentSectionId);
    }
  }

  function setManualScrollLock(targetSectionId) {
    setActiveNavLink(targetSectionId);
    isManualScroll = true;
    clearTimeout(manualScrollTimer);

    const unlock = () => {
      isManualScroll = false;
      updateActiveSection();
      window.removeEventListener('scrollend', unlock);
    };

    if ('onscrollend' in window) {
      window.addEventListener('scrollend', unlock, { once: true });
    }
    manualScrollTimer = setTimeout(unlock, 2000);
  }

  // Handle click on all anchor links targeting sections
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    const href = anchor.getAttribute('href');
    if (!href || href === '#' || href === '#top') return;
    const targetSectionId = href.slice(1);
    const isNavSection = NAV_ITEMS.some(item => item.sectionId === targetSectionId);

    if (isNavSection) {
      anchor.addEventListener('click', (e) => {
        const el = document.getElementById(targetSectionId);
        if (el) {
          e.preventDefault();
          setManualScrollLock(targetSectionId);
          const header = document.getElementById('site-header');
          const headerHeight = header ? header.offsetHeight : 80;
          const targetY = Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerHeight + 2);
          window.scrollTo({ top: targetY, behavior: 'smooth' });
          if (window.location.hash !== `#${targetSectionId}`) {
            history.pushState(null, '', `#${targetSectionId}`);
          }
        }
      });
    }
  });

  // Logo home click
  document.getElementById('brand-home-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    setManualScrollLock(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.location.hash) {
      history.pushState(null, '', window.location.pathname + window.location.search);
    }
  });

  // Passive high-performance scroll listener with requestAnimationFrame
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateActiveSection();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Update on hashchange, popstate, and initial load
  const handleUrlHash = () => {
    const hash = window.location.hash.slice(1);
    if (hash && NAV_ITEMS.some(item => item.sectionId === hash)) {
      setManualScrollLock(hash);
      return;
    }
    updateActiveSection();
  };

  window.addEventListener('hashchange', handleUrlHash);
  window.addEventListener('popstate', handleUrlHash);

  // Initial check on load
  setTimeout(() => {
    const hash = window.location.hash.slice(1);
    if (hash && NAV_ITEMS.some(item => item.sectionId === hash)) {
      setActiveNavLink(hash);
    } else {
      updateActiveSection();
    }
  }, 100);
}
