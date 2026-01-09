import { Component, type ReactNode } from "react";
import { hapticFeedback } from "../utils/haptic";
import "../App.css";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Log error details for debugging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Store error in localStorage for debugging (last 5 errors)
    try {
      const errorLog = JSON.parse(localStorage.getItem("errorLog") || "[]");
      errorLog.unshift(errorDetails);
      // Keep only last 5 errors
      if (errorLog.length > 5) {
        errorLog.pop();
      }
      localStorage.setItem("errorLog", JSON.stringify(errorLog));
    } catch (e) {
      // Silently fail if localStorage is not available
    }

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    hapticFeedback.medium();
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    hapticFeedback.medium();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h2 className="error-boundary-title">Something went wrong</h2>
            <p className="error-boundary-message">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary-details">
                <summary className="error-boundary-summary">Error Details (Dev Only)</summary>
                <div className="error-boundary-error">
                  <strong>Error:</strong> {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <pre className="error-boundary-stack">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
            <div className="error-boundary-actions">
              <button
                className="error-boundary-button primary"
                onClick={this.handleReset}
              >
                Try Again
              </button>
              <button
                className="error-boundary-button secondary"
                onClick={this.handleReload}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
