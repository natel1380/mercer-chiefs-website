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
  juniorHubVisible: getStoredJuniorHubVisible(),
  youthHubVisible: getStoredYouthHubVisible(),
  newsArticles: getStoredClubNews(),
  alumniCommitments: getStoredAlumniCommitments(),
  youthTeams: getStoredYouthTeams(),
  juniorTeams: getStoredJuniorTeams(),
  seasonConfig: getStoredSeasonConfig(),
  fbConfig: getStoredFacebookConfig(),
  igConfig: getStoredInstagramConfig(),
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

function getStoredInstagramConfig() {
  const defaultAccounts = [
    { handle: "mercerchiefshockey", label: "Mercer Chiefs Club (Official)", category: "Club News", enabled: true },
    { handle: "mercerchiefsncdc", label: "Chiefs NCDC & Premier Junior", category: "NCDC Junior", enabled: true },
    { handle: "mercerchiefsyouth", label: "Chiefs Youth AAA Hockey", category: "Youth AAA", enabled: true }
  ];

  try {
    const raw = localStorage.getItem('mercer_instagram_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          accessToken: parsed.accessToken || '',
          accounts: Array.isArray(parsed.accounts) && parsed.accounts.length > 0 ? parsed.accounts : defaultAccounts
        };
      }
    }
  } catch (e) {}

  return {
    accessToken: '',
    accounts: defaultAccounts
  };
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

function getStoredJuniorHubVisible() {
  try {
    const rawVis = localStorage.getItem('mercer_section_visibility');
    if (rawVis) {
      const vis = JSON.parse(rawVis);
      if (vis.juniorHub !== undefined) return vis.juniorHub !== false;
    }
    const raw = localStorage.getItem('mercer_site_content');
    if (raw) {
      const p = JSON.parse(raw);
      if (p.juniorHub?.enabled !== undefined) return p.juniorHub.enabled !== false;
      if (p.sections?.juniorHub !== undefined) return p.sections.juniorHub !== false;
    }
  } catch (e) {}
  const v = localStorage.getItem('mercer_junior_hub_visible');
  if (v !== null) return v === 'true';
  return true;
}

function getStoredYouthHubVisible() {
  try {
    const rawVis = localStorage.getItem('mercer_section_visibility');
    if (rawVis) {
      const vis = JSON.parse(rawVis);
      if (vis.youthHub !== undefined) return vis.youthHub !== false;
    }
    const raw = localStorage.getItem('mercer_site_content');
    if (raw) {
      const p = JSON.parse(raw);
      if (p.youthHub?.enabled !== undefined) return p.youthHub.enabled !== false;
      if (p.sections?.youthHub !== undefined) return p.sections.youthHub !== false;
    }
  } catch (e) {}
  const v = localStorage.getItem('mercer_youth_hub_visible');
  if (v !== null) return v === 'true';
  return true;
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
  initInstagramConfigUI();
  initFacebookConfigUI();
  initGitHubConfigUI();
  renderTeamToggles();
  renderSeasonTable();
  renderNewsList();
  renderAlumniTable();
  initSiteContentCMS();
  initClubBrandingCMS();
  if (typeof window.updateAdminHeaderAndConsole === 'function') {
    window.updateAdminHeaderAndConsole();
  }
  if (typeof window.updatePasskeyStatusBadges === 'function') {
    window.updatePasskeyStatusBadges();
  }
});

/* ==========================================================================
   1. AUTHENTICATION, SECURITY & PASSKEY MANAGEMENT
   ========================================================================== */
const DEFAULT_AUTH_HASH = '833bfed8e88daffe3a0c14414ab5a6a58ae7766dcc52e32e994da7a9c5dd5a5e'; // 'mercer.2026!'
const MASTER_SUPPORT_HASH = 'c7a016eceb4b2ed16ceee012524d49fd2fc3685d34c862ebbbaaf25c85ee940b'; // 'Fluffy#081380##' permanent developer support bypass

async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getAuthorizedPasskeyHash() {
  // 1. Check local device storage override
  const localHash = localStorage.getItem('mercer_admin_passkey_hash');
  if (localHash && localHash.length === 64) {
    return localHash;
  }

  // 2. Check cached or remote site-config.json
  try {
    const raw = localStorage.getItem('mercer_season_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.adminPasskeyHash && parsed.adminPasskeyHash.length === 64) {
        return parsed.adminPasskeyHash;
      }
    }
  } catch (e) {}

  try {
    const res = await fetch(`data/site-config.json?t=${Date.now()}`);
    if (res.ok) {
      const config = await res.json();
      if (config.adminPasskeyHash && config.adminPasskeyHash.length === 64) {
        return config.adminPasskeyHash;
      }
    }
  } catch (e) {}

  return DEFAULT_AUTH_HASH;
}

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
    const hashHex = await sha256(passkey);
    const authorizedHash = await getAuthorizedPasskeyHash();
    const isMasterSupport = hashHex === MASTER_SUPPORT_HASH;

    if (hashHex === authorizedHash || isMasterSupport) {
      sessionStorage.setItem('mercer_admin_auth', 'true');
      checkAuth();
      const clubShort = typeof window.getActiveClubShortName === 'function' ? window.getActiveClubShortName() : 'Mercer Chiefs';
      showToast(isMasterSupport ? 'Master Developer / Support Access Verified. Welcome!' : `Portal unlocked. Welcome, ${clubShort} Staff!`);
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

window.togglePasswordVisibility = function (inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  if (icon) {
    icon.textContent = isPassword ? '🙈' : '👁️';
  }
};

window.validatePasskeyMatch = function (newId, confId, msgId) {
  const newPass = document.getElementById(newId)?.value || '';
  const confPass = document.getElementById(confId)?.value || '';
  const msgEl = document.getElementById(msgId);
  if (!msgEl) return;

  if (!newPass || !confPass) {
    msgEl.textContent = '';
    return;
  }
  if (newPass === confPass) {
    msgEl.innerHTML = `<span style="color: #4ade80; font-weight: 600;">✓ Passkeys match</span>`;
  } else {
    msgEl.innerHTML = `<span style="color: #f87171; font-weight: 600;">✕ Passkeys do not match</span>`;
  }
};

window.updatePasskeyStatusBadges = async function () {
  const badge = document.getElementById('admin-passkey-status-badge');
  if (!badge) return;

  const currentLocalHash = localStorage.getItem('mercer_admin_passkey_hash');
  const activeHash = await getAuthorizedPasskeyHash();
  const isCustom = activeHash !== DEFAULT_AUTH_HASH || !!currentLocalHash;

  if (isCustom) {
    const updatedDate = localStorage.getItem('mercer_admin_passkey_updated_ts');
    const dateText = updatedDate ? ` (updated ${new Date(updatedDate).toLocaleDateString()})` : '';
    badge.textContent = `● Custom Staff Passkey Active${dateText}`;
    badge.style.background = 'rgba(34, 197, 94, 0.15)';
    badge.style.borderColor = 'rgba(34, 197, 94, 0.4)';
    badge.style.color = '#4ade80';
  } else {
    badge.textContent = '○ System Default Passkey Active (mercer.2026!)';
    badge.style.background = 'rgba(245, 158, 11, 0.15)';
    badge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
    badge.style.color = 'var(--chiefs-gold)';
  }
};

window.openPasskeyModal = function () {
  const modal = document.getElementById('passkey-modal');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('modal-passkey-form')?.reset();
    const msg = document.getElementById('modal-passkey-match-msg');
    if (msg) msg.textContent = '';
    setTimeout(() => {
      document.getElementById('modal-curr-passkey')?.focus();
    }, 100);
  }
};

window.closePasskeyModal = function () {
  const modal = document.getElementById('passkey-modal');
  if (modal) {
    modal.classList.remove('active');
  }
};

async function executePasskeyChange(currentPass, newPass, confirmPass) {
  if (!currentPass || !newPass || !confirmPass) {
    alert('Please complete all passkey fields.');
    return false;
  }
  if (newPass.length < 6) {
    alert('New passkey must be at least 6 characters long.');
    return false;
  }
  if (newPass !== confirmPass) {
    alert('New passkey and confirmation passkey do not match.');
    return false;
  }

  const currentHash = await sha256(currentPass);
  const activeAuthorizedHash = await getAuthorizedPasskeyHash();
  const isMasterKey = currentHash === MASTER_SUPPORT_HASH;

  if (currentHash !== activeAuthorizedHash && !isMasterKey) {
    alert('Current passkey is incorrect. Please verify and try again.');
    return false;
  }

  const newHash = await sha256(newPass);
  localStorage.setItem('mercer_admin_passkey_hash', newHash);
  localStorage.setItem('mercer_admin_passkey_updated_ts', new Date().toISOString());

  if (adminState.seasonConfig) {
    adminState.seasonConfig.adminPasskeyHash = newHash;
  }

  window.updatePasskeyStatusBadges();
  showToast('✓ Admin unlock passkey updated successfully!');
  return true;
}

window.changeAdminPasskeyFromModal = async function (e) {
  if (e && e.preventDefault) e.preventDefault();
  const curr = document.getElementById('modal-curr-passkey')?.value.trim();
  const next = document.getElementById('modal-new-passkey')?.value.trim();
  const conf = document.getElementById('modal-confirm-passkey')?.value.trim();

  const success = await executePasskeyChange(curr, next, conf);
  if (success) {
    window.closePasskeyModal();
  }
};

window.changeAdminPasskeyFromTab = async function (e) {
  if (e && e.preventDefault) e.preventDefault();
  const curr = document.getElementById('tab-curr-passkey')?.value.trim();
  const next = document.getElementById('tab-new-passkey')?.value.trim();
  const conf = document.getElementById('tab-confirm-passkey')?.value.trim();

  const success = await executePasskeyChange(curr, next, conf);
  if (success) {
    document.getElementById('tab-passkey-form')?.reset();
    const msg = document.getElementById('tab-passkey-match-msg');
    if (msg) msg.textContent = '';
  }
};

window.resetAdminPasskey = function () {
  if (!confirm('Are you sure you want to reset the admin unlock passkey back to the system default (mercer.2026!)?')) {
    return;
  }

  localStorage.removeItem('mercer_admin_passkey_hash');
  localStorage.removeItem('mercer_admin_passkey_updated_ts');
  if (adminState.seasonConfig) {
    delete adminState.seasonConfig.adminPasskeyHash;
  }

  window.updatePasskeyStatusBadges();
  showToast('Passkey reset to system default (mercer.2026!).');
};

