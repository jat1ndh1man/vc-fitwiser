'use client';
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// VideoSDK Configuration - Update these with your actual values
const VIDEOSDK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiJkMzFmYjVjZi1iYzFkLTRmMjQtYjg1Ni05OTVlZTgzMjY2MDAiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc1NTQyOTQ4MSwiZXhwIjoxOTEzMjE3NDgxfQ.PDGqipQbZ8B_gd1Emys5pFjkC7IOGrwvRq418fNhL1Y";

// Loading component
const LoadingComponent = () => (
  <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <h2 className="text-white text-lg">Loading video call...</h2>
      <p className="text-gray-400 text-sm mt-1">Please wait while we initialize the video components</p>
    </div>
  </div>
);

// Error component
const ErrorComponent = ({ error }: { error: string }) => (
  <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
      <div className="text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Error</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <div className="flex space-x-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.close()}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Video Call Main Component (client-side only)
const VideoCallMainComponent = () => {
  const [meetingId, setMeetingId] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [participantName, setParticipantName] = useState<string>('User');
  const [participantId, setParticipantId] = useState<string>('');
  const [initialized, setInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

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

  if (error) {
    return <ErrorComponent error={error} />;
  }

  if (!initialized) {
    return <LoadingComponent />;
  }

  // Render the actual video call component
  return (
    <VideoCallComponent
      roomId={meetingId}
      participantName={participantName}
      onLeave={() => {
        console.log('Call ended by user');
        window.close();
      }}
    />
  );
};

// Main Video Call Component
const VideoCallComponent = ({ 
  roomId, 
  onLeave, 
  participantName = "User" 
}: {
  roomId: string;
  onLeave: () => void;
  participantName?: string;
}) => {
  const [meeting, setMeeting] = useState<any>(null);
  const [participants, setParticipants] = useState(new Map());
  const [localWebcamOn, setLocalWebcamOn] = useState(true);
  const [localMicOn, setLocalMicOn] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLeavingCall, setIsLeavingCall] = useState(false);
  const [participantStreams, setParticipantStreams] = useState(new Map());
  const [audioStreams, setAudioStreams] = useState(new Map());
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  
  const remoteParticipants = Array.from(participants.values()).filter(
    (p: any) => p.id !== meeting?.localParticipant?.id
  );

  const videoElementRefs = useRef(new Map());
  const audioElementRefs = useRef(new Map());

  async function loadVideoSDK() {
    const mod = await import("@videosdk.live/js-sdk");
    const VS = mod?.VideoSDK || mod?.default || mod;
    if (!VS || typeof VS.initMeeting !== "function") {
      throw new Error(
        "Failed to load VideoSDK. Check that @videosdk.live/js-sdk is installed and up to date."
      );
    }
    return VS;
  }

  // Initialize VideoSDK when component mounts
  useEffect(() => {
    let isMounted = true;
    let currentMeeting: any = null;

    const initializeVideoSDK = async () => {
      try {
        if (!isMounted || meeting) {
          console.log("🚫 Skipping initialization - component unmounted or meeting exists");
          return;
        }

        console.log("🔄 Initializing VideoSDK for web...");

        if (!VIDEOSDK_TOKEN || VIDEOSDK_TOKEN.length < 10) {
          throw new Error("VideoSDK token not configured. Please set VIDEOSDK_TOKEN in the component");
        }

        // Request permissions
        try {
          await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          console.log("✅ Media permissions granted");
        } catch (permError) {
          console.warn("⚠️ Media permission error:", permError);
          // Continue anyway, VideoSDK will handle this
        }

        const VideoSDK = await loadVideoSDK();
        if (!isMounted) return;

        VideoSDK.config(VIDEOSDK_TOKEN);

        const meetingConfig = {
          meetingId: roomId,
          name: participantName,
          micEnabled: localMicOn,
          webcamEnabled: localWebcamOn,
          mode: "SEND_AND_RECV" as const,
        };

        const meetingInstance = VideoSDK.initMeeting(meetingConfig);
        currentMeeting = meetingInstance;

        if (!isMounted) {
          meetingInstance.leave();
          return;
        }

        // Set up listeners
        meetingInstance.on("meeting-joined", handleMeetingJoined);
        meetingInstance.on("meeting-left", handleMeetingLeft);
        meetingInstance.on("participant-joined", handleParticipantJoined);
        meetingInstance.on("participant-left", handleParticipantLeft);
        meetingInstance.on("error", handleMeetingError);

        // Local participant stream listeners
        meetingInstance.localParticipant.on("stream-enabled", (stream: any) => {
          handleStreamEnabled(meetingInstance.localParticipant.id, stream);
        });
        meetingInstance.localParticipant.on("stream-disabled", (stream: any) => {
          handleStreamDisabled(meetingInstance.localParticipant.id, stream);
        });

        setMeeting(meetingInstance);
        meetingInstance.join();

      } catch (error: any) {
        console.error("❌ VideoSDK initialization error:", error);
        if (isMounted) {
          setConnectionError(error.message);
          setIsConnecting(false);
        }
      }
    };

    const handleMeetingJoined = () => {
      console.log("✅ VideoSDK meeting joined successfully");
      setIsConnecting(false);
      setConnectionError(null);
    };

    const handleMeetingLeft = () => {
      console.log("👋 VideoSDK meeting left");
      setIsConnecting(false);
      setIsLeavingCall(false);
      onLeave();
    };

    const handleParticipantJoined = (participant: any) => {
      console.log("👤 Participant joined:", participant.displayName, participant.id);
      
      if (meeting && participant.id === meeting.localParticipant?.id) {
        console.log("🚫 Skipping local participant from participants list");
        return;
      }
      
      setParticipants(prev => {
        if (prev.has(participant.id)) {
          console.log("⚠️ Participant already exists, skipping:", participant.id);
          return prev;
        }
        
        const updated = new Map(prev);
        updated.set(participant.id, participant);
        console.log("✅ Added remote participant:", participant.id, "Total remote:", updated.size);
        return updated;
      });

      // Listen for stream events
      participant.on("stream-enabled", (stream: any) => {
        console.log("📺 Remote stream enabled:", stream.kind, "for", participant.id);
        handleStreamEnabled(participant.id, stream);
      });

      participant.on("stream-disabled", (stream: any) => {
        console.log("📺 Remote stream disabled:", stream.kind, "for", participant.id);
        handleStreamDisabled(participant.id, stream);
      });
    };

    const handleParticipantLeft = (participant: any) => {
      console.log("👤 Participant left:", participant.displayName);
      setParticipants(prev => {
        const updated = new Map(prev);
        updated.delete(participant.id);
        return updated;
      });

      setParticipantStreams(prev => {
        const updated = new Map(prev);
        updated.delete(participant.id);
        return updated;
      });

      setAudioStreams(prev => {
        const updated = new Map(prev);
        updated.delete(participant.id);
        return updated;
      });

      // Clean up video element
      const videoElement = videoElementRefs.current.get(participant.id);
      if (videoElement) {
        videoElement.srcObject = null;
        videoElementRefs.current.delete(participant.id);
      }

      // Clean up audio element
      const audioElement = audioElementRefs.current.get(participant.id);
      if (audioElement) {
        audioElement.srcObject = null;
        audioElementRefs.current.delete(participant.id);
      }

      // Close expanded view if this participant was expanded
      if (expandedParticipant === participant.id) {
        setExpandedParticipant(null);
      }
    };

    const handleStreamEnabled = (participantId: string, stream: any) => {
      console.log("📺 Stream enabled for participant:", participantId, "kind:", stream.kind);
      
      if (stream.kind === "video") {
        setParticipantStreams(prev => {
          const updated = new Map(prev);
          updated.set(participantId, stream);
          console.log("✅ Video stream stored for:", participantId);
          return updated;
        });

        setTimeout(() => {
          const videoElement = videoElementRefs.current.get(participantId);
          if (videoElement && stream.track) {
            try {
              const mediaStream = new MediaStream([stream.track]);
              videoElement.srcObject = mediaStream;
              videoElement.play().catch(console.error);
              console.log("✅ Video element updated for:", participantId);
            } catch (error) {
              console.error("❌ Error updating video element:", error);
            }
          }
        }, 100);
      } else if (stream.kind === "audio") {
        console.log("🔊 Audio stream enabled for:", participantId);
        setAudioStreams(prev => {
          const updated = new Map(prev);
          updated.set(participantId, stream);
          return updated;
        });

        setTimeout(() => {
          const audioElement = audioElementRefs.current.get(participantId);
          if (audioElement && stream.track) {
            try {
              const mediaStream = new MediaStream([stream.track]);
              audioElement.srcObject = mediaStream;
              audioElement.play().catch(console.error);
              console.log("✅ Audio element updated for:", participantId);
            } catch (error) {
              console.error("❌ Error updating audio element:", error);
            }
          }
        }, 100);
      }
    };

    const handleStreamDisabled = (participantId: string, stream: any) => {
      if (stream.kind === "video") {
        setParticipantStreams(prev => {
          const updated = new Map(prev);
          updated.delete(participantId);
          return updated;
        });

        const videoElement = videoElementRefs.current.get(participantId);
        if (videoElement) {
          videoElement.srcObject = null;
        }
      } else if (stream.kind === "audio") {
        setAudioStreams(prev => {
          const updated = new Map(prev);
          updated.delete(participantId);
          return updated;
        });

        const audioElement = audioElementRefs.current.get(participantId);
        if (audioElement) {
          audioElement.srcObject = null;
        }
      }
    };

    const handleMeetingError = (error: any) => {
      console.error("❌ VideoSDK meeting error:", error);
      setConnectionError(error.message || "Unknown video call error");
      setIsConnecting(false);
    };

    initializeVideoSDK();

    return () => {
      isMounted = false;
      if (currentMeeting) {
        try {
          currentMeeting.off("meeting-joined", handleMeetingJoined);
          currentMeeting.off("meeting-left", handleMeetingLeft);
          currentMeeting.off("participant-joined", handleParticipantJoined);
          currentMeeting.off("participant-left", handleParticipantLeft);
          currentMeeting.off("error", handleMeetingError);
          currentMeeting.leave();
        } catch (error) {
          console.warn("⚠️ Error during cleanup:", error);
        }
      }
    };
  }, [roomId]);

  const toggleWebcam = () => {
    if (meeting) {
      if (localWebcamOn) {
        meeting.disableWebcam();
      } else {
        meeting.enableWebcam();
      }
      setLocalWebcamOn(!localWebcamOn);
    }
  };

  const toggleMic = () => {
    if (meeting) {
      if (localMicOn) {
        meeting.muteMic();
      } else {
        meeting.unmuteMic();
      }
      setLocalMicOn(!localMicOn);
    }
  };

  const handleLeaveCall = async () => {
    try {
      setIsLeavingCall(true);
      if (meeting) {
        meeting.leave();
      } else {
        onLeave();
      }
    } catch (error) {
      console.error("❌ Error leaving call:", error);
      onLeave();
    }
  };

  const handleDoubleClick = (participantId: string) => {
    if (expandedParticipant === participantId) {
      setExpandedParticipant(null);
    } else {
      setExpandedParticipant(participantId);
    }
  };

  const ParticipantView = ({ 
    participant, 
    isLocal = false, 
    isExpanded = false 
  }: { 
    participant: any; 
    isLocal?: boolean; 
    isExpanded?: boolean; 
  }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const stream = participantStreams.get(participant.id);
    const audioStream = audioStreams.get(participant.id);
    const hasVideo = !!(stream && stream.track);

    // Store refs for cleanup
    useEffect(() => {
      if (videoRef.current) {
        videoElementRefs.current.set(participant.id, videoRef.current);
      }
      if (audioRef.current) {
        audioElementRefs.current.set(participant.id, audioRef.current);
      }
      return () => {
        videoElementRefs.current.delete(participant.id);
        audioElementRefs.current.delete(participant.id);
      };
    }, [participant.id]);

    // Attach video stream
    useEffect(() => {
      const el = videoRef.current;
      if (!el) return;

      if (stream?.track) {
        const ms = new MediaStream([stream.track]);
        el.srcObject = ms;
        el.play().catch((error: Error) => {
          console.warn("Video play failed:", error);
        });
      } else {
        el.srcObject = null;
      }
    }, [stream]);

    // Attach audio stream (only for remote participants)
    useEffect(() => {
      const el = audioRef.current;
      if (!el || isLocal) return; // Don't play local audio to prevent echo

      if (audioStream?.track) {
        const ms = new MediaStream([audioStream.track]);
        el.srcObject = ms;
        el.play().catch((error: Error) => {
          console.warn("Audio play failed:", error);
        });
      } else {
        el.srcObject = null;
      }
    }, [audioStream, isLocal]);

    return (
      <div 
        className={`participant-view ${isLocal ? 'local' : ''} ${isExpanded ? 'expanded' : ''}`}
        onDoubleClick={() => handleDoubleClick(participant.id)}
      >
        {hasVideo ? (
          <video
            ref={videoRef}
            className={`participant-video ${isExpanded ? 'expanded' : ''}`}
            autoPlay
            playsInline
            muted={isLocal}
          />
        ) : (
          <div className="no-video-placeholder">
            <div className="no-video-content">
              <div className="participant-avatar">
                <span className="participant-avatar-text">
                  {participant.displayName ? participant.displayName.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
              <p className="participant-name">{participant.displayName || 'Unknown'}</p>
              <p className="camera-off-text">Camera is off</p>
            </div>
          </div>
        )}

        {/* Audio element for remote participants */}
        {!isLocal && (
          <audio
            ref={audioRef}
            autoPlay
            playsInline
          />
        )}

        {/* Participant info overlay */}
        <div className="participant-info-overlay">
          <div className="participant-info">
            <span className="participant-label">
              {isLocal ? 'You' : participant.displayName || 'Unknown'}
            </span>
            <div className="participant-status">
              {!localMicOn && isLocal && (
                <div className="status-indicator muted">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                </div>
              )}
              {!hasVideo && (
                <div className="status-indicator camera-off">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expand/collapse button */}
        {hasVideo && (
          <button
            className="expand-button"
            onClick={(e) => {
              e.stopPropagation();
              handleDoubleClick(participant.id);
            }}
          >
            {isExpanded ? (
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 15v4.5M15 15h4.5M15 15l5.25 5.25" />
              </svg>
            ) : (
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>
        )}
      </div>
    );
  };

  // Error state
  if (connectionError) {
    return (
      <div className="error-modal">
        <div className="error-content">
          <div className="error-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: '#dc2626'}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="error-title">Connection Error</h3>
          <p className="error-message">{connectionError}</p>
          <div className="error-buttons">
            <button
              onClick={() => {
                setConnectionError(null);
                setIsConnecting(true);
                window.location.reload();
              }}
              className="error-button primary"
            >
              Try Again
            </button>
            <button
              onClick={onLeave}
              className="error-button secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const participantArray = Array.from(participants.values());
  const totalParticipants = participantArray.length;

  return (
    <div className="video-call-container">
      {/* Header */}
      <div className="video-call-header">
        <div>
          <h2 className="video-call-title">Video Call</h2>
          <p className="video-call-subtitle">
            {isConnecting ? 'Connecting...' : 
             isLeavingCall ? 'Ending call...' :
             `${totalParticipants + 1} participant${totalParticipants !== 0 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={onLeave}
          className="header-close-btn"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Video Grid */}
      <div className="video-grid-container">
        {isConnecting ? (
          <div className="loading-container">
            <div className="loading-content">
              <div className="spinner"></div>
              <p className="loading-title">Connecting to video call...</p>
              <p className="loading-subtitle">Please wait while we connect you</p>
            </div>
          </div>
        ) : isLeavingCall ? (
          <div className="loading-container">
            <div className="loading-content">
              <div className="spinner" style={{borderTopColor: '#dc2626'}}></div>
              <p className="loading-title">Ending call...</p>
            </div>
          </div>
        ) : (
          <div style={{height: '100%', position: 'relative'}}>
            {/* Expanded participant overlay */}
            {expandedParticipant && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 30,
                background: 'rgba(0,0,0,0.9)'
              }}>
                {meeting && meeting.localParticipant && expandedParticipant === meeting.localParticipant.id && (
                  <ParticipantView
                    key={`expanded-local-${meeting.localParticipant.id}`}
                    participant={meeting.localParticipant}
                    isLocal
                    isExpanded
                  />
                )}
                {remoteParticipants.map((participant: any) => 
                  expandedParticipant === participant.id && (
                    <ParticipantView
                      key={`expanded-remote-${participant.id}`}
                      participant={participant}
                      isLocal={false}
                      isExpanded
                    />
                  )
                )}
              </div>
            )}

            {/* Single participant or waiting state */}
            {remoteParticipants.length === 0 ? (
              <div className="waiting-room">
                <div className="waiting-content">
                  <div className="waiting-icon">👥</div>
                  <p className="waiting-title">Waiting for participants...</p>
                  <p className="waiting-subtitle">Share the room ID with others to join</p>
                  {/* Show local video while waiting */}
                  {meeting && meeting.localParticipant && (
                    <div className="local-video-preview">
                      <ParticipantView
                        key={`local-waiting-${meeting.localParticipant.id}`}
                        participant={meeting.localParticipant}
                        isLocal
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Multiple participants grid */
              <div className={`participants-grid ${
                remoteParticipants.length + 1 <= 1 ? 'grid-1' :
                remoteParticipants.length + 1 <= 2 ? 'grid-2' : 
                remoteParticipants.length + 1 <= 4 ? 'grid-4' : 
                'grid-many'
              }`}>
                {/* Local participant tile */}
                {meeting && meeting.localParticipant && (
                  <ParticipantView
                    key={`local-${meeting.localParticipant.id}`}
                    participant={meeting.localParticipant}
                    isLocal
                  />
                )}

                {/* Remote participants */}
                {remoteParticipants.map((participant: any) => (
                  <ParticipantView
                    key={`remote-${participant.id}`}
                    participant={participant}
                    isLocal={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="controls-container">
        <div className="controls-buttons">
          {/* Microphone */}
          <button
            onClick={toggleMic}
            disabled={isConnecting || isLeavingCall}
            className={`control-button ${localMicOn ? 'mic-on' : 'mic-off'}`}
            title={localMicOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {localMicOn ? (
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>

          {/* Camera */}
          <button
            onClick={toggleWebcam}
            disabled={isConnecting || isLeavingCall}
            className={`control-button ${localWebcamOn ? 'camera-on' : 'camera-off'}`}
            title={localWebcamOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {localWebcamOn ? (
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
              </svg>
            )}
          </button>

          {/* End Call */}
          <button
            onClick={handleLeaveCall}
            disabled={isLeavingCall}
            className="control-button end-call"
            title="End call"
          >
            {isLeavingCall ? (
              <div className="end-call-spinner"></div>
            ) : (
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l18 18" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Call info */}
        <div className="call-info">
          <p className="call-details">
            Room ID: <span className="room-id">{roomId}</span> • 
            {remoteParticipants.length + 1} participant{remoteParticipants.length !== 0 ? 's' : ''}
          </p>
          <p className="call-instructions">
            Double-click any video to expand • Audio should work automatically
          </p>
        </div>
      </div>
    </div>
  );
};

// Dynamically import the main component with SSR disabled
const VideoCallApp = dynamic(() => Promise.resolve(VideoCallMainComponent), {
  ssr: false,
  loading: () => <LoadingComponent />
});

export default VideoCallApp;