import { Component, type ErrorInfo, type ReactNode } from "react";

// Last-resort guard: a render error in one page shows a recovery screen instead of a blank white page.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Unhandled UI error:", error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-xl font-semibold">Something went wrong</p>
        <p className="max-w-md text-sm text-muted-foreground">An unexpected error occurred. Reloading usually fixes it.</p>
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}
