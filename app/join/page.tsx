'use client';
import React, { useState, useEffect, useRef } from 'react';

// VideoSDK Configuration - Update these with your actual values
const VIDEOSDK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiJkMzFmYjVjZi1iYzFkLTRmMjQtYjg1Ni05OTVlZTgzMjY2MDAiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc1NTQyOTQ4MSwiZXhwIjoxOTEzMjE3NDgxfQ.PDGqipQbZ8B_gd1Emys5pFjkC7IOGrwvRq418fNhL1Y";

// Loading component
const LoadingComponent = () => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '20px'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '3px solid #3b82f6',
        borderTop: '3px solid transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px'
      }}></div>
      <h2 style={{
        color: 'white',
        fontSize: '18px',
        fontWeight: '600',
        margin: '0 0 8px 0'
      }}>Loading video call...</h2>
      <p style={{
        color: '#9ca3af',
        fontSize: '14px',
        margin: 0
      }}>Please wait while we initialize the video components</p>
    </div>
    <style jsx>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Error component
const ErrorComponent = ({ error }: { error: string }) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '20px'
  }}>
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '400px',
      width: '100%',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          backgroundColor: '#fef2f2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <svg style={{ width: '24px', height: '24px', color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 8px 0'
        }}>Connection Error</h3>
        <p style={{
          color: '#6b7280',
          margin: '0 0 16px 0',
          fontSize: '14px'
        }}>{error}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              flex: 1,
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              minHeight: '44px'
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.close()}
            style={{
              flex: 1,
              backgroundColor: '#e5e7eb',
              color: '#374151',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              minHeight: '44px'
            }}
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
  const [localFacingMode, setLocalFacingMode] =
  useState<'user' | 'environment' | 'unknown'>('unknown');
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
        // Try multiple methods to close the window/webview
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'CLOSE_WEBVIEW' }, '*');
          }
          window.close();
        } catch (e) {
          console.log('Error closing window:', e);
        }
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
  const [participantStates, setParticipantStates] = useState(new Map()); // Track audio/video states
  const [localWebcamOn, setLocalWebcamOn] = useState(true);
  const [localMicOn, setLocalMicOn] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user'); // Add this line


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

      // Initialize participant state
      setParticipantStates(prev => {
        const updated = new Map(prev);
        updated.set(participant.id, {
          micOn: true, // Default to true, will be updated by stream events
          webcamOn: true // Default to true, will be updated by stream events
        });
        return updated;
      });

      // Listen for stream events
      participant.on("stream-enabled", (stream: any) => {
        console.log("📺 Remote stream enabled:", stream.kind, "for", participant.id);
        handleStreamEnabled(participant.id, stream);
        
        // Update participant state
        if (stream.kind === "video") {
          setParticipantStates(prev => {
            const updated = new Map(prev);
            const currentState = updated.get(participant.id) || { micOn: true, webcamOn: false };
            updated.set(participant.id, { ...currentState, webcamOn: true });
            return updated;
          });
        } else if (stream.kind === "audio") {
          setParticipantStates(prev => {
            const updated = new Map(prev);
            const currentState = updated.get(participant.id) || { micOn: false, webcamOn: true };
            updated.set(participant.id, { ...currentState, micOn: true });
            return updated;
          });
        }
      });

      participant.on("stream-disabled", (stream: any) => {
        console.log("📺 Remote stream disabled:", stream.kind, "for", participant.id);
        handleStreamDisabled(participant.id, stream);
        
        // Update participant state
        if (stream.kind === "video") {
          setParticipantStates(prev => {
            const updated = new Map(prev);
            const currentState = updated.get(participant.id) || { micOn: true, webcamOn: true };
            updated.set(participant.id, { ...currentState, webcamOn: false });
            return updated;
          });
        } else if (stream.kind === "audio") {
          setParticipantStates(prev => {
            const updated = new Map(prev);
            const currentState = updated.get(participant.id) || { micOn: true, webcamOn: true };
            updated.set(participant.id, { ...currentState, micOn: false });
            return updated;
          });
        }
      });
    };

    const handleParticipantLeft = (participant: any) => {
      console.log("👤 Participant left:", participant.displayName);
      setParticipants(prev => {
        const updated = new Map(prev);
        updated.delete(participant.id);
        return updated;
      });

      setParticipantStates(prev => {
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

    const camIndexRef = useRef(0);

const switchCamera = async () => {
  if (!meeting || !localWebcamOn) return;

  try {
    // 1) Try native device switching first
    const webcams = (await meeting.getWebcams?.()) || [];
    if (webcams.length) {
      // figure out the current deviceId if possible
      const localId = meeting?.localParticipant?.id;
      const curTrack = participantStreams.get(localId)?.track;
      const curSettings: any = curTrack?.getSettings?.() || {};
      const currentDeviceId: string | undefined = curSettings.deviceId;
      
      // Prefer "back/environment" when toggling
      const looksLikeBack = (label = "") =>
        /back|rear|environment/i.test(label);

      // choose target device
      let target =
        // first, pick a different device than the current one
        webcams.find((d: any) => d.deviceId && d.deviceId !== currentDeviceId) ||
        // next, try explicitly a back camera by label
        webcams.find((d: any) => looksLikeBack(d.label)) ||
        // otherwise just rotate through list
        webcams[(camIndexRef.current = (camIndexRef.current + 1) % webcams.length)];

      if (target?.deviceId) {
        await meeting.changeWebcam(target.deviceId);
        
        // Update facing mode based on device label
        const isBackCamera = looksLikeBack(target.label);
        setCurrentFacingMode(isBackCamera ? 'environment' : 'user');
        return;
      }
    }

    // 2) Fallback for mobile browsers: rebuild track with opposite facing
    const VideoSDK = await loadVideoSDK();
const localId = meeting?.localParticipant?.id;
const curTrack = participantStreams.get(localId)?.track;
const currentFacing: string =
  curTrack?.getSettings?.().facingMode || currentFacingMode;

await meeting.disableWebcam();
const newFacingMode = currentFacing === "environment" ? "user" : "environment";

// Map to VideoSDK expected values: "user" -> "front", "environment" -> "environment"
const videoSDKFacingMode = newFacingMode === "user" ? "front" : "environment";

const custom = await VideoSDK.createCameraVideoTrack({
  // flip front<->back
  facingMode: videoSDKFacingMode,
});
await meeting.enableWebcam(custom);

// Update our state
setCurrentFacingMode(newFacingMode);
    
  } catch (err) {
    console.error("Error switching camera:", err);
    setConnectionError("Unable to switch camera. Check browser permissions and try again.");
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
    currentFacingMode?: 'user' | 'environment';

  }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const stream = participantStreams.get(participant.id);
    const audioStream = audioStreams.get(participant.id);
    const hasVideo = !!(stream && stream.track);
    
    // Get participant state for mute/camera indicators
    const participantState = participantStates.get(participant.id);
    const isMicOn = isLocal ? localMicOn : (participantState?.micOn ?? true);
    const isCameraOn = isLocal ? localWebcamOn && hasVideo : hasVideo;

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

    const participantViewStyle: React.CSSProperties = {
      position: 'relative',
      backgroundColor: '#1f2937',
      borderRadius: isExpanded ? '0' : '12px',
      overflow: 'hidden',
      width: isExpanded ? '100%' : 'auto',
      height: isExpanded ? '100%' : 'auto',
      cursor: hasVideo ? 'pointer' : 'default',
      border: isLocal ? '2px solid #3b82f6' : '1px solid #374151'
    };

    const videoStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      backgroundColor: '#000',
  transform: isLocal && currentFacingMode === 'user' ? 'scaleX(-1)' : 'none'
    };

    const noVideoStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#374151',
      color: 'white'
    };

    const avatarStyle: React.CSSProperties = {
      width: isExpanded ? '120px' : '60px',
      height: isExpanded ? '120px' : '60px',
      borderRadius: '50%',
      backgroundColor: '#6b7280',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isExpanded ? '48px' : '24px',
      fontWeight: 'bold',
      color: 'white',
      marginBottom: '12px'
    };

    const overlayStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
      padding: '12px',
      color: 'white'
    };

    const expandButtonStyle: React.CSSProperties = {
      position: 'absolute',
      top: '12px',
      right: '12px',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      backgroundColor: 'rgba(0,0,0,0.6)',
      border: 'none',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
       WebkitTapHighlightColor: 'transparent',
  WebkitTouchCallout: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  outline: 'none'
    };

    return (
      <div 
        style={participantViewStyle}
        onDoubleClick={() => handleDoubleClick(participant.id)}
      >
        {hasVideo ? (
          <video
            ref={videoRef}
            style={videoStyle}
            autoPlay
            playsInline
            muted={isLocal}
          />
        ) : (
          <div style={noVideoStyle}>
            <div style={{ textAlign: 'center' }}>
              <div style={avatarStyle}>
                <span>
                  {participant.displayName ? participant.displayName.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
              <p style={{ 
                fontSize: isExpanded ? '18px' : '14px', 
                fontWeight: '600', 
                margin: '0 0 4px 0' 
              }}>
                {participant.displayName || 'Unknown'}
              </p>
              <p style={{ 
                fontSize: isExpanded ? '14px' : '12px', 
                opacity: 0.8, 
                margin: 0 
              }}>
                Camera is off
              </p>
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
        <div style={overlayStyle}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '600' 
            }}>
              {isLocal ? 'You' : participant.displayName || 'Unknown'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Mic muted indicator */}
              {!isMicOn && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#dc2626',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                </div>
              )}
              {/* Camera off indicator */}
              {!isCameraOn && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#dc2626',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
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
            style={expandButtonStyle}
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
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#fef2f2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: '#dc2626'}}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 8px 0'
            }}>Connection Error</h3>
            <p style={{
              color: '#6b7280',
              margin: '0 0 16px 0'
            }}>{connectionError}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setConnectionError(null);
                  setIsConnecting(true);
                  window.location.reload();
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Try Again
              </button>
              <button
                onClick={onLeave}
                style={{
                  flex: 1,
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const participantArray = Array.from(participants.values());
  const totalParticipants = participantArray.length;

  const containerStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#111827',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#1f2937',
    borderBottom: '1px solid #374151',
    minHeight: '60px'
  };

  const gridContainerStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px',
    overflow: 'hidden'
  };

  const getGridStyle = (): React.CSSProperties => {
    const count = remoteParticipants.length + 1;
    
    if (count <= 1) {
      return {
        display: 'flex',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center'
      };
    } else if (count === 2) {
      return {
        display: 'grid',
        gridTemplateColumns: window.innerWidth > window.innerHeight ? '1fr 1fr' : '1fr',
        gridTemplateRows: window.innerWidth > window.innerHeight ? '1fr' : '1fr 1fr',
        gap: '12px',
        height: '100%'
      };
    } else if (count <= 4) {
      return {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '12px',
        height: '100%'
      };
    } else {
      return {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        height: '100%',
        overflow: 'auto'
      };
    }
  };

  const controlsStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#1f2937',
    borderTop: '1px solid #374151'
  };

  const controlButtonsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '12px'
  };

  const getControlButtonStyle = (isActive: boolean, isEndCall = false): React.CSSProperties => ({
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    backgroundColor: isEndCall ? '#dc2626' : (isActive ? '#22c55e' : '#6b7280'),
    color: 'white',
    fontSize: '20px',
     WebkitTapHighlightColor: 'transparent',
  WebkitTouchCallout: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  outline: 'none'
  });

