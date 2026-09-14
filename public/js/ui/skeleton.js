export function skeleton(lines = 3) {
  const slots = Array.from({ length: lines }, (_, i) => `<div class="skeleton-line ${i === 0 ? 'tall' : ''}"></div>`).join('')
  return `<div class="skeleton-block">${slots}</div>`
}

export function renderHeaderSkeleton() {
  return `<div class="skeleton-block"><div class="skeleton-line short"></div></div>`
}