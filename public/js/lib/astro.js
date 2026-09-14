const SYNODIC_SECONDS = 2551442.796
const NEW_MOON_EPOCH = 947182440

export function moonPhase(unixSeconds) {
  const age = ((unixSeconds - NEW_MOON_EPOCH) % SYNODIC_SECONDS + SYNODIC_SECONDS) % SYNODIC_SECONDS
  return age / SYNODIC_SECONDS
}

export function moonPhaseLabel(phase) {
  if (phase >= 0.9375 || phase < 0.0625) return 'New Moon'
  if (phase < 0.1875) return 'Waxing Crescent'
  if (phase < 0.3125) return 'First Quarter'
  if (phase < 0.4375) return 'Waxing Gibbous'
  if (phase < 0.5625) return 'Full Moon'
  if (phase < 0.6875) return 'Waning Gibbous'
  if (phase < 0.8125) return 'Last Quarter'
  return 'Waning Crescent'
}