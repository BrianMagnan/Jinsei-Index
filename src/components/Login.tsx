import { useState } from "react";
import { authAPI, setAuthToken, setCurrentUser } from "../services/api";
import type { Profile } from "../types";
import { Spinner } from "./Spinner";

interface LoginProps {
  onLoginSuccess: (profile: Profile) => void;
  onSwitchToRegister: () => void;
}

export function Login({ onLoginSuccess, onSwitchToRegister }: LoginProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [useEmail, setUseEmail] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loginData = useEmail ? { email, password } : { name, password };
      const response = await authAPI.login(loginData);

      // Store token and user
      setAuthToken(response.token);
      setCurrentUser(response.profile);

      // Call success callback
      onLoginSuccess(response.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <div className="auth-toggle">
              <button
                type="button"
                className={`toggle-button ${useEmail ? "active" : ""}`}
                onClick={() => setUseEmail(true)}
              >
                Email
              </button>
              <button
                type="button"
                className={`toggle-button ${!useEmail ? "active" : ""}`}
                onClick={() => setUseEmail(false)}
              >
                Name
              </button>
            </div>
          </div>
          {useEmail ? (
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="Enter your email"
              />
            </div>
          ) : (
            <div className="auth-field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                placeholder="Enter your name"
              />
            </div>
          )}
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" />
                <span>Logging in...</span>
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>
        <div className="auth-switch">
          <p>
            Don't have an account?{" "}
            <button
              type="button"
              className="auth-link"
              onClick={onSwitchToRegister}
            >
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