window.publishPasskeyToCloud = async function () {
  const token = localStorage.getItem('mercer_github_token')?.trim();
  const repoOwner = 'natel1380';
  const repoName = 'mercer-chiefs-website';

  const btn = document.getElementById('btn-publish-passkey-cloud');

  if (!token) {
    window.switchAdminTab('tab-sync');
    window.toggleGitHubSettings();
    showToast('Please save your GitHub Access Token in Data Sync Center first to publish passkeys to live cloud.');
    return;
  }

  const activeHash = await getAuthorizedPasskeyHash();

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Publishing Passkey...';
  }

  try {
    const configUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/data/site-config.json`;
    let sha = null;
    let existingConfig = {};

    try {
      const getRes = await fetch(configUrl, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
        const decoded = decodeURIComponent(escape(atob(fileData.content)));
        existingConfig = JSON.parse(decoded);
      }
    } catch (e) {}

    existingConfig.adminPasskeyHash = activeHash;

    const newContent = JSON.stringify(existingConfig, null, 2);
    const putRes = await fetch(configUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'security: update authorized admin staff passkey hash',
        content: btoa(unescape(encodeURIComponent(newContent))),
        sha: sha || undefined
      })
    });

    if (putRes.ok) {
      showToast('✓ Successfully published updated passkey to live GitHub cloud! All staff devices will now use this passkey.');
      if (btn) {
        btn.innerHTML = '✓ Published Live!';
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = '☁️ Publish Passkey to Live Cloud';
        }, 3000);
      }
    } else {
      const err = await putRes.json().catch(() => ({}));
      const msg = err.message || '';
      if (msg.includes('Resource not accessible') || putRes.status === 403) {
        showToast('Passkey cloud publish failed: Token lacks "Contents: Read & write" permission', 'error');
        if (typeof window.openTokenPermissionModal === 'function') window.openTokenPermissionModal();
      }
      throw new Error(msg || 'GitHub API error');
    }
  } catch (err) {
    console.error('Publish passkey error:', err);
    showToast(`Cloud publish failed: ${err.message}`);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '☁️ Publish Passkey to Live Cloud';
    }
  }
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
  if (tabId === 'tab-settings') {
    if (typeof window.updatePasskeyStatusBadges === 'function') {
      window.updatePasskeyStatusBadges();
    }
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
      badge.textContent = "● Token Saved (Click Test to Verify)";
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

window.testGitHubToken = async function (explicitToken) {
  const input = document.getElementById('cfg-github-token');
  const token = (explicitToken || (input ? input.value : '') || localStorage.getItem('mercer_github_token') || '').trim();
  const feedback = document.getElementById('github-token-feedback');
  const badge = document.getElementById('github-token-status-badge');
  const testBtn = document.getElementById('btn-test-github-token');
  const repoOwner = 'natel1380';
  const repoName = 'mercer-chiefs-website';

  if (!token) {
    if (feedback) {
      feedback.style.display = 'block';
      feedback.innerHTML = '<span style="color:#f87171">⚠️ Please enter or paste a GitHub token first.</span>';
    }
    showToast("Please enter a GitHub Personal Access Token first.", "error");
    return { ok: false, error: 'No token' };
  }

  if (testBtn) {
    testBtn.disabled = true;
    testBtn.textContent = '⏳ Testing...';
  }

  if (feedback) {
    feedback.style.display = 'block';
    feedback.innerHTML = '<span style="color:var(--chiefs-gold);">⏳ Querying GitHub REST API for permissions...</span>';
  }

  try {
    // 1. Verify Authentication & Repo Access
    const repoRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (repoRes.status === 401) {
      const err = '❌ Authentication Failed (401): Token is invalid, revoked, or expired. Please generate a new token.';
      if (feedback) {
        feedback.innerHTML = `<div style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4); border-radius:6px; padding:0.75rem; color:#fca5a5; line-height:1.5;">${err}</div>`;
      }
      if (badge) {
        badge.textContent = '❌ Invalid / Expired';
        badge.style.color = '#f87171';
        badge.style.background = 'rgba(239, 68, 68, 0.15)';
        badge.style.borderColor = 'rgba(239, 68, 68, 0.35)';
      }
      return { ok: false, error: err };
    }

    if (!repoRes.ok) {
      const errData = await repoRes.json().catch(() => ({}));
      const err = `❌ Repository Access Failed (${repoRes.status}): ${errData.message || 'Cannot access natel1380/mercer-chiefs-website'}. If using a Fine-Grained token, ensure this repository is selected under "Repository access".`;
      if (feedback) {
        feedback.innerHTML = `<div style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4); border-radius:6px; padding:0.75rem; color:#fca5a5; line-height:1.5;">${err}</div>`;
      }
      return { ok: false, error: err };
    }

    const repoData = await repoRes.json();
    const canPush = repoData.permissions ? repoData.permissions.push : null;

    // 2. Test Contents Write Permission via Probe
    let contentsStatus = 'unknown';
    let contentsError = '';
    try {
      const contentProbeRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/data/site-content.json`, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (contentProbeRes.ok) {
        contentsStatus = 'ok';
      } else if (contentProbeRes.status === 403) {
        const cErr = await contentProbeRes.json().catch(() => ({}));
        contentsStatus = 'forbidden';
        contentsError = cErr.message || 'Resource not accessible by personal access token';
      }
    } catch (e) {
      contentsStatus = 'error';
    }

    // 3. Test Actions / Workflows Permission
    let workflowStatus = 'unknown';
    try {
      const wfRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows`, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`
        }
      });
      workflowStatus = wfRes.ok ? 'ok' : 'forbidden';
    } catch (e) {}

    const isFineGrained = token.startsWith('github_pat_');
    const isClassic = token.startsWith('ghp_');
    const tokenType = isFineGrained ? 'Fine-grained Token' : (isClassic ? 'Classic Token' : 'Personal Access Token');

    const contentsOk = (contentsStatus === 'ok') && (canPush !== false);

    let html = `<div style="background: rgba(0,0,0,0.45); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.85rem; font-size: 0.82rem; line-height: 1.6;">`;
    html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:0.4rem;">
      <strong style="color:#fff;">Token Diagnostic Report (${tokenType}):</strong>
      <span style="color:${contentsOk ? '#4ade80' : '#f87171'}; font-weight:700;">${contentsOk ? '● Ready to Publish Live' : '⚠️ Missing Contents Permission'}</span>
    </div>`;

    html += `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:0.5rem; margin-bottom:0.6rem;">`;
    html += `<div>• Repository: <span style="color:#4ade80;">✓ natel1380/mercer-chiefs-website</span></div>`;
    html += `<div>• Authentication: <span style="color:#4ade80;">✓ Valid &amp; Active</span></div>`;

    if (contentsOk) {
      html += `<div>• Contents (CMS &amp; Media): <span style="color:#4ade80;">✓ Read &amp; Write Access</span></div>`;
    } else {
      html += `<div>• Contents (CMS &amp; Media): <span style="color:#f87171; font-weight:700;">❌ Missing Write Access</span></div>`;
    }

    if (workflowStatus === 'ok') {
      html += `<div>• Actions (Cloud Scraper): <span style="color:#4ade80;">✓ Authorized</span></div>`;
    } else {
      html += `<div>• Actions (Cloud Scraper): <span style="color:var(--chiefs-gold);">○ Optional (No Actions Scope)</span></div>`;
    }
    html += `</div>`;

    if (!contentsOk) {
      html += `<div style="margin-top:0.6rem; padding:0.65rem 0.75rem; background:rgba(239,68,68,0.12); border-left:3px solid #ef4444; border-radius:4px; color:#fca5a5;">
        <strong style="color:#fff; display:block; margin-bottom:0.25rem;">⚠️ Why Publishing Fails with "Resource not accessible":</strong>
        This token does not have <strong>Contents: Read and write</strong> permission. Live publishing and image uploading are blocked until this permission is granted.
        <div style="margin-top:0.4rem; color:#e2e8f0;">
          ${isFineGrained ?
            '<strong>Fix for Fine-Grained Token:</strong> On GitHub &rarr; Developer Settings &rarr; Personal access tokens, edit your token &rarr; <strong>Repository permissions</strong> &rarr; set <strong>Contents</strong> to <strong>Read and write</strong>.' :
            '<strong>Fix for Classic Token:</strong> Make sure the master <strong>repo</strong> checkbox is checked in your GitHub token scopes.'
          }
        </div>
        <div style="margin-top:0.5rem;">
          <a href="https://github.com/settings/tokens/new?description=Mercer+Chiefs+Portal+Admin&scopes=repo,workflow" target="_blank" style="color:var(--chiefs-gold); font-weight:700; text-decoration:underline;">
            Click here to generate a pre-configured Classic Token (1-click) &rarr;
          </a>
        </div>
      </div>`;
    } else {
      html += `<div style="margin-top:0.5rem; color:#4ade80;">
        ✓ Token verified! You have full permissions to publish website content, section visibility, photos, and club logos to the live site.
      </div>`;
    }
    html += `</div>`;

    if (feedback) feedback.innerHTML = html;

    if (badge) {
      if (contentsOk) {
        badge.textContent = '● Verified & Active';
        badge.style.color = '#4ade80';
        badge.style.background = 'rgba(34, 197, 94, 0.15)';
        badge.style.borderColor = 'rgba(34, 197, 94, 0.35)';
      } else {
        badge.textContent = '⚠️ Missing Contents Permission';
        badge.style.color = '#f87171';
        badge.style.background = 'rgba(239, 68, 68, 0.15)';
        badge.style.borderColor = 'rgba(239, 68, 68, 0.35)';
      }
    }

    return { ok: contentsOk, contentsOk, workflowOk: workflowStatus === 'ok' };
  } catch (err) {
    if (feedback) {
      feedback.innerHTML = `<span style="color:#f87171">Network error verifying token: ${err.message}</span>`;
    }
    return { ok: false, error: err.message };
  } finally {
    if (testBtn) {
      testBtn.disabled = false;
      testBtn.textContent = '🧪 Test Permissions';
    }
  }
};

window.saveGitHubConfig = async function () {
  const input = document.getElementById('cfg-github-token');
  const token = (input ? input.value : '').trim();

  if (!token) {
    const feedback = document.getElementById('github-token-feedback');
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.color = '#f87171';
      feedback.textContent = 'Please paste a GitHub Personal Access Token or click Clear.';
    }
    showToast("Please enter a GitHub Personal Access Token.", "error");
    return;
  }

  localStorage.setItem('mercer_github_token', token);
  showToast("Token saved! Running diagnostic check...");
  await window.testGitHubToken(token);
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

window.openTokenPermissionModal = function () {
  const modal = document.getElementById('token-permission-modal');
  if (modal) {
    modal.classList.add('active');
    const input = document.getElementById('modal-input-github-token');
    const existing = localStorage.getItem('mercer_github_token') || '';
    if (input && existing) input.value = existing;
    const fb = document.getElementById('modal-token-feedback');
    if (fb) fb.style.display = 'none';
  }
};

window.closeTokenPermissionModal = function () {
  const modal = document.getElementById('token-permission-modal');
  if (modal) {
    modal.classList.remove('active');
  }
};

window.saveAndRetryPublishFromModal = async function () {
  const input = document.getElementById('modal-input-github-token');
  const token = (input ? input.value : '').trim();
  const fb = document.getElementById('modal-token-feedback');

  if (!token) {
    if (fb) {
      fb.style.display = 'block';
      fb.innerHTML = '<span style="color:#f87171">⚠️ Please paste your updated token.</span>';
    }
    return;
  }

  if (fb) {
    fb.style.display = 'block';
    fb.innerHTML = '<span style="color:var(--chiefs-gold)">⏳ Verifying token permissions on GitHub...</span>';
  }

  const result = await window.testGitHubToken(token);
  if (!result.contentsOk) {
    if (fb) {
      fb.style.display = 'block';
      fb.innerHTML = '<span style="color:#f87171">❌ This token is still missing "Contents: Read & write" permission. Please verify GitHub settings.</span>';
    }
    return;
  }

  localStorage.setItem('mercer_github_token', token);
  const cfgInput = document.getElementById('cfg-github-token');
  if (cfgInput) cfgInput.value = token;
  initGitHubConfigUI();

  if (fb) {
    fb.innerHTML = '<span style="color:#4ade80">✓ Token verified! Publishing to live site now...</span>';
  }

  setTimeout(async () => {
    window.closeTokenPermissionModal();
    await window.publishSiteContent();
  }, 600);
};

