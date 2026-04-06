// Page barrel — import from here so routes stay clean
// Vercel rule: bundle-barrel-imports — use direct imports in components to avoid
// pulling in unused pages. This barrel is ONLY for the router definition in main.jsx.
export { default as Home } from './Home'
export { default as Login } from './Login'
export { default as Signup } from './Signup'
export { default as NotFound } from './NotFound'
