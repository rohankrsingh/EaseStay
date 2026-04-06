import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found.</p>
      <Link to="/" className="underline underline-offset-4 hover:text-primary">
        Go home
      </Link>
    </main>
  )
}

export default NotFound