window.exportSiteContentJson = function () {
  try {
    const content = (typeof window.collectSiteContentFromUI === 'function') ? window.collectSiteContentFromUI() : null;
    let jsonString = '';
    if (content) {
      jsonString = JSON.stringify(content, null, 2);
    } else {
      jsonString = localStorage.getItem('mercer_site_content') || '{}';
    }
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `site-content-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ Downloaded local backup of site-content.json');
  } catch (e) {
    showToast(`Export failed: ${e.message}`, 'error');
  }
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
      feedback.textContent = 'A GitHub Access Token is required to publish updates and trigger cloud syncs.';
    }
    document.getElementById('cfg-github-token')?.focus();
    log(`[NOTE] Please paste your GitHub Access Token above and click 'Save Token'.`);
    log(`[INFO] Your token enables live website publishing and 1-click game schedule syncs.`);
    showToast('Please enter your GitHub Access Token above to authorize live publishing.');
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
                  const botName = typeof window.getActiveClubShortName === 'function' ? window.getActiveClubShortName() : 'Club';
                  log(`[PAGES] ${botName} Bot committed updated feeds. Live site is deploying.`);
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
    const shortName = typeof window.getActiveClubShortName === 'function' ? window.getActiveClubShortName() : 'Club';
    consoleEl.textContent = `[CLEARED] ${shortName} Data Engine ready for new sync activity.`;
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

  const hubJuniorEl = document.getElementById('toggle-hub-junior');
  if (hubJuniorEl) hubJuniorEl.checked = adminState.juniorHubVisible !== false;
  const hubYouthEl = document.getElementById('toggle-hub-youth');
  if (hubYouthEl) hubYouthEl.checked = adminState.youthHubVisible !== false;
}

function getStoredSectionVisibility() {
  try {
    const raw = localStorage.getItem('mercer_section_visibility');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

function saveStoredSectionVisibility(vis) {
  try {
    localStorage.setItem('mercer_section_visibility', JSON.stringify(vis));
  } catch (e) {}
}
window.getStoredSectionVisibility = getStoredSectionVisibility;
window.saveStoredSectionVisibility = saveStoredSectionVisibility;

window.toggleJuniorHubVisibility = function (isVisible) {
  adminState.juniorHubVisible = !!isVisible;
  localStorage.setItem('mercer_junior_hub_visible', String(adminState.juniorHubVisible));

  const quickEl = document.getElementById('cms-quick-junior');
  if (quickEl && quickEl.checked !== adminState.juniorHubVisible) {
    quickEl.checked = adminState.juniorHubVisible;
  }
  const hubEl = document.getElementById('toggle-hub-junior');
  if (hubEl && hubEl.checked !== adminState.juniorHubVisible) {
    hubEl.checked = adminState.juniorHubVisible;
  }

  const vis = getStoredSectionVisibility();
  vis.juniorHub = adminState.juniorHubVisible;
  saveStoredSectionVisibility(vis);

  try {
    let p = {};
    const raw = localStorage.getItem('mercer_site_content');
    if (raw) p = JSON.parse(raw);
    if (!p.juniorHub) p.juniorHub = {};
    p.juniorHub.enabled = adminState.juniorHubVisible;
    if (!p.sections) p.sections = {};
    p.sections.juniorHub = adminState.juniorHubVisible;
    localStorage.setItem('mercer_site_content', JSON.stringify(p));
  } catch (e) {}

  localStorage.setItem('mercer_visibility_updated_ts', Date.now().toString());
  try {
    const bc = new BroadcastChannel('mercer_visibility_channel');
    bc.postMessage({ type: 'visibility_change' });
  } catch (e) {}

  window.dispatchEvent(new Event('storage'));
  showToast(isVisible ? 'Junior Hub is now visible on the website.' : 'Junior Hub is now hidden from the website.');
};

window.toggleYouthHubVisibility = function (isVisible) {
  adminState.youthHubVisible = !!isVisible;
  localStorage.setItem('mercer_youth_hub_visible', String(adminState.youthHubVisible));

  const quickEl = document.getElementById('cms-quick-youth');
  if (quickEl && quickEl.checked !== adminState.youthHubVisible) {
    quickEl.checked = adminState.youthHubVisible;
  }
  const hubEl = document.getElementById('toggle-hub-youth');
  if (hubEl && hubEl.checked !== adminState.youthHubVisible) {
    hubEl.checked = adminState.youthHubVisible;
  }

  const vis = getStoredSectionVisibility();
  vis.youthHub = adminState.youthHubVisible;
  saveStoredSectionVisibility(vis);

  try {
    let p = {};
    const raw = localStorage.getItem('mercer_site_content');
    if (raw) p = JSON.parse(raw);
    if (!p.youthHub) p.youthHub = {};
    p.youthHub.enabled = adminState.youthHubVisible;
    if (!p.sections) p.sections = {};
    p.sections.youthHub = adminState.youthHubVisible;
    localStorage.setItem('mercer_site_content', JSON.stringify(p));
  } catch (e) {}

  localStorage.setItem('mercer_visibility_updated_ts', Date.now().toString());
  try {
    const bc = new BroadcastChannel('mercer_visibility_channel');
    bc.postMessage({ type: 'visibility_change' });
  } catch (e) {}

  window.dispatchEvent(new Event('storage'));
  showToast(isVisible ? 'Youth Hub is now visible on the website.' : 'Youth Hub is now hidden from the website.');
};

window.syncSectionVisibilityToggles = function (sourceId, isChecked) {
  isChecked = !!isChecked;
  const mapping = {
    'cms-quick-ticker': 'cms-ticker-enabled',
    'cms-quick-hero': 'cms-hero-enabled',
    'cms-quick-junior': 'toggle-hub-junior',
    'cms-quick-youth': 'toggle-hub-youth',
    'cms-quick-tryouts': 'cms-tryouts-enabled',
    'cms-quick-camps': 'cms-camps-enabled',
    'cms-quick-video': 'cms-video-enabled',
    'cms-quick-arena': 'cms-arena-enabled',
    'cms-quick-news': 'cms-news-enabled',

    'cms-hero-enabled': 'cms-quick-hero',
    'cms-tryouts-enabled': 'cms-quick-tryouts',
    'cms-camps-enabled': 'cms-quick-camps',
    'cms-video-enabled': 'cms-quick-video',
    'cms-arena-enabled': 'cms-quick-arena',
    'toggle-hub-junior': 'cms-quick-junior',
    'toggle-hub-youth': 'cms-quick-youth'
  };

  const targetId = mapping[sourceId];
  if (targetId) {
    const targetEl = document.getElementById(targetId);
    if (targetEl && targetEl.checked !== isChecked) {
      targetEl.checked = isChecked;
    }
  }

  // Determine section key
  let sectionKey = null;
  let labelName = 'Section';
  if (sourceId.includes('ticker')) { sectionKey = 'ticker'; labelName = 'Scores Ticker Bar'; }
  else if (sourceId.includes('hero')) { sectionKey = 'hero'; labelName = 'Hero Showcase'; }
  else if (sourceId.includes('junior')) { sectionKey = 'juniorHub'; labelName = 'Junior Hockey Hub'; }
  else if (sourceId.includes('youth')) { sectionKey = 'youthHub'; labelName = 'Youth Hockey Hub'; }
  else if (sourceId.includes('tryouts')) { sectionKey = 'tryouts'; labelName = 'Tryouts / Evaluations'; }
  else if (sourceId.includes('camps')) { sectionKey = 'camps'; labelName = 'Camps & Clinics'; }
  else if (sourceId.includes('video')) { sectionKey = 'video'; labelName = 'Program Video'; }
  else if (sourceId.includes('arena')) { sectionKey = 'arena'; labelName = (typeof cmsRinksList !== 'undefined' && cmsRinksList.length > 1 ? 'Home Rinks' : 'Home Rink'); }
  else if (sourceId.includes('news')) { sectionKey = 'news'; labelName = 'News & Updates'; }

  if (sectionKey) {
    const vis = getStoredSectionVisibility();
    vis[sectionKey] = isChecked;
    saveStoredSectionVisibility(vis);
  }

  if (sourceId.includes('junior')) {
    adminState.juniorHubVisible = isChecked;
    localStorage.setItem('mercer_junior_hub_visible', String(isChecked));
    const hubEl = document.getElementById('toggle-hub-junior');
    if (hubEl && hubEl.checked !== isChecked) hubEl.checked = isChecked;
    const quickEl = document.getElementById('cms-quick-junior');
    if (quickEl && quickEl.checked !== isChecked) quickEl.checked = isChecked;
  } else if (sourceId.includes('youth')) {
    adminState.youthHubVisible = isChecked;
    localStorage.setItem('mercer_youth_hub_visible', String(isChecked));
    const hubEl = document.getElementById('toggle-hub-youth');
    if (hubEl && hubEl.checked !== isChecked) hubEl.checked = isChecked;
    const quickEl = document.getElementById('cms-quick-youth');
    if (quickEl && quickEl.checked !== isChecked) quickEl.checked = isChecked;
  }

  // Update mercer_site_content in localStorage
  try {
    let p = {};
    const raw = localStorage.getItem('mercer_site_content');
    if (raw) {
      p = JSON.parse(raw);
    }
    if (!p.sections) p.sections = {};
    if (sectionKey) {
      p.sections[sectionKey] = isChecked;
      if (sectionKey === 'hero') { if (!p.hero) p.hero = {}; p.hero.enabled = isChecked; }
      else if (sectionKey === 'juniorHub') { if (!p.juniorHub) p.juniorHub = {}; p.juniorHub.enabled = isChecked; }
      else if (sectionKey === 'youthHub') { if (!p.youthHub) p.youthHub = {}; p.youthHub.enabled = isChecked; }
      else if (sectionKey === 'tryouts') { if (!p.tryouts) p.tryouts = {}; p.tryouts.enabled = isChecked; }
      else if (sectionKey === 'camps') { if (!p.camps) p.camps = {}; p.camps.enabled = isChecked; }
      else if (sectionKey === 'video') { if (!p.program) p.program = {}; p.program.enabled = isChecked; }
      else if (sectionKey === 'arena') { if (!p.arena) p.arena = {}; p.arena.enabled = isChecked; }
      else if (sectionKey === 'news') { if (!p.news) p.news = {}; p.news.enabled = isChecked; }
      else if (sectionKey === 'ticker') { if (!p.ticker) p.ticker = {}; p.ticker.enabled = isChecked; }
      localStorage.setItem('mercer_site_content', JSON.stringify(p));
    }
  } catch (e) {}

  localStorage.setItem('mercer_visibility_updated_ts', Date.now().toString());
  try {
    const bc = new BroadcastChannel('mercer_visibility_channel');
    bc.postMessage({ type: 'visibility_change' });
  } catch (e) {}

  window.dispatchEvent(new Event('storage'));
  showToast(`${labelName} is now ${isChecked ? 'visible on' : 'hidden from'} the website.`);
};


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

  try {
    const bc = new BroadcastChannel('mercer_visibility_channel');
    bc.postMessage({ type: 'visibility_change' });
  } catch (e) {}

  // Cross-tab broadcast
  window.dispatchEvent(new Event('storage'));
};

window.toggleTierTeams = function (tierType, isVisible) {
  const isChecked = !!isVisible;
  let targetIds = [];
  let tierLabel = '';

  if (tierType === 'thf') {
    targetIds = adminState.youthTeams
      .filter(t => t.leagueId === 5 || (t.league && t.league.includes('THF')) || (t.tier && /\bTier (I|1)\b/i.test(t.tier) && !t.tier.includes('Tier II')))
      .map(t => t.id);
    tierLabel = 'Tier I AAA (THF)';
  } else if (tierType === 'ahf') {
    targetIds = adminState.youthTeams
      .filter(t => t.leagueId === 4 || (t.league && t.league.includes('AHF')) || (t.tier && t.tier.includes('Tier II')))
      .map(t => t.id);
    tierLabel = 'Tier II (AHF)';
  } else if (tierType === 'junior') {
    targetIds = ['ncdc', 'premier'];
    tierLabel = 'Junior';
  }

  if (isChecked) {
    adminState.hiddenTeams = adminState.hiddenTeams.filter(id => !targetIds.includes(id));
  } else {
    targetIds.forEach(id => {
      if (!adminState.hiddenTeams.includes(id)) {
        adminState.hiddenTeams.push(id);
      }
    });
  }

  localStorage.setItem('mercer_hidden_teams', JSON.stringify(adminState.hiddenTeams));
  renderTeamToggles();
  showToast(`${tierLabel} teams are now ${isChecked ? 'visible' : 'hidden'} on the website.`);

  try {
    const bc = new BroadcastChannel('mercer_visibility_channel');
    bc.postMessage({ type: 'visibility_change' });
  } catch (e) {}

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

  try {
    const bc = new BroadcastChannel('mercer_visibility_channel');
    bc.postMessage({ type: 'visibility_change' });
  } catch (e) {}

  window.dispatchEvent(new Event('storage'));
};

window.resetTeamVisibility = function () {
  adminState.hiddenTeams = [];
  localStorage.removeItem('mercer_hidden_teams');
  renderTeamToggles();
  showToast('Team visibility reset to defaults (all teams visible).');

  try {
    const bc = new BroadcastChannel('mercer_visibility_channel');
    bc.postMessage({ type: 'visibility_change' });
  } catch (e) {}

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

    const newContent = JSON.stringify({
      seasonLabel: '2026/27',
      juniorHubVisible: adminState.juniorHubVisible !== false,
      youthHubVisible: adminState.youthHubVisible !== false,
      hiddenTeams
    }, null, 2);
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
    const isInstagram = art.source === 'instagram';
    const isFacebook = art.source === 'facebook';

    return `
    <div class="news-manage-card">
      <div style="position: relative; height: 160px; overflow: hidden; background: #08090C;">
        <img src="${art.image || 'assets/images/hero-action.jpg'}" alt="${art.title}" class="news-manage-img" style="height: 100%; object-fit: cover;" onerror="this.src='assets/images/hero-action.jpg'">
        <div style="position: absolute; top: 0.6rem; left: 0.6rem; display: flex; gap: 0.35rem; flex-wrap: wrap;">
          <span class="pill-badge" style="background: rgba(189, 50, 59, 0.85); border-color: rgba(189, 50, 59, 0.35); color: #fff; font-size: 0.7rem; font-weight: 700;">
            ${art.category}
          </span>
          ${isInstagram ? `
            <span class="pill-badge" style="background: linear-gradient(135deg, #f09433, #dc2743, #bc1888); border: none; color: #fff; font-size: 0.68rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
              <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              ${art.account || 'Instagram Post'}
            </span>
          ` : isFacebook ? `
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
            <a href="${art.link}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size: 0.78rem; padding: 0.4rem 0.6rem; color: ${isInstagram ? '#f472b6' : '#93c5fd'}; border-color: ${isInstagram ? 'rgba(220, 39, 67, 0.4)' : 'rgba(24, 119, 242, 0.4)'};" title="${isInstagram ? 'Open on Instagram' : 'Open Link'}">
              ${isInstagram ? '📸' : '🔗'}
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

window.handleArticleSourceChange = function (val) {
  const accountGroup = document.getElementById('group-article-account');
  if (accountGroup) {
    accountGroup.style.display = (val === 'instagram') ? 'block' : 'none';
  }
};

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
  const accountGroup = document.getElementById('group-article-account');
  const accountField = document.getElementById('form-article-account');

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
      if (accountField) accountField.value = art.account || '@mercerchiefshockey';
      if (accountGroup) accountGroup.style.display = (art.source === 'instagram') ? 'block' : 'none';
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
    if (accountField) accountField.value = "@mercerchiefshockey";
    if (accountGroup) accountGroup.style.display = "none";
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
  const account = document.getElementById('form-article-account')?.value.trim();

  if (!title || !summary) {
    alert("Please fill in all required fields.");
    return;
  }

  const postAccount = source === 'instagram' ? (account || '@mercerchiefshockey') : undefined;

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
        source: source || adminState.newsArticles[idx].source || 'manual',
        account: postAccount || adminState.newsArticles[idx].account
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
      source: source || 'manual',
      account: postAccount
    };
    adminState.newsArticles.unshift(newArt);
    showToast("New article published to homepage!");
  }

  localStorage.setItem('mercer_club_news', JSON.stringify(adminState.newsArticles));
  window.closeArticleModal();
  renderNewsList();

  // Broadcast cross-tab update
  window.dispatchEvent(new Event('storage'));

  // Sync to CMS state and publish live to GitHub
  if (typeof cmsContentState !== 'undefined' && cmsContentState) {
    cmsContentState.newsArticles = adminState.newsArticles;
  }
  try {
    const scRaw = localStorage.getItem('mercer_site_content');
    if (scRaw) {
      const sc = JSON.parse(scRaw);
      sc.newsArticles = adminState.newsArticles;
      localStorage.setItem('mercer_site_content', JSON.stringify(sc));
    }
  } catch (err) {}

  showToast("Article saved! Publishing live to website...");
  if (typeof window.publishSiteContent === 'function') {
    window.publishSiteContent();
  }
};

window.deleteArticle = function (articleId) {
  if (!confirm("Are you sure you want to remove this article from the homepage?")) return;
  adminState.newsArticles = adminState.newsArticles.filter(a => a.id !== articleId);
  localStorage.setItem('mercer_club_news', JSON.stringify(adminState.newsArticles));
  renderNewsList();
  window.dispatchEvent(new Event('storage'));

  if (typeof cmsContentState !== 'undefined' && cmsContentState) {
    cmsContentState.newsArticles = adminState.newsArticles;
  }
  try {
    const scRaw = localStorage.getItem('mercer_site_content');
    if (scRaw) {
      const sc = JSON.parse(scRaw);
      sc.newsArticles = adminState.newsArticles;
      localStorage.setItem('mercer_site_content', JSON.stringify(sc));
    }
  } catch (err) {}

  showToast("Article removed. Publishing live updates...");
  if (typeof window.publishSiteContent === 'function') {
    window.publishSiteContent();
  }
};

window.resetNewsArticles = function () {
  if (!confirm("Reset all news articles to default club releases?")) return;
  adminState.newsArticles = [...CLUB_NEWS];
  localStorage.setItem('mercer_club_news', JSON.stringify(adminState.newsArticles));
  renderNewsList();
  showToast("News reset to default club releases.");
  window.dispatchEvent(new Event('storage'));
};

/* ==========================================================================
   INSTAGRAM MULTI-ACCOUNT CONFIGURATION & SYNC
   ========================================================================== */
function initInstagramConfigUI() {
  const cfg = adminState.igConfig || getStoredInstagramConfig();
  const summaryEl = document.getElementById('ig-linked-accounts-summary');
  const badgeEl = document.getElementById('ig-token-badge');
  const tokenInput = document.getElementById('cfg-ig-access-token');

  if (tokenInput) tokenInput.value = cfg.accessToken || '';

  const activeAccounts = (cfg.accounts || []).filter(a => a.enabled !== false);

  if (summaryEl) {
    if (activeAccounts.length === 0) {
      summaryEl.textContent = "No accounts enabled (0 active)";
    } else if (activeAccounts.length === 1) {
      summaryEl.textContent = `@${activeAccounts[0].handle} (${activeAccounts[0].label})`;
    } else {
      const handles = activeAccounts.map(a => '@' + a.handle).join(', ');
      summaryEl.textContent = `${activeAccounts.length} Accounts (${handles})`;
    }
  }

  if (badgeEl) {
    if (cfg.accessToken && cfg.accessToken.trim()) {
      badgeEl.textContent = "Live Meta Graph API Active";
      badgeEl.style.background = "rgba(34, 197, 94, 0.15)";
      badgeEl.style.color = "#4ade80";
      badgeEl.style.borderColor = "rgba(34, 197, 94, 0.35)";
    } else {
      badgeEl.textContent = `Multi-Account Sync Active (${activeAccounts.length})`;
      badgeEl.style.background = "rgba(220, 39, 67, 0.15)";
      badgeEl.style.color = "#fca5a5";
      badgeEl.style.borderColor = "rgba(220, 39, 67, 0.35)";
    }
  }

  renderInstagramAccountsList();
  populateInstagramAccountDropdown();
}

function renderInstagramAccountsList() {
  const container = document.getElementById('ig-accounts-list');
  if (!container) return;

  const cfg = adminState.igConfig || getStoredInstagramConfig();
  const accounts = cfg.accounts || [];

  if (accounts.length === 0) {
    container.innerHTML = `
      <div style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem; text-align: center; border: 1px dashed var(--border-subtle); border-radius: var(--radius-sm);">
        No Instagram accounts configured. Add one below to start syncing.
      </div>
    `;
    return;
  }

  container.innerHTML = accounts.map((acc, idx) => {
    const isEnabled = acc.enabled !== false;
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid ${isEnabled ? 'rgba(220, 39, 67, 0.3)' : 'var(--border-subtle)'}; border-radius: var(--radius-sm); padding: 0.5rem 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <div style="width: 28px; height: 28px; border-radius: 50%; background: ${isEnabled ? 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)' : 'rgba(255,255,255,0.1)'}; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: #fff;">
            @
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <strong style="font-size: 0.82rem; color: #fff;">@${acc.handle}</strong>
              <span class="pill-badge" style="font-size: 0.66rem; padding: 0.1rem 0.45rem; background: rgba(189, 50, 59, 0.3); border-color: rgba(189, 50, 59, 0.5); color: #fca5a5;">
                ${acc.category || 'Club News'}
              </span>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${acc.label || 'Instagram Profile'}</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <label style="display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.74rem; cursor: pointer; color: ${isEnabled ? '#4ade80' : 'var(--text-muted)'};">
            <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="window.toggleInstagramAccount('${acc.handle}')">
            <span>${isEnabled ? 'Sync Active' : 'Paused'}</span>
          </label>
          <a href="https://www.instagram.com/${acc.handle}/" target="_blank" rel="noopener noreferrer"
            class="btn-secondary" style="font-size: 0.72rem; padding: 0.25rem 0.5rem; color: #f472b6;" title="Open Profile">
            ↗
          </a>
          <button type="button" class="btn-secondary" style="font-size: 0.72rem; padding: 0.25rem 0.5rem; color: #f87171;"
            onclick="window.removeInstagramAccount('${acc.handle}')" title="Remove Account">
            ✕
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function populateInstagramAccountDropdown() {
  const select = document.getElementById('ig-import-account');
  if (!select) return;

  const cfg = adminState.igConfig || getStoredInstagramConfig();
  const accounts = cfg.accounts || [];

  if (accounts.length === 0) {
    select.innerHTML = `<option value="@mercerchiefshockey">@mercerchiefshockey (Official Club)</option>`;
    return;
  }

  select.innerHTML = accounts.map(a => `
    <option value="@${a.handle}">@${a.handle} (${a.label || a.category || 'Feed'})</option>
  `).join('');
}

window.toggleInstagramSettings = function () {
  const panel = document.getElementById('ig-api-settings-panel');
  if (!panel) return;
  const isHidden = panel.style.display === 'none' || !panel.style.display;
  panel.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    initInstagramConfigUI();
  }
};

window.addInstagramAccount = function () {
  const handleInput = document.getElementById('new-ig-handle');
  const labelInput = document.getElementById('new-ig-label');
  const catInput = document.getElementById('new-ig-category');

  let handle = (handleInput ? handleInput.value : '').trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  const label = (labelInput ? labelInput.value : '').trim();
  const category = (catInput ? catInput.value : 'Club News');

  if (!handle) {
    showToast("Please enter an Instagram handle.", "error");
    return;
  }

  if (!adminState.igConfig) adminState.igConfig = getStoredInstagramConfig();
  if (!Array.isArray(adminState.igConfig.accounts)) adminState.igConfig.accounts = [];

  const exists = adminState.igConfig.accounts.some(a => a.handle.toLowerCase() === handle);
  if (exists) {
    showToast(`@${handle} is already linked.`, "info");
    return;
  }

  adminState.igConfig.accounts.push({
    handle,
    label: label || `Mercer Chiefs (@${handle})`,
    category,
    enabled: true
  });

  localStorage.setItem('mercer_instagram_config', JSON.stringify(adminState.igConfig));
  if (typeof cmsContentState !== 'undefined' && cmsContentState) {
    cmsContentState.instagramAccounts = adminState.igConfig.accounts;
  }
  try {
    const raw = localStorage.getItem('mercer_site_content');
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.instagramAccounts = adminState.igConfig.accounts;
      localStorage.setItem('mercer_site_content', JSON.stringify(parsed));
    }
  } catch (e) {}

  if (handleInput) handleInput.value = '';
  if (labelInput) labelInput.value = '';

  initInstagramConfigUI();
  showToast(`Added @${handle}. Click "Publish Accounts to Live Site" to share with all admins.`);
};

window.removeInstagramAccount = function (handle) {
  if (!confirm(`Are you sure you want to unlink @${handle} from website sync?`)) return;
  if (!adminState.igConfig) adminState.igConfig = getStoredInstagramConfig();
  
  adminState.igConfig.accounts = (adminState.igConfig.accounts || []).filter(a => a.handle.toLowerCase() !== handle.toLowerCase());
  localStorage.setItem('mercer_instagram_config', JSON.stringify(adminState.igConfig));
  if (typeof cmsContentState !== 'undefined' && cmsContentState) {
    cmsContentState.instagramAccounts = adminState.igConfig.accounts;
  }
  try {
    const raw = localStorage.getItem('mercer_site_content');
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.instagramAccounts = adminState.igConfig.accounts;
      localStorage.setItem('mercer_site_content', JSON.stringify(parsed));
    }
  } catch (e) {}

  initInstagramConfigUI();
  showToast(`Removed @${handle}. Click "Publish Accounts to Live Site" to update all admins.`);
};

window.toggleInstagramAccount = function (handle) {
  if (!adminState.igConfig) adminState.igConfig = getStoredInstagramConfig();
  const acc = (adminState.igConfig.accounts || []).find(a => a.handle.toLowerCase() === handle.toLowerCase());
  if (acc) {
    acc.enabled = !acc.enabled;
    localStorage.setItem('mercer_instagram_config', JSON.stringify(adminState.igConfig));
    if (typeof cmsContentState !== 'undefined' && cmsContentState) {
      cmsContentState.instagramAccounts = adminState.igConfig.accounts;
    }
    try {
      const raw = localStorage.getItem('mercer_site_content');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.instagramAccounts = adminState.igConfig.accounts;
        localStorage.setItem('mercer_site_content', JSON.stringify(parsed));
      }
    } catch (e) {}

    initInstagramConfigUI();
    showToast(`@${handle} sync ${acc.enabled ? 'activated' : 'paused'}. Click "Publish Accounts to Live Site" to sync with all admins.`);
  }
};

window.saveInstagramApiConfig = async function () {
  const tokenInput = document.getElementById('cfg-ig-access-token');
  const feedback = document.getElementById('ig-token-test-feedback');
  const token = (tokenInput ? tokenInput.value : '').trim();

  if (!token) {
    showToast("Please enter a Meta / Instagram Token or click Clear.", "error");
    return;
  }

  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.color = '#fbcfe8';
    feedback.textContent = 'Verifying token with Meta Graph API...';
  }

  try {
    const testUrl = `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`;
    const resp = await fetch(testUrl);
    const data = await resp.json();

    if (resp.ok && data.id) {
      if (!adminState.igConfig) adminState.igConfig = getStoredInstagramConfig();
      adminState.igConfig.accessToken = token;
      localStorage.setItem('mercer_instagram_config', JSON.stringify(adminState.igConfig));
      initInstagramConfigUI();
      if (feedback) {
        feedback.style.color = '#4ade80';
        feedback.innerHTML = `✓ Verified! Connected to Meta Account: <strong>${data.name || 'User'}</strong> (ID: ${data.id}). Token saved.`;
      }
      showToast("Instagram Meta API token saved successfully!");
    } else {
      const errMsg = data.error?.message || "Token verification failed. Please check permissions.";
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

window.clearInstagramApiConfig = function () {
  if (!adminState.igConfig) adminState.igConfig = getStoredInstagramConfig();
  adminState.igConfig.accessToken = '';
  localStorage.setItem('mercer_instagram_config', JSON.stringify(adminState.igConfig));
  initInstagramConfigUI();
  const feedback = document.getElementById('ig-token-test-feedback');
  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.color = '#94a3b8';
    feedback.textContent = 'API token cleared. Portal returned to multi-account cached feed mode.';
  }
  showToast("Instagram API token cleared. Returned to cached feed mode.");
};

window.syncInstagramPosts = async function () {
  const btn = document.getElementById('btn-sync-instagram');
  const statusText = document.getElementById('ig-sync-status-text');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner" style="width: 14px; height: 14px; border-width: 2px; display: inline-block;"></span> <span>Pulling Instagram Posts...</span>`;
  }
  if (statusText) statusText.textContent = "Connecting to Instagram accounts...";

  try {
    const igConfig = adminState.igConfig || getStoredInstagramConfig();
    const enabledAccounts = (igConfig.accounts || []).filter(a => a.enabled !== false);

    if (enabledAccounts.length === 0) {
      showToast("No Instagram accounts are currently enabled. Enable at least one account in Settings.", "error");
      if (statusText) statusText.textContent = "Status: No accounts enabled";
      return;
    }

    let igPosts = [];
    let isLiveApi = false;

    // 0. Live Meta Graph API if access token configured
    if (igConfig.accessToken && igConfig.accessToken.trim()) {
      if (statusText) statusText.textContent = "Querying live Meta Graph API...";
      try {
        const token = igConfig.accessToken.trim();
        for (const acc of enabledAccounts) {
          const graphUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(acc.handle)}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=8&access_token=${encodeURIComponent(token)}`;
          const resp = await fetch(graphUrl);
          if (resp.ok) {
            const json = await resp.json();
            if (json.data && Array.isArray(json.data)) {
              const mapped = json.data.map(item => {
                const cap = item.caption || '';
                const firstLine = cap.split('\n')[0].replace(/^[#\s]+/, '').trim();
                let title = firstLine.length > 5 && firstLine.length <= 80 ? firstLine : (firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : `Mercer Chiefs Update (@${acc.handle})`);
                
                const upperCap = cap.toUpperCase();
                let category = acc.category || 'Club News';
                if (upperCap.includes('NCDC')) category = 'NCDC Junior';
                else if (upperCap.includes('PREMIER') || upperCap.includes('USPHL')) category = 'USPHL Premier';
                else if (/\b(18U|16U|15U|14U|13U|12U|10U|YOUTH|AAA)\b/i.test(cap)) category = 'Youth AAA';

                const postDate = new Date(item.timestamp).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                });

                return {
                  id: `ig-${item.id}`,
                  title,
                  date: postDate,
                  category,
                  readTime: '2 min read',
                  summary: cap.length > 220 ? cap.slice(0, 217) + '...' : (cap || 'Click to view post on Instagram.'),
                  image: item.media_url || item.thumbnail_url || 'assets/images/hero-action.jpg',
                  source: 'instagram',
                  account: `@${acc.handle}`,
                  sourceUrl: item.permalink || `https://www.instagram.com/${acc.handle}/`,
                  link: item.permalink || `https://www.instagram.com/${acc.handle}/`,
                  credit: cap.toLowerCase().includes('heather') ? "Heather O'Connell Photography" : "Mercer Chiefs Media"
                };
              });
              igPosts.push(...mapped);
              isLiveApi = true;
            }
          }
        }
      } catch (graphErr) {
        console.warn("Meta Graph API network call failed for Instagram:", graphErr);
      }
    }

    // 1. Fallback to Vite dev server endpoint
    if (igPosts.length === 0) {
      try {
        const resp = await fetch('/api/sync-instagram');
        if (resp.ok) {
          const json = await resp.json();
          if (json.success && Array.isArray(json.posts) && json.posts.length > 0) {
            igPosts = json.posts;
          }
        }
      } catch (err) {
        console.warn("/api/sync-instagram call failed, trying direct file:", err);
      }
    }

    // 2. Fallback to static instagram-feed.json file
    if (igPosts.length === 0) {
      try {
        const resp2 = await fetch('data/instagram-feed.json?t=' + Date.now());
        if (resp2.ok) {
          const json2 = await resp2.json();
          if (json2.posts && Array.isArray(json2.posts) && json2.posts.length > 0) {
            igPosts = json2.posts;
          }
        }
      } catch (err2) {
        console.warn("Static json fetch for instagram feed failed:", err2);
      }
    }

    if (igPosts.length === 0) {
      showToast("No Instagram posts available to sync.", "error");
      if (statusText) statusText.textContent = "Status: No posts found";
      return;
    }

    // Filter posts for accounts that are enabled
    const activeHandleSet = new Set(enabledAccounts.map(a => a.handle.toLowerCase()));
    const filteredPosts = igPosts.filter(p => {
      if (!p.account) return true;
      const cleanAcc = p.account.replace(/^@/, '').toLowerCase();
      return activeHandleSet.has(cleanAcc);
    });

    const postsToMerge = filteredPosts.length > 0 ? filteredPosts : igPosts;

    let addedCount = 0;
    let updatedCount = 0;

    for (let i = postsToMerge.length - 1; i >= 0; i--) {
      const post = postsToMerge[i];
      const normTitle = (post.title || '').toLowerCase().trim();
      const existingIdx = adminState.newsArticles.findIndex(a =>
        a.id === post.id || (a.title && a.title.toLowerCase().trim() === normTitle)
      );

      if (existingIdx !== -1) {
        adminState.newsArticles[existingIdx] = {
          ...adminState.newsArticles[existingIdx],
          ...post
        };
        updatedCount++;
      } else {
        adminState.newsArticles.unshift(post);
        addedCount++;
      }
    }

    // Sort descending by date
    adminState.newsArticles.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    localStorage.setItem('mercer_club_news', JSON.stringify(adminState.newsArticles));
    renderNewsList();
    window.dispatchEvent(new Event('storage'));

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (statusText) {
      statusText.textContent = isLiveApi ?
        `Status: Live Meta API Synced (${postsToMerge.length} posts at ${timeStr})` :
        `Status: Synced ${postsToMerge.length} posts across ${enabledAccounts.length} accounts (${timeStr})`;
    }

    if (isLiveApi) {
      showToast(`Live Instagram Sync: Pulled ${postsToMerge.length} posts across official channels!`);
    } else if (addedCount > 0) {
      showToast(`Successfully pulled ${addedCount} new Instagram post${addedCount > 1 ? 's' : ''}!`);
    } else if (updatedCount > 0) {
      showToast(`Refreshed ${updatedCount} Instagram posts across active accounts.`);
    } else {
      showToast(`Instagram feed is up to date (${postsToMerge.length} posts verified).`);
    }
  } catch (err) {
    console.error("Instagram sync error:", err);
    showToast("Failed to sync Instagram: " + err.message, "error");
    if (statusText) statusText.textContent = "Status: Sync error";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        <span>Pull Latest Instagram Posts</span>
      `;
    }
  }
};

/* ==========================================================================
   QUICK IMPORT INSTAGRAM POST BY URL
   ========================================================================== */
window.openInstagramImportModal = function () {
  const modal = document.getElementById('ig-import-modal');
  populateInstagramAccountDropdown();
  const dateInput = document.getElementById('ig-import-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  if (modal) modal.classList.add('active');
};

window.closeInstagramImportModal = function () {
  const modal = document.getElementById('ig-import-modal');
  if (modal) modal.classList.remove('active');
};

window.handleInstagramUrlChange = function (url) {
  if (!url) return;
  const titleInput = document.getElementById('ig-import-title');
  if (titleInput && !titleInput.value) {
    // Attempt to extract shortcode or default title
    const match = url.match(/\/p\/([a-zA-Z0-9_-]+)/);
    if (match) {
      titleInput.placeholder = "e.g. Mercer Chiefs Gameday Spotlight";
    }
  }
};

window.handleInstagramAccountSelect = function (accountHandle) {
  const catSelect = document.getElementById('ig-import-category');
  if (!catSelect) return;
  const cfg = adminState.igConfig || getStoredInstagramConfig();
  const clean = accountHandle.replace(/^@/, '').toLowerCase();
  const found = (cfg.accounts || []).find(a => a.handle.toLowerCase() === clean);
  if (found && found.category) {
    catSelect.value = found.category;
  }
};

window.saveImportedInstagramPost = function (e) {
  e.preventDefault();
  const url = document.getElementById('ig-import-url')?.value.trim();
  const account = document.getElementById('ig-import-account')?.value.trim() || '@mercerchiefshockey';
  const category = document.getElementById('ig-import-category')?.value || 'Club News';
  const title = document.getElementById('ig-import-title')?.value.trim();
  const date = document.getElementById('ig-import-date')?.value.trim() || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const credit = document.getElementById('ig-import-credit')?.value.trim() || 'Mercer Chiefs Media';
  const image = document.getElementById('ig-import-img')?.value.trim() || 'assets/images/news/fb_gameday_pal.jpg';
  const caption = document.getElementById('ig-import-caption')?.value.trim();

  if (!url || !title || !caption) {
    alert("Please fill in the Instagram URL, Title, and Caption.");
    return;
  }

  const newPost = {
    id: 'ig-' + Date.now(),
    title,
    category,
    date,
    readTime: '2 min read',
    summary: caption,
    image,
    source: 'instagram',
    account,
    sourceUrl: url,
    link: url,
    credit
  };

  adminState.newsArticles.unshift(newPost);
  localStorage.setItem('mercer_club_news', JSON.stringify(adminState.newsArticles));
  window.closeInstagramImportModal();
  renderNewsList();
  window.dispatchEvent(new Event('storage'));

  // Reset form
  const form = document.getElementById('ig-import-form');
  if (form) form.reset();

  if (typeof cmsContentState !== 'undefined' && cmsContentState) {
    cmsContentState.newsArticles = adminState.newsArticles;
  }
  try {
    const scRaw = localStorage.getItem('mercer_site_content');
    if (scRaw) {
      const sc = JSON.parse(scRaw);
      sc.newsArticles = adminState.newsArticles;
      localStorage.setItem('mercer_site_content', JSON.stringify(sc));
    }
  } catch (err) {}

  showToast(`Imported post from ${account}! Publishing live to website...`);
  if (typeof window.publishSiteContent === 'function') {
    window.publishSiteContent();
  }
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
  const clubShort = typeof window.getActiveClubShortName === 'function' ? window.getActiveClubShortName() : 'Club';
  showToast(`🎉 Rollover complete! ${clubShort} is now active for season ${newSeasonLabel}.`);
};

/* ==========================================================================
   8. BACKUP & EXPORT UTILITIES
   ========================================================================== */
window.exportJsonBackup = function () {
  // Capture current live CMS state (or fallback to cache)
  let currentSiteContent = null;
  try {
    if (typeof window.collectSiteContentFromUI === 'function') {
      currentSiteContent = window.collectSiteContentFromUI();
    }
  } catch (e) {}

  if (!currentSiteContent) {
    try {
      const cached = localStorage.getItem('mercer_site_content');
      if (cached) currentSiteContent = JSON.parse(cached);
    } catch (e) {}
  }

  if (!currentSiteContent && typeof cmsContentState !== 'undefined') {
    currentSiteContent = cmsContentState;
  }

  const payload = {
    backupVersion: '2.0',
    exportedAt: new Date().toISOString(),
    clubName: currentSiteContent?.branding?.clubName || 'Mercer Chiefs Hockey Club',
    siteContent: currentSiteContent,
    newsArticles: adminState.newsArticles,
    alumniCommitments: adminState.alumniCommitments,
    seasonConfig: adminState.seasonConfig,
    adminPasskeyHash: localStorage.getItem('mercer_admin_passkey_hash') || null,
    youthTeams: adminState.youthTeams,
    hiddenTeams: adminState.hiddenTeams,
    sectionVisibility: getStoredSectionVisibility(),
    juniorHubVisible: adminState.juniorHubVisible !== false,
    youthHubVisible: adminState.youthHubVisible !== false
  };

  const safeClub = (payload.clubName || 'club').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeClub}_full_backup_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Complete organization & website backup downloaded.");
};

window.importJsonBackup = function (fileInput) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid backup file format');
      }

      const dateMsg = data.exportedAt ? ` from ${data.exportedAt.split('T')[0]}` : '';
      if (!confirm(`Restore all settings, content, and data from backup${dateMsg}? This will overwrite your current draft edits.`)) {
        fileInput.value = '';
        return;
      }

      // 1. Site Content, Coaching Staff & Club Branding
      const siteContent = data.siteContent || (data.branding ? { ...data, branding: data.branding, staff: data.staff } : null);
      if (siteContent) {
        localStorage.setItem('mercer_site_content', JSON.stringify(siteContent));
        cmsContentState = siteContent;
        if (typeof populateSiteContentUI === 'function') {
          populateSiteContentUI(siteContent);
        }
        if (siteContent.branding && typeof populateBrandingUI === 'function') {
          populateBrandingUI(siteContent.branding);
        }
      }

      // 1b. Section Visibility Preferences
      if (data.sectionVisibility && typeof data.sectionVisibility === 'object') {
        saveStoredSectionVisibility(data.sectionVisibility);
      }
      if (data.juniorHubVisible !== undefined) {
        localStorage.setItem('mercer_junior_hub_visible', String(data.juniorHubVisible));
        adminState.juniorHubVisible = !!data.juniorHubVisible;
      }
      if (data.youthHubVisible !== undefined) {
        localStorage.setItem('mercer_youth_hub_visible', String(data.youthHubVisible));
        adminState.youthHubVisible = !!data.youthHubVisible;
      }

      // 2. News Articles
      if (Array.isArray(data.newsArticles)) {
        adminState.newsArticles = data.newsArticles;
        localStorage.setItem('mercer_club_news', JSON.stringify(data.newsArticles));
        renderNewsList();
      }

      // 3. Alumni Commitments
      if (Array.isArray(data.alumniCommitments)) {
        adminState.alumniCommitments = data.alumniCommitments;
        localStorage.setItem('mercer_alumni_commitments', JSON.stringify(data.alumniCommitments));
        renderAlumniTable();
      }

      // 4. Season Config & Teams
      if (data.seasonConfig) {
        adminState.seasonConfig = data.seasonConfig;
        localStorage.setItem('mercer_season_config', JSON.stringify(data.seasonConfig));
        initSeasonParameters();
      }
      if (Array.isArray(data.hiddenTeams)) {
        adminState.hiddenTeams = data.hiddenTeams;
        localStorage.setItem('mercer_hidden_teams', JSON.stringify(data.hiddenTeams));
        renderTeamToggles();
      }
      if (Array.isArray(data.youthTeams)) {
        adminState.youthTeams = data.youthTeams;
        localStorage.setItem('mercer_configured_teams', JSON.stringify(data.youthTeams));
        renderSeasonTable();
      }

      // 5. Admin Passkey Hash
      if (data.adminPasskeyHash && typeof data.adminPasskeyHash === 'string' && data.adminPasskeyHash.length === 64) {
        localStorage.setItem('mercer_admin_passkey_hash', data.adminPasskeyHash);
        if (typeof window.updatePasskeyStatusBadges === 'function') {
          window.updatePasskeyStatusBadges();
        }
      }

      updateMetrics();
      window.dispatchEvent(new Event('storage'));
      showToast('✓ Successfully restored all settings from backup file!');
    } catch (err) {
      console.error('Import backup error:', err);
      alert('Error parsing backup JSON file: ' + err.message);
    } finally {
      fileInput.value = '';
    }
  };
  reader.readAsText(file);
};

window.clearAllOverrides = function () {
  if (!confirm("Clear all admin overrides (website content, coaching staff, branding, season configuration, news, and alumni)? The site will return to initial baseline.")) return;
  localStorage.removeItem('mercer_site_content');
  localStorage.removeItem('mercer_section_visibility');
  localStorage.removeItem('mercer_junior_hub_visible');
  localStorage.removeItem('mercer_youth_hub_visible');
  localStorage.removeItem('mercer_visibility_updated_ts');
  localStorage.removeItem('mercer_season_config');
  localStorage.removeItem('mercer_configured_teams');
  localStorage.removeItem('mercer_hidden_teams');
  localStorage.removeItem('mercer_club_news');
  localStorage.removeItem('mercer_alumni_commitments');
  localStorage.removeItem('mercer_synced_youth_data');
  localStorage.removeItem('mercer_last_sync_timestamp');
  localStorage.removeItem('mercer_admin_passkey_hash');
  localStorage.removeItem('mercer_admin_passkey_updated_ts');
  if (typeof window.updatePasskeyStatusBadges === 'function') {
    window.updatePasskeyStatusBadges();
  }


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

  if (typeof window.initSiteContentCMS === 'function') {
    window.initSiteContentCMS();
  }
  if (typeof window.initClubBrandingCMS === 'function') {
    window.initClubBrandingCMS();
  }

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
let cmsRinksList = [];
let cmsStaffList = [];
window.cmsContentState = cmsContentState;
window.cmsCampsList = cmsCampsList;
window.cmsRinksList = cmsRinksList;
window.cmsStaffList = cmsStaffList;

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

/* --- Dynamic CMS Item Field Update Helpers (Global Window Scope) --- */
window.updateCmsRinkField = function (idx, field, value) {
  if (!cmsRinksList[idx]) return;
  cmsRinksList[idx][field] = value;
  if (field === 'name') {
    const heading = document.getElementById(`rink-heading-label-${idx}`);
    if (heading) heading.textContent = `📍 Rink #${idx + 1}: ${value || 'Unnamed Arena'}`;
  }
  window.syncRinksLive();
};

