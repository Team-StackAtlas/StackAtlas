import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Isolates a single admin tab so a render crash in one section (Import,
 * Source Library, Findings, History) never takes down the others. Since
 * each tab conditionally mounts/unmounts its section, switching tabs away
 * and back also clears a crash; "Try again" clears it in place.
 */
export default class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Admin Research section crashed', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">This section hit an unexpected error.</p>
            <p className="mt-1 text-red-600 dark:text-red-400">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-2 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-200"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
