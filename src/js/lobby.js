import React, { useState, useEffect } from 'react';
import '../styles/lobby.css'; // Ensure the correct path
import '../styles/main.css';  // Ensure the correct path

function Lobby() {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');

  useEffect(() => {
    const displayName = sessionStorage.getItem('display_name');
    if (displayName) {
      setName(displayName);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    sessionStorage.setItem('display_name', name);

    let inviteCode = room;
    if (!inviteCode) {
      inviteCode = String(Math.floor(Math.random() * 10000));
    }

    window.location = `/room?room=${inviteCode}`;
  };

  return (
    <div id="room__lobby__container">
      <header id="nav">
        <div className="nav--list">
          <a href="/lobby">
            <h3 id="logo">
              <img src={`${process.env.PUBLIC_URL}/images/logo.png`} alt="Site Logo" />
              <span>Mumble</span>
            </h3>
          </a>
        </div>

        <div id="nav__links">
          <a className="nav__link" href="/">
            Lobby
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#ede0e0" viewBox="0 0 24 24">
              <path d="M20 7.093v-5.093h-3v2.093l3 3zm4 5.907l-12-12-12 12h3v10h7v-5h4v5h7v-10h3zm-5 8h-3v-5h-8v5h-3v-10.26l7-6.912 7 6.99v10.182z"/>
            </svg>
          </a>
          <a className="nav__link" id="create__room__btn" href="/lobby">
            Create Room
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#ede0e0" viewBox="0 0 24 24">
              <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm6 13h-5v5h-2v-5h-5v-2h5v-5h2v5h5v2z"/>
            </svg>
          </a>
        </div>
      </header>

      <main>
        <div id="form__container">
          <div id="form__container__header">
            <p>👋 Create or Join Room</p>
          </div>

          <form id="lobby__form" onSubmit={handleSubmit}>
            <div className="form__field__wrapper">
              <label>Your Name</label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter your display name..."
              />
            </div>

            <div className="form__field__wrapper">
              <label>Room Name</label>
              <input
                type="text"
                name="room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Enter room name..."
              />
            </div>

            <div className="form__field__wrapper">
              <button type="submit">
                Go to Room
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z"/>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Lobby;
