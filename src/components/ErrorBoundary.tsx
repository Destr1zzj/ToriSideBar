import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Tori] React ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: "100vw",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#1e1e22",
            color: "#e4e4e7",
            fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
            gap: "16px",
            padding: "24px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: "48px" }}>💥</div>
          <div style={{ fontSize: "18px", fontWeight: 600 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", maxWidth: "400px", textAlign: "center" }}>
            {this.state.error?.message || "Unknown error"}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "8px",
              padding: "8px 20px",
              borderRadius: "8px",
              border: "none",
              background: "#0ea5e9",
              color: "white",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
