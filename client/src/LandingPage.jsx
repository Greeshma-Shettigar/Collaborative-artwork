import React, { useState } from 'react';
import './LandingPage.css';
import { useNavigate } from 'react-router-dom';

import hero from './hero-bg.jpg';
import art1 from './art1.jpg';
import art2 from './art2.jpg'; 
import art3 from './art3.jpg';

export default function LandingPage() {
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('create');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [roomStep, setRoomStep] = useState(0); // 0 = hidden, 1 = choose, 2 = enter ID
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleStartDrawing = () => setRoomStep(1);
 const handleJoinRoom = async () => {
  if (roomId && name) {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/join-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }), // only roomId needed
      });

      const data = await res.json();
      if (res.ok) {
        navigate(`/canvas/${roomId}`, {
  state: { me: name },
});
// you already have name
      } else {
        alert(data.message); // shows "Room ID does not exist!"
      }
    } catch (err) {
      alert('Error joining room');
    }
  }
};

  

   const handleCreateRoom = async () => {
  if (roomId && name) {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, roomId }),
      });

      const data = await res.json();
      if (res.ok) {
        const link = `${window.location.origin}/canvas/${roomId}`;
        setShareableLink(link);
        setShowLinkModal(true);
        setPendingRedirect(true);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error creating room');
    }
  }
};


  const handleAuthClick = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const closeModals = () => {
    setShowAuthModal(false);
    setRoomStep(0);
    setName('');
    setPassword('');
    setRoomId('');
  };

  return (
    <>
      <div className="header">
        <div className="logo">CoArtistry</div>
        <div className="auth-buttons">
          <button onClick={() => handleAuthClick('create')}>Create Account</button>
          <button onClick={() => handleAuthClick('login')}>Login</button>
        </div>
      </div>

      <div
        className="hero"
        style={{ backgroundImage: `url(${hero})` }}
      >
        <h1 className="welcome-text">
          Welcome to <span className="highlight">CoArtistry</span>
        </h1>
        <p className="subtext">Collaborate, Create, and Color Your Ideas</p>
        <button className="start-btn" onClick={handleStartDrawing}>Start Drawing</button>
      </div>

      {/* IMAGE SECTIONS */}
      <div className="info-section red">
        <img src={art1} alt="Red Palette" />
        <div className="text">
          <h2>The Power of Co-Creation</h2>
          <p>Draw together in real-time with a partner. Build ideas like never before.</p>
        </div>
      </div>

      <div className="info-section green">
        <div className="text">
          <h2>Minimal, Beautiful, Functional</h2>
          <p>Tools that feel familiar — pencil, brush, colors — but collaborative.</p>
        </div>
        <img src={art2} alt="Green Palette" />
      </div>

      <div className="info-section blue">
        <img src={art3} alt="Blue Palette" />
        <div className="text">
          <h2>Easy to Start, Fun to Explore</h2>
          <p>Create a room, invite a friend, and begin painting the future together.</p>
        </div>
      </div>

      <div className="footer">CoArtistry</div>

      {showAuthModal && (
  <div className="modal" onClick={closeModals}>
    <div className="modal-content pink-bg" onClick={(e) => e.stopPropagation()}>
      <h2>{authMode === 'create' ? 'Create Account' : 'Login'}</h2>
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="modal-actions">
        {authMode === 'create' ? (
  <button
    onClick={async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: name, password }),
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.message || 'Account created!');
          closeModals();
        } else {
          alert(data.message || 'Registration failed');
        }
      } catch (err) {
        alert('Server error during registration');
      }
    }}
  >
    Create Account
  </button>
) : (
  <button
    onClick={async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: name, password }),
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.message || 'Logged in successfully');
          closeModals();
        } else {
          alert(data.message || 'Invalid login');
        }
      } catch (err) {
        alert('Server error during login');
      }
    }}
  >
    Login
  </button>
)}

        <button onClick={closeModals}>Close</button>
      </div>
    </div>
  </div>
)}


      {/* ROOM JOIN/CREATE */}
      {roomStep === 1 && (
        <div className="modal" onClick={closeModals}>
          <div className="modal-content white-bg" onClick={(e) => e.stopPropagation()}>
            <h2>Join or Create Room</h2>
            <div className="room-buttons">
              <button onClick={() => setRoomStep(2)}>Join Room</button>
              <button onClick={() => setRoomStep(3)}>Create Room</button>
            </div>
          </div>
        </div>
      )}

      {(roomStep === 2 || roomStep === 3) && (
        <div className="modal" onClick={closeModals}>
          <div className="modal-content white-bg" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button onClick={roomStep === 2 ? handleJoinRoom : handleCreateRoom}>
              {roomStep === 2 ? 'Join Room' : 'Create Room'}
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
        style={{ width: '100%', padding: '10px', fontSize: '1rem' }}
      />
      <button
        onClick={() => {
          navigator.clipboard.writeText(shareableLink);
          alert('Link copied to clipboard!');
        }}
        style={{ marginTop: '15px', padding: '10px 20px' }}
      >
        Copy Link
      </button>
      {pendingRedirect && (
        <button
  onClick={() => {
 
  setShowLinkModal(false);
  navigate(`/canvas/${roomId}`); // Navigate after short delay
}}

  style={{ marginTop: '15px', padding: '10px 20px' }}
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