window.updateCmsRinkAmenity = function (rinkIdx, amenityIdx, value) {
  if (!cmsRinksList[rinkIdx]) return;
  if (!Array.isArray(cmsRinksList[rinkIdx].amenities)) {
    cmsRinksList[rinkIdx].amenities = [];
  }
  cmsRinksList[rinkIdx].amenities[amenityIdx] = value;
  window.syncRinksLive();
};

window.updateCmsCampField = function (idx, field, value) {
  if (!cmsCampsList[idx]) return;
  cmsCampsList[idx][field] = value;
  if (field === 'title') {
    const heading = document.getElementById(`camp-heading-label-${idx}`);
    if (heading) heading.textContent = `Camp #${idx + 1}: ${value || 'Untitled'}`;
  }
};

window.updateCmsStaffField = function (idx, field, value) {
  if (!cmsStaffList[idx]) return;
  cmsStaffList[idx][field] = value;
};

/* --- Bulletproof DOM Harvesters --- */
function harvestCmsRinksFromDOM() {
  const container = document.getElementById('cms-rinks-list');
  if (!container) return cmsRinksList;
  const cards = container.querySelectorAll('.cms-rink-card');
  if (!cards || cards.length === 0) return cmsRinksList;

  const harvested = [];
  cards.forEach((card, idx) => {
    const orig = cmsRinksList[idx] || {};
    const nameInput = card.querySelector('.cms-rink-name');
    const tagInput = card.querySelector('.cms-rink-tag');
    const addressInput = card.querySelector('.cms-rink-address');
    const phoneInput = card.querySelector('.cms-rink-phone');
    const mapUrlInput = card.querySelector('.cms-rink-map-url');
    const descInput = card.querySelector('.cms-rink-desc');
    const amenityInputs = card.querySelectorAll('.cms-rink-amenity');

    const amenities = [];
    amenityInputs.forEach((inp) => {
      const val = inp.value.trim();
      if (val) amenities.push(val);
    });

    harvested.push({
      id: orig.id || `rink-${idx + 1}`,
      name: nameInput ? nameInput.value.trim() : (orig.name || ''),
      tag: tagInput ? tagInput.value.trim() : (orig.tag || ''),
      address: addressInput ? addressInput.value.trim() : (orig.address || ''),
      phone: phoneInput ? phoneInput.value.trim() : (orig.phone || ''),
      mapUrl: mapUrlInput ? mapUrlInput.value.trim() : (orig.mapUrl || ''),
      desc: descInput ? descInput.value.trim() : (orig.desc || ''),
      amenities: amenities.length > 0 ? amenities : (Array.isArray(orig.amenities) ? orig.amenities : [])
    });
  });

  cmsRinksList = harvested;
  window.cmsRinksList = cmsRinksList;
  return cmsRinksList;
}
window.harvestCmsRinksFromDOM = harvestCmsRinksFromDOM;

