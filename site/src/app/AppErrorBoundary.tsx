/**
 * Error boundary around the routed view: a render error inside a
 * view surfaces the shared `ErrorState` component instead of an unhandled
 * exception leaving a blank page. Deliberately a small hand-rolled class
 * component — the project has no `react-error-boundary` dependency and
 * `package.json` is out of this task's owned paths.
 *
 * Scoped around the routed content only (not the whole app) so the header
 * shell stays visible even when a view crashes.
 */
import { Component, type ReactNode } from "react";
import { ErrorState } from "../components/ErrorState";

export interface AppErrorBoundaryProps {
  /** Link target for the "view repository" action in the fallback UI. */
  repositoryUrl: string;
  children: ReactNode;
}

interface AppErrorBoundaryState {
  message: string | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  private handleRetry = (): void => {
    this.setState({ message: null });
  };

  render(): ReactNode {
    if (this.state.message !== null) {
      return (
        <ErrorState
          message={this.state.message}
          onRetry={this.handleRetry}
          repositoryUrl={this.props.repositoryUrl}
        />
      );
    }
    return this.props.children;
  }
}
