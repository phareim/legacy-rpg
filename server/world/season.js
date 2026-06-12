const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

// Deterministic weather per UTC day — same for every player, changes daily.
const WEATHER_BY_SEASON = {
  Spring: ['a soft drizzle', 'pale washed sunlight', 'mist threading between the trunks', 'a warm restless wind', 'the smell of wet earth after rain'],
  Summer: ['golden, dust-moted heat', 'deep dappled shade', 'a heavy stillness before thunder', 'a humming, pollen-thick breeze', 'sudden warm rain'],
  Autumn: ['leaves spiralling down', 'cold low fog', 'slanted amber light', 'a wind that smells of smoke', 'frost not quite melted in the shadows'],
  Winter: ['slow falling snow', 'brittle silver frost', 'an iron-grey stillness', 'a knifing wind from the north', 'ice creaking in the branches'],
};

export function initSeason(db) {
  if (!db.getSeason()) db.insertSeason('Spring');
}

function durationMs() {
  return Number(process.env.SEASON_DURATION_HOURS ?? 168) * 60 * 60 * 1000;
}

// Seasons advance lazily from the stored started_at, so server restarts
// never reset the clock. Each call catches up however many seasons have
// elapsed and persists the latest with its correct start time.
export function getCurrentSeason(db, now = Date.now()) {
  const row = db.getSeason();
  if (!row) {
    db.insertSeason('Spring');
    return 'Spring';
  }
  const dur = durationMs();
  let started = Date.parse(`${row.started_at.replace(' ', 'T')}Z`);
  if (!Number.isFinite(started)) return row.name;

  let name = row.name;
  let advanced = false;
  while (now - started >= dur) {
    name = SEASONS[(SEASONS.indexOf(name) + 1) % SEASONS.length];
    started += dur;
    advanced = true;
  }
  if (advanced) {
    db.insertSeason(name, new Date(started).toISOString().slice(0, 19).replace('T', ' '));
  }
  return name;
}

export function getTimeOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

export function getWeather(season, date = new Date()) {
  const day = Math.floor(date.getTime() / 86_400_000);
  const options = WEATHER_BY_SEASON[season] ?? WEATHER_BY_SEASON.Spring;
  return options[day % options.length];
}
