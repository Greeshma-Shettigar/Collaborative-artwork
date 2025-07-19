import React, { useState, useEffect, useRef } from "react";
import "./LandingPage.css";
import { useNavigate } from "react-router-dom";

import hero from "./hero-bg.jpg";
import art1 from "./art1.jpg";
import art2 from "./art2.jpg";
import art3 from "./art3.jpg";

export default function LandingPage() {
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("create");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [roomStep, setRoomStep] = useState(0);
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleStartDrawing = () => setRoomStep(1);

  const handleJoinRoom = async () => {
    if (isMounted.current) setLoading(true);
    if (!roomId || !name) {
      alert("Please enter both your name and Room ID.");
      if (isMounted.current) setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login or create an account first.");
      if (isMounted.current) setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/join-room`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ roomId }),
        }
      );

      const data = await res.json();
      if (isMounted.current) {
        if (res.ok) {
          navigate(`/canvas/${roomId}`, {
            state: { me: name },
          });
        } else {
          alert(data.message);
        }
      }
    } catch (err) {
      if (isMounted.current) {
        alert("Error joining room. Please check your network connection.");
        console.error("Join room failed:", err);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (isMounted.current) setLoading(true);
    if (!roomId || !name) {
      alert("Please enter both your name and Room ID.");
      if (isMounted.current) setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login or create an account first.");
      if (isMounted.current) setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/create-room`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name, roomId }),
        }
      );

      const data = await res.json();
      if (isMounted.current) {
        if (res.ok) {
          const link = `${window.location.origin}/canvas/${roomId}`;
          setShareableLink(link);
          setShowLinkModal(true);
          setPendingRedirect(true);
        } else {
          alert(data.message);
        }
      }
    } catch (err) {
      if (isMounted.current) {
        console.error("Create room failed:", err);
        alert("Error creating room. Please check your network connection.");
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleAuthClick = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleLogout = async () => {
    if (isMounted.current) setLogoutLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (res.ok) {
        alert('Logged out successfully');
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Logout failed: An unexpected error occurred.');
        console.error('Logout failed with status:', res.status, errorData);
      }
    } catch (err) {
      console.error('Logout failed:', err);
      alert('Server error during logout: Could not connect to the server.');
    } finally {
      localStorage.removeItem('token');
      if (isMounted.current) setLogoutLoading(false);
      window.location.reload();
    }
  };

  const handleCreateAccount = async () => {
    if (isMounted.current) setAuthLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: name, password }),
        }
      );
      const data = await res.json();
      if (isMounted.current) {
        if (res.ok) {
          alert(data.message || "Account created!");
          closeModals();
        } else {
          alert(data.message || "Registration failed");
        }
      }
    } catch (err) {
      if (isMounted.current) {
        alert("Server error during registration.");
        console.error("Registration error:", err);
      }
    } finally {
      if (isMounted.current) setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    if (isMounted.current) setAuthLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: name, password }),
        }
      );
      const data = await res.json();
      if (isMounted.current) {
        if (res.ok) {
          console.log(data)
          localStorage.setItem("token", data.token);
          alert(data.message || "Logged in successfully");
          closeModals();
        } else {
          alert(data.message || "Invalid login");
        }
      }
    } catch (err) {
      if (isMounted.current) {
        alert("Server error during login.");
        console.error("Login error:", err);
      }
    } finally {
      if (isMounted.current) setAuthLoading(false);
    }
  };

  const closeModals = () => {
    setShowAuthModal(false);
    setRoomStep(0);
    setName("");
    setPassword("");
    setRoomId("");
  };

  return (
    <>
      <div className="header">
        <div className="logo">CoArtistry</div>
        <div className="auth-buttons">
         {!localStorage.getItem("token")&&<button onClick={() => handleAuthClick("create")} disabled={authLoading || logoutLoading}>
            {authLoading && authMode === "create" ? "Creating Account..." : "Create Account"}
          </button>} 
         {!localStorage.getItem("token")&&<button onClick={() => handleAuthClick("login")} disabled={authLoading || logoutLoading}>
            {authLoading && authMode === "login" ? "Logging In..." : "Login"}
          </button>} 
          {localStorage.getItem("token")&&<button onClick={handleLogout} disabled={logoutLoading || authLoading}>
            {logoutLoading ? "Logging Out..." : "Logout"}
          </button>}
        </div>
      </div>

      <div className="hero" style={{ backgroundImage: `url(${hero})` }}>
        <h1 className="welcome-text">
          Welcome to <span className="highlight">CoArtistry</span>
        </h1>
        <p className="subtext">Collaborate, Create, and Color Your Ideas</p>
        <button className="start-btn" onClick={handleStartDrawing}>
          Start Drawing
        </button>
      </div>

      <div className="info-section red">
        <img src={art1} alt="Red Palette" />
        <div className="text">
          <h2>The Power of Co-Creation</h2>
          <p>
            Draw together in real-time with a partner. Build ideas like never
            before.
          </p>
        </div>
      </div>

      <div className="info-section green">
        <div className="text">
          <h2>Minimal, Beautiful, Functional</h2>
          <p>
            Tools that feel familiar — pencil, brush, colors — but
            collaborative.
          </p>
        </div>
        <img src={art2} alt="Green Palette" />
      </div>

      <div className="info-section blue">
        <img src={art3} alt="Blue Palette" />
        <div className="text">
          <h2>Easy to Start, Fun to Explore</h2>
          <p>
            Create a room, invite a friend, and begin painting the future
            together.
          </p>
        </div>
      </div>

      <div className="footer">CoArtistry</div>

      {showAuthModal && (
        <div className="modal" onClick={closeModals}>
          <div
            className="modal-content pink-bg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{authMode === "create" ? "Create Account" : "Login"}</h2>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={authLoading}
            />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={authLoading}
            />
            <div className="modal-actions">
              {authMode === "create" ? (
                <button
                  onClick={handleCreateAccount}
                  disabled={authLoading}
                >
                  {authLoading ? "Creating Account..." : "Create Account"}
                </button>
              ) : (
                <button
                  onClick={handleLogin}
                  disabled={authLoading}
                >
                  {authLoading ? "Logging In..." : "Login"}
                </button>
              )}
              <button onClick={closeModals} disabled={authLoading}>Close</button>
            </div>
          </div>
        </div>
      )}

      {roomStep === 1 && (
        <div className="modal" onClick={closeModals}>
          <div
            className="modal-content white-bg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Join or Create Room</h2>
            <div className="room-buttons">
              <button onClick={() => setRoomStep(2)} disabled={loading}>Join Room </button>
              <button onClick={() => setRoomStep(3)} disabled={loading}>Create Room</button>
            </div>
          </div>
        </div>
      )}

      {(roomStep === 2 || roomStep === 3) && (
        <div className="modal" onClick={closeModals}>
          <div
            className="modal-content white-bg"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={loading}
            />
            <button
              onClick={roomStep === 2 ? handleJoinRoom : handleCreateRoom}
              disabled={loading}
            >
              {roomStep === 2
                ? loading
                  ? "Joining..."
                  : "Join Room"
                : loading
                ? "Creating Room..."
                : "Create Room"}
            </button>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content white-bg">
            <h3>Share this Room</h3>
            <input
              type="text"
              value={shareableLink}
              readOnly
              onClick={(e) => e.target.select()}
              style={{ width: "100%", padding: "10px", fontSize: "1rem" }}
            />
            <button
              onClick={() => {
                const el = document.createElement('textarea');
                el.value = shareableLink;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                alert("Link copied to clipboard!");
              }}
              style={{ marginTop: "15px", padding: "10px 20px" }}
            >
              Copy Link
            </button>
            {pendingRedirect && (
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  navigate(`/canvas/${roomId}`);
                }}
                style={{ marginTop: "15px", padding: "10px 20px" }}
              >
                Go to Canvas
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}