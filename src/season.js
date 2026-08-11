// Seasonal dress for the site, on the salon's own calendar. The UK's
// meteorological seasons switch on the 1st of March, June, September and
// December - computed in the salon's timezone, whatever the visitor's
// computer is set to. The season lands as data-season on <html>; index.css
// recolours the accent palette from it.

const SHOP_TZ = 'Europe/London'

export const SEASON_LABELS = {
  spring: '❀ Spring',
  summer: '☀ Summer',
  autumn: '🍂 Autumn',
  winter: '❄ Winter',
}

export function currentSeason(date = new Date()) {
  const month = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: SHOP_TZ, month: 'numeric' }).format(date)
  )
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

export function applySeason() {
  const set = () => {
    document.documentElement.dataset.season = currentSeason()
  }
  set()
  // A tab left open across a season boundary catches up within the hour.
  setInterval(set, 60 * 60 * 1000)
}
