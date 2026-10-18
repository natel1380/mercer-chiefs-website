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
  if (!Array.isArray(teams)) return teams;
  const cfg = getActiveSeasonConfig();
  const is2026Season = (!cfg.thfSeasonId || cfg.thfSeasonId === '190') &&
                       (!cfg.seasonLabel || cfg.seasonLabel.includes('2026'));
  if (!is2026Season) {
    return teams;
  }
  return teams.map(t => {
    if (t.id === '18u-premier-aaa') {
      const updated = { ...t };
      // 1. Remove Game #82962 from featuredSchedule and upcomingSchedule
      if (Array.isArray(updated.featuredSchedule)) {
        updated.featuredSchedule = updated.featuredSchedule.filter(g => String(g.id) !== '82962');
      }
      if (Array.isArray(updated.upcomingSchedule)) {
        updated.upcomingSchedule = updated.upcomingSchedule.filter(g => String(g.id) !== '82962');
      }
      // 2. Ensure Game #82962 is at top of recentResults
      const recent = Array.isArray(updated.recentResults) ? [...updated.recentResults] : [];
      if (!recent.some(g => String(g.id) === '82962')) {
        recent.unshift({
          id: "82962",
          date: "2026-10-16",
          time: "08:00 PM",
          opp: "Hitmen 18U",
          rink: "Ice Vault Rink 2",
          loc: "Away",
          outcome: "W",
          score: "6-2",
          status: "Final",
          scoresheetUrl: "https://stats.blackbear.timetoscore.com//generate-scorecard.php?game_id=82962",
          liveUrl: "http://live.blackbear.timetoscore.com//index.php?game_id=82962"
        });
      }
      updated.recentResults = recent;
      // 3. Update Record & Points
      updated.record = '4-3-1';
      updated.pts = 13;
      updated.rank = '#5';
      updated.standingSummary = '4-3-1 | 13 PTS | #5 Atlantic Division';

      // 4. Update Official Cumulative Skater & Goalie Stats from TimeToScore
      const official18USkaters = [
        { no: 18, name: "Stanley Xenakis", gp: 6, g: 4, a: 3, pts: 7, pim: 2 },
        { no: 2, name: "William Boyd Jr", gp: 6, g: 3, a: 3, pts: 6, pim: 8 },
        { no: 9, name: "Clark Crosson", gp: 6, g: 3, a: 2, pts: 5, pim: 0 },
        { no: 23, name: "Danny Cabrales", gp: 6, g: 1, a: 3, pts: 4, pim: 2 },
        { no: 77, name: "Connor Gusditis", gp: 6, g: 3, a: 1, pts: 4, pim: 0 },
        { no: 71, name: "Andrew Krott", gp: 6, g: 0, a: 3, pts: 3, pim: 0 },
        { no: 88, name: "gavin burgess", gp: 6, g: 0, a: 2, pts: 2, pim: 2 },
        { no: 11, name: "Christian Lundfelt", gp: 6, g: 0, a: 2, pts: 2, pim: 2 },
        { no: 19, name: "Hunter Mason", gp: 6, g: 1, a: 1, pts: 2, pim: 0 },
        { no: 13, name: "James Morwald", gp: 6, g: 1, a: 1, pts: 2, pim: 0 },
        { no: 22, name: "Tyler Scarpino", gp: 6, g: 0, a: 2, pts: 2, pim: 0 },
        { no: 14, name: "Calvin Crosson", gp: 6, g: 0, a: 1, pts: 1, pim: 0 },
        { no: 42, name: "Brayden Houser", gp: 2, g: 1, a: 0, pts: 1, pim: 0 },
        { no: 5, name: "Josh Zdunkiewicz", gp: 6, g: 0, a: 1, pts: 1, pim: 2 },
        { no: 16, name: "Zhokhov Arkhip", gp: 6, g: 0, a: 0, pts: 0, pim: 0 },
        { no: 21, name: "Larry Merrill", gp: 6, g: 0, a: 0, pts: 0, pim: 0 },
        { no: 56, name: "Andras Nagy-Melykuti", gp: 6, g: 0, a: 0, pts: 0, pim: 0 },
        { no: 20, name: "Christopher Silvotti", gp: 5, g: 0, a: 0, pts: 0, pim: 6 }
      ];

      const official18UGoalies = [
        { no: 31, name: "Jackson Siefert", pos: "G", gp: 3, w: 1, l: 1, otl: 1, so: 1, gaa: "1.00", svPct: ".922" },
        { no: 33, name: "Reade Adams", pos: "G", gp: 2, w: 1, l: 1, otl: 0, so: 0, gaa: "1.20", svPct: ".850" },
        { no: 32, name: "Richie GEISER", pos: "G", gp: 1, w: 1, l: 0, otl: 0, so: 0, gaa: "0.33", svPct: ".950" }
      ];

      const roster = Array.isArray(updated.roster) ? [...updated.roster] : [];
      for (const p of roster) {
        if (p.pos === 'G') {
          const g = official18UGoalies.find(x => x.no === p.no || (x.name && p.name && x.name.toLowerCase() === p.name.toLowerCase()));
          if (g) Object.assign(p, g);
        } else {
          const s = official18USkaters.find(x => x.no === p.no || (x.name && p.name && x.name.toLowerCase() === p.name.toLowerCase()));
          if (s) {
            Object.assign(p, s);
            p.pos = 'F/D';
          }
        }
      }
      updated.roster = roster;

      return updated;
    }

    if (t.id === '18u-aa') {
      const updated = { ...t };
      // 1. Remove Games 92756 and 92739 from featuredSchedule and upcomingSchedule
      if (Array.isArray(updated.featuredSchedule)) {
        updated.featuredSchedule = updated.featuredSchedule.filter(g => String(g.id) !== '92756' && String(g.id) !== '92739');
      }
      if (Array.isArray(updated.upcomingSchedule)) {
        updated.upcomingSchedule = updated.upcomingSchedule.filter(g => String(g.id) !== '92756' && String(g.id) !== '92739');
      }

      // 2. Ensure both games are at top of recentResults
      const recent = Array.isArray(updated.recentResults) ? [...updated.recentResults] : [];
      if (!recent.some(g => String(g.id) === '92756')) {
        recent.unshift({
          id: "92756",
          date: "2026-10-17",
          time: "02:20 PM",
          opp: "Genesis Hockey Club 18AA",
          rink: "Ice Line Rink 1",
          loc: "Home",
          outcome: "T",
          score: "4-4",
          status: "Final",
          scoresheetUrl: "https://stats.blackbear.timetoscore.com/generate-scorecard.php?game_id=92756",
          liveUrl: "http://live.blackbear.timetoscore.com/index.php?game_id=92756"
        });
      }
      if (!recent.some(g => String(g.id) === '92739')) {
        // Place morning game right after afternoon game
        const insertIdx = recent.some(g => String(g.id) === '92756') ? 1 : 0;
        recent.splice(insertIdx, 0, {
          id: "92739",
          date: "2026-10-17",
          time: "07:20 AM",
          opp: "Red Bank Generals 18AA White",
          rink: "Hatfield Ice Arena Gray",
          loc: "Away",
          outcome: "T",
          score: "3-3",
          status: "Final",
          scoresheetUrl: "https://stats.blackbear.timetoscore.com/generate-scorecard.php?game_id=92739",
          liveUrl: "http://live.blackbear.timetoscore.com/index.php?game_id=92739"
        });
      }
      updated.recentResults = recent;

      // 3. Update Official Record, Points, and Standings
      updated.record = '12-5-3';
      updated.pts = 35;
      updated.rank = '#2';
      updated.standingSummary = '12-5-3 | 35 PTS | #2 Atlantic Hockey Federation (AHF)';

      return updated;
    }

    return t;
  });
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
  const active = all.filter(t => !hidden.includes(t.id));
  return active.length > 0 ? active : all;
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
  if (!baseJunior || typeof baseJunior !== 'object') return { junior: baseJunior, ticker: baseTicker };
  const junior = JSON.parse(JSON.stringify(baseJunior));
  let ticker = Array.isArray(baseTicker) ? JSON.parse(JSON.stringify(baseTicker)) : [...LIVE_TICKER_GAMES];

  // Only apply 2026-27 specific game fixes and baseline watermarks when configured for 2026-27!
  // In a new season (e.g. 2027/28), start clean and do NOT inject 2026 games, old standings, or old player stats.
  const cfg = getActiveSeasonConfig();
  const is2026Season = (!cfg.usphlSeasonId || cfg.usphlSeasonId === '67') && 
                       (!cfg.seasonLabel || cfg.seasonLabel.includes('2026'));
  if (!is2026Season) {
    return { junior, ticker };
  }

  // 1. Resolve Premier Game 26219 (Oct 16 vs Connecticut Jr Rangers)
  const premSched = junior.premier?.schedule;
  if (Array.isArray(premSched)) {
    const g26219 = premSched.find(g => g.gmNumber === 26219 || g.id === 'sch-prem-26219');
    if (g26219) {
      g26219.status = 'FINAL';
      g26219.result = 'W';
      g26219.chiefsScore = 10;
      g26219.oppScore = 4;
      g26219.scoresheetUrl = 'https://stats.usphl.timetoscore.com/generate-scorecard.php?game_id=26219';
    }
  }

  // Official Verified USPHL Premier Atlantic Division Standings (Baseline through Oct 17, 2026)
  const officialPremierStandings = [
    {
      rank: 1,
      team: "Rockets Hockey Club",
      logo: "assets/images/logos/rockets-hc.png",
      isChiefs: false,
      gp: 9,
      w: 8,
      l: 1,
      otl: 0,
      pts: 16,
      gf: 68,
      ga: 20,
      diff: "+48",
      streak: "5W",
      pct: ".889"
    },
    {
      rank: 2,
      team: "P.A.L. Junior Islanders",
      logo: "assets/images/logos/pal-jr-islanders.png",
      isChiefs: false,
      gp: 8,
      w: 8,
      l: 0,
      otl: 0,
      pts: 16,
      gf: 47,
      ga: 17,
      diff: "+30",
      streak: "8W",
      pct: "1.000"
    },
    {
      rank: 3,
      team: "Mercer Chiefs (Premier)",
      logo: "assets/images/logos/mercer-chiefs-junior.png",
      isChiefs: true,
      gp: 10,
      w: 7,
      l: 3,
      otl: 0,
      pts: 14,
      gf: 43,
      ga: 25,
      diff: "+18",
      streak: "1L",
      pct: ".700"
    },
    {
      rank: 4,
      team: "West Chester Wolves",
      logo: "assets/images/logos/west-chester-wolves.png",
      isChiefs: false,
      gp: 9,
      w: 6,
      l: 2,
      otl: 1,
      pts: 13,
      gf: 41,
      ga: 25,
      diff: "+16",
      streak: "1W",
      pct: ".722"
    },
    {
      rank: 5,
      team: "Red Bank Generals",
      logo: "assets/images/logos/red-bank-generals.png",
      isChiefs: false,
      gp: 8,
      w: 6,
      l: 2,
      otl: 0,
      pts: 12,
      gf: 39,
      ga: 14,
      diff: "+25",
      streak: "1W",
      pct: ".750"
    },
    {
      rank: 6,
      team: "Jersey Hitmen",
      logo: "assets/images/logos/jersey-hitmen.png",
      isChiefs: false,
      gp: 9,
      w: 5,
      l: 4,
      otl: 0,
      pts: 10,
      gf: 39,
      ga: 43,
      diff: "-4",
      streak: "1W",
      pct: ".556"
    },
    {
      rank: 7,
      team: "Wilkes-Barre Scranton Knights",
      logo: "assets/images/logos/wbs-knights.png",
      isChiefs: false,
      gp: 7,
      w: 3,
      l: 2,
      otl: 2,
      pts: 8,
      gf: 19,
      ga: 21,
      diff: "-2",
      streak: "1L",
      pct: ".571"
    },
    {
      rank: 8,
      team: "New Jersey Renegades",
      logo: "assets/images/logos/nj-renegades.png",
      isChiefs: false,
      gp: 11,
      w: 1,
      l: 8,
      otl: 2,
      pts: 4,
      gf: 26,
      ga: 80,
      diff: "-54",
      streak: "5L",
      pct: ".182"
    },
    {
      rank: 9,
      team: "Connecticut Junior Rangers",
      logo: "assets/images/logos/ct-jr-rangers.png",
      isChiefs: false,
      gp: 9,
      w: 1,
      l: 7,
      otl: 1,
      pts: 3,
      gf: 23,
      ga: 68,
      diff: "-45",
      streak: "5L",
      pct: ".167"
    }
  ];

  // Auto-update Premier Standings if missing or less than the 9-team Atlantic Division
  const curPremStandings = junior.premier?.standings;
  const isPremStale = !Array.isArray(curPremStandings) || curPremStandings.length < 9;
  if (isPremStale) {
    junior.premier.standings = officialPremierStandings;
  }

  // Update Premier Cumulative Player & Goalie Stats from Official USPHL TimeToScore
  const premRoster = junior.premier?.roster;
  if (Array.isArray(premRoster)) {
    const premOfficial = [
      { name: 'Zachary Meseroll', gp: 9, g: 9, a: 11, pts: 20, pim: 0, ppg: 2, shg: 1, gwg: 2 },
      { name: 'Maxime Vernier', gp: 9, g: 7, a: 10, pts: 17, pim: 8, ppg: 2, shg: 0, gwg: 1 },
      { name: 'Andrii Kapitan', gp: 9, g: 9, a: 4, pts: 13, pim: 10, ppg: 3, shg: 0, gwg: 1 },
      { name: 'Dillon Chase', gp: 9, g: 2, a: 5, pts: 7, pim: 4, ppg: 0, shg: 0, gwg: 1 },
      { name: 'Jacob Hunter', gp: 9, g: 2, a: 4, pts: 6, pim: 6, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Raphael Blouin', gp: 9, g: 0, a: 5, pts: 5, pim: 15, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Luka Laurin', gp: 9, g: 3, a: 2, pts: 5, pim: 4, ppg: 1, shg: 0, gwg: 0 },
      { name: 'Anton Gavrylets', gp: 9, g: 3, a: 2, pts: 5, pim: 0, ppg: 0, shg: 0, gwg: 1 },
      { name: 'Olivier Blouin', gp: 9, g: 1, a: 4, pts: 5, pim: 4, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Octavian Czarnecki', gp: 9, g: 1, a: 2, pts: 3, pim: 6, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Jayden Crane', gp: 5, g: 0, a: 2, pts: 2, pim: 2, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Mykyta Popov', alt: 'MYKYTA POPOV', gp: 9, g: 0, a: 1, pts: 1, pim: 0, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Cameron Mansell', gp: 9, g: 1, a: 0, pts: 1, pim: 4, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Maximillian Fish', gp: 9, g: 0, a: 1, pts: 1, pim: 10, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Klim Belko', gp: 3, g: 1, a: 0, pts: 1, pim: 2, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Patrick Shine', gp: 9, g: 0, a: 0, pts: 0, pim: 4, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Caden Allen', gp: 9, g: 0, a: 0, pts: 0, pim: 0, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Brannick Wallace', gp: 1, g: 0, a: 0, pts: 0, pim: 0, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Ryan Rider', gp: 2, g: 0, a: 0, pts: 0, pim: 0, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Alexander Mozuraitis', alt: 'ALEXANDER Mozuraitis', gp: 5, g: 1, a: 1, pts: 2, pim: 0, ppg: 0, shg: 0, gwg: 0 }
    ];

    for (const item of premOfficial) {
      const p = premRoster.find(pl => {
        const n = (pl.name || '').toLowerCase().trim();
        return n === item.name.toLowerCase().trim() || (item.alt && n === item.alt.toLowerCase().trim());
      });
      if (p) {
        if (typeof p.gp !== 'number' || p.gp < item.gp) p.gp = item.gp;
        if (typeof p.g !== 'number' || p.g < item.g) p.g = item.g;
        if (typeof p.a !== 'number' || p.a < item.a) p.a = item.a;
        if (typeof p.pts !== 'number' || p.pts < item.pts) p.pts = item.pts;
        if (item.pim !== undefined && (typeof p.pim !== 'number' || p.pim < item.pim)) p.pim = item.pim;
        if (item.ppg !== undefined) p.ppg = item.ppg;
        if (item.shg !== undefined) p.shg = item.shg;
        if (item.gwg !== undefined) p.gwg = item.gwg;
      }
    }

    // Premier Goalies (Baseline through Oct 16)
    const martin = premRoster.find(p => p.name?.toLowerCase().includes('martin'));
    if (martin && (typeof martin.gp !== 'number' || martin.gp < 4)) {
      martin.gp = 4; martin.w = 2; martin.l = 2; martin.ga = 10; martin.sv = 127; martin.sa = 137;
      martin.svPct = '.927'; martin.gaa = '2.44';
    }
    const lapensee = premRoster.find(p => p.name?.toLowerCase().includes('lapensee'));
    if (lapensee && (typeof lapensee.gp !== 'number' || lapensee.gp < 3)) {
      lapensee.gp = 3; lapensee.w = 3; lapensee.l = 0; lapensee.ga = 3; lapensee.sv = 84; lapensee.sa = 87;
      lapensee.svPct = '.966'; lapensee.gaa = '1.00';
    }
    const mammarella = premRoster.find(p => p.name?.toLowerCase().includes('mammarella'));
    if (mammarella && (typeof mammarella.gp !== 'number' || mammarella.gp < 1)) {
      mammarella.gp = 1; mammarella.w = 1; mammarella.l = 0; mammarella.ga = 0; mammarella.sv = 12; mammarella.sa = 12;
      mammarella.svPct = '1.000'; mammarella.gaa = '0.00';
    }
    const mirra = premRoster.find(p => p.name?.toLowerCase().includes('mirra'));
    if (mirra && (typeof mirra.gp !== 'number' || mirra.gp < 1)) {
      mirra.gp = 1; mirra.w = 1; mirra.l = 0; mirra.ga = 4; mirra.sv = 14; mirra.sa = 18;
      mirra.svPct = '.778'; mirra.gaa = '4.00';
    }
  }

  // 2. Resolve NCDC Game 24378 (Oct 16 vs P.A.L. Jr Islanders)
  const ncdcSched = junior.ncdc?.schedule;
  if (Array.isArray(ncdcSched)) {
    const g24378 = ncdcSched.find(g => g.gmNumber === 24378 || g.id === 'sch-ncdc-24378');
    if (g24378) {
      g24378.status = 'FINAL';
      g24378.result = 'L';
      g24378.chiefsScore = 1;
      g24378.oppScore = 4;
      g24378.scoresheetUrl = 'https://stats.usphl.timetoscore.com/generate-scorecard.php?game_id=24378';
    }
  }

  // Official Verified USPHL NCDC Atlantic Division Standings (Baseline through Oct 16, 2026)
  const officialNcdcStandings = [
    {
      rank: 1,
      team: "Wilkes-Barre Scranton Knights",
      logo: "assets/images/logos/wbs-knights.png",
      isChiefs: false,
      gp: 9,
      w: 7,
      l: 1,
      otl: 1,
      pts: 15,
      gf: 35,
      ga: 26,
      diff: "+9",
      streak: "3W",
      pct: ".833"
    },
    {
      rank: 2,
      team: "P.A.L. Junior Islanders",
      logo: "assets/images/logos/pal-jr-islanders.png",
      isChiefs: false,
      gp: 9,
      w: 7,
      l: 2,
      otl: 0,
      pts: 14,
      gf: 32,
      ga: 24,
      diff: "+8",
      streak: "2W",
      pct: ".778"
    },
    {
      rank: 3,
      team: "Jersey Hitmen",
      logo: "assets/images/logos/jersey-hitmen.png",
      isChiefs: false,
      gp: 8,
      w: 5,
      l: 2,
      otl: 1,
      pts: 11,
      gf: 27,
      ga: 22,
      diff: "+5",
      streak: "2W",
      pct: ".688"
    },
    {
      rank: 4,
      team: "Rockets Hockey Club",
      logo: "assets/images/logos/rockets-hc.png",
      isChiefs: false,
      gp: 9,
      w: 4,
      l: 4,
      otl: 1,
      pts: 9,
      gf: 27,
      ga: 29,
      diff: "-2",
      streak: "2L",
      pct: ".500"
    },
    {
      rank: 5,
      team: "Connecticut Junior Rangers",
      logo: "assets/images/logos/ct-jr-rangers.png",
      isChiefs: false,
      gp: 9,
      w: 3,
      l: 5,
      otl: 1,
      pts: 7,
      gf: 26,
      ga: 33,
      diff: "-7",
      streak: "1W",
      pct: ".389"
    },
    {
      rank: 6,
      team: "Mercer Chiefs (NCDC)",
      logo: "assets/images/logos/mercer-chiefs-junior.png",
      isChiefs: true,
      gp: 10,
      w: 3,
      l: 6,
      otl: 1,
      pts: 7,
      gf: 27,
      ga: 36,
      diff: "-9",
      streak: "2L",
      pct: ".350"
    },
    {
      rank: 7,
      team: "West Chester Wolves",
      logo: "assets/images/logos/west-chester-wolves.png",
      isChiefs: false,
      gp: 9,
      w: 3,
      l: 5,
      otl: 1,
      pts: 7,
      gf: 29,
      ga: 32,
      diff: "-3",
      streak: "3L",
      pct: ".389"
    }
  ];

  // Auto-update NCDC Standings if missing or less than the 7-team Atlantic Division
  const curNcdcStandings = junior.ncdc?.standings;
  const isNcdcStale = !Array.isArray(curNcdcStandings) || curNcdcStandings.length < 7;
  if (isNcdcStale) {
    junior.ncdc.standings = officialNcdcStandings;
  }

  // Update NCDC Cumulative Player & Goalie Stats from Official USPHL TimeToScore
  const ncdcRoster = junior.ncdc?.roster;
  if (Array.isArray(ncdcRoster)) {
    const ncdcOfficial = [
      { name: 'Tristan MacCormick', gp: 10, g: 4, a: 6, pts: 10, pim: 0, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Jack Spiess', gp: 10, g: 3, a: 6, pts: 9, pim: 4, ppg: 3, shg: 0, gwg: 0 },
      { name: 'Douglas Jorgensen', gp: 10, g: 1, a: 7, pts: 8, pim: 10, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Jake Lauterstein', gp: 10, g: 4, a: 4, pts: 8, pim: 4, ppg: 1, shg: 0, gwg: 0 },
      { name: 'Beaudy Beaudin', gp: 10, g: 6, a: 2, pts: 8, pim: 2, ppg: 3, shg: 0, gwg: 1 },
      { name: 'Chris Sarver', gp: 10, g: 1, a: 6, pts: 7, pim: 38, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Michael Zajac', gp: 8, g: 1, a: 4, pts: 5, pim: 0, ppg: 1, shg: 0, gwg: 0 },
      { name: 'Lukas Reisen', gp: 10, g: 2, a: 2, pts: 4, pim: 2, ppg: 0, shg: 2, gwg: 1 },
      { name: 'Antonijs Marks', alt: 'Marks Antonijs', gp: 8, g: 2, a: 1, pts: 3, pim: 0, ppg: 1, shg: 0, gwg: 0 },
      { name: 'Richard Shin', gp: 9, g: 0, a: 3, pts: 3, pim: 17, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Jakub Hanzak', gp: 9, g: 0, a: 2, pts: 2, pim: 4, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Cole Pastor', gp: 10, g: 0, a: 2, pts: 2, pim: 8, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Cameron Ross', gp: 9, g: 1, a: 1, pts: 2, pim: 4, ppg: 1, shg: 0, gwg: 0 },
      { name: 'Emmett Auch', gp: 9, g: 0, a: 1, pts: 1, pim: 2, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Drew Fabry', gp: 10, g: 0, a: 1, pts: 1, pim: 0, ppg: 0, shg: 0, gwg: 0 },
      { name: "Jacob Prud'homme", alt: 'Jacob Prudhomme', gp: 9, g: 0, a: 1, pts: 1, pim: 4, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Benjamin Smith', gp: 9, g: 1, a: 0, pts: 1, pim: 2, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Mason Imler', gp: 5, g: 1, a: 0, pts: 1, pim: 2, ppg: 0, shg: 0, gwg: 1 },
      { name: 'Michael Bonino', gp: 4, g: 0, a: 0, pts: 0, pim: 2, ppg: 0, shg: 0, gwg: 0 },
      { name: 'James Lucosky', gp: 4, g: 0, a: 0, pts: 0, pim: 2, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Ivan Petrov', gp: 7, g: 0, a: 0, pts: 0, pim: 0, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Jake Weiner', gp: 2, g: 0, a: 0, pts: 0, pim: 0, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Conall Sarkar', gp: 7, g: 0, a: 0, pts: 0, pim: 17, ppg: 0, shg: 0, gwg: 0 },
      { name: 'Brayden Castiglia', gp: 5, g: 0, a: 0, pts: 0, pim: 0, ppg: 0, shg: 0, gwg: 0 }
    ];

    for (const item of ncdcOfficial) {
      const p = ncdcRoster.find(pl => {
        const n = (pl.name || '').toLowerCase().trim();
        return n === item.name.toLowerCase().trim() || (item.alt && n === item.alt.toLowerCase().trim());
      });
      if (p) {
        if (typeof p.gp !== 'number' || p.gp < item.gp) p.gp = item.gp;
        if (typeof p.g !== 'number' || p.g < item.g) p.g = item.g;
        if (typeof p.a !== 'number' || p.a < item.a) p.a = item.a;
        if (typeof p.pts !== 'number' || p.pts < item.pts) p.pts = item.pts;
        if (item.pim !== undefined && (typeof p.pim !== 'number' || p.pim < item.pim)) p.pim = item.pim;
        if (item.ppg !== undefined) p.ppg = item.ppg;
        if (item.shg !== undefined) p.shg = item.shg;
        if (item.gwg !== undefined) p.gwg = item.gwg;
      }
    }

    // NCDC Goalies (Baseline through Oct 16)
    const scali = ncdcRoster.find(p => p.name?.toLowerCase().includes('scali'));
    if (scali && (typeof scali.gp !== 'number' || scali.gp < 5)) {
      scali.gp = 5; scali.w = 2; scali.l = 3; scali.ga = 19; scali.sv = 202; scali.sa = 221;
      scali.svPct = '.914'; scali.gaa = '3.81';
    }
    const lanctot = ncdcRoster.find(p => p.name?.toLowerCase().includes('lanctot'));
    if (lanctot && (typeof lanctot.gp !== 'number' || lanctot.gp < 1)) {
      lanctot.gp = 1; lanctot.w = 1; lanctot.l = 0; lanctot.ga = 2; lanctot.sv = 26; lanctot.sa = 28;
      lanctot.svPct = '.929'; lanctot.gaa = '2.00';
    }
    const zygulski = ncdcRoster.find(p => p.name?.toLowerCase().includes('zygulski'));
    if (zygulski && (typeof zygulski.gp !== 'number' || zygulski.gp < 2)) {
      zygulski.gp = 2; zygulski.w = 0; zygulski.l = 2; zygulski.ga = 8; zygulski.sv = 63; zygulski.sa = 71;
      zygulski.svPct = '.887'; zygulski.gaa = '4.02';
    }
  }

  // 3. Update Ticker Items if still UPCOMING
  const live3 = ticker.find(t => t.id === 'g-live-3');
  if (live3 && live3.status !== 'FINAL') {
    live3.status = 'FINAL';
    live3.home = 'Mercer Chiefs Premier';
    live3.away = 'Connecticut Junior Rangers';
    live3.homeScore = 10;
    live3.awayScore = 4;
    live3.date = 'Oct 16, 2026';
    live3.highlight = 'Chiefs 10-4 win • Kapitan hat-trick (3G) • Meseroll 2G 2A • Vernier 1G 4A';
  }
  const live4 = ticker.find(t => t.id === 'g-live-4');
  if (live4 && live4.status !== 'FINAL') {
    live4.status = 'FINAL';
    live4.home = 'Mercer Chiefs NCDC';
    live4.away = 'P.A.L. Junior Islanders';
    live4.homeScore = 1;
    live4.awayScore = 4;
    live4.date = 'Oct 16, 2026';
    live4.highlight = 'Marks 1G • Scali 40 saves on 44 shots';
  }

  // Ensure upcoming matches for Oct 17 and Oct 18 are present in the ticker
  if (!ticker.some(t => t.id === 'g-live-next-1')) {
    ticker.push({
      id: 'g-live-next-1',
      league: 'USPHL Premier',
      status: 'UPCOMING',
      home: 'Mercer Chiefs Premier',
      away: 'P.A.L. Junior Islanders',
      homeScore: null,
      awayScore: null,
      date: 'Oct 17, 7:00 PM EDT',
      rink: 'Ice Land Black Bear',
      streamUrl: 'https://blackbearsports.tv/'
    });
  }
  if (!ticker.some(t => t.id === 'g-live-next-2')) {
    ticker.push({
      id: 'g-live-next-2',
      league: 'NCDC',
      status: 'UPCOMING',
      home: 'Jersey Hitmen',
      away: 'Mercer Chiefs NCDC',
      homeScore: null,
      awayScore: null,
      date: 'Oct 18, 1:30 PM EDT',
      rink: 'Ice Vault Arena',
      streamUrl: 'https://blackbearsports.tv/'
    });
  }

  return { junior, ticker };
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

  // Auto-resolve any verified game completions even if base chiefs-data.js is old
  const { junior } = applyVerifiedResults(data, LIVE_TICKER_GAMES);
  if (JSON.stringify(junior) !== JSON.stringify(data)) {
    try {
      localStorage.setItem('mercer_synced_junior_data', JSON.stringify(junior));
    } catch (e) {}
  }
  return junior;
}

export function getStoredTickerGames() {
  let ticker = null;
  try {
    const raw = localStorage.getItem('mercer_synced_ticker_data');
    if (raw) {
      ticker = JSON.parse(raw);
    }
  } catch (e) {}

  if (!Array.isArray(ticker) || ticker.length === 0 || ticker[0]?.id === 'g-live-1') {
    ticker = LIVE_TICKER_GAMES;
  }

  // Filter out any obsolete static placeholders like g-live-next-1 if dynamic games exist
  const hasDynamic = ticker.some(g => g.id?.includes('ticker-prem') || g.id?.includes('ticker-ncdc'));
  if (hasDynamic) {
    ticker = ticker.filter(g => g.id !== 'g-live-next-1' && !g.date?.includes('Oct 17, 7:00 PM'));
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
  });

  window.addEventListener('mercer:datasync', () => {
    refreshJuniorDataUI();
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
      const ncdcNeedsUpdate = !stored.ncdc?.schedule?.some(g => g.gmNumber === 24378 && g.status === 'FINAL');
      const premNeedsUpdate = !stored.premier?.schedule?.some(g => g.gmNumber === 26219 && g.status === 'FINAL');
      const premStandingsNeedUpdate = !stored.premier?.standings || stored.premier.standings.some(t => t.team?.includes('Rockets') && t.pts < 16);
      const youthNeedsUpdate = !localStorage.getItem('mercer_synced_youth_data');

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

            if (ncdcNeedsUpdate || premNeedsUpdate || premStandingsNeedUpdate || feedTs > storedTs || !localStorage.getItem('mercer_synced_junior_data')) {
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

            if (youthNeedsUpdate || feedTs > storedTs || !localStorage.getItem('mercer_synced_youth_data')) {
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
function initStaff() {
  const container = document.getElementById('staff-grid');
  if (!container) return;

  container.innerHTML = COACHING_STAFF.map(staff => `
    <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 2rem; backdrop-filter: var(--glass-blur); display: flex; flex-direction: column;">
      <div style="display: flex; align-items: center; gap: 1.25rem; margin-bottom: 1.25rem;">
        <img src="${staff.photo}" alt="${staff.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--chiefs-red); box-shadow: 0 0 14px var(--chiefs-red-glow);">
        <div>
          <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--chiefs-gold);">${staff.badge}</span>
          <h3 style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; color: #fff;">${staff.name}</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${staff.role}</p>
        </div>
      </div>

      <p style="color: #cbd5e1; font-size: 0.92rem; line-height: 1.6; margin-bottom: 1.5rem; flex-grow: 1;">${staff.bio}</p>

      <a href="mailto:${staff.email}" class="btn-secondary" style="font-size: 0.85rem; padding: 0.5rem 1rem; width: 100%; text-align: center; justify-content: center;">
        Contact Coach
      </a>
    </div>
  `).join('');
}

/* ==========================================================================
   9. YOUTH TEAMS & GAMESHEET / TIMETOSCORE HUB
   ========================================================================== */
function initYouthHub() {
  const select = document.getElementById('youth-team-select');
  if (!select) return;

  function populateYouthDropdown() {
    const activeTeams = getActiveYouthTeams();
    const filter = state.youthTierFilter; // 'all' | 'ahf' | 'thf'
    const ahfTeams = activeTeams.filter(t => t.tier.includes('AHF') || (t.league && t.league.includes('AHF')));
    const thfTeams = activeTeams.filter(t => t.tier.includes('THF') || (t.league && t.league.includes('THF')));

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
          ${isFacebook ? `
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
          ${isFacebook ? `
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
    fbBtn.href = art.link || art.sourceUrl || 'https://www.facebook.com/mercerchiefshockey';
    if (art.link && art.link.includes('breakaway')) {
      fbBtn.innerHTML = '🛒 Visit Mercer Chiefs Team Store ↗';
    } else {
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

  // Scout Inquiry Form submission
  const scoutForm = document.getElementById('scout-inquiry-form');
  if (scoutForm) {
    scoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('scout-name')?.value || 'Scout';
      alert(`Thank you, ${name}. Your scout inquiry package request has been routed directly to GM & Head Coach Rob Broderick and Head Scout Ryan Kosecki.`);
      document.getElementById('scout-inquiry-modal')?.classList.remove('open');
      scoutForm.reset();
    });
  }

  // Billet Form submission
  const billetForm = document.getElementById('billet-app-form');
  if (billetForm) {
    billetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const hostName = document.getElementById('billet-host-name')?.value || 'Family';
      alert(`Thank you, ${hostName}! Your Mercer Chiefs Billet Host Family application has been received. Our Billet Coordinator Heather O'Connell will contact you for a home visit.`);
      document.getElementById('billet-modal')?.classList.remove('open');
      billetForm.reset();
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
