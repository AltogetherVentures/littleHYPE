import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <main className="page-narrow">
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to the start</Link>
      </p>
    </main>
  );
}
