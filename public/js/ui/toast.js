export function showToast(message, kind = 'info') {
  const el = document.getElementById('toast')
  el.textContent = message
  el.className = `toast toast-${kind} show`
  clearTimeout(el._t)
  el._t = setTimeout(() => {
    el.className = 'toast'
  }, 4000)
}