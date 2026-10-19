import {
  JUNIOR_TEAMS,
  LIVE_TICKER_GAMES,
  YOUTH_TEAMS,
  CLUB_NEWS,
  COLLEGE_COMMITMENTS
} from './data/chiefs-data.js';

// Portal State
const adminState = {
  hiddenTeams: getStoredHiddenTeams(),
  newsArticles: getStoredClubNews(),
  alumniCommitments: getStoredAlumniCommitments(),
  youthTeams: getStoredYouthTeams(),
  juniorTeams: getStoredJuniorTeams(),
  seasonConfig: getStoredSeasonConfig(),
  fbConfig: getStoredFacebookConfig(),
  seasonFilter: 'all',
  seasonSearchQuery: '',
  alumniFilter: 'all',
  alumniSearchQuery: '',
  lastSyncTime: localStorage.getItem('mercer_last_sync_timestamp') || 'October 15, 2026'
};

import { applyVerifiedResults } from './app.js';

// Storage Helpers
function getStoredJuniorTeams() {
  let data = null;
  try {
    const raw = localStorage.getItem('mercer_synced_junior_data');
    if (raw) data = JSON.parse(raw);
  } catch (e) {}

  if (!data || typeof data !== 'object') {
    data = JUNIOR_TEAMS;
  }

  const { junior } = applyVerifiedResults(data, LIVE_TICKER_GAMES);
  return junior;
}
function getStoredFacebookConfig() {
  try {
    const raw = localStorage.getItem('mercer_fb_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          pageId: parsed.pageId || 'mercerchiefshockey',
          accessToken: parsed.accessToken || ''
        };
      }
    }
  } catch (e) {}
  return {
    pageId: 'mercerchiefshockey',
    accessToken: ''
  };
}

function getStoredSeasonConfig() {
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
  } catch (e) {}
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

function getStoredHiddenTeams() {
  try {
    const raw = localStorage.getItem('mercer_hidden_teams');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function getStoredClubNews() {
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
            } catch (e) {}
          }
          return parsed;
        }
      }
    }
  } catch (e) {}
  return [...CLUB_NEWS];
}

function getStoredYouthTeams() {
  try {
    const rawConfigured = localStorage.getItem('mercer_configured_teams');
    if (rawConfigured) {
      const parsed = JSON.parse(rawConfigured);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasResults = parsed.some(t => Array.isArray(t.recentResults) && t.recentResults.length > 0);
        if (hasResults) return parsed;
        localStorage.removeItem('mercer_configured_teams');
      }
    }
    const raw = localStorage.getItem('mercer_synced_youth_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasResults = parsed.some(t => Array.isArray(t.recentResults) && t.recentResults.length > 0);
        if (hasResults) return parsed;
        localStorage.removeItem('mercer_synced_youth_data');
      }
    }
  } catch (e) {}
  return [...YOUTH_TEAMS];
}

function getStoredAlumniCommitments() {
  try {
    const raw = localStorage.getItem('mercer_alumni_commitments');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [...COLLEGE_COMMITMENTS];
}

// Initialize Admin Portal
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  updateMetrics();
  initSeasonParameters();
  initFacebookConfigUI();
  initGitHubConfigUI();
  renderTeamToggles();
  renderSeasonTable();
  renderNewsList();
  renderAlumniTable();
  initSiteContentCMS();
  initClubBrandingCMS();
});

/* ==========================================================================
   1. AUTHENTICATION & SESSION
   ========================================================================== */
function checkAuth() {
  const isAuth = sessionStorage.getItem('mercer_admin_auth') === 'true';
  const authScreen = document.getElementById('auth-screen');
  if (authScreen) {
    authScreen.style.display = isAuth ? 'none' : 'flex';
  }
}

window.handleAuth = async function (e) {
  if (e && e.preventDefault) e.preventDefault();
  const passkey = document.getElementById('auth-passkey')?.value.trim();
  if (!passkey) return;

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(passkey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Cryptographic SHA-256 hash of authorized staff passkey
    const AUTH_HASH = '833bfed8e88daffe3a0c14414ab5a6a58ae7766dcc52e32e994da7a9c5dd5a5e';

    if (hashHex === AUTH_HASH) {
      sessionStorage.setItem('mercer_admin_auth', 'true');
      checkAuth();
      showToast('Portal unlocked. Welcome, Mercer Chiefs Staff!');
    } else {
      alert('Invalid Passkey. Please enter the authorized staff passkey or contact organization administration.');
    }
  } catch (err) {
    console.error('Auth verification error:', err);
    alert('Authentication error occurred. Please try again.');
  }
};

window.logout = function () {
  sessionStorage.removeItem('mercer_admin_auth');
  checkAuth();
  showToast('Portal locked.');
};

/* ==========================================================================
   2. TAB NAVIGATION
   ========================================================================== */
window.switchAdminTab = function (tabId) {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.admin-tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  if (tabId === 'tab-content') {
    window.initSiteContentCMS();
  }
  if (tabId === 'tab-branding') {
    window.initClubBrandingCMS();
  }
};

/* ==========================================================================
   3. METRICS & SUMMARY
   ========================================================================== */
function updateMetrics() {
  const totalTeams = 2 + adminState.youthTeams.length; // 2 Junior + 29 Youth = 31
  let totalPlayers = 24 + 27; // NCDC + Premier
  let totalGames = 50 + 44; // NCDC + Premier
  
  adminState.youthTeams.forEach(t => {
    totalPlayers += (t.roster || t.sampleRoster || []).length;
    totalGames += (t.upcomingSchedule || []).length + (t.recentResults || []).length;
  });

  const elTeams = document.getElementById('metric-total-teams');
  const elPlayers = document.getElementById('metric-total-players');
  const elGames = document.getElementById('metric-total-games');
  const elLastSync = document.getElementById('metric-last-sync-time');

  if (elTeams) elTeams.textContent = totalTeams;
  if (elPlayers) elPlayers.textContent = totalPlayers + '+';
  if (elGames) elGames.textContent = totalGames + '+';
  if (elLastSync) {
    const formatted = formatLastSync(adminState.lastSyncTime);
    elLastSync.textContent = `Last Synced: ${formatted}`;
  }

  updateVisibleTeamsBadge();
}

function formatLastSync(isoStr) {
  if (!isoStr) return 'Just now';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  } catch (e) {
    return isoStr;
  }
}

/* ==========================================================================
   4. DATA SYNCHRONIZATION & GITHUB CLOUD AUTOMATION
   ========================================================================== */

// 4A. GitHub Cloud Automation Configuration
function initGitHubConfigUI() {
  const tokenInput = document.getElementById('cfg-github-token');
  const badge = document.getElementById('github-token-status-badge');
  const token = localStorage.getItem('mercer_github_token')?.trim();

  if (tokenInput && token && !tokenInput.value) {
    tokenInput.value = token;
  }

  if (badge) {
    if (token) {
      badge.textContent = "● GitHub Connected";
      badge.style.background = "rgba(34, 197, 94, 0.15)";
      badge.style.color = "#4ade80";
      badge.style.borderColor = "rgba(34, 197, 94, 0.35)";
    } else {
      badge.textContent = "○ Token Not Configured";
      badge.style.background = "rgba(245, 158, 11, 0.15)";
      badge.style.color = "var(--chiefs-gold)";
      badge.style.borderColor = "rgba(245, 158, 11, 0.35)";
    }
  }
}

window.toggleGitHubSettings = function () {
  const panel = document.getElementById('github-api-settings-panel');
  if (!panel) return;
  const isHidden = panel.style.display === 'none' || !panel.style.display;
  panel.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    initGitHubConfigUI();
  }
};

window.toggleGitHubTokenVisibility = function () {
  const input = document.getElementById('cfg-github-token');
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
};

window.saveGitHubConfig = function () {
  const input = document.getElementById('cfg-github-token');
  const feedback = document.getElementById('github-token-feedback');
  const token = (input ? input.value : '').trim();

  if (!token) {
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.color = '#f87171';
      feedback.textContent = 'Please paste a GitHub Personal Access Token or click Clear.';
    }
    showToast("Please enter a GitHub Personal Access Token.", "error");
    return;
  }

  localStorage.setItem('mercer_github_token', token);
  initGitHubConfigUI();

  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.color = '#4ade80';
    feedback.innerHTML = '✓ Token saved securely in local browser storage. Ready for 1-click cloud sync!';
  }
  showToast("GitHub Personal Access Token saved successfully!");
};

window.clearGitHubConfig = function () {
  localStorage.removeItem('mercer_github_token');
  const input = document.getElementById('cfg-github-token');
  if (input) input.value = '';
  initGitHubConfigUI();
  const feedback = document.getElementById('github-token-feedback');
  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.color = '#94a3b8';
    feedback.textContent = 'GitHub token removed from this browser.';
  }
  showToast("GitHub token cleared.");
};

// 4B. 1-Click Cloud Scraper Trigger (Dispatches GitHub Actions Ubuntu Runner)
window.triggerGitHubCloudSync = async function () {
  const token = localStorage.getItem('mercer_github_token')?.trim();
  const repoOwner = 'natel1380';
  const repoName = 'mercer-chiefs-website';
  const workflowFile = 'hourly_sync.yml';

  const btn = document.getElementById('btn-cloud-sync');
  const originalHtml = btn ? btn.innerHTML : '';
  const pContainer = document.getElementById('sync-progress-container');
  const pBar = document.getElementById('sync-progress-bar');
  const pText = document.getElementById('sync-status-text');
  const pPct = document.getElementById('sync-status-pct');
  const consoleEl = document.getElementById('sync-console');

  const log = (msg) => {
    if (consoleEl) {
      const time = new Date().toLocaleTimeString();
      consoleEl.innerHTML += `\n[${time}] ${msg}`;
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  };

  const updateProgress = (pct, msg) => {
    if (pBar) pBar.style.width = `${pct}%`;
    if (pPct) pPct.textContent = `${pct}%`;
    if (pText) pText.textContent = msg;
  };

  if (!token) {
    window.toggleGitHubSettings();
    const panel = document.getElementById('github-api-settings-panel');
    if (panel) panel.style.display = 'block';
    const feedback = document.getElementById('github-token-feedback');
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.color = '#f87171';
      feedback.textContent = 'A GitHub Personal Access Token is required to trigger cloud scraper runs.';
    }
    document.getElementById('cfg-github-token')?.focus();
    log(`[ERROR] Cannot trigger cloud sync: No GitHub token configured.`);
    log(`[ACTION] Please paste your GitHub Personal Access Token in the settings drawer above and click 'Save Token'.`);
    log(`[OR] Click 'Actions Tab ↗' to manually click 'Run workflow' directly in GitHub.`);
    showToast('Please enter your GitHub token first (or run manually in Actions tab).');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `⏳ Launching Cloud Runner...`;
  }
  if (pContainer) pContainer.style.display = 'block';

  log(`[START] Contacting GitHub Actions API to trigger '${workflowFile}' on ${repoOwner}/${repoName}...`);
  updateProgress(15, 'Dispatching workflow to GitHub Actions...');

  try {
    const hiddenTeams = adminState.hiddenTeams || [];
    const dispatchUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowFile}/dispatches`;
    const res = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          hidden_teams: JSON.stringify(hiddenTeams)
        }
      })
    });

    if (res.status === 204) {
      log(`[GITHUB SUCCESS] Workflow dispatched successfully! Runner started in cloud.`);
      if (hiddenTeams.length > 0) {
        log(`[CONFIG] Synced ${hiddenTeams.length} hidden team preferences to cloud runner.`);
      }
      updateProgress(35, 'Cloud VM spinning up Ubuntu runner & Node.js environment...');
      if (btn) btn.innerHTML = `⚙️ Cloud Scraper Running...`;

      // Poll GitHub Actions workflow runs to monitor progress
      let attempts = 0;
      const maxAttempts = 35; // ~70-100 seconds
      let runStarted = false;

      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const runsUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowFile}/runs?per_page=1`;
          const runRes = await fetch(runsUrl, {
            headers: {
              'Accept': 'application/vnd.github+json',
              'Authorization': `Bearer ${token}`,
              'X-GitHub-Api-Version': '2022-11-28'
            }
          });

          if (runRes.ok) {
            const runData = await runRes.json();
            const latest = runData.workflow_runs?.[0];
            if (latest) {
              if (latest.status === 'in_progress' || latest.status === 'queued') {
                runStarted = true;
                const pct = Math.min(85, 35 + (attempts * 3));
                updateProgress(pct, `Cloud Scraper Run #${latest.run_number}: ${latest.status.toUpperCase()} (scraping USPHL & TimeToScore)...`);
                if (attempts % 4 === 0) {
                  log(`[RUN #${latest.run_number}] Status: ${latest.status} | Scraping league box scores & decompressed PDFs...`);
                }
              } else if (latest.status === 'completed' && runStarted) {
                clearInterval(pollInterval);
                if (latest.conclusion === 'success') {
                  updateProgress(100, `Cloud Sync Completed Successfully! Deploying site...`);
                  log(`[COMPLETE] Run #${latest.run_number} finished with conclusion: SUCCESS!`);
                  log(`[PAGES] Mercer Chiefs Bot committed updated feeds. Live site is deploying.`);
                  showToast('Cloud scraper completed successfully! Live feeds updated.');
                  // Automatically reload the fresh feeds into this admin dashboard
                  setTimeout(() => {
                    window.runDataSync('all');
                  }, 1200);
                } else {
                  updateProgress(100, `Run finished with: ${latest.conclusion}`);
                  log(`[WARN] Workflow concluded with: ${latest.conclusion}. Log: ${latest.html_url}`);
                  showToast(`Cloud run finished: ${latest.conclusion}`);
                }

                if (btn) {
                  btn.disabled = false;
                  btn.innerHTML = originalHtml;
                }
                return;
              }
            }
          }
        } catch (pollErr) {
          console.debug('Polling error:', pollErr);
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          updateProgress(100, 'Cloud runner initiated. Check GitHub Actions tab for logs.');
          log(`[INFO] Workflow has been dispatched. Track completion live at: https://github.com/${repoOwner}/${repoName}/actions`);
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
          }
          // Fetch whatever is ready
          window.runDataSync('all');
        }
      }, 3000);

    } else {
      const err = await res.json().catch(() => ({}));
      log(`[GITHUB ERROR] HTTP ${res.status}: ${err.message || res.statusText}`);
      if (res.status === 401 || res.status === 403) {
        log(`[HINT] Check that your token is valid and has 'actions:write' (or repo) permission.`);
        window.toggleGitHubSettings();
      }
      showToast(`GitHub API error: ${err.message || 'Check token permissions'}`);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
      if (pContainer) pContainer.style.display = 'none';
    }
  } catch (err) {
    log(`[NETWORK ERROR] Could not reach GitHub API: ${err.message}`);
    showToast(`Network error: ${err.message}`);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
    if (pContainer) pContainer.style.display = 'none';
  }
};

