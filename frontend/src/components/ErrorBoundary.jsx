import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#222', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#ff4444' }}>Ups... Algo se rompió en la interfaz (React Crash)</h1>
          <p>La pantalla "negra" es en realidad este error que no estaba siendo atrapado:</p>
          <pre style={{ background: '#000', padding: '10px', overflowX: 'auto', color: '#00ff00' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button 
            onClick={() => window.location.href = '/'}
            style={{ padding: '10px 20px', background: '#00C9A7', color: '#000', border: 'none', cursor: 'pointer', marginTop: '20px' }}
          >
            Volver al inicio
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
