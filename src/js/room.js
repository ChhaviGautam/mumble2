import React, { useEffect, useState, useRef } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import "../styles/room.css";
import "../styles/main.css";

const APP_ID = "69261f031ec443fa8fee25a18a269fb0";

function Room() {
  const [uid, setUid] = useState(
    sessionStorage.getItem("uid") || String(Math.floor(Math.random() * 10000))
  );
  const [token] = useState(null);
  const [client, setClient] = useState(null);
  const [webSocket, setWebSocket] = useState(null);
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState({});
  const [localScreenTracks, setLocalScreenTracks] = useState(null);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [userIdInDisplayFrame, setUserIdInDisplayFrame] = useState(null);
  const [activeMemberContainer, setActiveMemberContainer] = useState(false);
  const [activeChatContainer, setActiveChatContainer] = useState(false);
  const [participants, setParticipants] = useState(null);
  const [activeSection, setActiveSection] = useState("new-interview");
  const [activeTab, setActiveTab] = useState("Chat");

  const displayFrameRef = useRef(null);
  const videoFramesRef = useRef([]);
  const membersContainerRef = useRef(null);
  const chatContainerRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (!sessionStorage.getItem("uid")) {
      sessionStorage.setItem("uid", uid);
    }

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const roomId = urlParams.get("room") || "main";
    const displayName = sessionStorage.getItem("display_name");

    if (!displayName) {
      window.location.href = "/lobby";
    }

    const joinRoomInit = async () => {
      const rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      await rtcClient.join(APP_ID, roomId, null); // Pass `null` to let Agora generate a unique UID
      setClient(rtcClient);

      const ws = new WebSocket("wss://your-websocket-server.com");
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join", roomId, uid, displayName }));
      };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      setWebSocket(ws);
    };

    joinRoomInit();

    return () => {
      leaveChannel();
      leaveStream();
    };
  }, [uid, token]);

  const addMemberToDom = (displayName) => {
    const memberItem = `<div class="member__wrapper" id="member__${displayName}__wrapper">
                          <span class="green__icon"></span>
                          <p class="member_name">${displayName}</p>
                        </div>`;
    document
      .getElementById("member__list")
      .insertAdjacentHTML("beforeend", memberItem);
  };

  const removeMemberFromDom = (displayName) => {
    const memberWrapper = document.getElementById(
      `member__${displayName}__wrapper`
    );
    if (memberWrapper) {
      memberWrapper.remove();
    }
  };

  const handleWebSocketMessage = (data) => {
    if (data.type === "chat") {
      addMessageToDom(data.displayName, data.message);
    } else if (data.type === "user-joined") {
      addMemberToDom(data.displayName);
      addBotMessageToDom(`Welcome to the room ${data.displayName}! 👋`);
    } else if (data.type === "user-left") {
      removeMemberFromDom(data.displayName);
      addBotMessageToDom(`${data.displayName} has left the room.`);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();

    const message = e.target.message.value.trim();

    if (message && webSocket) {
      addMessageToDom("You", message);

      webSocket.send(
        JSON.stringify({
          type: "chat",
          roomId: "main",
          message,
          displayName: "You",
        })
      );

      e.target.message.value = "";
    }
  };

  const leaveChannel = () => {
    if (webSocket) {
      webSocket.close();
    }
    if (client) {
      client.leave();
    }
  };

  const toggleMemberContainer = () => {
    if (membersContainerRef.current) {
      membersContainerRef.current.style.display = activeMemberContainer
        ? "none"
        : "block";
      setActiveMemberContainer(!activeMemberContainer);
    }
  };

  const toggleChatContainer = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.style.display = activeChatContainer
        ? "none"
        : "block";
      setActiveChatContainer(!activeChatContainer);
    }
  };

  const handleUserPublished = async (user, mediaType) => {
    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    let player = document.getElementById(`user-container-${user.uid}`);
    if (!player) {
      player = `<div class="video__container" id="user-container-${user.uid}">
                  <div class="video-player" id="user-${user.uid}"></div>
                </div>`;
      document
        .getElementById("streams__container")
        .insertAdjacentHTML("beforeend", player);
      document
        .getElementById(`user-container-${user.uid}`)
        .addEventListener("click", expandVideoFrame);
    }

    if (mediaType === "video") {
      user.videoTrack.play(`user-${user.uid}`);
    }

    if (mediaType === "audio") {
      user.audioTrack.play();
    }
  };

  const handleUserLeft = (user) => {
    delete remoteUsers[user.uid];
    const item = document.getElementById(`user-container-${user.uid}`);
    if (item) {
      item.remove();
    }

    if (user.uid === userIdInDisplayFrame) {
      displayFrameRef.current.style.display = null;
      const videoFrames = document.getElementsByClassName("video__container");
      for (let i = 0; videoFrames.length > i; i++) {
        videoFrames[i].style.height = "300px";
        videoFrames[i].style.width = "300px";
      }
    }
  };

  const expandVideoFrame = (e) => {
    const displayFrame = displayFrameRef.current;
    const videoFrames = videoFramesRef.current;

    const child = displayFrame.children[0];
    if (child) {
      document.getElementById("streams__container").appendChild(child);
    }

    displayFrame.style.display = "block";
    displayFrame.appendChild(e.currentTarget);
    setUserIdInDisplayFrame(e.currentTarget.id);

    for (let i = 0; i < videoFrames.length; i++) {
      if (videoFrames[i].id !== userIdInDisplayFrame) {
        videoFrames[i].style.height = "100px";
        videoFrames[i].style.width = "100px";
      }
    }
  };

  const hideDisplayFrame = () => {
    const displayFrame = displayFrameRef.current;
    const videoFrames = videoFramesRef.current;

    setUserIdInDisplayFrame(null);
    displayFrame.style.display = null;

    const child = displayFrame.children[0];
    document.getElementById("streams__container").appendChild(child);

    for (let i = 0; videoFrames.length > i; i++) {
      videoFrames[i].style.height = "300px";
      videoFrames[i].style.width = "300px";
    }
  };

  const addMessageToDom = (name, message) => {
    const newMessage = `<div class="message__wrapper">
                          <div class="message__body">
                            <strong class="message__author">${name}</strong>
                            <p class="message__text">${message}</p>
                          </div>
                        </div>`;
    messagesContainerRef.current.insertAdjacentHTML("beforeend", newMessage);
    const lastMessage = document.querySelector(
      "#messages .message__wrapper:last-child"
    );
    if (lastMessage) {
      lastMessage.scrollIntoView();
    }
  };

  const addBotMessageToDom = (botMessage) => {
    const newMessage = `<div class="message__wrapper">
                          <div class="message__body__bot">
                            <strong class="message__author__bot">🤖 Mumble Bot</strong>
                            <p class="message__text__bot">${botMessage}</p>
                          </div>
                        </div>`;
    messagesContainerRef.current.insertAdjacentHTML("beforeend", newMessage);
    const lastMessage = document.querySelector(
      "#messages .message__wrapper:last-child"
    );
    if (lastMessage) {
      lastMessage.scrollIntoView();
    }
  };

  const leaveStream = async (e) => {
    if (e) {
      e.preventDefault();
    }

    const joinButton = document.getElementById("join-btn");
    if (joinButton) {
      joinButton.style.display = "block";
    }

    const streamActions = document.getElementsByClassName("stream__actions")[0];
    if (streamActions) {
      streamActions.style.display = "flex";
    }

    if (localTracks && localTracks.length > 0) {
      localTracks.forEach((track) => {
        track.stop();
        track.close();
      });

      if (client) {
        await client.unpublish(localTracks);
      }
    } else {
      console.warn("No local tracks to unpublish.");
    }

    if (localScreenTracks && client) {
      await client.unpublish([localScreenTracks]);
    } else {
      console.warn("No screen tracks to unpublish.");
    }

    const userContainer = document.getElementById(`user-container-${uid}`);
    if (userContainer) {
      userContainer.remove();
    }

    if (
      userIdInDisplayFrame === `user-container-${uid}` &&
      displayFrameRef.current
    ) {
      displayFrameRef.current.style.display = null;

      const videoFrames = document.getElementsByClassName("video__container");
      for (let i = 0; i < videoFrames.length; i++) {
        videoFrames[i].style.height = "300px";
        videoFrames[i].style.width = "300px";
      }
    }
  };

  const joinStream = async () => {
    document.getElementById("join-btn").style.display = "none";
    document.getElementsByClassName("stream__actions")[0].style.display =
      "flex";

    try {
      const tracks = await AgoraRTC.createMicrophoneAndCameraTracks(
        {},
        {
          encoderConfig: {
            width: { min: 640, ideal: 1920, max: 1920 },
            height: { min: 480, ideal: 1080, max: 1080 },
          },
        }
      );

      console.log("Tracks created:", tracks); // Add this line to debug

      setLocalTracks(tracks);

      const player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                      </div>`;

      document
        .getElementById("streams__container")
        .insertAdjacentHTML("beforeend", player);
      document
        .getElementById(`user-container-${uid}`)
        .addEventListener("click", expandVideoFrame);

      tracks[1].play(`user-${uid}`);
      await client.publish([tracks[0], tracks[1]]);
    } catch (error) {
      console.error("Error joining stream or creating tracks:", error); // Add this line to catch errors
    }
  };

  const toggleMic = async (e) => {
    let button = e.currentTarget;

    if (localTracks[0].muted) {
      await localTracks[0].setMuted(false);
      button.classList.add("active");
    } else {
      await localTracks[0].setMuted(true);
      button.classList.remove("active");
    }
  };

  const toggleCamera = async (e) => {
    let button = e.currentTarget;

    if (!localTracks[1]) {
      console.error("Camera track is not initialized.");
      return;
    }

    if (localTracks[1].muted) {
      await localTracks[1].setMuted(false);
      button.classList.add("active");
    } else {
      await localTracks[1].setMuted(true);
      button.classList.remove("active");
    }

    console.log("Camera muted state:", localTracks[1].muted); // Debug log
  };

  const toggleScreen = async (e) => {
    let screenButton = e.currentTarget;
    let cameraButton = document.getElementById("camera-btn");

    if (!sharingScreen) {
      setSharingScreen(true);
      screenButton.classList.add("active");
      cameraButton.classList.remove("active");
      cameraButton.style.display = "none";

      const screenTracks = await AgoraRTC.createScreenVideoTrack();
      setLocalScreenTracks(screenTracks);

      document.getElementById(`user-container-${uid}`).remove();
      displayFrameRef.current.style.display = "block";

      const player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                      </div>`;
      displayFrameRef.current.insertAdjacentHTML("beforeend", player);
      document
        .getElementById(`user-container-${uid}`)
        .addEventListener("click", expandVideoFrame);

      screenTracks.play(`user-${uid}`);

      await client.unpublish([localTracks[1]]);
      await client.publish([screenTracks]);

      const videoFrames = document.getElementsByClassName("video__container");
      for (let i = 0; videoFrames.length > i; i++) {
        if (videoFrames[i].id !== userIdInDisplayFrame) {
          videoFrames[i].style.height = "100px";
          videoFrames[i].style.width = "100px";
        }
      }
    } else {
      setSharingScreen(false);
      cameraButton.style.display = "block";
      document.getElementById(`user-container-${uid}`).remove();
      await client.unpublish([localScreenTracks]);
      switchToCamera();
    }
  };

  const switchToCamera = async () => {
    const player = `<div class="video__container" id="user-container-${uid}">
                      <div class="video-player" id="user-${uid}"></div>
                    </div>`;
    displayFrameRef.current.insertAdjacentHTML("beforeend", player);

    await localTracks[0].setMuted(true);
    await localTracks[1].setMuted(true);

    document.getElementById("mic-btn").classList.remove("active");
    document.getElementById("screen-btn").classList.remove("active");

    localTracks[1].play(`user-${uid}`);
    await client.publish([localTracks[1]]);
  };

  return (
    <div id="room__container">
      <header id="nav">
        <div className="nav--list">
          <button id="members__button" onClick={toggleMemberContainer}>
            <svg
              width="24"
              height="24"
              xmlns="http://www.w3.org/2000/svg"
              fillRule="evenodd"
              clipRule="evenodd"
            >
              <path
                d="M24 18v1h-24v-1h24zm0-6v1h-24v-1h24zm0-6v1h-24v-1h24z"
                fill="#ede0e0"
              />
              <path d="M24 19h-24v-1h24v1zm0-6h-24v-1h24v1zm0-6h-24v-1h24v1z" />
            </svg>
          </button>
          <a href="/lobby">
            <h3 id="logo">
              <img
                src={`${process.env.PUBLIC_URL}/images/logo.png`}
                alt="Site Logo"
              />
              <span>Mumble</span>
            </h3>
          </a>
        </div>
        <div id="nav__links">
          <button id="chat__button" onClick={toggleChatContainer}>
            <svg
              width="24"
              height="24"
              xmlns="http://www.w3.org/2000/svg"
              fillRule="evenodd"
              fill="#ede0e0"
              clipRule="evenodd"
            >
              <path d="M24 20h-3v4l-5.333-4h-7.667v-4h2v2h6.333l2.667 2v-2h3v-8.001h-2v-2h4v12.001zm-15.667-6l-5.333 4v-4h-3v-14.001l18 .001v14h-9.667zm-6.333-2h3v2l2.667-2h8.333v-10l-14-.001v10.001z" />
            </svg>
          </button>
          <a className="nav__link" id="create__room__btn" href="/lobby">
            Create Room
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="#ede0e0"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm6 13h-5v5h-2v-5h-5v-2h5v-5h2v5h5v2z" />
            </svg>
          </a>
        </div>
      </header>

      <main className="container">
        <aside className="sidebar">
        <div className="sidebar-title">WEBSTAFF</div>
          <button
            id="join-btn"
            onClick={() => {
              setActiveSection("new-interview");
              joinStream(); // Automatically join the stream when this section is activated
            }}
            className={activeSection === "new-interview" ? "active" : ""}
          >
            New Interview
          </button>

          <button
            id="interview-list-button"
            className={activeSection === "interview-list" ? "active" : ""}
            onClick={() => setActiveSection("interview-list")}
            style={{ marginTop: "20px" }}
          >
            Interview list
          </button>
        </aside>

        <section className="content">
          {activeSection === "new-interview" ? (
            <section id="stream__container">
              <div id="stream__box" ref={displayFrameRef}></div>
              <div id="streams__container"></div>
              <div id="translation__container">
                <div class="translation__results">
                  Translation Results. Translation Results. Translation Results.
                  Translation Results.
                </div>
              </div>
              <div id="checklist__container">
                <ul class="checklist">
                  <li>
                    Confirm name <span>Tarou Yamada</span>
                  </li>
                  <li>
                    Confirm Faculty <span>computer science</span>
                  </li>
                  <li>
                    Confirm name <span>Tarou Yamada</span>
                  </li>
                  <li>
                    Confirm Faculty <span>computer science</span>
                  </li>
                </ul>
              </div>
              <div class="stream__actions">
                <button
                  id="camera-btn"
                  className="active"
                  onClick={toggleCamera}
                >
                  Toggle Camera
                </button>
                <button id="mic-btn" className="active" onClick={toggleMic}>
                  Toggle Mic
                </button>
                <button id="screen-btn" onClick={toggleScreen}>
                  Share Screen
                </button>
                <button
                  id="leave-btn"
                  style={{ backgroundColor: "#FF5050" }}
                  onClick={leaveStream}
                >
                  Leave Stream
                </button>
              </div>
            </section>
          ) : (
            <div className="interview-list">
              <h2>Interview list</h2>
              <div className="interview-item">
                <img src="path-to-image" alt="Interviewee" />
                <div>
                  <p>2024-08-01</p>
                  <p>UserName</p>
                  <p>Movie Title, Movie Title, Movie Title, Movie Title,</p>
                </div>
                <button>Edit</button>
              </div>
              {/* Repeat the above interview-item for more entries */}
            </div>
          )}
        </section>

        <div>
          <div className="tabs">
            <button
              className={`tab-button ${activeTab === "Chat" ? "active" : ""}`}
              onClick={() => setActiveTab("Chat")}
            >
              Chat
            </button>
            <button
              className={`tab-button ${
                activeTab === "Translation" ? "active" : ""
              }`}
              onClick={() => setActiveTab("Translation")}
            >
              Translation
            </button>
          </div>

          {/* Common Content for Both Tabs */}
          {activeTab && (
            <section id="messages__container">
              <div id="messages"></div>
              <form id="message__form" onSubmit={sendMessage}>
                <input
                  type="text"
                  name="message"
                  placeholder="Send a message...."
                />
              </form>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default Room;
