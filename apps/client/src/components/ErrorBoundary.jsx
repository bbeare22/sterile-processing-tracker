import React from 'react';

import logger from '../utils/logger';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logger.error('[ErrorBoundary]', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 24,
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            background: 'var(--color-surface)',
            boxShadow: 'var(--shadow-soft)',
            maxWidth: 720,
            margin: '48px auto',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
          <p style={{ opacity: 0.85, marginBottom: 16 }}>
            An unexpected error occurred while rendering this page.
          </p>
          <details
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: 12,
              opacity: 0.75,
              marginBottom: 16,
            }}
          >
            {String(this.state.error || '')}
          </details>
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid var(--color-brand)',
              background: 'var(--color-brand)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