const getSwitchCameraButtonStyle = (): React.CSSProperties => ({
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  backgroundColor: '#22c55e', 
  color: 'white',
  fontSize: '20px',
  marginLeft: '14px',
    WebkitTapHighlightColor: 'transparent',
  WebkitTouchCallout: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  outline: 'none'
  });

  const waitingStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'white',
    textAlign: 'center',
    padding: '20px'
  };

  const loadingStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'white',
    textAlign: 'center'
  };

  const spinnerStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    border: '3px solid #3b82f6',
    borderTop: '3px solid transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  };

  return (
    <>
<style jsx>{`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Remove tap highlights on all buttons and interactive elements */
  button {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    outline: none;
  }
  
  button:focus {
    outline: none;
  }
  
  @media (max-width: 768px) {
    .mobile-responsive {
      padding: 8px !important;
    }
    
    .mobile-grid {
      gap: 8px !important;
    }
    
    .mobile-controls {
      padding: 12px !important;
    }
    
    .mobile-button {
      width: 48px !important;
      height: 48px !important;
    }
    
    .mobile-switch-button {
      width: 36px !important;
      height: 36px !important;
    }
  }
`}</style>
      
      <div style={containerStyle}>
        {/* Video Grid */}
        <div style={gridContainerStyle} className="mobile-responsive">
          {isConnecting ? (
            <div style={loadingStyle}>
              <div style={spinnerStyle}></div>
              <p style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>
                Connecting to video call...
              </p>
              <p style={{ fontSize: '14px', opacity: 0.8, margin: 0 }}>
                Please wait while we connect you
              </p>
            </div>
          ) : isLeavingCall ? (
            <div style={loadingStyle}>
              <div style={{...spinnerStyle, borderTopColor: '#dc2626'}}></div>
              <p style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                Ending call...
              </p>
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
                <div style={waitingStyle}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
                  <p style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 8px 0' }}>
                    Waiting for Coach...
                  </p>
                  <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>
                  </p>
                  {/* Show local video while waiting */}
                  {meeting && meeting.localParticipant && (
                    <div style={{
                      width: '100%',
                      maxWidth: '300px',
                      aspectRatio: '16/9'
                    }}>
                      <ParticipantView
                        key={`local-waiting-${meeting.localParticipant.id}`}
                        participant={meeting.localParticipant}
                        isLocal
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* Multiple participants grid */
                <div style={getGridStyle()} className="mobile-grid">
                  {/* Local participant tile */}
                  {meeting && meeting.localParticipant && (
                    <ParticipantView
                      key={`local-${meeting.localParticipant.id}`}
                      participant={meeting.localParticipant}
                      isLocal
                      currentFacingMode={currentFacingMode}

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
        <div style={controlsStyle} className="mobile-controls">
          <div style={controlButtonsStyle}>
            {/* Microphone */}
            <button
              onClick={toggleMic}
              disabled={isConnecting || isLeavingCall}
              style={getControlButtonStyle(localMicOn)}
              className="mobile-button"
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

            {/* Camera controls group */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* Camera */}
              <button
                onClick={toggleWebcam}
                disabled={isConnecting || isLeavingCall}
                style={getControlButtonStyle(localWebcamOn)}
                className="mobile-button"
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

              {/* Camera Switch Button */}
              {localWebcamOn && (
                 <button
    onClick={switchCamera}
    disabled={isConnecting || isLeavingCall}
    style={getSwitchCameraButtonStyle()}
    className="mobile-button" 
    title="Switch camera"
  >
           <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
</svg>
                </button>
              )}
            </div>

          </div>
          
  
        </div>
      </div>
    </>
  );
};

export default VideoCallMainComponent;