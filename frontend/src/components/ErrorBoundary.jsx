import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
          <p className="text-slate-600">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-2xl bg-[#1a3c2e] px-6 py-3 text-white font-semibold hover:bg-[#2a5c46]"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