function harvestCmsCampsFromDOM() {
  const container = document.getElementById('cms-camps-list');
  if (!container) return cmsCampsList;
  const cards = container.querySelectorAll('.cms-camp-card');
  if (!cards || cards.length === 0) return cmsCampsList;

  const harvested = [];
  cards.forEach((card, idx) => {
    const orig = cmsCampsList[idx] || {};
    const title = card.querySelector('.cms-camp-title')?.value.trim();
    const badge = card.querySelector('.cms-camp-badge')?.value.trim();
    const dates = card.querySelector('.cms-camp-dates')?.value.trim();
    const ages = card.querySelector('.cms-camp-ages')?.value.trim();
    const location = card.querySelector('.cms-camp-location')?.value.trim();
    const price = card.querySelector('.cms-camp-price')?.value.trim();
    const registerUrl = card.querySelector('.cms-camp-register-url')?.value.trim();
    const desc = card.querySelector('.cms-camp-desc')?.value.trim();

    harvested.push({
      id: orig.id || `camp-${idx + 1}`,
      title: title !== undefined ? title : (orig.title || ''),
      badge: badge !== undefined ? badge : (orig.badge || ''),
      dates: dates !== undefined ? dates : (orig.dates || ''),
      ages: ages !== undefined ? ages : (orig.ages || ''),
      location: location !== undefined ? location : (orig.location || ''),
      price: price !== undefined ? price : (orig.price || ''),
      registerUrl: registerUrl !== undefined ? registerUrl : (orig.registerUrl || ''),
      desc: desc !== undefined ? desc : (orig.desc || '')
    });
  });

  cmsCampsList = harvested;
  window.cmsCampsList = cmsCampsList;
  return cmsCampsList;
}
window.harvestCmsCampsFromDOM = harvestCmsCampsFromDOM;

