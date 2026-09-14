export function uvClass(index) {
  if (index <= 2) return 'low'
  if (index <= 5) return 'moderate'
  if (index <= 7) return 'high'
  return 'extreme'
}