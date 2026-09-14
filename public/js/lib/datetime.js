const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function localDate(dtSec, tzOffsetSec) {
  return new Date((dtSec + tzOffsetSec) * 1000)
}

function hour12(date) {
  const h = date.getUTCHours()
  return (h % 12 || 12)
}

function ampm(date) {
  return date.getUTCHours() >= 12 ? 'PM' : 'AM'
}

export function hourLabel(dtSec, tzOffsetSec) {
  const d = localDate(dtSec, tzOffsetSec)
  return `${hour12(d)}:00 ${ampm(d)}`
}

export function clockLabel(sec, tzOffsetSec) {
  const d = localDate(sec, tzOffsetSec)
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hour12(d)}:${m} ${ampm(d)}`
}

export function dayLabel(dtSec, tzOffsetSec) {
  return DAY_LABELS[localDate(dtSec, tzOffsetSec).getUTCDay()]
}

export function shortDateLabel(dtSec, tzOffsetSec) {
  const d = localDate(dtSec, tzOffsetSec)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dayLabel(dtSec, tzOffsetSec)} ${dd}/${mm}`
}

export function updatedLabel(unixSec) {
  const d = new Date(unixSec * 1000)
  let h = d.getHours() % 12
  if (h === 0) h = 12
  const m = String(d.getMinutes()).padStart(2, '0')
  const suffix = d.getHours() >= 12 ? 'PM' : 'AM'
  return `${h}:${m} ${suffix}`
}