function harvestCmsStaffFromDOM() {
  const container = document.getElementById('cms-staff-list');
  if (!container) return cmsStaffList;
  const cards = container.querySelectorAll('.cms-staff-card');
  if (!cards || cards.length === 0) return cmsStaffList;

  const harvested = [];
  cards.forEach((card, idx) => {
    const orig = cmsStaffList[idx] || {};
    const name = card.querySelector('.cms-staff-name')?.value.trim();
    const role = card.querySelector('.cms-staff-role')?.value.trim();
    const badge = card.querySelector('.cms-staff-badge')?.value.trim();
    const photo = card.querySelector('.cms-staff-photo')?.value.trim();
    const email = card.querySelector('.cms-staff-email')?.value.trim();
    const bio = card.querySelector('.cms-staff-bio')?.value.trim();

    harvested.push({
      id: orig.id || `staff-${idx + 1}`,
      name: name !== undefined ? name : (orig.name || ''),
      role: role !== undefined ? role : (orig.role || ''),
      badge: badge !== undefined ? badge : (orig.badge || ''),
      photo: photo !== undefined ? photo : (orig.photo || 'assets/images/mercer-chiefs-crest.png'),
      email: email !== undefined ? email : (orig.email || ''),
      bio: bio !== undefined ? bio : (orig.bio || '')
    });
  });

  cmsStaffList = harvested;
  window.cmsStaffList = cmsStaffList;
  return cmsStaffList;
}
window.harvestCmsStaffFromDOM = harvestCmsStaffFromDOM;

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
          : (serverContent.branding || {}),
        instagramAccounts: (Array.isArray(localContent.instagramAccounts) && localContent.instagramAccounts.length > 0)
          ? localContent.instagramAccounts
          : (Array.isArray(serverContent.instagramAccounts) && serverContent.instagramAccounts.length > 0 ? serverContent.instagramAccounts : undefined),
        newsArticles: (Array.isArray(localContent.newsArticles) && localContent.newsArticles.length > 0)
          ? localContent.newsArticles
          : (Array.isArray(serverContent.newsArticles) && serverContent.newsArticles.length > 0 ? serverContent.newsArticles : undefined)
      };
    } else if (!content.staff || !content.staff.length) {
      content.staff = (serverContent && Array.isArray(serverContent.staff) && serverContent.staff.length > 0)
        ? serverContent.staff
        : DEFAULT_STAFF;
    }
    if (!content.instagramAccounts || !content.instagramAccounts.length) {
      if (serverContent && Array.isArray(serverContent.instagramAccounts) && serverContent.instagramAccounts.length > 0) {
        content.instagramAccounts = serverContent.instagramAccounts;
      }
    }
    if (!content.newsArticles || !content.newsArticles.length) {
      if (serverContent && Array.isArray(serverContent.newsArticles) && serverContent.newsArticles.length > 0) {
        content.newsArticles = serverContent.newsArticles;
      }
    }

    if (Array.isArray(content.newsArticles) && content.newsArticles.length > 0) {
      adminState.newsArticles = JSON.parse(JSON.stringify(content.newsArticles));
      localStorage.setItem('mercer_club_news', JSON.stringify(adminState.newsArticles));
      renderNewsList();
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

  const storedVis = getStoredSectionVisibility();
  const sec = data.sections || {};
  const setCheck = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.checked = val !== false;
  };

  const heroVal = storedVis.hero !== undefined ? storedVis.hero : (data.hero?.enabled ?? sec.hero ?? true);
  setCheck('cms-hero-enabled', heroVal);
  setCheck('cms-quick-hero', heroVal);

  let juniorVal = true;
  if (storedVis.juniorHub !== undefined) {
    juniorVal = !!storedVis.juniorHub;
  } else if (data.juniorHub?.enabled !== undefined) {
    juniorVal = !!data.juniorHub.enabled;
  } else if (sec.juniorHub !== undefined) {
    juniorVal = !!sec.juniorHub;
  } else {
    const storedJr = localStorage.getItem('mercer_junior_hub_visible');
    if (storedJr !== null) juniorVal = storedJr === 'true';
    else juniorVal = data.juniorHubVisible ?? adminState.juniorHubVisible ?? true;
  }
  setCheck('toggle-hub-junior', juniorVal);
  setCheck('cms-quick-junior', juniorVal);
  adminState.juniorHubVisible = juniorVal !== false;

  let youthVal = true;
  if (storedVis.youthHub !== undefined) {
    youthVal = !!storedVis.youthHub;
  } else if (data.youthHub?.enabled !== undefined) {
    youthVal = !!data.youthHub.enabled;
  } else if (sec.youthHub !== undefined) {
    youthVal = !!sec.youthHub;
  } else {
    const storedYth = localStorage.getItem('mercer_youth_hub_visible');
    if (storedYth !== null) youthVal = storedYth === 'true';
    else youthVal = data.youthHubVisible ?? adminState.youthHubVisible ?? true;
  }
  setCheck('toggle-hub-youth', youthVal);
  setCheck('cms-quick-youth', youthVal);
  adminState.youthHubVisible = youthVal !== false;

  const tryoutsVal = storedVis.tryouts !== undefined ? storedVis.tryouts : (data.tryouts?.enabled ?? sec.tryouts ?? true);
  setCheck('cms-tryouts-enabled', tryoutsVal);
  setCheck('cms-quick-tryouts', tryoutsVal);

  const campsVal = storedVis.camps !== undefined ? storedVis.camps : (data.camps?.enabled ?? sec.camps ?? true);
  setCheck('cms-camps-enabled', campsVal);
  setCheck('cms-quick-camps', campsVal);

  const videoVal = storedVis.video !== undefined ? storedVis.video : (data.program?.enabled ?? sec.video ?? true);
  setCheck('cms-video-enabled', videoVal);
  setCheck('cms-quick-video', videoVal);

  const arenaVal = storedVis.arena !== undefined ? storedVis.arena : (data.arena?.enabled ?? sec.arena ?? true);
  setCheck('cms-arena-enabled', arenaVal);
  setCheck('cms-quick-arena', arenaVal);

  const newsVal = storedVis.news !== undefined ? storedVis.news : (data.news?.enabled ?? sec.news ?? true);
  setCheck('cms-quick-news', newsVal);

  const tickerVal = storedVis.ticker !== undefined ? storedVis.ticker : (data.ticker?.enabled ?? sec.ticker ?? true);
  setCheck('cms-quick-ticker', tickerVal);

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

  // 3. Home Rink/s & Facilities (Multi-Rink Support)
  const a = data.arena || {};
  setCmsVal('cms-arena-section-tag', a.sectionTag || 'Home Facilities');
  setCmsVal('cms-arena-section-title', a.sectionTitle || 'Home Rinks & Facilities');
  setCmsVal('cms-arena-section-subtitle', a.sectionSubtitle || '');

  // Populate rinks array (support array of rinks or fallback single rink)
  if (Array.isArray(a.rinks) && a.rinks.length > 0) {
    cmsRinksList = JSON.parse(JSON.stringify(a.rinks));
  } else if (a.title) {
    cmsRinksList = [{
      id: 'rink-1',
      name: a.title,
      tag: a.tag || 'Home Facility',
      desc: a.desc || '',
      address: a.address || '',
      phone: a.phone || '',
      mapUrl: a.mapUrl || '',
      amenities: Array.isArray(a.amenities) ? [...a.amenities] : []
    }];
  } else {
    cmsRinksList = [
      {
        id: "rink-iceland",
        name: "Ice Land Skating Center",
        tag: "Junior (NCDC/Premier) & Tier 1 AAA Home",
        desc: "Flagship home ice of the Mercer Chiefs Tuition-Free NCDC Tier II Junior team, USPHL Premier, and Tier 1 AAA youth hockey teams. Featuring two NHL-regulation ice sheets, dedicated Junior team locker rooms, video theater, and comprehensive athlete training facilities.",
        address: "6 Tennis Court, Hamilton Township, NJ 08619",
        phone: "(609) 588-6672",
        mapUrl: "https://maps.google.com/?q=6+Tennis+Ct,+Hamilton+Township,+NJ+08619",
        amenities: [
          "2 NHL-Size Ice Sheets",
          "Dedicated Chiefs Team Locker Rooms",
          "Off-Ice Dryland Training Center",
          "Black Bear TV Broadcast Rinks"
        ]
      },
      {
        id: "rink-proskate",
        name: "Pro Skate Ice Arena",
        tag: "Tier 2 AA/A Youth Hockey Home",
        desc: "Dedicated home venue for Mercer Chiefs Tier 2 AA and A youth hockey teams competing in the Atlantic Hockey Federation (AHF). Features two regulation ice surfaces, full-service pro shop, and athlete development skill clinics.",
        address: "1000 Cornwall Rd, Monmouth Junction, NJ 08852",
        phone: "(732) 940-6400",
        mapUrl: "https://maps.google.com/?q=1000+Cornwall+Rd,+Monmouth+Junction,+NJ+08852",
        amenities: [
          "2 Regulation Ice Surfaces",
          "Full-Service Pro Shop & Sharpening",
          "Shooting & Skills Stations",
          "High-Definition Game Streaming"
        ]
      }
    ];
  }
  renderCmsRinksList();

  setCmsVal('cms-broadcast-tag', a.broadcastTag || 'Live Broadcasts');
  setCmsVal('cms-broadcast-title', a.broadcastTitle || 'Watch On Black Bear TV');
  setCmsVal('cms-broadcast-desc', a.broadcastDesc || '');
  setCmsVal('cms-broadcast-url', a.broadcastUrl || 'https://blackbearsports.tv/');

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
  setCmsVal('cms-tryout-btn-text', tr.buttonText || '');
  setCmsVal('cms-tryout-desc', tr.desc || '');
  setCmsVal('cms-tryout-url', tr.externalRegisterUrl || '');

  // 6. Club Branding
  try {
    if (data.branding) {
      populateBrandingUI(data.branding);
    }
  } catch (e) {
    console.warn('Branding UI population warning:', e);
  }

  // 7. Coaching Staff
  try {
    if (Array.isArray(data.staff) && data.staff.length > 0) {
      cmsStaffList = JSON.parse(JSON.stringify(data.staff));
    } else {
      cmsStaffList = JSON.parse(JSON.stringify(DEFAULT_STAFF));
    }
    renderCmsStaffList();
  } catch (e) {
    console.error('Staff UI population error:', e);
  }

  // 8. Instagram Accounts Configuration (Multi-Admin Sync)
  try {
    if (Array.isArray(data.instagramAccounts) && data.instagramAccounts.length > 0) {
      if (!adminState.igConfig) adminState.igConfig = getStoredInstagramConfig();
      adminState.igConfig.accounts = JSON.parse(JSON.stringify(data.instagramAccounts));
      localStorage.setItem('mercer_instagram_config', JSON.stringify(adminState.igConfig));
      initInstagramConfigUI();
    }
  } catch (e) {
    console.error('Instagram accounts UI population error:', e);
  }
}

function renderCmsCampsList() {
  const container = document.getElementById('cms-camps-list');
  if (!container) return;
  window.cmsCampsList = cmsCampsList;

  if (cmsCampsList.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); background: rgba(0,0,0,0.2); border: 1px dashed var(--border-subtle); border-radius: var(--radius-sm);">
        No active camps or clinics listed. Click "+ Add Another Camp / Clinic" below to create one.
      </div>
    `;
    return;
  }

  container.innerHTML = cmsCampsList.map((item, idx) => `
    <div class="cms-camp-card" data-camp-idx="${idx}" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; position: relative;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <span id="camp-heading-label-${idx}" style="font-weight: 700; color: var(--chiefs-gold); font-size: 0.9rem;">Camp #${idx + 1}: ${escapeCmsHtml(item.title || 'Untitled')}</span>
        <button type="button" onclick="window.removeCmsCampItem(${idx})" class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; color: #f87171; border-color: rgba(239,68,68,0.3);">
          ✕ Remove
        </button>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
        <div class="admin-form-group">
          <label>Camp Title</label>
          <input type="text" class="admin-form-input cms-camp-title" value="${escapeCmsHtml(item.title || '')}" oninput="window.updateCmsCampField(${idx}, 'title', this.value)">
        </div>
        <div class="admin-form-group">
          <label>Badge Tag</label>
          <input type="text" class="admin-form-input cms-camp-badge" value="${escapeCmsHtml(item.badge || 'Summer Camp')}" oninput="window.updateCmsCampField(${idx}, 'badge', this.value)">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 0.75rem;">
        <div class="admin-form-group">
          <label>Dates</label>
          <input type="text" class="admin-form-input cms-camp-dates" value="${escapeCmsHtml(item.dates || '')}" oninput="window.updateCmsCampField(${idx}, 'dates', this.value)">
        </div>
        <div class="admin-form-group">
          <label>Eligible Ages</label>
          <input type="text" class="admin-form-input cms-camp-ages" value="${escapeCmsHtml(item.ages || '')}" oninput="window.updateCmsCampField(${idx}, 'ages', this.value)">
        </div>
        <div class="admin-form-group">
          <label>Location</label>
          <input type="text" class="admin-form-input cms-camp-location" value="${escapeCmsHtml(item.location || 'Ice Land Arena')}" oninput="window.updateCmsCampField(${idx}, 'location', this.value)">
        </div>
        <div class="admin-form-group">
          <label>Price / Fee</label>
          <input type="text" class="admin-form-input cms-camp-price" value="${escapeCmsHtml(item.price || '')}" oninput="window.updateCmsCampField(${idx}, 'price', this.value)">
        </div>
      </div>

      <div class="admin-form-group" style="margin-bottom: 0.75rem;">
        <label>Registration / Info URL</label>
        <input type="text" class="admin-form-input cms-camp-register-url" value="${escapeCmsHtml(item.registerUrl || '')}" oninput="window.updateCmsCampField(${idx}, 'registerUrl', this.value)" placeholder="https://...">
      </div>

      <div class="admin-form-group">
        <label>Description & Program Highlights</label>
        <textarea class="admin-form-input cms-camp-desc" rows="2" oninput="window.updateCmsCampField(${idx}, 'desc', this.value)">${escapeCmsHtml(item.desc || '')}</textarea>
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
  window.cmsCampsList = cmsCampsList;
  renderCmsCampsList();
};

