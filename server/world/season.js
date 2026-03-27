const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

export function initSeason(db) {
  const existing = db.getSeason();
  if (!existing) {
    db.insertSeason('Spring');
  }
}

export function getCurrentSeason(db) {
  const row = db.getSeason();
  return row ? row.name : 'Spring';
}

export function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

// Call this on a schedule to advance seasons.
// Duration: SEASON_DURATION_HOURS (default 168h = 1 week per season).
export function advanceSeason(db) {
  const current = db.getSeason();
  const idx = SEASONS.indexOf(current?.name ?? 'Winter');
  const next = SEASONS[(idx + 1) % SEASONS.length];
  db.insertSeason(next);
  return next;
}
