import React, { useState, useEffect } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const APP_ID = '69261f031ec443fa8fee25a18a269fb0';

const RTCComponent = ({ uid, displayName, roomId, client, setClient }) => {
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState({});
  const [localScreenTracks, setLocalScreenTracks] = useState(null);
  const [sharingScreen, setSharingScreen] = useState(false);

  useEffect(() => {
    const initClient = async () => {
        const rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        
        try {
            await rtcClient.join(APP_ID, roomId, null, uid); // Using null for UID to let Agora generate one
        } catch (error) {
            console.error("Failed to join the channel:", error);
        }

        rtcClient.on('user-published', handleUserPublished);
        rtcClient.on('user-left', handleUserLeft);

        setClient(rtcClient);
    };

    initClient();

    return () => {
        leaveStream();
    };
}, [uid, roomId, setClient]);


  const joinStream = async () => {
    const tracks = await AgoraRTC.createMicrophoneAndCameraTracks({}, {
      encoderConfig: {
        width: { min: 640, ideal: 1920, max: 1920 },
        height: { min: 480, ideal: 1080, max: 1080 }
      }
    });

    setLocalTracks(tracks);

    const player = `<div class="video__container" id="user-container-${uid}">
                      <div class="video-player" id="user-${uid}"></div>
                    </div>`;

    document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
    document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);

    tracks[1].play(`user-${uid}`);
    await client.publish([tracks[0], tracks[1]]);
  };

  const handleUserPublished = async (user, mediaType) => {
    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    let player = document.getElementById(`user-container-${user.uid}`);
    if (player === null) {
      player = `<div class="video__container" id="user-container-${user.uid}">
                  <div class="video-player" id="user-${user.uid}"></div>
                </div>`;
      document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
      document.getElementById(`user-container-${user.uid}`).addEventListener('click', expandVideoFrame);
    }

    if (mediaType === 'video') {
      user.videoTrack.play(`user-${user.uid}`);
    }

    if (mediaType === 'audio') {
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
      displayFrame.style.display = null;
      const videoFrames = document.getElementsByClassName('video__container');
      for (let i = 0; videoFrames.length > i; i++) {
        videoFrames[i].style.height = '300px';
        videoFrames[i].style.width = '300px';
      }
    }
  };

  const toggleMic = async (e) => {
    let button = e.currentTarget;

    if (localTracks[0].muted) {
      await localTracks[0].setMuted(false);
      button.classList.add('active');
    } else {
      await localTracks[0].setMuted(true);
      button.classList.remove('active');
    }
  };

  const toggleCamera = async (e) => {
    let button = e.currentTarget;

    if (localTracks[1].muted) {
      await localTracks[1].setMuted(false);
      button.classList.add('active');
    } else {
      await localTracks[1].setMuted(true);
      button.classList.remove('active');
    }
  };

  const toggleScreen = async (e) => {
    let screenButton = e.currentTarget;
    let cameraButton = document.getElementById('camera-btn');

    if (!sharingScreen) {
      sharingScreen = true;
      screenButton.classList.add('active');
      cameraButton.classList.remove('active');
      cameraButton.style.display = 'none';

      const screenTracks = await AgoraRTC.createScreenVideoTrack();
      setLocalScreenTracks(screenTracks);

      document.getElementById(`user-container-${uid}`).remove();
      displayFrame.style.display = 'block';

      const player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                      </div>`;
      displayFrame.insertAdjacentHTML('beforeend', player);
      document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);

      screenTracks.play(`user-${uid}`);

      await client.unpublish([localTracks[1]]);
      await client.publish([screenTracks]);

      const videoFrames = document.getElementsByClassName('video__container');
      for (let i = 0; videoFrames.length > i; i++) {
        if (videoFrames[i].id !== userIdInDisplayFrame) {
          videoFrames[i].style.height = '100px';
          videoFrames[i].style.width = '100px';
        }
      }
    } else {
      sharingScreen = false;
      cameraButton.style.display = 'block';
      document.getElementById(`user-container-${uid}`).remove();
      await client.unpublish([localScreenTracks]);
      switchToCamera();
    }
  };

  const leaveStream = async (e) => {
    e.preventDefault();

    document.getElementById('join-btn').style.display = 'block';
    document.getElementsByClassName('stream__actions')[0].style.display = 'none';

    localTracks.forEach(track => {
      track.stop();
      track.close();
    });

    await client.unpublish(localTracks);

    if (localScreenTracks) {
      await client.unpublish([localScreenTracks]);
    }

    document.getElementById(`user-container-${uid}`).remove();

    channel.sendMessage({ text: JSON.stringify({ type: 'user_left', uid }) });
  };

  return (
    <div>
      {/* Add buttons for toggling mic, camera, screen sharing, and leave stream */}
      <button id="camera-btn" onClick={toggleCamera}>Toggle Camera</button>
      <button id="mic-btn" onClick={toggleMic}>Toggle Mic</button>
      <button id="screen-btn" onClick={toggleScreen}>Share Screen</button>
      <button id="leave-btn" onClick={leaveStream}>Leave Stream</button>
      <button id="join-btn" onClick={joinStream}>Join Stream</button>
    </div>
  );
};

export default RTCComponent;
