'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}

// Helper to send events back to RN WebView
const postToRN = (
  type: 'CALL_CONNECTED' | 'CALL_DISCONNECTED' | 'END_CALL' | 'CALL_ERROR',
  payload: Record<string, any> = {}
) => {
  try {
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type, ...payload }));
  } catch {
    // ignore if not running inside RN
  }
};

type Participant = {
  id: string;
  displayName: string;
  webcamOn: boolean;
  micOn: boolean;
};
type Meeting = {
  id: string;
  participants: Map<string, Participant>;
  localParticipant: Participant | null;
  isConnecting: boolean;
  availableCameras: MediaDeviceInfo[];
  currentCameraDeviceId: string | null;
};
type ParticipantViewProps = {
  participant: Participant;
  isLocal?: boolean;
};


const VideoCallApp = () => {
  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState(new Map());
const [localParticipant, setLocalParticipant] = useState<Participant | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [currentCameraDeviceId, setCurrentCameraDeviceId] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [meetingId, setMeetingId] = useState('');
  const [token, setToken] = useState('');
  const [participantName, setParticipantName] = useState('User');
  const [participantId, setParticipantId] = useState('');
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);

  const meetingRef = useRef(null);

  // Initialize from URL parameters (in a real app, you'd pass these as props)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const meetingIdParam = urlParams.get('meetingId') || urlParams.get('roomId') || 'demo-room-123';
    const tokenParam = urlParams.get('token') || 'demo-token';
    const nameParam = urlParams.get('name') || 'User';
    const participantIdParam = urlParams.get('participantId') || `user_${Date.now()}`;

    setMeetingId(meetingIdParam);
    setToken(tokenParam);
    setParticipantName(nameParam);
    setParticipantId(participantIdParam);
  }, []);

    useEffect(() => {
  const handleUnload = () => {
    postToRN('CALL_DISCONNECTED', { meetingId });
  };
  window.addEventListener('beforeunload', handleUnload);
  return () => window.removeEventListener('beforeunload', handleUnload);
}, [meetingId]);

  // Initialize VideoSDK
  const initializeVideoSDK = useCallback(async () => {
    if (!meetingId || !token) {
      setError('Missing meeting ID or token');
      return;
    }

    try {
      // Note: In a real implementation, you'd need to load the VideoSDK library
      // For this demo, we'll simulate the behavior
      console.log('Initializing VideoSDK with:', { meetingId, token, participantName });
      
      // Simulate connection delay
      setTimeout(() => {
        setIsConnecting(false);
        setParticipantCount(1);
        // Simulate successful connection
        onMeetingJoined();
      }, 2000);

    } catch (error) {
      console.error('VideoSDK initialization error:', error);
      setError(`Failed to initialize video call: `);
    }
  }, [meetingId, token, participantName]);

  // Simulated meeting joined handler
  const onMeetingJoined = () => {
    console.log("Meeting joined successfully");
    setIsConnecting(false);
    // In real implementation, this would come from VideoSDK events
    setLocalParticipant({
      id: participantId,
      displayName: participantName,
      webcamOn: true,
      micOn: true
      
    });
     postToRN('CALL_CONNECTED', { meetingId, participantId, participantName });
  };

  useEffect(() => {
    if (meetingId && token) {
      initializeVideoSDK();
    }
  }, [meetingId, token, initializeVideoSDK]);

  const toggleMic = () => {
    setMicOn(!micOn);
    // In real implementation: meeting.toggleMic();
    console.log('Toggling microphone');
  };

  const toggleCamera = () => {
    setCameraOn(!cameraOn);
    // In real implementation: meeting.toggleWebcam();
    console.log('Toggling camera');
  };

  const switchCamera = async () => {
    if (availableCameras.length < 2) {
      console.log('Cannot switch camera: not enough cameras available');
      return;
    }
    // In real implementation: switch between cameras
    console.log('Switching camera');
  };

  const endCall = () => {
    console.log('Ending call');
    postToRN('END_CALL', { meetingId });
    // In real implementation: meeting.leave();
    setError('Call ended. You can close this window.');
  };