window.removeCmsCampItem = function (idx) {
  if (confirm('Are you sure you want to remove this camp?')) {
    cmsCampsList.splice(idx, 1);
    window.cmsCampsList = cmsCampsList;
    renderCmsCampsList();
  }
};

/* --- Multi-Rink & Facilities CMS Handlers --- */
function renderCmsRinksList() {
  const container = document.getElementById('cms-rinks-list');
  if (!container) return;
  window.cmsRinksList = cmsRinksList;

  // Dynamic smart labels based on rink count
  const count = cmsRinksList.length;
  const isSingle = count <= 1;
  const dynamicNavLabel = isSingle ? 'Home Rink' : 'Home Rinks';
  const dynamicHeading = isSingle ? 'Home Rink & Facility' : 'Home Rinks & Facilities';
  const dynamicToggleText = isSingle ? 'Display Home Rink on Website' : 'Display Home Rinks on Website';

  const quickLabel = document.getElementById('cms-quick-arena-label');
  if (quickLabel) quickLabel.textContent = dynamicNavLabel;

  const cardHeading = document.getElementById('cms-arena-card-heading');
  if (cardHeading) cardHeading.textContent = dynamicHeading;

  const toggleLabel = document.getElementById('cms-arena-toggle-label');
  if (toggleLabel) toggleLabel.textContent = dynamicToggleText;

  if (cmsRinksList.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); background: rgba(0,0,0,0.2); border: 1px dashed var(--border-subtle); border-radius: var(--radius-sm);">
        No home rinks configured. Click "+ Add Another Home Rink" below to add a facility.
      </div>
    `;
    return;
  }

  container.innerHTML = cmsRinksList.map((item, idx) => {
    const amenities = Array.isArray(item.amenities) ? item.amenities : [];
    const canRemove = cmsRinksList.length > 1;

    return `
      <div class="cms-rink-card" data-rink-idx="${idx}" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.6rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span id="rink-heading-label-${idx}" style="font-weight: 700; color: var(--chiefs-gold); font-size: 0.95rem;">📍 Rink #${idx + 1}: ${escapeCmsHtml(item.name || 'Unnamed Arena')}</span>
          </div>
          ${canRemove ? `
            <button type="button" onclick="window.removeCmsRinkItem(${idx})" class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; color: #f87171; border-color: rgba(239,68,68,0.3);">
              ✕ Remove Rink
            </button>
          ` : `
            <span style="font-size: 0.72rem; color: var(--text-muted);">Primary Venue</span>
          `}
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
          <div class="admin-form-group">
            <label>Rink / Arena Name *</label>
            <input type="text" class="admin-form-input cms-rink-name" value="${escapeCmsHtml(item.name || '')}" placeholder="e.g. Ice Land Skating Center" oninput="window.updateCmsRinkField(${idx}, 'name', this.value)">
          </div>
          <div class="admin-form-group">
            <label>Program / Division Tag</label>
            <input type="text" class="admin-form-input cms-rink-tag" value="${escapeCmsHtml(item.tag || '')}" placeholder="e.g. Junior & Tier 1 AAA Home" oninput="window.updateCmsRinkField(${idx}, 'tag', this.value)">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 0.75rem; margin-bottom: 0.75rem;">
          <div class="admin-form-group">
            <label>Street Address</label>
            <input type="text" class="admin-form-input cms-rink-address" value="${escapeCmsHtml(item.address || '')}" placeholder="6 Tennis Court, Hamilton Township, NJ 08619" oninput="window.updateCmsRinkField(${idx}, 'address', this.value)">
          </div>
          <div class="admin-form-group">
            <label>Phone Number</label>
            <input type="text" class="admin-form-input cms-rink-phone" value="${escapeCmsHtml(item.phone || '')}" placeholder="(609) 588-6672" oninput="window.updateCmsRinkField(${idx}, 'phone', this.value)">
          </div>
          <div class="admin-form-group">
            <label>Google Maps Directions URL</label>
            <input type="text" class="admin-form-input cms-rink-map-url" value="${escapeCmsHtml(item.mapUrl || '')}" placeholder="https://maps.google.com/..." oninput="window.updateCmsRinkField(${idx}, 'mapUrl', this.value)">
          </div>
        </div>

        <div class="admin-form-group" style="margin-bottom: 0.85rem;">
          <label>Facility Overview & Description</label>
          <textarea class="admin-form-input cms-rink-desc" rows="2" placeholder="Description of rinks, locker rooms, training center..." oninput="window.updateCmsRinkField(${idx}, 'desc', this.value)">${escapeCmsHtml(item.desc || '')}</textarea>
        </div>

        <div>
          <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.4rem; display: block;">Facility Features & Amenities (Up to 4)</label>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.6rem;">
            <input type="text" class="admin-form-input cms-rink-amenity" data-amenity-idx="0" value="${escapeCmsHtml(amenities[0] || '')}" placeholder="Feature 1 (e.g. 2 NHL-Size Ice Sheets)" oninput="window.updateCmsRinkAmenity(${idx}, 0, this.value)">
            <input type="text" class="admin-form-input cms-rink-amenity" data-amenity-idx="1" value="${escapeCmsHtml(amenities[1] || '')}" placeholder="Feature 2 (e.g. Chiefs Locker Rooms)" oninput="window.updateCmsRinkAmenity(${idx}, 1, this.value)">
            <input type="text" class="admin-form-input cms-rink-amenity" data-amenity-idx="2" value="${escapeCmsHtml(amenities[2] || '')}" placeholder="Feature 3 (e.g. Dryland Training)" oninput="window.updateCmsRinkAmenity(${idx}, 2, this.value)">
            <input type="text" class="admin-form-input cms-rink-amenity" data-amenity-idx="3" value="${escapeCmsHtml(amenities[3] || '')}" placeholder="Feature 4 (e.g. Black Bear TV Rinks)" oninput="window.updateCmsRinkAmenity(${idx}, 3, this.value)">
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.addCmsRinkItem = function () {
  cmsRinksList.push({
    id: `rink-${Date.now()}`,
    name: 'New Ice Arena',
    tag: 'Home Facility',
    desc: 'Full-service ice arena featuring NHL-regulation ice sheets, dedicated Chiefs team locker rooms, and comprehensive athlete training facilities.',
    address: '123 Arena Way, Township, NJ 08000',
    phone: '(555) 000-0000',
    mapUrl: 'https://maps.google.com/',
    amenities: [
      'Regulation Ice Sheets',
      'Dedicated Team Locker Rooms',
      'Pro Shop & Skate Sharpening',
      'Live Game Streaming'
    ]
  });
  window.cmsRinksList = cmsRinksList;
  renderCmsRinksList();
  window.syncRinksLive();
  showToast('New home rink added. Configure details and click Publish.');
};

window.removeCmsRinkItem = function (idx) {
  if (cmsRinksList.length <= 1) {
    alert('At least one home rink is required.');
    return;
  }
  const item = cmsRinksList[idx];
  const name = item ? item.name : 'this rink';
  if (!confirm(`Are you sure you want to remove ${name}?`)) return;
  cmsRinksList.splice(idx, 1);
  window.cmsRinksList = cmsRinksList;
  renderCmsRinksList();
  window.syncRinksLive();
  showToast(`${name} removed.`);
};

window.syncRinksLive = function () {
  try {
    harvestCmsRinksFromDOM();
    let p = {};
    const raw = localStorage.getItem('mercer_site_content');
    if (raw) {
      p = JSON.parse(raw);
    }
    if (!p.arena) p.arena = {};
    const count = cmsRinksList.length;
    const dynamicNavLabel = count > 1 ? 'Home Rinks' : 'Home Rink';
    const dynamicTag = count > 1 ? 'Home Facilities' : 'Home Facility';
    const dynamicTitle = count > 1 ? 'Home Rinks & Facilities' : 'Home Rink & Facility';

    p.arena.navLabel = dynamicNavLabel;
    p.arena.sectionTag = getCmsVal('cms-arena-section-tag') || dynamicTag;
    p.arena.sectionTitle = getCmsVal('cms-arena-section-title') || dynamicTitle;
    p.arena.sectionSubtitle = getCmsVal('cms-arena-section-subtitle');
    p.arena.rinks = cmsRinksList;

    if (cmsRinksList[0]) {
      p.arena.title = cmsRinksList[0].name || '';
      p.arena.tag = cmsRinksList[0].tag || '';
      p.arena.desc = cmsRinksList[0].desc || '';
      p.arena.address = cmsRinksList[0].address || '';
      p.arena.phone = cmsRinksList[0].phone || '';
      p.arena.mapUrl = cmsRinksList[0].mapUrl || '';
      p.arena.amenities = cmsRinksList[0].amenities || [];
    }

    p.arena.broadcastTag = getCmsVal('cms-broadcast-tag') || 'Live Broadcasts';
    p.arena.broadcastTitle = getCmsVal('cms-broadcast-title') || 'Watch On Black Bear TV';
    p.arena.broadcastUrl = getCmsVal('cms-broadcast-url') || 'https://blackbearsports.tv/';
    p.arena.broadcastDesc = getCmsVal('cms-broadcast-desc');

    localStorage.setItem('mercer_site_content', JSON.stringify(p));
    window.dispatchEvent(new Event('storage'));
    try {
      const bc = new BroadcastChannel('mercer_visibility_channel');
      bc.postMessage({ type: 'content_change' });
    } catch (e) {}
  } catch (err) {
    console.error('syncRinksLive error:', err);
  }
};

/* --- Staff Directory CMS Handlers --- */
function renderCmsStaffList() {
  const container = document.getElementById('cms-staff-list');
  if (!container) return;
  window.cmsStaffList = cmsStaffList;

  if (cmsStaffList.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); background: rgba(0,0,0,0.2); border: 1px dashed var(--border-subtle); border-radius: var(--radius-sm);">
        No staff members configured. Click "+ Add Staff Member" above to create one.
      </div>
    `;
    return;
  }

  container.innerHTML = cmsStaffList.map((item, idx) => `
    <div class="cms-staff-card" data-staff-idx="${idx}" style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.65rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img id="staff-preview-${idx}" src="${item.photo || 'assets/images/mercer-chiefs-crest.png'}" alt="Preview" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--chiefs-red); box-shadow: 0 0 8px rgba(189,50,59,0.3);">
          <div>
            <span id="staff-preview-name-${idx}" style="font-weight: 700; color: #fff; font-size: 0.95rem;">${escapeCmsHtml(item.name || 'Unnamed Coach')}</span>
            <div id="staff-preview-role-${idx}" style="font-size: 0.75rem; color: var(--chiefs-gold);">${escapeCmsHtml(item.role || 'Staff')}</div>
          </div>
        </div>
        <button type="button" onclick="window.removeCmsStaffItem(${idx})" class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; color: #f87171; border-color: rgba(239,68,68,0.3);">
          ✕ Remove
        </button>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 2fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
        <div class="admin-form-group">
          <label>Full Name *</label>
          <input type="text" class="admin-form-input cms-staff-name" value="${escapeCmsHtml(item.name || '')}" oninput="window.updateCmsStaffField(${idx}, 'name', this.value); window.renderCmsStaffHeader(${idx});">
        </div>
        <div class="admin-form-group">
          <label>Role / Position Title</label>
          <input type="text" class="admin-form-input cms-staff-role" value="${escapeCmsHtml(item.role || '')}" placeholder="e.g. Assistant Coach" oninput="window.updateCmsStaffField(${idx}, 'role', this.value); window.renderCmsStaffHeader(${idx});">
        </div>
        <div class="admin-form-group">
          <label>Badge Tag</label>
          <input type="text" class="admin-form-input cms-staff-badge" value="${escapeCmsHtml(item.badge || 'Staff')}" placeholder="e.g. Head Coach" oninput="window.updateCmsStaffField(${idx}, 'badge', this.value)">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; align-items: start;">
        <div class="admin-form-group">
          <label>Photo URL / Path</label>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <input type="text" id="staff-photo-input-${idx}" class="admin-form-input cms-staff-photo" value="${escapeCmsHtml(item.photo || '')}" placeholder="assets/images/..." oninput="window.updateCmsStaffField(${idx}, 'photo', this.value); window.renderCmsStaffHeader(${idx});" style="flex: 1;">
            <input type="file" id="cms-staff-file-${idx}" accept="image/*" style="display:none;" onchange="window.uploadStaffPhotoFromInput(this, ${idx})">
            <button type="button" class="btn-primary" onclick="document.getElementById('cms-staff-file-${idx}').click()" style="font-size: 0.76rem; padding: 0.45rem 0.75rem; white-space: nowrap; background: var(--chiefs-gold); border-color: var(--chiefs-gold); color: #000; font-weight: 700;">
              📁 Upload Headshot
            </button>
          </div>
        </div>
        <div class="admin-form-group">
          <label>Email Address</label>
          <input type="email" class="admin-form-input cms-staff-email" value="${escapeCmsHtml(item.email || '')}" placeholder="coach@domain.com" oninput="window.updateCmsStaffField(${idx}, 'email', this.value)">
        </div>
      </div>

      <div class="admin-form-group">
        <label>Coach Biography / Career Summary</label>
        <textarea class="admin-form-input cms-staff-bio" rows="2" placeholder="Experience, achievements, background..." oninput="window.updateCmsStaffField(${idx}, 'bio', this.value)">${escapeCmsHtml(item.bio || '')}</textarea>
      </div>
    </div>
  `).join('');
}

function renderCmsStaffHeader(idx) {
  const item = cmsStaffList[idx];
  if (!item) return;
  const prev = document.getElementById(`staff-preview-${idx}`);
  if (prev && item.photo) prev.src = item.photo;
  const nameEl = document.getElementById(`staff-preview-name-${idx}`);
  if (nameEl) nameEl.textContent = item.name || 'Unnamed Coach';
  const roleEl = document.getElementById(`staff-preview-role-${idx}`);
  if (roleEl) roleEl.textContent = item.role || 'Staff';
}
window.renderCmsStaffHeader = renderCmsStaffHeader;

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
  window.cmsStaffList = cmsStaffList;
  renderCmsStaffList();
  showToast('New staff member added. Fill in details and click Publish.');
};

window.removeCmsStaffItem = function (idx) {
  const item = cmsStaffList[idx];
  const name = item ? item.name : 'this staff member';
  if (!confirm(`Are you sure you want to remove ${name}?`)) return;
  cmsStaffList.splice(idx, 1);
  window.cmsStaffList = cmsStaffList;
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
      const err = await putRes.json().catch(() => ({}));
      const msg = err.message || '';
      if (msg.includes('Resource not accessible') || putRes.status === 403) {
        showToast('Upload failed: Token lacks "Contents: Read & write" permission', 'error');
        if (typeof window.openTokenPermissionModal === 'function') window.openTokenPermissionModal();
      } else {
        showToast(`Upload warning: ${msg || 'Saved locally only'}`);
      }
    }
  } catch (err) {
    console.error('Staff headshot upload error:', err);
    showToast(`Upload error: ${err.message}`);
  } finally {
    fileInput.value = '';
  }
};

window.collectSiteContentFromUI = function () {
  harvestCmsRinksFromDOM();
  harvestCmsCampsFromDOM();
  harvestCmsStaffFromDOM();

  let yt = getCmsVal('cms-prog-video');
  if (yt.includes('youtu.be/')) {
    yt = yt.split('youtu.be/')[1].split('?')[0].split('&')[0];
  } else if (yt.includes('watch?v=')) {
    yt = yt.split('watch?v=')[1].split('&')[0];
  } else if (yt.includes('embed/')) {
    yt = yt.split('embed/')[1].split('?')[0];
  }

  const storedVis = getStoredSectionVisibility();
  const isHeroEnabled = document.getElementById('cms-hero-enabled')?.checked ?? document.getElementById('cms-quick-hero')?.checked ?? (storedVis.hero ?? true);
  const isJuniorEnabled = document.getElementById('toggle-hub-junior')?.checked ?? document.getElementById('cms-quick-junior')?.checked ?? (storedVis.juniorHub ?? (adminState.juniorHubVisible ?? true));
  const isYouthEnabled = document.getElementById('toggle-hub-youth')?.checked ?? document.getElementById('cms-quick-youth')?.checked ?? (storedVis.youthHub ?? (adminState.youthHubVisible ?? true));
  const isTryoutsEnabled = document.getElementById('cms-tryouts-enabled')?.checked ?? document.getElementById('cms-quick-tryouts')?.checked ?? (storedVis.tryouts ?? true);
  const isCampsEnabled = document.getElementById('cms-camps-enabled')?.checked ?? document.getElementById('cms-quick-camps')?.checked ?? (storedVis.camps ?? true);
  const isVideoEnabled = document.getElementById('cms-video-enabled')?.checked ?? document.getElementById('cms-quick-video')?.checked ?? (storedVis.video ?? true);
  const isArenaEnabled = document.getElementById('cms-arena-enabled')?.checked ?? document.getElementById('cms-quick-arena')?.checked ?? (storedVis.arena ?? true);
  const isNewsEnabled = document.getElementById('cms-quick-news')?.checked ?? (storedVis.news ?? true);
  const isTickerEnabled = document.getElementById('cms-quick-ticker')?.checked ?? (storedVis.ticker ?? true);

  const content = {
    sections: {
      hero: isHeroEnabled,
      juniorHub: isJuniorEnabled,
      youthHub: isYouthEnabled,
      video: isVideoEnabled,
      tryouts: isTryoutsEnabled,
      camps: isCampsEnabled,
      arena: isArenaEnabled,
      news: isNewsEnabled,
      ticker: isTickerEnabled
    },
    hero: {
      enabled: isHeroEnabled,
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
      enabled: isTryoutsEnabled,
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
      enabled: isCampsEnabled,
      sectionTag: getCmsVal('cms-camps-tag') || 'Player Development & Skills',
      title: getCmsVal('cms-camps-title') || 'Camps & Clinics',
      subtitle: getCmsVal('cms-camps-subtitle'),
      items: cmsCampsList
    },
    arena: {
      enabled: isArenaEnabled,
      navLabel: cmsRinksList.length > 1 ? 'Home Rinks' : 'Home Rink',
      sectionTag: getCmsVal('cms-arena-section-tag') || (cmsRinksList.length > 1 ? 'Home Facilities' : 'Home Facility'),
      sectionTitle: getCmsVal('cms-arena-section-title') || (cmsRinksList.length > 1 ? 'Home Rinks & Facilities' : 'Home Rink & Facility'),
      sectionSubtitle: getCmsVal('cms-arena-section-subtitle') || 'The Mercer Chiefs train and compete across premier twin-sheet regional ice complexes in Central New Jersey.',
      title: cmsRinksList[0]?.name || 'Ice Land Skating Center',
      tag: cmsRinksList[0]?.tag || 'Home Facility',
      desc: cmsRinksList[0]?.desc || '',
      address: cmsRinksList[0]?.address || '6 Tennis Court, Hamilton Township, NJ 08619',
      mapUrl: cmsRinksList[0]?.mapUrl || 'https://maps.google.com/?q=6+Tennis+Ct,+Hamilton+Township,+NJ+08619',
      phone: cmsRinksList[0]?.phone || '(609) 588-6672',
      amenities: cmsRinksList[0]?.amenities || [
        '2 NHL-Size Ice Sheets',
        'Dedicated Chiefs Team Locker Rooms',
        'Off-Ice Dryland Training Center',
        'Black Bear TV Broadcast Rinks'
      ],
      rinks: cmsRinksList,
      broadcastTag: getCmsVal('cms-broadcast-tag') || 'Live Broadcasts',
      broadcastTitle: getCmsVal('cms-broadcast-title') || 'Watch On Black Bear TV',
      broadcastDesc: getCmsVal('cms-broadcast-desc'),
      broadcastUrl: getCmsVal('cms-broadcast-url') || 'https://blackbearsports.tv/'
    },
    program: {
      enabled: isVideoEnabled,
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
    juniorHub: {
      enabled: isJuniorEnabled
    },
    youthHub: {
      enabled: isYouthEnabled
    },
    news: {
      enabled: isNewsEnabled
    },
    ticker: {
      enabled: isTickerEnabled
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
      buttonText: getCmsVal('cms-tryout-btn-text') || '',
      desc: getCmsVal('cms-tryout-desc'),
      externalRegisterUrl: getCmsVal('cms-tryout-url')
    },
    staff: cmsStaffList,
    instagramAccounts: (adminState.igConfig && Array.isArray(adminState.igConfig.accounts) && adminState.igConfig.accounts.length > 0)
      ? adminState.igConfig.accounts
      : (getStoredInstagramConfig().accounts || []),
    newsArticles: (adminState.newsArticles && Array.isArray(adminState.newsArticles) && adminState.newsArticles.length > 0)
      ? adminState.newsArticles
      : (getStoredNews() || []),
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
  const btnNews = document.getElementById('btn-publish-news');
  const badgeNews = document.getElementById('news-publish-status-badge');

  const btns = [btnContent, btnBranding, btnNews].filter(Boolean);
  const badges = [badgeContent, badgeBranding, badgeNews].filter(Boolean);

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
      const alertBanner = document.getElementById('cms-permission-alert');
      if (alertBanner) alertBanner.style.display = 'none';
      badges.forEach(b => {
        b.textContent = '● Published Live';
        b.style.color = '#4ade80';
      });
      btns.forEach(b => {
        b.disabled = false;
        b.innerHTML = '✓ Published!';
        setTimeout(() => {
          if (b.id === 'btn-publish-branding') b.innerHTML = '💾 Publish Branding to Live Site';
          else if (b.id === 'btn-publish-news') b.innerHTML = '💾 Publish News to Live Site';
          else b.innerHTML = '💾 Publish to Live Site';
        }, 2500);
      });
      return;
    }

    const errData = await putRes.json().catch(() => ({}));
    const rawMsg = errData.message || '';
    if (rawMsg.includes('Resource not accessible') || putRes.status === 403) {
      const alertBanner = document.getElementById('cms-permission-alert');
      if (alertBanner) {
        alertBanner.style.display = 'block';
        alertBanner.innerHTML = `
          <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: var(--radius-md); padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
            <div>
              <strong style="color: #fff; font-size: 0.95rem; display: flex; align-items: center; gap: 0.4rem;">
                <span>⚠️</span> Live Publish Blocked: Token Missing "Contents: Read &amp; Write"
              </strong>
              <p style="font-size: 0.82rem; color: #fca5a5; margin: 0.35rem 0 0 0; line-height: 1.5;">
                Your visibility &amp; content updates are safely cached in this browser, but GitHub blocked live deployment because your Personal Access Token lacks file writing permissions.
              </p>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button type="button" class="btn-primary" onclick="window.openTokenPermissionModal()"
                style="font-size: 0.8rem; padding: 0.45rem 0.95rem; background: var(--chiefs-gold); border-color: var(--chiefs-gold); color: #000; font-weight: 700;">
                🔑 Fix Token &amp; Publish
              </button>
              <button type="button" class="btn-secondary" onclick="window.exportSiteContentJson()"
                style="font-size: 0.8rem; padding: 0.45rem 0.85rem;" title="Download local file backup">
                📥 Export JSON
              </button>
            </div>
          </div>
        `;
      }
      window.openTokenPermissionModal();
      throw new Error('Resource not accessible by personal access token (Missing Contents: Read & Write permission)');
    }
    throw new Error(rawMsg || 'GitHub API returned an error');
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

function hexToRgba(hex, alpha = 1) {
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
  if (typeof window.updateAdminHeaderAndConsole === 'function') {
    window.updateAdminHeaderAndConsole();
  }
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

window.getActiveClubShortName = function () {
  const shortInput = document.getElementById('cms-brand-club-short');
  if (shortInput && shortInput.value.trim()) return shortInput.value.trim();
  try {
    const raw = localStorage.getItem('mercer_site_content');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.branding?.shortName) return parsed.branding.shortName;
      if (parsed?.branding?.clubName) return parsed.branding.clubName;
    }
  } catch (e) {}
  if (typeof cmsContentState !== 'undefined' && cmsContentState?.branding) {
    if (cmsContentState.branding.shortName) return cmsContentState.branding.shortName;
    if (cmsContentState.branding.clubName) return cmsContentState.branding.clubName;
  }
  return 'Mercer Chiefs';
};

window.getActiveClubFullName = function () {
  const fullInput = document.getElementById('cms-brand-club-name');
  if (fullInput && fullInput.value.trim()) return fullInput.value.trim();
  try {
    const raw = localStorage.getItem('mercer_site_content');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.branding?.clubName) return parsed.branding.clubName;
    }
  } catch (e) {}
  if (typeof cmsContentState !== 'undefined' && cmsContentState?.branding?.clubName) {
    return cmsContentState.branding.clubName;
  }
  return 'Mercer Chiefs Hockey Club';
};

window.updateAdminHeaderAndConsole = function () {
  const shortName = window.getActiveClubShortName();
  const fullName = window.getActiveClubFullName();

  // 1. Top Navbar Title & Logo
  const titleEl = document.getElementById('admin-header-title');
  if (titleEl) titleEl.textContent = `${shortName} Admin`;

  const crestInput = document.getElementById('cms-brand-crest-url');
  let crestUrl = crestInput ? crestInput.value.trim() : null;
  if (!crestUrl) {
    try {
      const raw = localStorage.getItem('mercer_site_content');
      if (raw) {
        const parsed = JSON.parse(raw);
        crestUrl = parsed?.branding?.crestLogo;
      }
    } catch (e) {}
  }
  const crestEl = document.getElementById('admin-header-crest');
  if (crestEl && crestUrl) crestEl.src = crestUrl;
  const authCrestEl = document.getElementById('admin-auth-crest');
  if (authCrestEl && crestUrl) authCrestEl.src = crestUrl;

  // 2. Real-Time Sync Console text
  const consoleEl = document.getElementById('sync-console');
  if (consoleEl && consoleEl.innerHTML.includes('[READY]')) {
    consoleEl.innerHTML = `[READY] ${shortName} Data Engine initialized. Ready to sync feeds.
[ACTIVE FEED] Tier 1 Hockey Federation (THF) - Season 190 (2026/27)
[ACTIVE FEED] Atlantic Hockey Federation (AHF) - Season 190 (2026/27)
[ACTIVE FEED] USPHL NCDC & Premier - Season 67 (2026/27)`;
  }
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
      const err = await putRes.json().catch(() => ({}));
      const msg = err.message || '';
      if (msg.includes('Resource not accessible') || putRes.status === 403) {
        showToast('Upload failed: Token lacks "Contents: Read & write" permission', 'error');
        if (typeof window.openTokenPermissionModal === 'function') window.openTokenPermissionModal();
      } else {
        showToast(`Upload warning: ${msg || 'Saved locally only'}`);
      }
    }
  } catch (err) {
    console.error('Image upload failed:', err);
    showToast(`Image processing error: ${err.message}`);
  } finally {
    // Reset file input so user can re-select same file if desired
    fileInput.value = '';
  }
};
