import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  return <ClassErrorBoundary>{children}</ClassErrorBoundary>;
}

class ClassErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ fontFamily: 'sans-serif', padding: '40px', textAlign: 'center', background: '#f8fafc', color: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '500px', background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e3a8a', marginBottom: '10px' }}>Gracia Learning Centre ERP</h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>The application encountered an unexpected display glitch. Click below to reload.</p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}