// 4C. Browser Cache Feeds Reloader
window.runDataSync = async function (scope = 'all') {
  const btn = document.getElementById('btn-sync-all');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `Reloading...`;
  }

  const pContainer = document.getElementById('sync-progress-container');
  const pBar = document.getElementById('sync-progress-bar');
  const pText = document.getElementById('sync-status-text');
  const pPct = document.getElementById('sync-status-pct');
  const consoleEl = document.getElementById('sync-console');

  if (pContainer) pContainer.style.display = 'block';

  const log = (msg) => {
    if (consoleEl) {
      const time = new Date().toLocaleTimeString();
      consoleEl.innerHTML += `\n[${time}] ${msg}`;
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  };

  const updateProgress = (pct, msg) => {
    if (pBar) pBar.style.width = `${pct}%`;
    if (pPct) pPct.textContent = `${pct}%`;
    if (pText) pText.textContent = msg;
  };

  const cfg = adminState.seasonConfig;
  log(`[RELOAD] Reading latest published feeds from server (Season ${cfg.seasonLabel})...`);
  updateProgress(20, `Fetching data/junior-feed.json (Season ${cfg.usphlSeasonId})...`);

  let updatedJunior = null;
  let updatedTicker = null;

  try {
    const res = await fetch(`data/junior-feed.json?t=${Date.now()}`);
    if (res.ok) {
      const feed = await res.json();
      if (feed && feed.ncdc && feed.premier) {
        updatedJunior = {
          ncdc: feed.ncdc,
          premier: feed.premier
        };
        updatedTicker = feed.ticker || null;
        log(`[JUNIOR FEED] Loaded Junior feed. Last Synced: ${feed.lastSynced || 'Current'}`);
        if (feed.premier?.standings) {
          const chiefsPrem = feed.premier.standings.find(t => t.team?.includes('Mercer'));
          if (chiefsPrem) {
            log(`[STANDINGS] Premier: Rank #${chiefsPrem.rank} (${chiefsPrem.gp} GP, ${chiefsPrem.w}-${chiefsPrem.l}-${chiefsPrem.otl}, ${chiefsPrem.pts} PTS)`);
          }
        }
      }
    }
  } catch (err) {
    log(`[WARN] Junior feed fetch failed (${err.message}). Using local base data.`);
  }

  if (!updatedJunior) updatedJunior = JUNIOR_TEAMS;
  if (!updatedTicker) updatedTicker = LIVE_TICKER_GAMES;

  adminState.juniorTeams = updatedJunior;

  updateProgress(60, `Fetching data/youth-feed.json (THF & AHF)...`);
  try {
    const youthFeedResp = await fetch(`data/youth-feed.json?t=${Date.now()}`);
    if (youthFeedResp.ok) {
      const youthFeedData = await youthFeedResp.json();
      if (youthFeedData && Array.isArray(youthFeedData.teams) && youthFeedData.teams.length > 0) {
        adminState.youthTeams = youthFeedData.teams;
        log(`[YOUTH FEED] Loaded ${youthFeedData.teams.length} youth squads. Last Synced: ${youthFeedData.lastSynced || 'Current'}`);
        const u18aa = youthFeedData.teams.find(t => t.id === '18u-aa');
        if (u18aa) {
          log(`[YOUTH] 18U AA Record: ${u18aa.record} | Recent: ${u18aa.recentResults?.[0]?.opp || 'N/A'} (${u18aa.recentResults?.[0]?.score || ''})`);
        }
      }
    }
  } catch (e) {
    log(`[WARN] Youth feed fetch failed (${e.message}).`);
  }

  try {
    const cfgResp = await fetch(`data/site-config.json?t=${Date.now()}`);
    if (cfgResp.ok) {
      const siteCfg = await cfgResp.json();
      if (siteCfg && Array.isArray(siteCfg.hiddenTeams)) {
        adminState.hiddenTeams = siteCfg.hiddenTeams;
        localStorage.setItem('mercer_hidden_teams', JSON.stringify(siteCfg.hiddenTeams));
        renderTeamToggles();
        log(`[SITE CONFIG] Synced global hidden teams (${siteCfg.hiddenTeams.length} hidden) from server.`);
      }
    }
  } catch (e) {}

  updateProgress(85, "Synchronizing coaching directory and updating browser cache...");
  await new Promise(r => setTimeout(r, 200));

  // Update timestamps and persist
  const nowIso = new Date().toISOString();
  adminState.lastSyncTime = nowIso;
  localStorage.setItem('mercer_last_sync_timestamp', nowIso);
  localStorage.setItem('mercer_synced_youth_data', JSON.stringify(adminState.youthTeams));
  localStorage.setItem('mercer_synced_junior_data', JSON.stringify(updatedJunior));
  localStorage.setItem('mercer_synced_ticker_data', JSON.stringify(updatedTicker));

  // Trigger cross-tab sync event
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('mercer:datasync', { 
    detail: { juniorTeams: updatedJunior, ticker: updatedTicker, timestamp: nowIso } 
  }));

  updateProgress(100, "Reload complete!");
  log(`[COMPLETE] Dashboard reloaded! 2 junior teams and ${adminState.youthTeams.length} youth teams active.`);
  showToast(`Browser feeds reloaded successfully.`);

  setTimeout(() => {
    if (pContainer) pContainer.style.display = 'none';
    if (pBar) pBar.style.width = '0%';
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
    updateMetrics();
  }, 800);
};

window.clearConsole = function () {
  const consoleEl = document.getElementById('sync-console');
  if (consoleEl) {
    consoleEl.textContent = `[CLEARED] Ready for new sync activity.`;
  }
};

/* ==========================================================================
   5. SHOW / HIDE SPECIFIC TEAMS
   ========================================================================== */
function renderTeamToggles() {
  const gridJunior = document.getElementById('grid-junior-teams');
  const gridThf = document.getElementById('grid-thf-teams');
  const gridAhf = document.getElementById('grid-ahf-teams');

  // Junior Teams
  const juniorList = [
    { id: 'ncdc', name: 'NCDC Junior Team', league: 'USPHL NCDC', tier: 'Tier II Tuition-Free', coach: adminState.seasonConfig.ncdcCoach || 'Rob Broderick', players: 24 },
    { id: 'premier', name: 'USPHL Premier Team', league: 'USPHL Premier', tier: 'Tier III Junior', coach: adminState.seasonConfig.premierCoach || 'Staff', players: 27 }
  ];

  if (gridJunior) {
    gridJunior.innerHTML = juniorList.map(t => renderSingleTeamCard(t)).join('');
  }

  // THF Teams
  const thfTeams = adminState.youthTeams.filter(t => t.leagueId === 5 || t.league?.includes('THF') || t.tier?.includes('THF'));
  if (gridThf) {
    gridThf.innerHTML = thfTeams.map(t => renderSingleTeamCard({
      id: t.id,
      name: t.name,
      league: 'Tier 1 Hockey Federation (THF)',
      tier: t.tier,
      coach: t.headCoach,
      players: (t.roster || t.sampleRoster || []).length
    })).join('');
  }

  // AHF Teams
  const ahfTeams = adminState.youthTeams.filter(t => t.leagueId === 4 || t.league?.includes('AHF') || t.tier?.includes('AHF'));
  if (gridAhf) {
    gridAhf.innerHTML = ahfTeams.map(t => renderSingleTeamCard({
      id: t.id,
      name: t.name,
      league: 'Atlantic Hockey Federation (AHF)',
      tier: t.tier,
      coach: t.headCoach,
      players: (t.roster || t.sampleRoster || []).length
    })).join('');
  }

  updateVisibleTeamsBadge();
}

function renderSingleTeamCard(t) {
  const isHidden = adminState.hiddenTeams.includes(t.id);
  const isChecked = !isHidden;

  return `
    <div class="team-toggle-card ${isHidden ? 'is-hidden' : ''}" id="team-card-${t.id}">
      <div style="min-width: 0;">
        <div class="team-toggle-name">
          <span>${t.name}</span>
          <span style="font-size: 0.68rem; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 700; ${isChecked ? 'background: rgba(34, 197, 94, 0.15); color: #4ade80;' : 'background: rgba(239, 68, 68, 0.15); color: #f87171;'}">
            ${isChecked ? 'Visible' : 'Hidden'}
          </span>
        </div>
        <div class="team-toggle-sub">
          <strong>Coach:</strong> ${t.coach || 'Staff'} • <strong>${t.players}</strong> Players
        </div>
        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.15rem;">
          ${t.league}
        </div>
      </div>

      <label class="switch-toggle" title="Toggle team visibility on public site">
        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.handleTeamVisibilityChange('${t.id}', this.checked)">
        <span class="switch-slider"></span>
      </label>
    </div>
  `;
}

window.handleTeamVisibilityChange = function (teamId, isVisible) {
  if (isVisible) {
    adminState.hiddenTeams = adminState.hiddenTeams.filter(id => id !== teamId);
  } else {
    if (!adminState.hiddenTeams.includes(teamId)) {
      adminState.hiddenTeams.push(teamId);
    }
  }

  localStorage.setItem('mercer_hidden_teams', JSON.stringify(adminState.hiddenTeams));
  
  // Re-render UI
  renderTeamToggles();
  showToast(`Updated! ${teamId.toUpperCase()} is now ${isVisible ? 'visible' : 'hidden'} on the website.`);

  // Cross-tab broadcast
  window.dispatchEvent(new Event('storage'));
};

window.toggleAllTeams = function (showAll) {
  if (showAll) {
    adminState.hiddenTeams = [];
  } else {
    const allIds = [
      'ncdc', 'premier',
      ...adminState.youthTeams.map(t => t.id)
    ];
    adminState.hiddenTeams = allIds;
  }

  localStorage.setItem('mercer_hidden_teams', JSON.stringify(adminState.hiddenTeams));
  renderTeamToggles();
  showToast(showAll ? 'All 31 teams are now visible.' : 'All teams hidden.');
  window.dispatchEvent(new Event('storage'));
};

window.resetTeamVisibility = function () {
  adminState.hiddenTeams = [];
  localStorage.removeItem('mercer_hidden_teams');
  renderTeamToggles();
  showToast('Team visibility reset to defaults (all teams visible).');
  window.dispatchEvent(new Event('storage'));
};

