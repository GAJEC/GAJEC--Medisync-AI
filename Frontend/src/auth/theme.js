export const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light'
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export const animateTheme = (theme, origin, update) => {
  const root = document.documentElement
  const next = theme === 'dark' ? 'dark' : 'light'
  const commit = () => {
    applyTheme(next)
    update?.()
  }
  if (root.dataset.theme === next || prefersReducedMotion()) {
    commit()
    return
  }

  if (!document.startViewTransition) {
    root.classList.add('theme-fade')
    commit()
    window.setTimeout(() => root.classList.remove('theme-fade'), 450)
    return
  }

  const x = origin?.x ?? window.innerWidth / 2
  const y = origin?.y ?? window.innerHeight / 2
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const transition = document.startViewTransition(commit)
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 550, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
    .catch(() => {})
}

export const originOf = (event) => {
  const el = event?.currentTarget
  if (!el?.getBoundingClientRect) return undefined
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
