export function preferCityLabel(cityPlace, sectorPlace) {
  const label = (p) => p && p.name ? [p.name, p.state, p.country].filter(Boolean).join(', ') : null
  return label(cityPlace) || label(sectorPlace)
}