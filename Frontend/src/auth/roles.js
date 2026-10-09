export const ROLE_HOME = {
  patient: '/patient/dashboard',
  staff: '/staff/dashboard',
}

export const ROUTE_ROLES = [
  { prefix: '/patient', roles: ['patient'] },
  { prefix: '/staff', roles: ['staff'] },
]

export const PUBLIC_PATHS = ['/login']

export const hasHome = (role) => Object.hasOwn(ROLE_HOME, role)

export const homeFor = (role) => (hasHome(role) ? ROLE_HOME[role] : '/login')

export const isPublicPath = (pathname) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

export const rolesFor = (pathname) => {
  const match = ROUTE_ROLES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  return match ? match.roles : null
}
