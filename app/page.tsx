'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MeetingProvider, useMeeting, useParticipant } from "@videosdk.live/react-sdk";

// VideoSDK Configuration - Update these with your actual values
const VIDEOSDK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiJkMzFmYjVjZi1iYzFkLTRmMjQtYjg1Ni05OTVlZTgzMjY2MDAiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc1NTQyOTQ4MSwiZXhwIjoxOTEzMjE3NDgxfQ.PDGqipQbZ8B_gd1Emys5pFjkC7IOGrwvRq418fNhL1Y";

const ParticipantView = ({ participantId, isLocal = false }) => {
  const webcamRef = useRef(null);
  const micRef = useRef(null);
  
  const {
    webcamStream,
    micStream,
    webcamOn,
    micOn,
    isLocal: participantIsLocal,
    displayName,
    setQuality
  } = useParticipant(participantId, {
    onStreamEnabled: (stream) => {
      console.log(`Stream enabled for ${participantId}:`, stream.kind);
      if (stream.kind === 'video') {
        if (webcamRef.current) {
          const mediaStream = new MediaStream();
          mediaStream.addTrack(stream.track);
          webcamRef.current.srcObject = mediaStream;
          webcamRef.current.play().catch((error) => {
            console.error("Error playing video:", error);
          });
        }
      }
      if (stream.kind === 'audio') {
        if (micRef.current) {
          const mediaStream = new MediaStream();
          mediaStream.addTrack(stream.track);
          micRef.current.srcObject = mediaStream;
          micRef.current.play().catch((error) => {
            console.error("Error playing audio:", error);
          });
        }
      }
    },
    onStreamDisabled: (stream) => {
      console.log(`Stream disabled for ${participantId}:`, stream.kind);
      if (stream.kind === 'video' && webcamRef.current) {
        webcamRef.current.srcObject = null;
      }
      if (stream.kind === 'audio' && micRef.current) {
        micRef.current.srcObject = null;
      }
    },
  });

  useEffect(() => {
    // Set video quality for better performance
    if (webcamOn && setQuality) {
      setQuality("med");
    }
  }, [webcamOn, setQuality]);

  return (
    <div className={`participant ${isLocal ? 'local' : ''}`}>
      {webcamOn && webcamStream ? (
        <div className="video-container">
          <video
            ref={webcamRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="participant-video"
          />
        </div>
      ) : (
        <div className="no-video-placeholder">
          <div className="avatar-placeholder">
            {displayName ? displayName.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="participant-name">{displayName || 'Unknown'}</div>
          <div className="no-video-text">
            {webcamOn ? 'Connecting video...' : 'Camera is off'}
          </div>
        </div>
      )}
      
      {/* Audio element for remote participants */}
      {!isLocal && micStream && (
        <audio ref={micRef} autoPlay playsInline />
      )}
      
      <div className="participant-info">
        {isLocal ? (
          <>
            <span className="status-icon"></span>
            You
          </>
        ) : (
          displayName || 'Unknown'
        )}
        {!micOn && <span className="status-icon muted">🔇</span>}
      </div>
    </div>
  );
};

const MeetingView = () => {
  const [joined, setJoined] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [availableWebcams, setAvailableWebcams] = useState([]);
  const [selectedWebcamId, setSelectedWebcamId] = useState(null);
  const [isLeavingCall, setIsLeavingCall] = useState(false);

  const {
    join,
    leave,
    toggleMic,
    toggleWebcam,
    changeWebcam,
    getWebcams,
    participants,
    localParticipant,
    meetingId
  } = useMeeting({
    onMeetingJoined: async () => {
      console.log("Meeting Joined Successfully");
      setJoined("JOINED");
      
      // Get available webcams
      try {
        const webcams = await getWebcams();
        setAvailableWebcams(webcams);
        console.log("Available webcams:", webcams);
        
        // Set default webcam (preferably front camera)
        const frontCamera = webcams.find(cam => 
          cam.label.toLowerCase().includes('front') || 
          cam.label.toLowerCase().includes('user')
        ) || webcams[0];
        
        if (frontCamera) {
          setSelectedWebcamId(frontCamera.deviceId);
        }
      } catch (error) {
        console.warn("Could not get webcams:", error);
      }
    },
    onMeetingLeft: () => {
      console.log("Meeting Left");
      setJoined("LEFT");
      setIsLeavingCall(false);
    },
    onError: (error) => {
      console.error("Meeting Error:", error);
      setJoined("ERROR");
      setIsLeavingCall(false);
    },
    onParticipantJoined: (participant) => {
      console.log("Participant Joined:", participant);
    },
    onParticipantLeft: (participant) => {
      console.log("Participant Left:", participant);
    },
  });

  const joinMeeting = () => {
    setJoined("JOINING");
    join();
  };

  const leaveMeeting = () => {
    setIsLeavingCall(true);
    leave();
  };

  const handleToggleMic = () => {
    toggleMic();
    setIsMicOn(!isMicOn);
  };

  const handleToggleCamera = () => {
    toggleWebcam();
    setIsCameraOn(!isCameraOn);
  };

  const handleSwitchCamera = async () => {
    if (availableWebcams.length < 2) {
      console.log("No alternative camera available");
      return;
    }

    try {
      const currentIndex = availableWebcams.findIndex(
        (webcam) => webcam.deviceId === selectedWebcamId
      );
      const nextIndex = (currentIndex + 1) % availableWebcams.length;
      const nextWebcam = availableWebcams[nextIndex];

      await changeWebcam(nextWebcam.deviceId);
      setSelectedWebcamId(nextWebcam.deviceId);
      console.log("Switched to camera:", nextWebcam.label);
    } catch (error) {
      console.error("Error switching camera:", error);
    }
  };

  const renderParticipantsGrid = () => {
    const allParticipants = [...participants.keys()];
    const totalParticipants = allParticipants.length;
    
    let gridClass = 'participants-grid';
    if (totalParticipants <= 1) {
      gridClass += ' participants-1';
    } else if (totalParticipants === 2) {
      gridClass += ' participants-2';
    } else if (totalParticipants <= 4) {
      gridClass += ' participants-4';
    } else {
      gridClass += ' participants-many';
    }

    if (totalParticipants === 0) {
      return (
        <div className={gridClass}>
          <div className="waiting-room">
            <div className="icon">👥</div>
            <h2>Waiting for other participants...</h2>
            <p>Share the room ID with others to join</p>
          </div>
        </div>
      );
    }

    return (
      <div className={gridClass}>
        {/* Local Participant */}
        {localParticipant && (
          <div className="participant-wrapper">
            <ParticipantView participantId={localParticipant.id} isLocal={true} />
            {/* Camera switch button for local participant */}
            {isCameraOn && availableWebcams.length > 1 && (
              <button className="camera-switch" onClick={handleSwitchCamera}>
                🔄
              </button>
            )}
          </div>
        )}
        
        {/* Remote Participants */}
        {allParticipants.map((participantId) => (
          participantId !== localParticipant?.id && (
            <div key={participantId} className="participant-wrapper">
              <ParticipantView participantId={participantId} />
            </div>
          )
        ))}
      </div>
    );
  };

  return (
    <div className="container">
      {joined && joined === "JOINED" ? (
        <>
          {/* Header */}
          <div className="header">
            <h1>Wellness Video Call</h1>
            <div className="room-info">Room: {meetingId}</div>
            <div className="participant-count">
              {participants.size + 1} participant{participants.size !== 0 ? 's' : ''}
            </div>
          </div>

          {/* Video Container */}
          <div className="video-container">
            {renderParticipantsGrid()}
          </div>

          {/* Controls */}
          <div className="controls">
            <button
              className={`control-btn ${!isMicOn ? 'muted' : ''}`}
              onClick={handleToggleMic}
              title="Toggle Microphone"
              disabled={isLeavingCall}
            >
              {isMicOn ? '🎤' : '🔇'}
            </button>
            <button
              className={`control-btn ${!isCameraOn ? 'muted' : ''}`}
              onClick={handleToggleCamera}
              title="Toggle Camera"
              disabled={isLeavingCall}
            >
              {isCameraOn ? '📹' : '📵'}
            </button>
            <button
              className="control-btn"
              onClick={handleSwitchCamera}
              disabled={!isCameraOn || availableWebcams.length < 2 || isLeavingCall}
              title="Switch Camera"
            >
              🔄
            </button>
            <button
              className="control-btn end-call"
              onClick={leaveMeeting}
              title="End Call"
              disabled={isLeavingCall}
            >
              {isLeavingCall ? '⏳' : '📞'}
            </button>
          </div>
        </>
      ) : joined && joined === "JOINING" ? (
        <div className="container">
          <div className="video-container">
            <div className="participants-grid participants-1">
              <div className="waiting-room">
                <div className="spinner"></div>
                <h2>Connecting to video call...</h2>
                <p>Please wait while we connect you to the meeting</p>
              </div>
            </div>
          </div>
        </div>
      ) : joined && joined === "ERROR" ? (
        <div className="container">
          <div className="video-container">
            <div className="participants-grid participants-1">
              <div className="error-container">
                <div className="icon">⚠️</div>
                <h2>Connection Error</h2>
                <p>Failed to join the video call. Please check your internet connection and try again.</p>
                <button className="retry-btn" onClick={joinMeeting}>
                  Try Again
                </button>
                <button className="retry-btn secondary" onClick={() => window.close()}>
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : joined && joined === "LEFT" ? (
        <div className="container">
          <div className="video-container">
            <div className="participants-grid participants-1">
              <div className="waiting-room">
                <div className="icon">👋</div>
                <h2>Call Ended</h2>
                <p>You have left the video call. You can close this window now.</p>
                <button className="retry-btn secondary" onClick={() => window.close()}>
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="container">
          <div className="video-container">
            <div className="participants-grid participants-1">
              <div className="waiting-room">
                <div className="icon">🎥</div>
                <h2>Ready to Join</h2>
                <p>Click the button below to join the video call</p>
                <button className="retry-btn" onClick={joinMeeting}>
                  Join Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VideoCallApp = () => {
  const [meetingId, setMeetingId] = useState('');
  const [token, setToken] = useState('');
  const [participantName, setParticipantName] = useState('User');
  const [participantId, setParticipantId] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const meetingIdParam = urlParams.get('meetingId') || urlParams.get('roomId');
    const tokenParam = urlParams.get('token') || VIDEOSDK_TOKEN;
    const nameParam = urlParams.get('name') || 'User';
    const participantIdParam = urlParams.get('participantId') || `user_${Date.now()}`;

    console.log('URL Parameters:', {
      meetingId: meetingIdParam,
      token: tokenParam ? 'Present' : 'Missing',
      name: nameParam,
      participantId: participantIdParam
    });

    if (!meetingIdParam) {
      setError('Missing meeting ID in URL parameters');
      return;
    }

    if (!tokenParam) {
      setError('Missing VideoSDK token');
      return;
    }

    setMeetingId(meetingIdParam);
    setToken(tokenParam);
    setParticipantName(nameParam);
    setParticipantId(participantIdParam);
    setInitialized(true);
  }, []);

  // Add global styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        background: #000;
        color: white;
        overflow: hidden;
      }

      .container {
        height: 100vh;
        display: flex;
        flex-direction: column;
        background: #000;
      }

      .header {
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 1rem 2rem;
        text-align: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 100;
      }

      .header h1 {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      .header .room-info {
        font-size: 0.875rem;
        opacity: 0.7;
      }

      .participant-count {
        font-size: 0.75rem;
        opacity: 0.6;
        margin-top: 0.25rem;
      }

      .video-container {
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: #1a1a1a;
      }

      .participants-grid {
        width: 100%;
        height: 100%;
        display: grid;
        gap: 8px;
        padding: 16px;
      }

      .participants-1 {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
      }

      .participants-2 {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr;
      }

      .participants-3,
      .participants-4 {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
      }

      .participants-many {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        grid-auto-rows: minmax(200px, 1fr);
      }

      .participant-wrapper {
        position: relative;
      }

      .participant {
        position: relative;
        background: #333;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 200px;
        width: 100%;
        height: 100%;
      }

      .participant.local {
        border: 2px solid #10B981;
      }

      .video-container video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 12px;
      }

      .participant-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .participant-info {
        position: absolute;
        bottom: 12px;
        left: 12px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .participant-info .status-icon {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10B981;
      }

      .participant-info .muted {
        background: transparent;
        width: auto;
        height: auto;
      }

      .no-video-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        text-align: center;
        height: 100%;
        width: 100%;
      }

      .avatar-placeholder {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: #10B981;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 1rem;
      }

      .participant-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }

      .no-video-text {
        opacity: 0.7;
        font-size: 0.875rem;
      }

      .waiting-room, .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        text-align: center;
        height: 100%;
        padding: 2rem;
      }

      .waiting-room .icon, .error-container .icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        opacity: 0.6;
      }

      .error-container .icon {
        color: #EF4444;
        opacity: 1;
      }

      .waiting-room h2, .error-container h2 {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
      }

      .error-container h2 {
        color: #EF4444;
      }

      .waiting-room p, .error-container p {
        opacity: 0.7;
        font-size: 1rem;
        margin-bottom: 2rem;
        line-height: 1.5;
      }

      .controls {
        background: rgba(0, 0, 0, 0.9);
        padding: 1.5rem 2rem;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .control-btn {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 1.25rem;
        color: white;
        background: rgba(255, 255, 255, 0.2);
      }

      .control-btn:hover:not(:disabled) {
        transform: scale(1.05);
        background: rgba(255, 255, 255, 0.3);
      }

      .control-btn:active {
        transform: scale(0.95);
      }

      .control-btn.muted {
        background: rgba(239, 68, 68, 0.8);
      }

      .control-btn.end-call {
        background: rgba(239, 68, 68, 0.9);
      }

      .control-btn.end-call:hover:not(:disabled) {
        background: rgba(239, 68, 68, 1);
      }

      .control-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .camera-switch {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        z-index: 10;
      }

      .camera-switch:hover {
        background: rgba(0, 0, 0, 0.8);
      }

      .retry-btn {
        background: #10B981;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        margin: 0.5rem;
        transition: background 0.2s ease;
      }

      .retry-btn:hover {
        background: #059669;
      }

      .retry-btn.secondary {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }

      .retry-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .spinner {
        width: 24px;
        height: 24px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @media (max-width: 768px) {
        .header {
          padding: 0.75rem 1rem;
        }

        .header h1 {
          font-size: 1.1rem;
        }

        .controls {
          padding: 1rem;
          gap: 0.75rem;
        }

        .control-btn {
          width: 50px;
          height: 50px;
          font-size: 1.1rem;
        }

        .participants-grid {
          padding: 8px;
          gap: 4px;
        }

        .participants-2,
        .participants-3,
        .participants-4 {
          grid-template-columns: 1fr;
          grid-template-rows: repeat(auto-fit, minmax(150px, 1fr));
        }

        .avatar-placeholder {
          width: 60px;
          height: 60px;
          font-size: 1.5rem;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (error) {
    return (
      <div className="container">
        <div className="video-container">
          <div className="participants-grid participants-1">
            <div className="error-container">
              <div className="icon">⚠️</div>
              <h2>Configuration Error</h2>
              <p>{error}</p>
              <button className="retry-btn secondary" onClick={() => window.close()}>
                Close Window
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="container">
        <div className="video-container">
          <div className="participants-grid participants-1">
            <div className="waiting-room">
              <div className="spinner"></div>
              <h2>Initializing...</h2>
              <p>Setting up video call</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MeetingProvider
      config={{
        meetingId,
        micEnabled: true,
        webcamEnabled: true,
        name: participantName,
        participantId: participantId
      }}
      token={token}
    >
      <MeetingView />
    </MeetingProvider>
  );
};

export default VideoCallApp;