window.publishTeamVisibility = async function () {
  const token = localStorage.getItem('mercer_github_token')?.trim();
  const hiddenTeams = adminState.hiddenTeams || [];
  const btn = document.getElementById('btn-publish-visibility');
  const originalHtml = btn ? btn.innerHTML : '';
  const repoOwner = 'natel1380';
  const repoName = 'mercer-chiefs-website';

  if (!token) {
    window.switchAdminTab('tab-sync');
    window.toggleGitHubSettings();
    showToast('Please enter and save your GitHub Token in Data Sync Center first to publish to the live site.');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `⏳ Publishing to Cloud...`;
  }

  try {
    // 1. Try direct GitHub Contents API (instant ~1s if token has Contents write permission)
    const contentUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/data/site-config.json`;
    let sha = null;
    try {
      const getRes = await fetch(contentUrl, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }
    } catch (e) {}

    const newContent = JSON.stringify({ seasonLabel: '2026/27', hiddenTeams }, null, 2);
    const putRes = await fetch(contentUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `chore: update team visibility (${hiddenTeams.length} hidden)`,
        content: btoa(unescape(encodeURIComponent(newContent))),
        sha: sha || undefined
      })
    });

    if (putRes.ok) {
      showToast(`✓ Published visibility to live site (${hiddenTeams.length} hidden)!`);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `✓ Published!`;
        setTimeout(() => { btn.innerHTML = originalHtml; }, 2500);
      }
      return;
    }

    // 2. Fallback: Trigger dedicated lightweight publish_config.yml workflow (takes ~8s with Actions permission)
    const dispatchUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/publish_config.yml/dispatches`;
    const res = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          hidden_teams: JSON.stringify(hiddenTeams)
        }
      })
    });

    if (res.status === 204) {
      showToast(`✓ Visibility update dispatched to cloud runner (~8s to deploy)!`);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `✓ Dispatched (~8s)!`;
        setTimeout(() => { btn.innerHTML = originalHtml; }, 3000);
      }
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(`Publish error: ${err.message || res.statusText}`, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }
  } catch (err) {
    showToast(`Network error: ${err.message}`, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
};

function updateVisibleTeamsBadge() {
  const total = 2 + adminState.youthTeams.length;
  const visible = total - adminState.hiddenTeams.length;
  const badge = document.getElementById('teams-visible-badge');
  if (badge) {
    badge.textContent = `Showing ${visible} of ${total} Teams`;
    if (visible === total) {
      badge.style.color = '#4ade80';
      badge.style.borderColor = 'rgba(34, 197, 94, 0.4)';
    } else {
      badge.style.color = '#facc15';
      badge.style.borderColor = 'rgba(234, 179, 8, 0.4)';
    }
  }
}

/* ==========================================================================
   6. NEWS & ARTICLES CMS
   ========================================================================== */
function renderNewsList() {
  const container = document.getElementById('news-articles-list');
  if (!container) return;

  if (adminState.newsArticles.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
        No articles published currently. Click "Pull Latest Facebook Posts" or "+ Write New Article" to post news to the website.
      </div>
    `;
    return;
  }

  container.innerHTML = adminState.newsArticles.map((art, idx) => {
    const isFacebook = art.source === 'facebook';

    return `
    <div class="news-manage-card">
      <div style="position: relative; height: 160px; overflow: hidden; background: #08090C;">
        <img src="${art.image || 'assets/images/hero-action.jpg'}" alt="${art.title}" class="news-manage-img" style="height: 100%; object-fit: cover;" onerror="this.src='assets/images/hero-action.jpg'">
        <div style="position: absolute; top: 0.6rem; left: 0.6rem; display: flex; gap: 0.35rem; flex-wrap: wrap;">
          <span class="pill-badge" style="background: rgba(189, 50, 59, 0.85); border-color: rgba(189, 50, 59, 0.35); color: #fff; font-size: 0.7rem; font-weight: 700;">
            ${art.category}
          </span>
          ${isFacebook ? `
            <span class="pill-badge" style="background: rgba(24, 119, 242, 0.9); border-color: #1877F2; color: #fff; font-size: 0.68rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
              <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook Post
            </span>
          ` : `
            <span class="pill-badge" style="background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); color: #e2e8f0; font-size: 0.68rem;">
              Manual Article
            </span>
          `}
        </div>
      </div>

      <div class="news-manage-body">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
          <span style="font-size: 0.75rem; color: var(--text-muted);">${art.date}</span>
          ${art.credit ? `<span style="font-size: 0.7rem; color: #94a3b8; font-style: italic;">📷 ${art.credit}</span>` : ''}
        </div>
        <h4 style="font-family: var(--font-heading); font-size: 1.05rem; font-weight: 700; color: #fff; line-height: 1.35; margin-bottom: 0.6rem;">
          ${art.title}
        </h4>
        <p style="font-size: 0.83rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.25rem; flex-grow: 1;">
          ${art.summary}
        </p>
        <div style="display: flex; gap: 0.5rem; border-top: 1px solid var(--border-subtle); padding-top: 0.85rem; align-items: center;">
          <button type="button" class="btn-secondary" style="flex: 1; font-size: 0.78rem; padding: 0.4rem;" onclick="window.openArticleModal('${art.id}')">
            ✏️ Edit
          </button>
          ${art.link ? `
            <a href="${art.link}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size: 0.78rem; padding: 0.4rem 0.6rem; color: #93c5fd;" title="Open Link">
              🔗
            </a>
          ` : ''}
          <button type="button" class="btn-secondary" style="font-size: 0.78rem; padding: 0.4rem 0.8rem; color: #f87171; border-color: rgba(239, 68, 68, 0.3);" onclick="window.deleteArticle('${art.id}')">
            🗑️
          </button>
        </div>
      </div>
    </div>
    `;
  }).join('');
}

window.openArticleModal = function (articleId = null) {
  const modal = document.getElementById('article-modal');
  const titleHeader = document.getElementById('modal-article-title');
  const idField = document.getElementById('edit-article-id');
  const titleField = document.getElementById('form-article-title');
  const catField = document.getElementById('form-article-cat');
  const dateField = document.getElementById('form-article-date');
  const readField = document.getElementById('form-article-readtime');
  const imgField = document.getElementById('form-article-img');
  const summaryField = document.getElementById('form-article-summary');
  const linkField = document.getElementById('form-article-link');
  const creditField = document.getElementById('form-article-credit');
  const sourceField = document.getElementById('form-article-source');

  if (articleId) {
    const art = adminState.newsArticles.find(a => a.id === articleId);
    if (art) {
      titleHeader.textContent = "Edit News Article";
      idField.value = art.id;
      titleField.value = art.title;
      catField.value = art.category || 'NCDC Junior';
      dateField.value = art.date || '';
      readField.value = art.readTime || '2 min read';
      imgField.value = art.image || 'assets/images/hero-action.jpg';
      summaryField.value = art.summary || '';
      if (linkField) linkField.value = art.link || art.sourceUrl || '';
      if (creditField) creditField.value = art.credit || '';
      if (sourceField) sourceField.value = art.source || 'manual';
    }
  } else {
    titleHeader.textContent = "Write News Article";
    idField.value = "";
    titleField.value = "";
    catField.value = "NCDC Junior";
    dateField.value = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    readField.value = "2 min read";
    imgField.value = "assets/images/news/fb_gameday_pal.jpg";
    summaryField.value = "";
    if (linkField) linkField.value = "";
    if (creditField) creditField.value = "";
    if (sourceField) sourceField.value = "manual";
  }

  if (modal) modal.classList.add('active');
};

window.closeArticleModal = function () {
  const modal = document.getElementById('article-modal');
  if (modal) modal.classList.remove('active');
};

window.saveArticle = function (e) {
  e.preventDefault();
  const idField = document.getElementById('edit-article-id')?.value;
  const title = document.getElementById('form-article-title')?.value.trim();
  const category = document.getElementById('form-article-cat')?.value;
  const date = document.getElementById('form-article-date')?.value.trim();
  const readTime = document.getElementById('form-article-readtime')?.value.trim();
  const image = document.getElementById('form-article-img')?.value.trim();
  const summary = document.getElementById('form-article-summary')?.value.trim();
  const link = document.getElementById('form-article-link')?.value.trim();
  const credit = document.getElementById('form-article-credit')?.value.trim();
  const source = document.getElementById('form-article-source')?.value.trim() || 'manual';

  if (!title || !summary) {
    alert("Please fill in all required fields.");
    return;
  }

  if (idField) {
    // Edit existing
    const idx = adminState.newsArticles.findIndex(a => a.id === idField);
    if (idx !== -1) {
      adminState.newsArticles[idx] = {
        ...adminState.newsArticles[idx],
        title,
        category,
        date,
        readTime,
        image,
        summary,
        link: link || undefined,
        credit: credit || undefined,
        source: source || adminState.newsArticles[idx].source || 'manual'
      };
      showToast("Article updated and published to homepage!");
    }
  } else {
    // New article
    const newArt = {
      id: 'news-' + Date.now(),
      title,
      category,
      date,
      readTime,
      image,
      summary,
      link: link || undefined,
      credit: credit || undefined,
      source: source || 'manual'
    };
    adminState.newsArticles.unshift(newArt);
    showToast("New article published to homepage!");
  }

  localStorage.setItem('mercer_club_news', JSON.stringify(adminState.newsArticles));
  window.closeArticleModal();
  renderNewsList();

  // Broadcast cross-tab update
  window.dispatchEvent(new Event('storage'));
};

window.deleteArticle = function (articleId) {
  if (!confirm("Are you sure you want to remove this article from the homepage?")) return;
  adminState.newsArticles = adminState.newsArticles.filter(a => a.id !== articleId);
  localStorage.setItem('mercer_club_news', JSON.stringify(adminState.newsArticles));
  renderNewsList();
  showToast("Article removed.");
  window.dispatchEvent(new Event('storage'));
};

window.resetNewsArticles = function () {
  if (!confirm("Reset all news articles to default club Facebook releases?")) return;
  adminState.newsArticles = [...CLUB_NEWS];
  localStorage.setItem('mercer_club_news', JSON.stringify(adminState.newsArticles));
  renderNewsList();
  showToast("News reset to default club Facebook releases.");
  window.dispatchEvent(new Event('storage'));
};

// Facebook API Configuration & Live Sync
function initFacebookConfigUI() {
  const pageInput = document.getElementById('cfg-fb-page-id');
  const tokenInput = document.getElementById('cfg-fb-access-token');
  const badge = document.getElementById('fb-token-badge');
  const cfg = adminState.fbConfig || getStoredFacebookConfig();

  if (pageInput) pageInput.value = cfg.pageId || 'mercerchiefshockey';
  if (tokenInput) tokenInput.value = cfg.accessToken || '';

  if (badge) {
    if (cfg.accessToken && cfg.accessToken.trim()) {
      badge.textContent = "Live Meta API Active";
      badge.style.background = "rgba(34, 197, 94, 0.15)";
      badge.style.color = "#4ade80";
      badge.style.borderColor = "rgba(34, 197, 94, 0.35)";
    } else {
      badge.textContent = "Cached Feed Mode";
      badge.style.background = "rgba(148, 163, 184, 0.15)";
      badge.style.color = "#94a3b8";
      badge.style.borderColor = "rgba(148, 163, 184, 0.3)";
    }
  }
}

window.toggleFacebookSettings = function () {
  const panel = document.getElementById('fb-api-settings-panel');
  if (!panel) return;
  const isHidden = panel.style.display === 'none' || !panel.style.display;
  panel.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    initFacebookConfigUI();
  }
};

window.saveFacebookApiConfig = async function () {
  const pageInput = document.getElementById('cfg-fb-page-id');
  const tokenInput = document.getElementById('cfg-fb-access-token');
  const feedback = document.getElementById('fb-token-test-feedback');

  const pageId = (pageInput ? pageInput.value : 'mercerchiefshockey').trim() || 'mercerchiefshockey';
  const token = (tokenInput ? tokenInput.value : '').trim();

  if (!token) {
    showToast("Please enter a Meta Page Access Token or click Clear.", "error");
    return;
  }

  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.color = '#93c5fd';
    feedback.textContent = 'Verifying token with Meta Graph API...';
  }

  try {
    const testUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}?fields=id,name,link&access_token=${encodeURIComponent(token)}`;
    const resp = await fetch(testUrl);
    const data = await resp.json();

    if (resp.ok && data.id) {
      adminState.fbConfig = { pageId, accessToken: token };
      localStorage.setItem('mercer_fb_config', JSON.stringify(adminState.fbConfig));
      initFacebookConfigUI();
      if (feedback) {
        feedback.style.color = '#4ade80';
        feedback.innerHTML = `✓ Verified! Connected to official Facebook Page: <strong>${data.name || pageId}</strong> (ID: ${data.id}). Token saved.`;
      }
      showToast(`Meta API connected successfully to ${data.name || pageId}!`);
    } else {
      const errMsg = data.error?.message || "Token verification failed. Please check the Page ID and Token permissions.";
      if (feedback) {
        feedback.style.color = '#f87171';
        feedback.textContent = `Error: ${errMsg}`;
      }
      showToast("Meta API Error: " + errMsg, "error");
    }
  } catch (err) {
    if (feedback) {
      feedback.style.color = '#f87171';
      feedback.textContent = `Connection error: ${err.message}`;
    }
    showToast("Network error verifying token: " + err.message, "error");
  }
};

window.clearFacebookApiConfig = function () {
  adminState.fbConfig = { pageId: 'mercerchiefshockey', accessToken: '' };
  localStorage.removeItem('mercer_fb_config');
  initFacebookConfigUI();
  const feedback = document.getElementById('fb-token-test-feedback');
  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.color = '#94a3b8';
    feedback.textContent = 'API token cleared. Portal returned to cached feed mode.';
  }
  showToast("Facebook API token cleared. Returned to cached feed mode.");
};

