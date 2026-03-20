import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="min-h-[300px] flex flex-col items-center justify-center p-8"
          style={{
            background: 'rgb(2 6 23)',
            border: '2px solid rgb(255 107 107)',
            fontFamily: 'Oswald, sans-serif',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              background: 'rgba(255,107,107,0.12)',
              border: '2px solid rgb(255 107 107)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <span style={{ color: 'rgb(255 107 107)', fontSize: 24, fontWeight: 900 }}>!</span>
          </div>
          <p
            style={{
              color: 'rgb(248 250 252)',
              fontWeight: 900,
              fontSize: 18,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 8,
            }}
          >
            Something went wrong
          </p>
          <p
            style={{
              color: 'rgb(148 163 184)',
              fontSize: 13,
              marginBottom: 24,
              textAlign: 'center',
              maxWidth: 400,
            }}
          >
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: 'rgb(255 107 107)',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              fontFamily: 'Oswald, sans-serif',
              fontWeight: 900,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