const ParticipantView: React.FC<ParticipantViewProps> = ({ participant, isLocal = false }) => {
    const hasVideo = participant?.webcamOn;
    
    return (
      <div className={`participant ${isLocal ? 'local' : ''}`}>
        {hasVideo ? (
          <div className="video-container">
            <video
              autoPlay
              playsInline
              muted={isLocal}
              className="participant-video"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '12px'
              }}
            />
            {isLocal && availableCameras.length > 1 && (
              <button className="camera-switch" onClick={switchCamera}>
                🔄
              </button>
            )}
          </div>
        ) : (
          <div className="no-video-placeholder">
            <div className="avatar-placeholder">
              {participant?.displayName ? participant.displayName.charAt(0).toUpperCase() : '?'}
            </div>
            <div>{participant?.displayName || 'Unknown'}</div>
            <div style={{ opacity: 0.7, fontSize: '0.875rem', marginTop: '0.5rem' }}>
              {participant?.webcamOn ? 'Connecting video...' : 'Camera is off'}
            </div>
          </div>
        )}
        
        <div className="participant-info">
          {isLocal ? (
            <>
              <span className="status-icon"></span>
              You
            </>
          ) : (
            participant?.displayName || 'Unknown'
          )}
          {!participant?.micOn && <span className="status-icon muted"></span>}
        </div>
      </div>
    );
  };

  const renderParticipantsGrid = () => {
    const totalParticipants = participants.size + (localParticipant ? 1 : 0);
    
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

    if (isConnecting) {
      return (
        <div className={gridClass}>
          <div className="waiting-room">
            <div className="spinner"></div>
            <h2>Connecting to video call...</h2>
            <p>Please wait while we connect you to the meeting</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={gridClass}>
          <div className="error-container">
            <div className="icon">⚠️</div>
            <h2>Connection Error</h2>
            <p>{error}</p>
            <button className="retry-btn" onClick={() => window.location.reload()}>
              Try Again
            </button>
            <button className="retry-btn secondary" onClick={endCall}>
              End Call
            </button>
          </div>
        </div>
      );
    }

    if (totalParticipants === 0) {
      return (
        <div className={gridClass}>
          <div className="waiting-room">
            <div className="icon">👥</div>
            <h2>Waiting for participants...</h2>
            <p>Share the room ID with others to join</p>
          </div>
        </div>
      );
    }

    return (
      <div className={gridClass}>
        {localParticipant && (
          <ParticipantView participant={localParticipant} isLocal={true} />
        )}
        {Array.from(participants.values()).map((participant) => (
          <ParticipantView key={participant.id} participant={participant} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <style jsx>{`
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

        .participant {
          position: relative;
          background: #333;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
        }

        .participant.local {
          border: 2px solid #10B981;
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
          background: #EF4444;
        }

        .no-video-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
          height: 100%;
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

        .waiting-room {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
          height: 100%;
        }

        .waiting-room .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.6;
        }

        .waiting-room h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .waiting-room p {
          opacity: 0.7;
          font-size: 1rem;
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

        .control-btn:hover {
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

        .control-btn.end-call:hover {
          background: rgba(239, 68, 68, 1);
        }

        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 0.5rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
          height: 100%;
          padding: 2rem;
        }

        .error-container .icon {
          font-size: 4rem;
          color: #EF4444;
          margin-bottom: 1rem;
        }

        .error-container h2 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: #EF4444;
        }

        .error-container p {
          opacity: 0.8;
          margin-bottom: 2rem;
          line-height: 1.5;
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
        }

        .retry-btn:hover {
          background: #059669;
        }

        .retry-btn.secondary {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
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
        }

        .camera-switch:hover {
          background: rgba(0, 0, 0, 0.8);
        }

        .camera-switch:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
      `}</style>

      {/* Header */}
      <div className="header">
        <h1>Wellness Video Call</h1>
        <div className="room-info">
          Room: {meetingId || 'Connecting...'}
        </div>
        <div className="participant-count">
          {participantCount} participant{participantCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Video Container */}
      <div className="video-container">
        {renderParticipantsGrid()}
      </div>

      {/* Controls */}
      <div className="controls">
        <button
          className={`control-btn ${!micOn ? 'muted' : ''}`}
          onClick={toggleMic}
          title="Toggle Microphone"
        >
          🎤
        </button>
        <button
          className={`control-btn ${!cameraOn ? 'muted' : ''}`}
          onClick={toggleCamera}
          title="Toggle Camera"
        >
          📹
        </button>
        <button
          className="control-btn"
          onClick={switchCamera}
          disabled={!cameraOn || availableCameras.length < 2}
          title="Switch Camera"
        >
          🔄
        </button>
        <button
          className="control-btn end-call"
          onClick={endCall}
          title="End Call"
        >
          📞
        </button>
      </div>
    </div>
  );
};

export default VideoCallApp;