window.syncFacebookPosts = async function () {
  const btn = document.getElementById('btn-sync-facebook');
  const statusText = document.getElementById('fb-sync-status-text');
  
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner" style="width: 14px; height: 14px; border-width: 2px; display: inline-block;"></span> <span>Pulling Facebook Posts...</span>`;
  }
  if (statusText) statusText.textContent = "Connecting to Facebook...";

  try {
    let fbPosts = [];
    let isLiveApi = false;
    const fbConfig = adminState.fbConfig || getStoredFacebookConfig();

    // 0. If Meta Graph API Token is configured, query Facebook's live API directly!
    if (fbConfig.accessToken && fbConfig.accessToken.trim()) {
      if (statusText) statusText.textContent = "Connecting to Meta Graph API...";
      try {
        const pageId = (fbConfig.pageId || 'mercerchiefshockey').trim();
        const token = fbConfig.accessToken.trim();
        const graphUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/feed?fields=id,message,created_time,full_picture,permalink_url,attachments{media,description,title}&limit=15&access_token=${encodeURIComponent(token)}`;
        
        const graphResp = await fetch(graphUrl);
        if (graphResp.ok) {
          const graphJson = await graphResp.json();
          if (graphJson.data && Array.isArray(graphJson.data) && graphJson.data.length > 0) {
            fbPosts = graphJson.data.map(item => {
              const msg = item.message || '';
              // Create smart title
              let title = '';
              const firstLine = msg.split('\n')[0].replace(/^[#\s]+/, '').trim();
              if (firstLine.length > 5 && firstLine.length <= 80) {
                title = firstLine;
              } else if (firstLine.length > 80) {
                title = firstLine.slice(0, 77) + '...';
              } else {
                title = `Mercer Chiefs Club Update (${new Date(item.created_time).toLocaleDateString()})`;
              }

              // Smart category detection
              const upperMsg = msg.toUpperCase();
              let category = 'Club News';
              if (upperMsg.includes('NCDC')) category = 'NCDC Junior';
              else if (upperMsg.includes('PREMIER') || upperMsg.includes('USPHL')) category = 'USPHL Premier';
              else if (/\b(18U|16U|15U|14U|13U|12U|10U|YOUTH|AAA)\b/i.test(msg)) category = 'Youth AAA';

              // Format date: "October 16, 2026"
              const postDate = new Date(item.created_time).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              });

              const mediaImg = item.full_picture || 
                               item.attachments?.data?.[0]?.media?.image?.src || 
                               'assets/images/hero-action.jpg';

              const permalink = item.permalink_url || `https://www.facebook.com/${item.id}`;

              return {
                id: `fb-${item.id}`,
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
              };
            });
            isLiveApi = true;
          }
        } else {
          const errData = await graphResp.json().catch(() => ({}));
          console.warn("Meta Graph API returned error:", errData);
          showToast(`Meta API note: ${errData.error?.message || 'Access token invalid or expired'}. Falling back to cached feed.`, 'info');
        }
      } catch (graphErr) {
        console.warn("Meta Graph API network call failed:", graphErr);
      }
    }

    // 1. Fallback to Vite backend endpoint if not synced via live API
    if (fbPosts.length === 0) {
      try {
        const resp = await fetch('/api/sync-facebook');
        if (resp.ok) {
          const json = await resp.json();
          if (json.success && Array.isArray(json.posts) && json.posts.length > 0) {
            fbPosts = json.posts;
          }
        }
      } catch (err) {
        console.warn("API sync call failed, falling back to static feed:", err);
      }
    }

    // 2. Fallback to direct static JSON file if API endpoint unavailable
    if (fbPosts.length === 0) {
      try {
        const resp2 = await fetch('data/facebook-feed.json?t=' + Date.now());
        if (resp2.ok) {
          const json2 = await resp2.json();
          if (json2.posts && Array.isArray(json2.posts) && json2.posts.length > 0) {
            fbPosts = json2.posts;
          }
        }
      } catch (err2) {
        console.warn("Static json fetch failed, falling back to embedded CLUB_NEWS:", err2);
      }
    }

    // 3. Fallback to embedded CLUB_NEWS
    if (fbPosts.length === 0) {
      fbPosts = CLUB_NEWS.filter(p => p.source === 'facebook');
    }

    if (fbPosts.length === 0) {
      showToast("No Facebook posts found to import.", "error");
      if (statusText) statusText.textContent = "Status: No posts available";
      return;
    }

    // Merge posts: update existing posts in place, and prepend any new ones
    let addedCount = 0;
    let updatedCount = 0;

    for (let i = fbPosts.length - 1; i >= 0; i--) {
      const post = fbPosts[i];
      const normTitle = (post.title || '').toLowerCase().trim();
      const existingIdx = adminState.newsArticles.findIndex(a => 
        a.id === post.id || (a.title && a.title.toLowerCase().trim() === normTitle)
      );

      if (existingIdx !== -1) {
        // Update existing post in place with latest live information
        adminState.newsArticles[existingIdx] = {
          ...adminState.newsArticles[existingIdx],
          ...post
        };
        updatedCount++;
      } else {
        // Prepend brand new post
        adminState.newsArticles.unshift(post);
        addedCount++;
      }
    }

    // Sort descending by date so newest posts appear first
    adminState.newsArticles.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    localStorage.setItem('mercer_club_news', JSON.stringify(adminState.newsArticles));
    renderNewsList();
    window.dispatchEvent(new Event('storage'));

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (statusText) {
      statusText.textContent = isLiveApi ? `Status: Live Meta API Synced (${timeStr})` : `Status: Synced ${fbPosts.length} posts (${timeStr})`;
    }
    
    if (isLiveApi) {
      showToast(`Live Meta Sync: Pulled ${fbPosts.length} posts directly from Facebook!`);
    } else if (addedCount > 0) {
      showToast(`Successfully pulled ${addedCount} new Facebook post${addedCount > 1 ? 's' : ''}!`);
    } else if (updatedCount > 0) {
      showToast(`Refreshed ${updatedCount} Facebook posts with latest team releases.`);
    } else {
      showToast(`Facebook feed is up to date (${fbPosts.length} posts verified).`);
    }
  } catch (err) {
    console.error("Facebook sync error:", err);
    showToast("Failed to sync Facebook posts: " + err.message, "error");
    if (statusText) statusText.textContent = "Status: Sync error";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        <span>Pull Latest Facebook Posts</span>
      `;
    }
  }
};

/* ==========================================================================
   7. SEASON & TEAM ID CONFIGURATION
   ========================================================================== */
function initSeasonParameters() {
  const cfg = adminState.seasonConfig;
  const elLabel = document.getElementById('cfg-season-label');
  const elThf = document.getElementById('cfg-thf-season');
  const elAhf = document.getElementById('cfg-ahf-season');
  const elUsphl = document.getElementById('cfg-usphl-season');
  const elNcdc = document.getElementById('cfg-ncdc-team');
  const elNcdcCoach = document.getElementById('cfg-ncdc-coach');
  const elPremier = document.getElementById('cfg-premier-team');
  const elPremierCoach = document.getElementById('cfg-premier-coach');
  const elPill = document.getElementById('admin-season-pill');

  if (elLabel) elLabel.value = cfg.seasonLabel;
  if (elThf) elThf.value = cfg.thfSeasonId;
  if (elAhf) elAhf.value = cfg.ahfSeasonId;
  if (elUsphl) elUsphl.value = cfg.usphlSeasonId;
  if (elNcdc) elNcdc.value = cfg.ncdcTeamId;
  if (elNcdcCoach) elNcdcCoach.value = cfg.ncdcCoach || 'Rob Broderick';
  if (elPremier) elPremier.value = cfg.premierTeamId;
  if (elPremierCoach) elPremierCoach.value = cfg.premierCoach || '';

  if (elPill) {
    elPill.textContent = `● ${cfg.seasonLabel} Active Season`;
  }
}

function renderSeasonTable() {
  const tbody = document.getElementById('season-teams-table-body');
  if (!tbody) return;

  const cfg = adminState.seasonConfig;

  // Build full list of teams
  const allTeams = [
    {
      id: 'ncdc',
      name: 'NCDC Junior Team',
      league: 'USPHL NCDC',
      tier: 'Tier II Tuition-Free',
      teamId: cfg.ncdcTeamId,
      headCoach: cfg.ncdcCoach || 'Rob Broderick',
      leagueType: 'junior',
      isJunior: true,
      testUrl: `https://usphl.com/ncdc/game-center/teams/?team=${cfg.ncdcTeamId}&season=${cfg.usphlSeasonId}`
    },
    {
      id: 'premier',
      name: 'USPHL Premier Team',
      league: 'USPHL Premier',
      tier: 'Tier III Junior',
      teamId: cfg.premierTeamId,
      headCoach: cfg.premierCoach || '',
      leagueType: 'junior',
      isJunior: true,
      testUrl: `https://usphl.com/premier/game-center/teams/?team=${cfg.premierTeamId}&season=${cfg.usphlSeasonId}`
    },
    ...adminState.youthTeams.map(t => {
      const isThf = t.leagueId === 5 || t.league?.includes('THF') || t.tier?.includes('THF');
      const seasonId = isThf ? cfg.thfSeasonId : cfg.ahfSeasonId;
      const testUrl = isThf
        ? `https://www.tier1hockeyfederation.com/team-pages/?team=${t.teamId}&season=${seasonId}&stat_class=1`
        : `https://atlantichockeyfederation.com/team-page/?team=${t.teamId}&season=${seasonId}&stat_class=1`;
      return {
        id: t.id,
        name: t.name,
        league: isThf ? 'Tier 1 Hockey Federation (THF)' : 'Atlantic Hockey Federation (AHF)',
        tier: t.tier,
        teamId: t.teamId,
        headCoach: t.headCoach || 'Staff',
        leagueType: isThf ? 'thf' : 'ahf',
        isJunior: false,
        testUrl
      };
    })
  ];

  // Update total counts
  const totalCountEl = document.getElementById('count-all-teams');
  if (totalCountEl) totalCountEl.textContent = allTeams.length;

  // Filter by category
  let filtered = allTeams;
  if (adminState.seasonFilter !== 'all') {
    filtered = filtered.filter(t => t.leagueType === adminState.seasonFilter);
  }

  // Filter by search query
  if (adminState.seasonSearchQuery) {
    const q = adminState.seasonSearchQuery;
    filtered = filtered.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.headCoach.toLowerCase().includes(q) ||
      t.tier.toLowerCase().includes(q) ||
      String(t.teamId).includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          No teams found matching the search criteria or filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const tierColor = t.leagueType === 'junior' 
      ? 'var(--chiefs-red)' 
      : (t.leagueType === 'thf' ? 'var(--chiefs-gold)' : 'var(--chiefs-silver)');
    const isCustomOrYouth = !t.isJunior;

    return `
      <tr id="season-row-${t.id}">
        <td>
          <div style="font-weight: 700; color: #fff; font-size: 0.92rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>${t.name}</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">ID: ${t.id}</div>
        </td>
        <td>
          <span class="pill-badge" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.15); color: ${tierColor}; font-size: 0.72rem;">
            ${t.tier}
          </span>
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.2rem;">${t.league}</div>
        </td>
        <td>
          <input type="text"
                 class="table-input table-team-id"
                 data-id="${t.id}"
                 value="${t.teamId ?? ''}"
                 placeholder="League ID"
                 title="Official Team ID in TimeToScore or USPHL"
                 style="font-family: monospace; font-weight: 700; color: var(--chiefs-gold); width: 110px;">
        </td>
        <td>
          <input type="text"
                 class="table-input table-coach"
                 data-id="${t.id}"
                 value="${t.headCoach ?? ''}"
                 placeholder="Head Coach Name">
        </td>
        <td>
          <a href="${t.testUrl}"
             target="_blank"
             class="btn-secondary"
             style="font-size: 0.72rem; padding: 0.28rem 0.65rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.3rem;"
             title="Open official league page for this team and season in new window">
            <span>Verify Page ↗</span>
          </a>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 0.35rem;">
            <button type="button"
                    class="btn-secondary"
                    onclick="window.openTeamModal('${t.id}')"
                    style="font-size: 0.72rem; padding: 0.28rem 0.55rem;"
                    title="Edit Full Team Parameters">
              ✏️
            </button>
            ${isCustomOrYouth ? `
              <button type="button"
                      class="btn-secondary"
                      onclick="window.deleteTeamById('${t.id}')"
                      style="font-size: 0.72rem; padding: 0.28rem 0.55rem; color: #f87171; border-color: rgba(239, 68, 68, 0.3);"
                      title="Delete / Archive Team">
                🗑️
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.filterSeasonTable = function (filterType) {
  adminState.seasonFilter = filterType;
  const buttons = ['all', 'thf', 'ahf', 'junior'];
  buttons.forEach(b => {
    const el = document.getElementById(`sfilter-${b}`);
    if (el) {
      const isSelected = b === filterType;
      el.style.background = isSelected ? 'var(--chiefs-red)' : 'transparent';
      el.style.color = isSelected ? '#fff' : '#94a3b8';
      el.style.borderColor = isSelected ? 'transparent' : 'var(--border-subtle)';
    }
  });
  renderSeasonTable();
};

window.handleSeasonSearch = function (q) {
  adminState.seasonSearchQuery = (q || '').toLowerCase().trim();
  renderSeasonTable();
};

window.saveSeasonConfig = function () {
  const seasonLabel = document.getElementById('cfg-season-label')?.value.trim() || '2026/27';
  const thfSeasonId = document.getElementById('cfg-thf-season')?.value.trim() || '190';
  const ahfSeasonId = document.getElementById('cfg-ahf-season')?.value.trim() || '190';
  const usphlSeasonId = document.getElementById('cfg-usphl-season')?.value.trim() || '67';
  const ncdcTeamId = document.getElementById('cfg-ncdc-team')?.value.trim() || '112';
  const ncdcCoach = document.getElementById('cfg-ncdc-coach')?.value.trim() || 'Rob Broderick';
  const premierTeamId = document.getElementById('cfg-premier-team')?.value.trim() || '459';
  const premierCoach = document.getElementById('cfg-premier-coach')?.value.trim() || '';

  adminState.seasonConfig = {
    seasonLabel,
    thfSeasonId,
    ahfSeasonId,
    usphlSeasonId,
    ncdcTeamId,
    ncdcCoach,
    premierTeamId,
    premierCoach
  };

  localStorage.setItem('mercer_season_config', JSON.stringify(adminState.seasonConfig));

  const elPill = document.getElementById('admin-season-pill');
  if (elPill) elPill.textContent = `● ${seasonLabel} Active Season`;

  renderTeamToggles();
  renderSeasonTable();
  window.dispatchEvent(new Event('storage'));
  showToast(`Season parameters updated (${seasonLabel})! Active feeds point to new season.`);
};

window.saveAllTeamMappings = function () {
  const idInputs = document.querySelectorAll('.table-team-id');
  const coachInputs = document.querySelectorAll('.table-coach');

  let updatedCount = 0;

  idInputs.forEach(input => {
    const teamIdKey = input.getAttribute('data-id');
    const val = input.value.trim();

    if (teamIdKey === 'ncdc') {
      if (adminState.seasonConfig.ncdcTeamId !== val) {
        adminState.seasonConfig.ncdcTeamId = val;
        updatedCount++;
      }
    } else if (teamIdKey === 'premier') {
      if (adminState.seasonConfig.premierTeamId !== val) {
        adminState.seasonConfig.premierTeamId = val;
        updatedCount++;
      }
    } else {
      const t = adminState.youthTeams.find(item => item.id === teamIdKey);
      if (t) {
        const numVal = isNaN(val) ? val : Number(val);
        if (t.teamId !== numVal) {
          t.teamId = numVal;
          updatedCount++;
        }
      }
    }
  });

  coachInputs.forEach(input => {
    const teamIdKey = input.getAttribute('data-id');
    const val = input.value.trim();

    if (teamIdKey === 'ncdc') {
      if (adminState.seasonConfig.ncdcCoach !== val) {
        adminState.seasonConfig.ncdcCoach = val;
        updatedCount++;
      }
    } else if (teamIdKey === 'premier') {
      if (adminState.seasonConfig.premierCoach !== val) {
        adminState.seasonConfig.premierCoach = val;
        updatedCount++;
      }
    } else {
      const t = adminState.youthTeams.find(item => item.id === teamIdKey);
      if (t && t.headCoach !== val) {
        t.headCoach = val;
        updatedCount++;
      }
    }
  });

  // Persist
  localStorage.setItem('mercer_season_config', JSON.stringify(adminState.seasonConfig));
  localStorage.setItem('mercer_configured_teams', JSON.stringify(adminState.youthTeams));
  localStorage.setItem('mercer_synced_youth_data', JSON.stringify(adminState.youthTeams));

  // Sync inputs with config form
  initSeasonParameters();
  renderTeamToggles();
  renderSeasonTable();
  updateMetrics();

  window.dispatchEvent(new Event('storage'));
  showToast(`Team mappings saved! All live feeds updated with latest IDs & coaches.`);
};

window.resetTeamMappings = function () {
  if (!confirm("Reset all youth squad IDs and coaches back to 2026/27 default directory?")) return;
  localStorage.removeItem('mercer_configured_teams');
  adminState.youthTeams = [...YOUTH_TEAMS];
  localStorage.setItem('mercer_synced_youth_data', JSON.stringify(adminState.youthTeams));
  renderTeamToggles();
  renderSeasonTable();
  updateMetrics();
  window.dispatchEvent(new Event('storage'));
  showToast("Team IDs reset to default mappings.");
};

// Team Modal
window.openTeamModal = function (teamId = null) {
  const modal = document.getElementById('team-modal');
  const title = document.getElementById('modal-team-title');
  const idField = document.getElementById('edit-team-id');
  const isNewField = document.getElementById('edit-team-is-new');
  const nameField = document.getElementById('form-team-name');
  const slugField = document.getElementById('form-team-slug');
  const leagueField = document.getElementById('form-team-league');
  const tierField = document.getElementById('form-team-tier');
  const leagueIdField = document.getElementById('form-team-league-id');
  const coachField = document.getElementById('form-team-coach');
  const recordField = document.getElementById('form-team-record');
  const rankField = document.getElementById('form-team-rank');
  const urlField = document.getElementById('form-team-url');
  const btnDelete = document.getElementById('btn-delete-team');

  if (teamId) {
    if (teamId === 'ncdc' || teamId === 'premier') {
      const isNcdc = teamId === 'ncdc';
      title.textContent = isNcdc ? "Edit NCDC Junior Team" : "Edit Premier Junior Team";
      idField.value = teamId;
      isNewField.value = "false";
      nameField.value = isNcdc ? "NCDC Junior Team" : "USPHL Premier Team";
      slugField.value = teamId;
      slugField.readOnly = true;
      leagueField.value = isNcdc ? "USPHL-NCDC" : "USPHL-Premier";
      tierField.value = isNcdc ? "Tier II Tuition-Free" : "Tier III Junior";
      leagueIdField.value = isNcdc ? adminState.seasonConfig.ncdcTeamId : adminState.seasonConfig.premierTeamId;
      coachField.value = isNcdc 
        ? (adminState.seasonConfig.ncdcCoach || "Rob Broderick") 
        : (adminState.seasonConfig.premierCoach || "");
      recordField.value = isNcdc ? "10-2-1" : "8-4-0";
      rankField.value = "#1 South Division";
      urlField.value = "";
      if (btnDelete) btnDelete.style.display = 'none';
    } else {
      const t = adminState.youthTeams.find(item => item.id === teamId);
      if (t) {
        title.textContent = `Edit ${t.name}`;
        idField.value = t.id;
        isNewField.value = "false";
        nameField.value = t.name;
        slugField.value = t.id;
        slugField.readOnly = true;
        const isThf = t.leagueId === 5 || t.league?.includes('THF') || t.tier?.includes('THF');
        leagueField.value = isThf ? "THF" : "AHF";
        tierField.value = t.tier;
        leagueIdField.value = t.teamId;
        coachField.value = t.headCoach || "";
        recordField.value = t.record || "0-0-0";
        rankField.value = t.rank || "Regular Season";
        urlField.value = t.officialUrl || "";
        if (btnDelete) btnDelete.style.display = 'block';
      }
    }
  } else {
    // New Team
    title.textContent = "Add New Squad Configuration";
    idField.value = "";
    isNewField.value = "true";
    nameField.value = "";
    slugField.value = "";
    slugField.readOnly = false;
    leagueField.value = "THF";
    tierField.value = "Tier I AAA";
    leagueIdField.value = "";
    coachField.value = "";
    recordField.value = "0-0-0";
    rankField.value = "Pre-Season";
    urlField.value = "";
    if (btnDelete) btnDelete.style.display = 'none';
  }

  if (modal) modal.classList.add('active');
};

window.closeTeamModal = function () {
  const modal = document.getElementById('team-modal');
  if (modal) modal.classList.remove('active');
};

window.handleTeamLeagueChange = function (leagueVal) {
  const tierField = document.getElementById('form-team-tier');
  if (!tierField) return;
  if (leagueVal === 'THF') {
    tierField.value = 'Tier I AAA';
  } else if (leagueVal === 'AHF') {
    tierField.value = 'Tier II AA';
  } else if (leagueVal === 'USPHL-NCDC') {
    tierField.value = 'Tier II Tuition-Free';
  } else if (leagueVal === 'USPHL-Premier') {
    tierField.value = 'Tier III Junior';
  } else {
    tierField.value = 'Independent / Showcase';
  }
};

window.saveTeam = function (e) {
  e.preventDefault();
  const idField = document.getElementById('edit-team-id')?.value;
  const isNew = document.getElementById('edit-team-is-new')?.value === 'true';
  const name = document.getElementById('form-team-name')?.value.trim();
  const slug = document.getElementById('form-team-slug')?.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const leagueVal = document.getElementById('form-team-league')?.value;
  const tier = document.getElementById('form-team-tier')?.value.trim();
  const leagueIdNum = Number(document.getElementById('form-team-league-id')?.value.trim());
  const coach = document.getElementById('form-team-coach')?.value.trim();
  const record = document.getElementById('form-team-record')?.value.trim() || '0-0-0';
  const rank = document.getElementById('form-team-rank')?.value.trim() || 'Pre-Season';
  const urlOverride = document.getElementById('form-team-url')?.value.trim();

  if (!name || !slug || !tier || isNaN(leagueIdNum) || !coach) {
    alert("Please fill in all required fields (Name, Slug, Tier, League ID, Coach).");
    return;
  }

  if (idField === 'ncdc') {
    adminState.seasonConfig.ncdcTeamId = String(leagueIdNum);
    adminState.seasonConfig.ncdcCoach = coach;
    localStorage.setItem('mercer_season_config', JSON.stringify(adminState.seasonConfig));
    showToast(`Updated NCDC Junior Team (Coach: ${coach})!`);
  } else if (idField === 'premier') {
    adminState.seasonConfig.premierTeamId = String(leagueIdNum);
    adminState.seasonConfig.premierCoach = coach;
    localStorage.setItem('mercer_season_config', JSON.stringify(adminState.seasonConfig));
    showToast(`Updated Premier Junior Team (Coach: ${coach})!`);
  } else {
    const isThf = leagueVal === 'THF';
    const leagueName = isThf ? 'Tier 1 Hockey Federation (THF)' : 'Atlantic Hockey Federation (AHF)';
    const leagueCode = isThf ? 5 : 4;

    if (isNew) {
      if (adminState.youthTeams.some(t => t.id === slug)) {
        alert("A team with this slug ID already exists. Please choose a unique identifier.");
        return;
      }

      const newTeam = {
        id: slug,
        name,
        tier,
        league: leagueName,
        leagueId: leagueCode,
        teamId: leagueIdNum,
        headCoach: coach,
        record,
        rank,
        standingSummary: rank,
        officialUrl: urlOverride || (isThf 
          ? `https://www.tier1hockeyfederation.com/team-pages/?team=${leagueIdNum}&season=${adminState.seasonConfig.thfSeasonId}&stat_class=1`
          : `https://atlantichockeyfederation.com/team-page/?team=${leagueIdNum}&season=${adminState.seasonConfig.ahfSeasonId}&stat_class=1`),
        roster: [],
        upcomingSchedule: [],
        recentResults: []
      };

      adminState.youthTeams.push(newTeam);
      showToast(`Added new team: ${name}!`);
    } else {
      const idx = adminState.youthTeams.findIndex(t => t.id === idField);
      if (idx !== -1) {
        adminState.youthTeams[idx] = {
          ...adminState.youthTeams[idx],
          name,
          tier,
          league: leagueName,
          leagueId: leagueCode,
          teamId: leagueIdNum,
          headCoach: coach,
          record,
          rank,
          standingSummary: rank,
          officialUrl: urlOverride || undefined
        };
        showToast(`Updated team: ${name}!`);
      }
    }

    localStorage.setItem('mercer_configured_teams', JSON.stringify(adminState.youthTeams));
    localStorage.setItem('mercer_synced_youth_data', JSON.stringify(adminState.youthTeams));
  }

  window.closeTeamModal();
  initSeasonParameters();
  renderTeamToggles();
  renderSeasonTable();
  updateMetrics();
  window.dispatchEvent(new Event('storage'));
};

window.deleteTeam = function () {
  const idField = document.getElementById('edit-team-id')?.value;
  if (!idField || idField === 'ncdc' || idField === 'premier') return;
  window.deleteTeamById(idField);
  window.closeTeamModal();
};

window.deleteTeamById = function (teamId) {
  const team = adminState.youthTeams.find(t => t.id === teamId);
  const name = team ? team.name : teamId;
  if (!confirm(`Are you sure you want to remove ${name} from the active directory?`)) return;

  adminState.youthTeams = adminState.youthTeams.filter(t => t.id !== teamId);
  adminState.hiddenTeams = adminState.hiddenTeams.filter(id => id !== teamId);

  localStorage.setItem('mercer_configured_teams', JSON.stringify(adminState.youthTeams));
  localStorage.setItem('mercer_synced_youth_data', JSON.stringify(adminState.youthTeams));
  localStorage.setItem('mercer_hidden_teams', JSON.stringify(adminState.hiddenTeams));

  renderTeamToggles();
  renderSeasonTable();
  updateMetrics();
  window.dispatchEvent(new Event('storage'));
  showToast(`Team ${name} removed.`);
};

// Rollover Wizard
window.openRolloverModal = function () {
  const modal = document.getElementById('rollover-modal');
  const currentSeason = adminState.seasonConfig.seasonLabel;
  const nextLabelField = document.getElementById('ro-season-label');
  const roThf = document.getElementById('ro-thf-season');
  const roAhf = document.getElementById('ro-ahf-season');
  const roUsphl = document.getElementById('ro-usphl-season');

  if (nextLabelField) {
    if (currentSeason === '2026/27') {
      nextLabelField.value = '2027/28';
      if (roThf) roThf.value = '245';
      if (roAhf) roAhf.value = '245';
      if (roUsphl) roUsphl.value = '68';
    } else {
      nextLabelField.value = '2028/29';
      if (roThf) roThf.value = '290';
      if (roAhf) roAhf.value = '290';
      if (roUsphl) roUsphl.value = '69';
    }
  }

  if (modal) modal.classList.add('active');
};

window.closeRolloverModal = function () {
  const modal = document.getElementById('rollover-modal');
  if (modal) modal.classList.remove('active');
};

window.applyRollover = function (e) {
  e.preventDefault();
  const newSeasonLabel = document.getElementById('ro-season-label')?.value.trim() || '2027/28';
  const newThfSeason = document.getElementById('ro-thf-season')?.value.trim() || '245';
  const newAhfSeason = document.getElementById('ro-ahf-season')?.value.trim() || '245';
  const newUsphlSeason = document.getElementById('ro-usphl-season')?.value.trim() || '68';

  const optResetRecords = document.getElementById('ro-opt-reset-records')?.checked;
  const optClearResults = document.getElementById('ro-opt-clear-results')?.checked;

  // Update Season Config
  adminState.seasonConfig = {
    seasonLabel: newSeasonLabel,
    thfSeasonId: newThfSeason,
    ahfSeasonId: newAhfSeason,
    usphlSeasonId: newUsphlSeason,
    ncdcTeamId: adminState.seasonConfig.ncdcTeamId,
    premierTeamId: adminState.seasonConfig.premierTeamId
  };

  // Rollover youth teams
  adminState.youthTeams = adminState.youthTeams.map(t => {
    const updated = { ...t };
    if (optResetRecords) {
      updated.record = '0-0-0';
      updated.rank = 'Pre-Season';
      updated.standingSummary = 'Pre-Season (0 Pts)';
    }
    if (optClearResults) {
      updated.recentResults = [];
    }
    return updated;
  });

  // Persist all
  localStorage.setItem('mercer_season_config', JSON.stringify(adminState.seasonConfig));
  localStorage.setItem('mercer_configured_teams', JSON.stringify(adminState.youthTeams));
  localStorage.setItem('mercer_synced_youth_data', JSON.stringify(adminState.youthTeams));

  // Console log
  const consoleEl = document.getElementById('sync-console');
  if (consoleEl) {
    const time = new Date().toLocaleTimeString();
    consoleEl.innerHTML += `\n[${time}] [SEASON ROLLOVER] Rolled over to ${newSeasonLabel}! (THF: ${newThfSeason}, AHF: ${newAhfSeason}, USPHL: ${newUsphlSeason}). Ready for new season data ingestion.`;
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  window.closeRolloverModal();
  initSeasonParameters();
  renderTeamToggles();
  renderSeasonTable();
  updateMetrics();

  window.dispatchEvent(new Event('storage'));
  showToast(`🎉 Rollover complete! Mercer Chiefs are now active for season ${newSeasonLabel}.`);
};

/* ==========================================================================
   8. BACKUP & EXPORT UTILITIES
   ========================================================================== */
window.exportJsonBackup = function () {
  const payload = {
    exportedAt: new Date().toISOString(),
    seasonConfig: adminState.seasonConfig,
    hiddenTeams: adminState.hiddenTeams,
    newsArticles: adminState.newsArticles,
    youthTeams: adminState.youthTeams,
    alumniCommitments: adminState.alumniCommitments
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mercer_chiefs_admin_backup_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Backup JSON file downloaded.");
};

window.clearAllOverrides = function () {
  if (!confirm("Clear all admin overrides (season configuration, team mappings, news edits, alumni changes, and visibility)? The site will return to initial baseline.")) return;
  localStorage.removeItem('mercer_season_config');
  localStorage.removeItem('mercer_configured_teams');
  localStorage.removeItem('mercer_hidden_teams');
  localStorage.removeItem('mercer_club_news');
  localStorage.removeItem('mercer_alumni_commitments');
  localStorage.removeItem('mercer_synced_youth_data');
  localStorage.removeItem('mercer_last_sync_timestamp');

  adminState.seasonConfig = getStoredSeasonConfig();
  adminState.hiddenTeams = [];
  adminState.newsArticles = [...CLUB_NEWS];
  adminState.alumniCommitments = [...COLLEGE_COMMITMENTS];
  adminState.youthTeams = [...YOUTH_TEAMS];

  initSeasonParameters();
  renderTeamToggles();
  renderSeasonTable();
  renderNewsList();
  renderAlumniTable();
  updateMetrics();
  showToast("All overrides cleared. Defaults restored.");
  window.dispatchEvent(new Event('storage'));
};

/* ==========================================================================
   8b. ALUMNI & COMMITMENTS CMS
   ========================================================================== */
function renderAlumniTable() {
  const tbody = document.getElementById('admin-alumni-tbody');
  if (!tbody) return;

  const all = adminState.alumniCommitments || [];

  // Update counter badges
  const countAll = all.length;
  const countD1 = all.filter(a => a.category === 'd1').length;
  const countPro = all.filter(a => a.isPro || a.category === 'pro' || a.draftInfo).length;
  const countD3 = all.filter(a => a.category === 'd3').length;

  const elAll = document.getElementById('admin-alumni-count-all');
  const elD1 = document.getElementById('admin-alumni-count-d1');
  const elPro = document.getElementById('admin-alumni-count-pro');
  const elD3 = document.getElementById('admin-alumni-count-d3');

  if (elAll) elAll.textContent = countAll;
  if (elD1) elD1.textContent = countD1;
  if (elPro) elPro.textContent = countPro;
  if (elD3) elD3.textContent = countD3;

  const query = (adminState.alumniSearchQuery || '').toLowerCase().trim();
  const cat = adminState.alumniFilter || 'all';

  const filtered = all.filter(item => {
    // Category filter
    let matchesCat = true;
    if (cat === 'd1') {
      matchesCat = item.category === 'd1';
    } else if (cat === 'pro') {
      matchesCat = item.isPro || item.category === 'pro' || !!item.draftInfo;
    } else if (cat === 'd3') {
      matchesCat = item.category === 'd3';
    }
    if (!matchesCat) return false;

    // Search query filter
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
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
          No alumni or commitments found matching your filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const isPro = item.isPro || item.category === 'pro' || !!item.draftInfo;
    const divColor = item.category === 'pro' ? '#ff858d' : item.category === 'd3' ? '#38bdf8' : 'var(--chiefs-gold)';
    const divBg = item.category === 'pro' ? 'rgba(189,50,59,0.18)' : item.category === 'd3' ? 'rgba(56,189,248,0.15)' : 'rgba(245,166,35,0.15)';

    // Distinction badge
    let badgeSnippet = '';
    if (item.badge) {
      badgeSnippet = `
        <div style="display: inline-block; font-size: 0.72rem; font-weight: 700; color: #ffcf66; background: rgba(245, 166, 35, 0.15); border: 1px solid rgba(245,166,35,0.35); padding: 0.15rem 0.5rem; border-radius: var(--radius-full); margin-top: 0.35rem;">
          ⭐ ${item.badge}
        </div>
      `;
    }

    // Pathway summary
    const pathwayLines = [];
    if (item.juniorTeam) pathwayLines.push(`<span style="color: var(--text-muted); font-size: 0.72rem; font-weight: 700;">JR:</span> ${item.juniorTeam}`);
    if (item.proTeam) pathwayLines.push(`<span style="color: #ff858d; font-size: 0.72rem; font-weight: 700;">PRO:</span> ${item.proTeam}`);
    if (item.draftInfo) pathwayLines.push(`<span style="color: var(--chiefs-gold); font-size: 0.72rem; font-weight: 700;">DRAFT:</span> ${item.draftInfo}`);

    return `
      <tr>
        <td>
          <div style="font-weight: 800; color: #fff; font-size: 0.95rem;">${item.name}</div>
          ${badgeSnippet}
        </td>
        <td>
          <div style="font-weight: 700; color: #fff; font-size: 0.9rem;">${item.college || '—'}</div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">${item.conference || ''}</div>
        </td>
        <td>
          <span style="display: inline-block; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); font-size: 0.72rem; font-weight: 700; color: ${divColor}; background: ${divBg}; border: 1px solid ${divColor}40;">
            ${item.division}
          </span>
        </td>
        <td>
          <div style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.4;">
            ${pathwayLines.length > 0 ? pathwayLines.join('<br>') : `<span style="font-style: italic; color: var(--text-muted);">${item.highlight || 'Mercer Chiefs Alumni'}</span>`}
          </div>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn-secondary" style="font-size: 0.76rem; padding: 0.3rem 0.65rem; margin-right: 0.35rem;" onclick="window.openAlumniModal('${item.id}')">
            Edit
          </button>
          <button type="button" class="btn-secondary" style="font-size: 0.76rem; padding: 0.3rem 0.65rem; color: #f87171; border-color: rgba(239, 68, 68, 0.3);" onclick="window.deleteAlumni('${item.id}')">
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.filterAdminAlumni = function (filter) {
  adminState.alumniFilter = filter;
  document.querySelectorAll('#admin-alumni-filters .filter-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-filter') === filter);
  });
  renderAlumniTable();
};

window.searchAdminAlumni = function (query) {
  adminState.alumniSearchQuery = query;
  renderAlumniTable();
};

window.openAlumniModal = function (id = null) {
  const modal = document.getElementById('alumni-modal');
  const title = document.getElementById('modal-alumni-title');
  const idField = document.getElementById('edit-alumni-id');
  const nameField = document.getElementById('form-alumni-name');
  const collegeField = document.getElementById('form-alumni-college');
  const divisionField = document.getElementById('form-alumni-division');
  const confField = document.getElementById('form-alumni-conference');
  const juniorField = document.getElementById('form-alumni-junior');
  const proField = document.getElementById('form-alumni-pro');
  const draftField = document.getElementById('form-alumni-draft');
  const badgeField = document.getElementById('form-alumni-badge');
  const badgeTypeField = document.getElementById('form-alumni-badgetype');
  const highlightField = document.getElementById('form-alumni-highlight');

  if (!modal) return;

  if (id) {
    const item = (adminState.alumniCommitments || []).find(a => a.id === id);
    if (item) {
      if (title) title.textContent = `Edit Alumni: ${item.name}`;
      if (idField) idField.value = item.id;
      if (nameField) nameField.value = item.name || '';
      if (collegeField) collegeField.value = item.college || '';
      if (divisionField) divisionField.value = item.division || 'NCAA Division I';
      if (confField) confField.value = item.conference || '';
      if (juniorField) juniorField.value = item.juniorTeam || '';
      if (proField) proField.value = item.proTeam || '';
      if (draftField) draftField.value = item.draftInfo || '';
      if (badgeField) badgeField.value = item.badge || '';
      if (badgeTypeField) badgeTypeField.value = item.badgeType || 'd1';
      if (highlightField) highlightField.value = item.highlight || item.quote || '';
    }
  } else {
    if (title) title.textContent = 'Add New Commitment / Alumni';
    if (idField) idField.value = '';
    if (nameField) nameField.value = '';
    if (collegeField) collegeField.value = '';
    if (divisionField) divisionField.value = 'NCAA Division I';
    if (confField) confField.value = '';
    if (juniorField) juniorField.value = '';
    if (proField) proField.value = '';
    if (draftField) draftField.value = '';
    if (badgeField) badgeField.value = 'NCAA D1 Commit';
    if (badgeTypeField) badgeTypeField.value = 'd1';
    if (highlightField) highlightField.value = '';
  }

  modal.classList.add('active');
};

window.closeAlumniModal = function () {
  const modal = document.getElementById('alumni-modal');
  if (modal) modal.classList.remove('active');
};

window.saveAlumni = function (e) {
  e.preventDefault();
  const idField = document.getElementById('edit-alumni-id')?.value;
  const name = document.getElementById('form-alumni-name')?.value.trim();
  const college = document.getElementById('form-alumni-college')?.value.trim();
  const division = document.getElementById('form-alumni-division')?.value;
  const conference = document.getElementById('form-alumni-conference')?.value.trim();
  const juniorTeam = document.getElementById('form-alumni-junior')?.value.trim();
  const proTeam = document.getElementById('form-alumni-pro')?.value.trim();
  const draftInfo = document.getElementById('form-alumni-draft')?.value.trim();
  const badge = document.getElementById('form-alumni-badge')?.value.trim();
  const badgeType = document.getElementById('form-alumni-badgetype')?.value;
  const highlight = document.getElementById('form-alumni-highlight')?.value.trim();

  if (!name || !college || !highlight) {
    alert("Please fill in Player Name, College/Pro Organization, and Highlight summary.");
    return;
  }

  // Determine category and isPro
  let category = 'd1';
  let isPro = false;
  if (division === 'NHL & Professional' || proTeam || draftInfo) {
    category = division === 'NHL & Professional' ? 'pro' : (division === 'NCAA Division III' ? 'd3' : 'd1');
    isPro = true;
  } else if (division === 'NCAA Division III') {
    category = 'd3';
  } else if (division === 'Junior Hockey Alumni') {
    category = 'junior';
  }

  if (idField) {
    // Edit existing
    const idx = adminState.alumniCommitments.findIndex(a => a.id === idField);
    if (idx !== -1) {
      adminState.alumniCommitments[idx] = {
        ...adminState.alumniCommitments[idx],
        name,
        college,
        division,
        category,
        conference,
        juniorTeam: juniorTeam || null,
        proTeam: proTeam || null,
        draftInfo: draftInfo || null,
        badge: badge || null,
        badgeType: badgeType || 'default',
        highlight,
        isPro
      };
      showToast(`Alumni record updated for ${name}!`);
    }
  } else {
    // Create new
    const newId = 'alumni-' + Date.now();
    const newRecord = {
      id: newId,
      name,
      college,
      division,
      category,
      conference,
      juniorTeam: juniorTeam || null,
      proTeam: proTeam || null,
      draftInfo: draftInfo || null,
      badge: badge || (division === 'NCAA Division I' ? 'NCAA D1 Commit' : 'Chiefs Alumni'),
      badgeType: badgeType || 'default',
      highlight,
      isPro,
      year: division.includes('NCAA') ? 'Commitment' : 'Alumni'
    };
    adminState.alumniCommitments.unshift(newRecord);
    showToast(`New commitment added for ${name}!`);
  }

  localStorage.setItem('mercer_alumni_commitments', JSON.stringify(adminState.alumniCommitments));
  window.closeAlumniModal();
  renderAlumniTable();

  // Broadcast cross-tab update to live site
  window.dispatchEvent(new Event('storage'));
};

window.deleteAlumni = function (id) {
  const item = adminState.alumniCommitments.find(a => a.id === id);
  const name = item ? item.name : 'this alumni record';
  if (!confirm(`Are you sure you want to delete ${name}?`)) return;

  adminState.alumniCommitments = adminState.alumniCommitments.filter(a => a.id !== id);
  localStorage.setItem('mercer_alumni_commitments', JSON.stringify(adminState.alumniCommitments));
  renderAlumniTable();
  showToast(`${name} removed.`);
  window.dispatchEvent(new Event('storage'));
};

window.resetAlumni = function () {
  if (!confirm("Reset alumni directory back to the 36 verified baseline records from mercerchiefs.com?")) return;
  adminState.alumniCommitments = [...COLLEGE_COMMITMENTS];
  localStorage.setItem('mercer_alumni_commitments', JSON.stringify(adminState.alumniCommitments));
  renderAlumniTable();
  showToast("Alumni directory reset to verified baseline records.");
  window.dispatchEvent(new Event('storage'));
};

/* ==========================================================================
   9. TOAST NOTIFICATION
   ========================================================================== */
function showToast(msg) {
  const toast = document.getElementById('admin-toast');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;

  msgEl.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

/* ==========================================================================
   10. WEBSITE CONTENT & PAGES CMS (TRYOUTS, CAMPS, RINK, MODALS)
   ========================================================================== */

let cmsContentState = null;
let cmsCampsList = [];
let cmsStaffList = [];

function escapeCmsHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setCmsVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val ?? '';
}

function getCmsVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

const DEFAULT_STAFF = [
  {
    id: "staff-1",
    name: "Rob Broderick",
    role: "General Manager & Head Coach (NCDC)",
    badge: "GM / Head Coach",
    photo: "assets/images/coach-broderick.jpg",
    bio: "Coach Broderick brings decades of elite coaching, development, and junior hockey scouting leadership. Under his leadership, the Chiefs reached the Dineen Cup Championship and have graduated dozens of players into NCAA Division I and Division III hockey programs.",
    email: "mercerjuniorhockey@gmail.com"
  },
  {
    id: "staff-2",
    name: "Sasha Firsov",
    role: "Assistant Coach (NCDC) & Premier Head Coach",
    badge: "Assistant Coach",
    photo: "assets/images/coach-firsov.jpg",
    bio: "Former professional forward with extensive European and North American playing experience. Specializes in forward skill development, tactical offensive systems, and individual video analysis.",
    email: "sasha@ice-land.com"
  },
  {
    id: "staff-3",
    name: "Terry Jarkowsky",
    role: "Director of Goaltending & Goalie Coach",
    badge: "Goaltending Director",
    photo: "assets/images/mercer-chiefs-crest.png",
    bio: "Nationally recognized goaltending coach whose netminders consistently earn all-league honors and collegiate roster spots, including 2026 starting goaltenders Jack Scali and Louis-Charles Lapensee.",
    email: "terry@ice-land.com"
  },
  {
    id: "staff-4",
    name: "Ryan Kosecki",
    role: "Head Scout & Director of Player Personnel",
    badge: "Head Scout",
    photo: "assets/images/mercer-chiefs-crest.png",
    bio: "Leads national scouting operations across North America, identifying premier junior and college-bound talent for both the NCDC and USPHL Premier rosters.",
    email: "recruiting@mercerchiefs.com"
  },
  {
    id: "staff-5",
    name: "Heather O'Connell",
    role: "Director of Hockey Operations & Administration",
    badge: "Hockey Operations",
    photo: "assets/images/mercer-chiefs-crest.png",
    bio: "Oversees club logistics, league compliance, billeting coordinator programs, tournament operations, and community partnerships at Ice Land.",
    email: "heather@ice-land.com"
  },
  {
    id: "staff-6",
    name: "Oktay Armgan",
    role: "Director of Player Skills & Skating",
    badge: "Skills Coach",
    photo: "assets/images/mercer-chiefs-crest.png",
    bio: "Renowned power-skating and stickhandling specialist working with both junior players and youth tier programs to accelerate edge control and high-speed execution.",
    email: "skills@ice-land.com"
  }
];

async function initSiteContentCMS() {
  try {
    let serverContent = null;
    try {
      const res = await fetch(`data/site-content.json?t=${Date.now()}`);
      if (res.ok) {
        serverContent = await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch data/site-content.json:', e);
    }

    let localContent = null;
    try {
      const cached = localStorage.getItem('mercer_site_content');
      if (cached) localContent = JSON.parse(cached);
    } catch (e) {}

    // Combine: use serverContent as baseline schema, overlay with any local cached changes.
    // If local cache lacks staff or has 0 staff, fallback to server content or DEFAULT_STAFF.
    let content = serverContent || localContent || {};
    if (serverContent && localContent) {
      content = {
        ...serverContent,
        ...localContent,
        staff: (Array.isArray(localContent.staff) && localContent.staff.length > 0)
          ? localContent.staff
          : (Array.isArray(serverContent.staff) && serverContent.staff.length > 0 ? serverContent.staff : DEFAULT_STAFF),
        branding: (localContent.branding && localContent.branding.clubName)
          ? localContent.branding
          : (serverContent.branding || {})
      };
    } else if (!content.staff || !content.staff.length) {
      content.staff = (serverContent && Array.isArray(serverContent.staff) && serverContent.staff.length > 0)
        ? serverContent.staff
        : DEFAULT_STAFF;
    }

    cmsContentState = content;
    populateSiteContentUI(content);
  } catch (err) {
    console.warn('Failed to load site-content.json in admin:', err);
  }
}
window.initSiteContentCMS = initSiteContentCMS;

function populateSiteContentUI(data) {
  if (!data) return;

  // 0. Hero Showcase
  const h = data.hero || {};
  setCmsVal('cms-hero-backdrop', h.backdropImage || 'assets/images/hero-action.jpg');
  const heroPrev = document.getElementById('cms-hero-preview-img');
  if (heroPrev) heroPrev.src = h.backdropImage || 'assets/images/hero-action.jpg';
  setCmsVal('cms-hero-headline-1', h.headlineLine1 || 'CHAMPIONSHIP HOCKEY.');
  setCmsVal('cms-hero-headline-grad', h.headlineGradient || 'PROVEN ADVANCEMENT.');
  setCmsVal('cms-hero-desc', h.description || '');
  setCmsVal('cms-hero-btn1-text', h.primaryBtnText || 'Explore Junior Teams');
  setCmsVal('cms-hero-btn1-url', h.primaryBtnUrl || '#ncdc-hub');
  setCmsVal('cms-hero-btn2-text', h.secondaryBtnText || 'Youth Hub');
  setCmsVal('cms-hero-btn2-url', h.secondaryBtnUrl || '#youth-hub');
  setCmsVal('cms-hero-stat1-num', h.stat1Num || '30+');
  setCmsVal('cms-hero-stat1-lbl', h.stat1Label || 'NCAA D1 Commitments');
  setCmsVal('cms-hero-stat2-num', h.stat2Num || '19');
  setCmsVal('cms-hero-stat2-lbl', h.stat2Label || 'NHL Draft & Pro Alumni');
  setCmsVal('cms-hero-stat3-num', h.stat3Num || '1');
  setCmsVal('cms-hero-stat3-lbl', h.stat3Label || 'Stanley Cup Champion');
  setCmsVal('cms-hero-stat4-num', h.stat4Num || 'DINEEN');
  setCmsVal('cms-hero-stat4-lbl', h.stat4Label || 'Cup Championship Finalist');

  // 1. Tryouts
  const t = data.tryouts || {};
  setCmsVal('cms-tryouts-tag', t.sectionTag || '');
  setCmsVal('cms-tryouts-title', t.title || '');
  setCmsVal('cms-tryouts-subtitle', t.subtitle || '');

  const t1 = t.tier1 || {};
  setCmsVal('cms-t1-badge', t1.badge || '');
  setCmsVal('cms-t1-title', t1.title || '');
  setCmsVal('cms-t1-desc', t1.desc || '');
  setCmsVal('cms-t1-years', t1.birthYears || '');
  setCmsVal('cms-t1-arena', t1.arena || '');
  setCmsVal('cms-t1-showcase', t1.showcaseSchedule || '');
  setCmsVal('cms-t1-equipment', t1.equipment || '');
  setCmsVal('cms-t1-btn-text', t1.registerButtonText || '');
  setCmsVal('cms-t1-url', t1.registerUrl || '');

  const t2 = t.tier2 || {};
  setCmsVal('cms-t2-badge', t2.badge || '');
  setCmsVal('cms-t2-title', t2.title || '');
  setCmsVal('cms-t2-desc', t2.desc || '');
  setCmsVal('cms-t2-years', t2.birthYears || '');
  setCmsVal('cms-t2-divisions', t2.divisions || '');
  setCmsVal('cms-t2-goalies', t2.goaltending || '');
  setCmsVal('cms-t2-tournaments', t2.tournaments || '');
  setCmsVal('cms-t2-btn-text', t2.registerButtonText || '');
  setCmsVal('cms-t2-url', t2.registerUrl || '');

  // 2. Camps
  const c = data.camps || {};
  const enabledBox = document.getElementById('cms-camps-enabled');
  if (enabledBox) enabledBox.checked = c.enabled !== false;
  setCmsVal('cms-camps-tag', c.sectionTag || '');
  setCmsVal('cms-camps-title', c.title || '');
  setCmsVal('cms-camps-subtitle', c.subtitle || '');

  cmsCampsList = Array.isArray(c.items) ? JSON.parse(JSON.stringify(c.items)) : [];
  renderCmsCampsList();

  // 3. Arena & Facility
  const a = data.arena || {};
  setCmsVal('cms-arena-title', a.title || '');
  setCmsVal('cms-arena-desc', a.desc || '');
  setCmsVal('cms-arena-address', a.address || '');
  setCmsVal('cms-arena-phone', a.phone || '');
  setCmsVal('cms-arena-mapurl', a.mapUrl || '');

  const amenities = Array.isArray(a.amenities) ? a.amenities : [];
  for (let i = 0; i < 4; i++) {
    setCmsVal(`cms-amenity-${i}`, amenities[i] || '');
  }

  setCmsVal('cms-broadcast-title', a.broadcastTitle || '');
  setCmsVal('cms-broadcast-desc', a.broadcastDesc || '');
  setCmsVal('cms-broadcast-url', a.broadcastUrl || '');

  // 4. Program Video
  const p = data.program || {};
  setCmsVal('cms-prog-tag', p.sectionTag || '');
  setCmsVal('cms-prog-title', p.title || '');
  setCmsVal('cms-prog-subtitle', p.subtitle || '');
  setCmsVal('cms-prog-video', p.youtubeVideoId || '');
  setCmsVal('cms-prog-callout', p.calloutText || '');

  const pillars = Array.isArray(p.pillars) ? p.pillars : [];
  for (let i = 0; i < 4; i++) {
    setCmsVal(`cms-pillar-${i}-title`, pillars[i]?.title || '');
    setCmsVal(`cms-pillar-${i}-desc`, pillars[i]?.desc || '');
  }

  // 5. Modals
  const b = data.billetModal || {};
  setCmsVal('cms-billet-title', b.title || '');
  setCmsVal('cms-billet-desc', b.desc || '');
  setCmsVal('cms-billet-stipend', b.stipend || '');
  setCmsVal('cms-billet-perk1', b.perk1 || '');
  setCmsVal('cms-billet-perk2', b.perk2 || '');
  setCmsVal('cms-billet-coord-name', b.coordinatorName || '');
  setCmsVal('cms-billet-coord-email', b.coordinatorEmail || '');

  const tr = data.tryoutModal || {};
  setCmsVal('cms-tryout-title', tr.title || '');
  setCmsVal('cms-tryout-desc', tr.desc || '');
  setCmsVal('cms-tryout-url', tr.externalRegisterUrl || '');

  // 6. Club Branding
  if (data.branding) {
    populateBrandingUI(data.branding);
  }

  // 7. Coaching Staff
  if (Array.isArray(data.staff) && data.staff.length > 0) {
    cmsStaffList = JSON.parse(JSON.stringify(data.staff));
  } else {
    cmsStaffList = JSON.parse(JSON.stringify(DEFAULT_STAFF));
  }
  renderCmsStaffList();
}

function renderCmsCampsList() {
  const container = document.getElementById('cms-camps-list');
  if (!container) return;

  if (cmsCampsList.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); background: rgba(0,0,0,0.2); border: 1px dashed var(--border-subtle); border-radius: var(--radius-sm);">
        No active camps or clinics listed. Click "+ Add Another Camp / Clinic" below to create one.
      </div>
    `;
    return;
  }

  container.innerHTML = cmsCampsList.map((item, idx) => `
    <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; position: relative;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <span style="font-weight: 700; color: var(--chiefs-gold); font-size: 0.9rem;">Camp #${idx + 1}</span>
        <button type="button" onclick="window.removeCmsCampItem(${idx})" class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; color: #f87171; border-color: rgba(239,68,68,0.3);">
          ✕ Remove
        </button>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
        <div class="admin-form-group">
          <label>Camp Title</label>
          <input type="text" class="admin-form-input" value="${escapeCmsHtml(item.title || '')}" oninput="cmsCampsList[${idx}].title = this.value">
        </div>
        <div class="admin-form-group">
          <label>Badge Tag</label>
          <input type="text" class="admin-form-input" value="${escapeCmsHtml(item.badge || 'Summer Camp')}" oninput="cmsCampsList[${idx}].badge = this.value">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 0.75rem;">
        <div class="admin-form-group">
          <label>Dates</label>
          <input type="text" class="admin-form-input" value="${escapeCmsHtml(item.dates || '')}" oninput="cmsCampsList[${idx}].dates = this.value">
        </div>
        <div class="admin-form-group">
          <label>Eligible Ages</label>
          <input type="text" class="admin-form-input" value="${escapeCmsHtml(item.ages || '')}" oninput="cmsCampsList[${idx}].ages = this.value">
        </div>
        <div class="admin-form-group">
          <label>Location</label>
          <input type="text" class="admin-form-input" value="${escapeCmsHtml(item.location || 'Ice Land Arena')}" oninput="cmsCampsList[${idx}].location = this.value">
        </div>
        <div class="admin-form-group">
          <label>Price / Fee</label>
          <input type="text" class="admin-form-input" value="${escapeCmsHtml(item.price || '')}" oninput="cmsCampsList[${idx}].price = this.value">
        </div>
      </div>

      <div class="admin-form-group" style="margin-bottom: 0.75rem;">
        <label>Registration / Info URL</label>
        <input type="text" class="admin-form-input" value="${escapeCmsHtml(item.registerUrl || '')}" oninput="cmsCampsList[${idx}].registerUrl = this.value" placeholder="https://...">
      </div>

      <div class="admin-form-group">
        <label>Description & Program Highlights</label>
        <textarea class="admin-form-input" rows="2" oninput="cmsCampsList[${idx}].desc = this.value">${escapeCmsHtml(item.desc || '')}</textarea>
      </div>
    </div>
  `).join('');
}

window.addCmsCampItem = function () {
  cmsCampsList.push({
    id: `camp-${Date.now()}`,
    title: 'New Elite Camp / Clinic',
    badge: 'Camp',
    dates: 'TBD',
    ages: 'All Birth Years',
    location: 'Ice Land Skating Center',
    desc: 'On-ice instruction, power skating, and skill refinement with Chiefs coaching staff.',
    price: '$450',
    registerUrl: ''
  });
  renderCmsCampsList();
};

window.removeCmsCampItem = function (idx) {
  if (confirm('Are you sure you want to remove this camp?')) {
    cmsCampsList.splice(idx, 1);
    renderCmsCampsList();
  }
};

/* --- Staff Directory CMS Handlers --- */
function renderCmsStaffList() {
  const container = document.getElementById('cms-staff-list');
  if (!container) return;

  if (cmsStaffList.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); background: rgba(0,0,0,0.2); border: 1px dashed var(--border-subtle); border-radius: var(--radius-sm);">
        No staff members configured. Click "+ Add Staff Member" above to create one.
      </div>
    `;
    return;
  }

  container.innerHTML = cmsStaffList.map((item, idx) => `
    <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.65rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img id="staff-preview-${idx}" src="${item.photo || 'assets/images/mercer-chiefs-crest.png'}" alt="Preview" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--chiefs-red); box-shadow: 0 0 8px rgba(189,50,59,0.3);">
          <div>
            <span style="font-weight: 700; color: #fff; font-size: 0.95rem;">${escapeCmsHtml(item.name || 'Unnamed Coach')}</span>
            <div style="font-size: 0.75rem; color: var(--chiefs-gold);">${escapeCmsHtml(item.role || 'Staff')}</div>
          </div>
        </div>
        <button type="button" onclick="window.removeCmsStaffItem(${idx})" class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; color: #f87171; border-color: rgba(239,68,68,0.3);">
          ✕ Remove
        </button>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 2fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
        <div class="admin-form-group">
          <label>Full Name *</label>
          <input type="text" class="admin-form-input" value="${escapeCmsHtml(item.name || '')}" oninput="cmsStaffList[${idx}].name = this.value; renderCmsStaffHeader(${idx});">
        </div>
        <div class="admin-form-group">
          <label>Role / Position Title</label>
          <input type="text" class="admin-form-input" value="${escapeCmsHtml(item.role || '')}" placeholder="e.g. Assistant Coach" oninput="cmsStaffList[${idx}].role = this.value; renderCmsStaffHeader(${idx});">
        </div>
        <div class="admin-form-group">
          <label>Badge Tag</label>
          <input type="text" class="admin-form-input" value="${escapeCmsHtml(item.badge || 'Staff')}" placeholder="e.g. Head Coach" oninput="cmsStaffList[${idx}].badge = this.value;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; align-items: start;">
        <div class="admin-form-group">
          <label>Photo URL / Path</label>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <input type="text" id="staff-photo-input-${idx}" class="admin-form-input" value="${escapeCmsHtml(item.photo || '')}" placeholder="assets/images/..." oninput="cmsStaffList[${idx}].photo = this.value; document.getElementById('staff-preview-${idx}').src = this.value;" style="flex: 1;">
            <input type="file" id="cms-staff-file-${idx}" accept="image/*" style="display:none;" onchange="window.uploadStaffPhotoFromInput(this, ${idx})">
            <button type="button" class="btn-primary" onclick="document.getElementById('cms-staff-file-${idx}').click()" style="font-size: 0.76rem; padding: 0.45rem 0.75rem; white-space: nowrap; background: var(--chiefs-gold); border-color: var(--chiefs-gold); color: #000; font-weight: 700;">
              📁 Upload Headshot
            </button>
          </div>
        </div>
        <div class="admin-form-group">
          <label>Email Address</label>
          <input type="email" class="admin-form-input" value="${escapeCmsHtml(item.email || '')}" placeholder="coach@domain.com" oninput="cmsStaffList[${idx}].email = this.value;">
        </div>
      </div>

      <div class="admin-form-group">
        <label>Coach Biography / Career Summary</label>
        <textarea class="admin-form-input" rows="2" placeholder="Experience, achievements, background..." oninput="cmsStaffList[${idx}].bio = this.value;">${escapeCmsHtml(item.bio || '')}</textarea>
      </div>
    </div>
  `).join('');
}

function renderCmsStaffHeader(idx) {
  const item = cmsStaffList[idx];
  if (!item) return;
  const prev = document.getElementById(`staff-preview-${idx}`);
  if (prev && item.photo) prev.src = item.photo;
}

window.addCmsStaffItem = function () {
  cmsStaffList.push({
    id: `staff-${Date.now()}`,
    name: 'New Coach / Staff Member',
    role: 'Assistant Coach',
    badge: 'Coaching Staff',
    photo: 'assets/images/mercer-chiefs-crest.png',
    bio: 'Coach brings extensive experience in player development, high-tempo practice execution, and scouting.',
    email: 'staff@mercerchiefshockey.com'
  });
  renderCmsStaffList();
  showToast('New staff member added. Fill in details and click Publish.');
};

window.removeCmsStaffItem = function (idx) {
  const item = cmsStaffList[idx];
  const name = item ? item.name : 'this staff member';
  if (!confirm(`Are you sure you want to remove ${name}?`)) return;
  cmsStaffList.splice(idx, 1);
  renderCmsStaffList();
  showToast(`${name} removed.`);
};

window.uploadStaffPhotoFromInput = async function (fileInput, idx) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;

  const token = localStorage.getItem('mercer_github_token')?.trim();
  const repoOwner = 'natel1380';
  const repoName = 'mercer-chiefs-website';

  showToast(`Preparing headshot for ${cmsStaffList[idx]?.name || 'coach'}...`);

  try {
    const dataUrl = await optimizeImageFile(file, 400, 400, 0.90);
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const filename = `staff-${Date.now()}.${ext}`;
    const repoPath = `assets/images/${filename}`;

    // Update in-memory and UI immediately
    if (cmsStaffList[idx]) cmsStaffList[idx].photo = repoPath;
    const photoInput = document.getElementById(`staff-photo-input-${idx}`);
    if (photoInput) photoInput.value = repoPath;
    const prev = document.getElementById(`staff-preview-${idx}`);
    if (prev) prev.src = dataUrl;

    if (!token) {
      showToast('Headshot loaded locally. Save GitHub Token in Data Sync Center to publish to live cloud.');
      return;
    }

    showToast(`Uploading headshot to GitHub...`);
    const base64Content = dataUrl.split(',')[1];
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${repoPath}`;

    let sha = null;
    try {
      const checkRes = await fetch(apiUrl, {
        headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}` }
      });
      if (checkRes.ok) {
        const existing = await checkRes.json();
        sha = existing.sha;
      }
    } catch (e) {}

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `upload: add ${filename} staff headshot via CMS`,
        content: base64Content,
        sha: sha || undefined
      })
    });

    if (putRes.ok) {
      showToast(`✓ Headshot uploaded to ${repoPath}! Click Publish to deploy.`);
    } else {
      const err = await putRes.json();
      showToast(`Upload warning: ${err.message || 'Saved locally only'}`);
    }
  } catch (err) {
    console.error('Staff headshot upload error:', err);
    showToast(`Upload error: ${err.message}`);
  } finally {
    fileInput.value = '';
  }
};

window.collectSiteContentFromUI = function () {
  let yt = getCmsVal('cms-prog-video');
  if (yt.includes('youtu.be/')) {
    yt = yt.split('youtu.be/')[1].split('?')[0].split('&')[0];
  } else if (yt.includes('watch?v=')) {
    yt = yt.split('watch?v=')[1].split('&')[0];
  } else if (yt.includes('embed/')) {
    yt = yt.split('embed/')[1].split('?')[0];
  }

  const content = {
    hero: {
      backdropImage: getCmsVal('cms-hero-backdrop') || 'assets/images/hero-action.jpg',
      headlineLine1: getCmsVal('cms-hero-headline-1') || 'CHAMPIONSHIP HOCKEY.',
      headlineGradient: getCmsVal('cms-hero-headline-grad') || 'PROVEN ADVANCEMENT.',
      description: getCmsVal('cms-hero-desc'),
      primaryBtnText: getCmsVal('cms-hero-btn1-text') || 'Explore Junior Teams',
      primaryBtnUrl: getCmsVal('cms-hero-btn1-url') || '#ncdc-hub',
      secondaryBtnText: getCmsVal('cms-hero-btn2-text') || 'Youth Hub',
      secondaryBtnUrl: getCmsVal('cms-hero-btn2-url') || '#youth-hub',
      stat1Num: getCmsVal('cms-hero-stat1-num') || '30+',
      stat1Label: getCmsVal('cms-hero-stat1-lbl') || 'NCAA D1 Commitments',
      stat2Num: getCmsVal('cms-hero-stat2-num') || '19',
      stat2Label: getCmsVal('cms-hero-stat2-lbl') || 'NHL Draft & Pro Alumni',
      stat3Num: getCmsVal('cms-hero-stat3-num') || '1',
      stat3Label: getCmsVal('cms-hero-stat3-lbl') || 'Stanley Cup Champion',
      stat4Num: getCmsVal('cms-hero-stat4-num') || 'DINEEN',
      stat4Label: getCmsVal('cms-hero-stat4-lbl') || 'Cup Championship Finalist'
    },
    tryouts: {
      sectionTag: getCmsVal('cms-tryouts-tag') || '2026 / 2027 Season Evaluations',
      title: getCmsVal('cms-tryouts-title') || 'Join The Chiefs Tradition',
      subtitle: getCmsVal('cms-tryouts-subtitle'),
      tier1: {
        badge: getCmsVal('cms-t1-badge') || 'Tier I AAA — THF',
        title: getCmsVal('cms-t1-title') || 'Tier 1 National Bound & Youth',
        desc: getCmsVal('cms-t1-desc'),
        birthYears: getCmsVal('cms-t1-years'),
        arena: getCmsVal('cms-t1-arena'),
        showcaseSchedule: getCmsVal('cms-t1-showcase'),
        equipment: getCmsVal('cms-t1-equipment'),
        registerButtonText: getCmsVal('cms-t1-btn-text') || 'Register for Tier I Evaluations',
        registerUrl: getCmsVal('cms-t1-url')
      },
      tier2: {
        badge: getCmsVal('cms-t2-badge') || 'Tier II — AHF',
        title: getCmsVal('cms-t2-title') || 'Tier II Competitive & Development',
        desc: getCmsVal('cms-t2-desc'),
        birthYears: getCmsVal('cms-t2-years'),
        divisions: getCmsVal('cms-t2-divisions'),
        goaltending: getCmsVal('cms-t2-goalies'),
        tournaments: getCmsVal('cms-t2-tournaments'),
        registerButtonText: getCmsVal('cms-t2-btn-text') || 'Register for Tier II Evaluations',
        registerUrl: getCmsVal('cms-t2-url')
      }
    },
    camps: {
      enabled: document.getElementById('cms-camps-enabled')?.checked ?? true,
      sectionTag: getCmsVal('cms-camps-tag') || 'Player Development & Skills',
      title: getCmsVal('cms-camps-title') || 'Camps & Clinics',
      subtitle: getCmsVal('cms-camps-subtitle'),
      items: cmsCampsList
    },
    arena: {
      sectionTag: 'Home Facility',
      title: getCmsVal('cms-arena-title') || 'Ice Land Skating Center',
      desc: getCmsVal('cms-arena-desc'),
      address: getCmsVal('cms-arena-address') || '6 Tennis Court, Hamilton Township, NJ 08619',
      mapUrl: getCmsVal('cms-arena-mapurl') || 'https://maps.google.com/?q=6+Tennis+Ct,+Hamilton+Township,+NJ+08619',
      phone: getCmsVal('cms-arena-phone') || '(609) 588-6672',
      amenities: [
        getCmsVal('cms-amenity-0') || '2 NHL-Size Ice Sheets',
        getCmsVal('cms-amenity-1') || 'Full-menu Concessions',
        getCmsVal('cms-amenity-2') || 'Off-Ice Dryland Training',
        getCmsVal('cms-amenity-3') || 'Blackbear TV Broadcast Rinks'
      ],
      broadcastTag: 'Live Broadcasts',
      broadcastTitle: getCmsVal('cms-broadcast-title') || 'Watch On Black Bear TV',
      broadcastDesc: getCmsVal('cms-broadcast-desc'),
      broadcastUrl: getCmsVal('cms-broadcast-url') || 'https://blackbearsports.tv/'
    },
    program: {
      sectionTag: getCmsVal('cms-prog-tag') || 'Inside The Mercer Chiefs Experience',
      title: getCmsVal('cms-prog-title') || 'Junior Hockey Defined',
      subtitle: getCmsVal('cms-prog-subtitle'),
      youtubeVideoId: yt || 'E9HzPzEbpS8',
      sourceTitle: 'Mercer Chiefs NCDC & Premier Hockey Club',
      sourceLocation: 'Ice Land Skating Center • Hamilton Township, NJ',
      pillars: [
        { title: getCmsVal('cms-pillar-0-title'), desc: getCmsVal('cms-pillar-0-desc') },
        { title: getCmsVal('cms-pillar-1-title'), desc: getCmsVal('cms-pillar-1-desc') },
        { title: getCmsVal('cms-pillar-2-title'), desc: getCmsVal('cms-pillar-2-desc') },
        { title: getCmsVal('cms-pillar-3-title'), desc: getCmsVal('cms-pillar-3-desc') }
      ],
      calloutText: getCmsVal('cms-prog-callout') || 'Ready to take the ice for the 2026/27 campaign?'
    },
    billetModal: {
      goldTag: 'Support Junior Hockey in Hamilton',
      title: getCmsVal('cms-billet-title') || 'Become a Mercer Chiefs Billet Family',
      desc: getCmsVal('cms-billet-desc'),
      stipend: getCmsVal('cms-billet-stipend') || '$675/mo food allowance',
      perk1: getCmsVal('cms-billet-perk1') || 'VIP Passes to all Chiefs games',
      perk2: getCmsVal('cms-billet-perk2') || 'Mentoring a future NCAA star',
      coordinatorName: getCmsVal('cms-billet-coord-name') || 'Heather O\'Connell',
      coordinatorEmail: getCmsVal('cms-billet-coord-email') || 'billet@mercerchiefshockey.com'
    },
    tryoutModal: {
      goldTag: '2026/27 Mercer Chiefs Evaluations',
      title: getCmsVal('cms-tryout-title') || 'Tryout Registration Portal',
      desc: getCmsVal('cms-tryout-desc'),
      externalRegisterUrl: getCmsVal('cms-tryout-url')
    },
    staff: cmsStaffList,
    branding: {
      clubName: getCmsVal('cms-brand-club-name') || 'Mercer Chiefs Hockey Club',
      shortName: getCmsVal('cms-brand-club-short') || 'Mercer Chiefs',
      tagline: getCmsVal('cms-brand-tagline') || 'Junior & Elite Youth Hockey',
      description: getCmsVal('cms-brand-desc'),
      founded: getCmsVal('cms-brand-founded') || '1990',
      crestLogo: getCmsVal('cms-brand-crest-url') || 'assets/images/mercer-chiefs-crest.png',
      wordmarkLogo: getCmsVal('cms-brand-wordmark-url') || 'assets/images/mercer-chiefs-logo.png',
      favicon: getCmsVal('cms-brand-favicon-url') || 'assets/images/mercer-chiefs-crest.png',
      colors: {
        primary: getCmsVal('cms-color-primary') || '#BD323B',
        accent: getCmsVal('cms-color-accent') || '#F5A623',
        bgDeep: getCmsVal('cms-color-bg') || '#08090C',
        bgCard: getCmsVal('cms-color-card') || '#12151C'
      }
    }
  };

  return content;
};

window.publishSiteContent = async function () {
  const token = localStorage.getItem('mercer_github_token')?.trim();
  const repoOwner = 'natel1380';
  const repoName = 'mercer-chiefs-website';

  const btnContent = document.getElementById('btn-publish-site-content');
  const badgeContent = document.getElementById('site-content-status-badge');
  const btnBranding = document.getElementById('btn-publish-branding');
  const badgeBranding = document.getElementById('site-branding-status-badge');

  const btns = [btnContent, btnBranding].filter(Boolean);
  const badges = [badgeContent, badgeBranding].filter(Boolean);

  if (!token) {
    window.switchAdminTab('tab-sync');
    window.toggleGitHubSettings();
    showToast('Please enter and save your GitHub Token in Data Sync Center first to publish changes to the live site.');
    return;
  }

  btns.forEach(b => {
    b.disabled = true;
    b.innerHTML = '⏳ Publishing to Live Site...';
  });
  badges.forEach(b => {
    b.textContent = '○ Uploading...';
    b.style.color = 'var(--chiefs-gold)';
  });

  const content = window.collectSiteContentFromUI();
  const jsonString = JSON.stringify(content, null, 2);

  // Cache locally
  localStorage.setItem('mercer_site_content', jsonString);
  window.dispatchEvent(new Event('storage'));

  try {
    const contentUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/data/site-content.json`;
    let sha = null;
    try {
      const getRes = await fetch(contentUrl, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }
    } catch (e) {}

    const putRes = await fetch(contentUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'chore: update website content and club branding via CMS',
        content: btoa(unescape(encodeURIComponent(jsonString))),
        sha: sha || undefined
      })
    });

    if (putRes.ok) {
      showToast('✓ Successfully published updates to live website!');
      badges.forEach(b => {
        b.textContent = '● Published Live';
        b.style.color = '#4ade80';
      });
      btns.forEach(b => {
        b.disabled = false;
        b.innerHTML = '✓ Published!';
        setTimeout(() => {
          b.innerHTML = b.id === 'btn-publish-branding' ? '💾 Publish Branding to Live Site' : '💾 Publish to Live Site';
        }, 2500);
      });
      return;
    }

    const errData = await putRes.json();
    throw new Error(errData.message || 'GitHub API returned an error');
  } catch (err) {
    console.error('Publish error:', err);
    showToast(`Publish failed: ${err.message || 'Check token permissions'}`);
    badges.forEach(b => {
      b.textContent = '● Saved Locally Only';
      b.style.color = '#f87171';
    });
    btns.forEach(b => {
      b.disabled = false;
      b.innerHTML = b.id === 'btn-publish-branding' ? '💾 Publish Branding to Live Site' : '💾 Publish to Live Site';
    });
  }
};

window.resetSiteContentDefaults = async function () {
  if (!confirm('Reset all website content back to default values?')) return;
  try {
    const res = await fetch(`data/site-content.json?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      populateSiteContentUI(data);
      showToast('Content reset to file defaults.');
    }
  } catch (e) {}
};

/* ==========================================================================
   11. CLUB BRANDING & THEME CMS
   ========================================================================== */

async function initClubBrandingCMS() {
  try {
    let serverContent = null;
    try {
      const res = await fetch(`data/site-content.json?t=${Date.now()}`);
      if (res.ok) {
        serverContent = await res.json();
      }
    } catch (e) {}

    let localContent = null;
    try {
      const cached = localStorage.getItem('mercer_site_content');
      if (cached) localContent = JSON.parse(cached);
    } catch (e) {}

    const branding = (localContent?.branding && localContent.branding.clubName)
      ? localContent.branding
      : (serverContent?.branding || cmsContentState?.branding || null);

    if (branding) {
      populateBrandingUI(branding);
    } else {
      window.resetBrandingDefaults(false);
    }
  } catch (err) {
    console.warn('Failed to load branding in admin:', err);
  }
}
window.initClubBrandingCMS = initClubBrandingCMS;

function populateBrandingUI(b) {
  if (!b) return;

  setCmsVal('cms-brand-club-name', b.clubName || 'Mercer Chiefs Hockey Club');
  setCmsVal('cms-brand-club-short', b.shortName || 'Mercer Chiefs');
  setCmsVal('cms-brand-tagline', b.tagline || 'Junior & Elite Youth Hockey');
  setCmsVal('cms-brand-founded', b.founded || '1990');
  setCmsVal('cms-brand-desc', b.description || '');

  setCmsVal('cms-brand-crest-url', b.crestLogo || 'assets/images/mercer-chiefs-crest.png');
  setCmsVal('cms-brand-wordmark-url', b.wordmarkLogo || 'assets/images/mercer-chiefs-logo.png');
  setCmsVal('cms-brand-favicon-url', b.favicon || 'assets/images/mercer-chiefs-crest.png');

  const colors = b.colors || {};
  const primary = colors.primary || '#BD323B';
  const accent = colors.accent || '#F5A623';
  const bg = colors.bgDeep || '#08090C';
  const card = colors.bgCard || '#12151C';

  setCmsVal('cms-color-primary', primary);
  setCmsVal('cms-color-primary-picker', primary);
  setCmsVal('cms-color-accent', accent);
  setCmsVal('cms-color-accent-picker', accent);
  setCmsVal('cms-color-bg', bg);
  setCmsVal('cms-color-bg-picker', bg);
  setCmsVal('cms-color-card', card);
  setCmsVal('cms-color-card-picker', card);

  window.updateBrandingPreview();
}

window.updateBrandingPreview = function () {
  const shortName = getCmsVal('cms-brand-club-short') || 'MERCER CHIEFS';
  const tagline = getCmsVal('cms-brand-tagline') || 'JUNIOR & ELITE YOUTH HOCKEY';
  const crestUrl = getCmsVal('cms-brand-crest-url') || 'assets/images/mercer-chiefs-crest.png';
  const wordmarkUrl = getCmsVal('cms-brand-wordmark-url') || 'assets/images/mercer-chiefs-logo.png';
  const primary = getCmsVal('cms-color-primary') || '#BD323B';
  const accent = getCmsVal('cms-color-accent') || '#F5A623';
  const bg = getCmsVal('cms-color-bg') || '#08090C';
  const card = getCmsVal('cms-color-card') || '#12151C';
  const fullName = getCmsVal('cms-brand-club-name') || 'Mercer Chiefs Hockey Club';

  // Update Image Previews
  const previewCrest = document.getElementById('preview-crest-img');
  if (previewCrest) previewCrest.src = crestUrl;
  const previewWordmark = document.getElementById('preview-wordmark-img');
  if (previewWordmark) previewWordmark.src = wordmarkUrl;

  // Update Mockup Elements
  const mockCrest = document.getElementById('mockup-crest');
  if (mockCrest) mockCrest.src = crestUrl;
  const mockTitle = document.getElementById('mockup-title');
  if (mockTitle) mockTitle.textContent = shortName.toUpperCase();
  const mockSub = document.getElementById('mockup-sub');
  if (mockSub) {
    mockSub.textContent = tagline.toUpperCase();
    mockSub.style.color = accent;
  }
  const mockCopy = document.getElementById('mockup-copyright');
  if (mockCopy) mockCopy.textContent = `© ${new Date().getFullYear()} ${fullName}. All rights reserved.`;

  // Update Mockup Colors & Borders
  const previewBox = document.getElementById('live-theme-preview-box');
  if (previewBox) previewBox.style.background = bg;

  const mockCard = document.getElementById('mockup-card-surface');
  if (mockCard) {
    mockCard.style.background = card;
    mockCard.style.borderColor = primary;
  }

  const mockBadge = document.getElementById('mockup-badge');
  if (mockBadge) {
    mockBadge.style.color = accent;
    mockBadge.style.borderColor = accent;
    mockBadge.style.background = hexToRgba(accent, 0.15);
  }

  const primBtn = document.getElementById('mockup-primary-btn');
  if (primBtn) {
    primBtn.style.background = primary;
    primBtn.style.borderColor = primary;
    primBtn.style.boxShadow = `0 0 12px ${hexToRgba(primary, 0.45)}`;
  }

  const secBtn = document.getElementById('mockup-secondary-btn');
  if (secBtn) {
    secBtn.style.color = accent;
    secBtn.style.borderColor = accent;
  }

  // Also apply dynamically to active page root so admin portal feels themed
  document.documentElement.style.setProperty('--chiefs-red', primary);
  document.documentElement.style.setProperty('--chiefs-gold', accent);
};

window.applyColorPreset = function (primary, accent, bgDeep, bgCard) {
  setCmsVal('cms-color-primary', primary);
  setCmsVal('cms-color-primary-picker', primary);
  setCmsVal('cms-color-accent', accent);
  setCmsVal('cms-color-accent-picker', accent);
  setCmsVal('cms-color-bg', bgDeep);
  setCmsVal('cms-color-bg-picker', bgDeep);
  setCmsVal('cms-color-card', bgCard);
  setCmsVal('cms-color-card-picker', bgCard);

  window.updateBrandingPreview();
  showToast('Color preset applied. See preview below.');
};

window.resetBrandingDefaults = function (promptUser = true) {
  if (promptUser && !confirm('Reset club branding back to Mercer Chiefs authentic defaults?')) return;
  populateBrandingUI({
    clubName: 'Mercer Chiefs Hockey Club',
    shortName: 'Mercer Chiefs',
    tagline: 'Junior & Elite Youth Hockey',
    description: 'Dedicated to developing student-athletes through competitive Tier II tuition-free junior hockey and premier Tier 1 AAA youth competition in Hamilton, New Jersey.',
    founded: '1990',
    crestLogo: 'assets/images/mercer-chiefs-crest.png',
    wordmarkLogo: 'assets/images/mercer-chiefs-logo.png',
    favicon: 'assets/images/mercer-chiefs-crest.png',
    colors: {
      primary: '#BD323B',
      accent: '#F5A623',
      bgDeep: '#08090C',
      bgCard: '#12151C'
    }
  });
  if (promptUser) showToast('Branding reset to Mercer Chiefs defaults.');
};

window.publishClubBranding = function () {
  window.publishSiteContent();
};

/* ==========================================================================
   12. CMS MEDIA & IMAGE CLOUD UPLOADER
   ========================================================================== */

function optimizeImageFile(file, maxWidth = 1920, maxHeight = 1920, quality = 0.88) {
  return new Promise((resolve) => {
    // If SVG or gif (animations), don't process via canvas
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Keep png if transparent or requested, else jpeg/webp
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outputType, quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

window.uploadImageFromInput = async function (fileInput, targetInputId, previewImgId, imageType = 'general') {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;

  const targetInput = document.getElementById(targetInputId);
  const previewImg = previewImgId ? document.getElementById(previewImgId) : null;
  const token = localStorage.getItem('mercer_github_token')?.trim();
  const repoOwner = 'natel1380';
  const repoName = 'mercer-chiefs-website';

  showToast(`Preparing and optimizing ${file.name}...`);

  try {
    // Max dimension: 1920px for hero, 600px for crest/wordmark/logos
    const maxDim = (imageType === 'hero') ? 1920 : 600;
    const dataUrl = await optimizeImageFile(file, maxDim, maxDim, 0.90);

    // Sanitize filename
    const ext = file.type === 'image/png' ? 'png' : (file.name.split('.').pop().toLowerCase() || 'jpg');
    const filename = `${imageType}-${Date.now()}.${ext}`;
    const repoPath = `assets/images/${filename}`;

    // Immediately update preview in browser
    if (previewImg) previewImg.src = dataUrl;
    if (targetInput) targetInput.value = repoPath;

    // If branding preview exists, update mockup
    if (typeof window.updateBrandingPreview === 'function') {
      window.updateBrandingPreview();
    }

    if (!token) {
      showToast('Image preview loaded locally. Enter GitHub Token in Data Sync Center to publish to live cloud repository.');
      return;
    }

    showToast(`Uploading ${filename} to GitHub repository...`);

    const base64Content = dataUrl.split(',')[1];
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${repoPath}`;

    // Check if file exists to get SHA
    let sha = null;
    try {
      const checkRes = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (checkRes.ok) {
        const existing = await checkRes.json();
        sha = existing.sha;
      }
    } catch (e) {}

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `upload: add ${filename} via Staff CMS`,
        content: base64Content,
        sha: sha || undefined
      })
    });

    if (putRes.ok) {
      showToast(`✓ Image uploaded successfully to repository (${repoPath})!`);
      if (targetInput) targetInput.value = repoPath;
    } else {
      const err = await putRes.json();
      showToast(`Upload warning: ${err.message || 'Saved locally only'}`);
    }
  } catch (err) {
    console.error('Image upload failed:', err);
    showToast(`Image processing error: ${err.message}`);
  } finally {
    // Reset file input so user can re-select same file if desired
    fileInput.value = '';
  }
};
