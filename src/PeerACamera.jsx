import React, { useState, useEffect, useRef } from 'react';
import './PeerACamera.css';

const PeerACamera = () => {
  const [connectionStatus, setConnectionStatus] = useState('INITIALIZING');
  const [peerStatus, setPeerStatus] = useState('READY');
  const [offer, setOffer] = useState('');
  const [answer, setAnswer] = useState('');
  const [statusMessage, setStatusMessage] = useState('Click "Initialize Camera" to start streaming');
  const [isError, setIsError] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [offerGenerated, setOfferGenerated] = useState(false);
  const [answerSet, setAnswerSet] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [timestamp, setTimestamp] = useState('00:00:00');

  const localVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  // WebRTC Configuration with STUN servers
async function createPeerConnection() {
  const res = await fetch("https://turn.pdftoexcel.space/turn-credentials");
  const data = await res.json();

  const config = {
    iceServers: [
      { urls: "stun:turn.pdftoexcel.space:3478" },
      {
        urls: "turn:turn.pdftoexcel.space:3478",
        username: data.username,
        credential: data.credential
      }
    ]
  };

  return new RTCPeerConnection(config);
}

  // Update timestamp
  useEffect(() => {
    const updateTimestamp = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTimestamp(`${hours}:${minutes}:${seconds}`);
    };

    updateTimestamp();
    const interval = setInterval(updateTimestamp, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update status
  const updateStatus = (message, error = false) => {
    setStatusMessage(message);
    setIsError(error);
  };

  // Initialize camera
  const handleStartCamera = async () => {
    try {
      updateStatus('Requesting camera access...');
      
      // Get user media (camera)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      updateStatus('Camera initialized successfully! Creating offer...');
      setConnectionStatus('CAMERA ACTIVE');
      setPeerStatus('STREAMING');
      setCameraStarted(true);

      // Create peer connection
      await createOffer();
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      updateStatus(`Error: ${error.message}`, true);
      setConnectionStatus('ERROR');
      setPeerStatus('FAILED');
    }
  };

  // Create WebRTC offer
  const createOffer = async () => {
    try {
      const pc = await createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local stream tracks to peer connection
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });

      // ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('New ICE candidate:', event.candidate);
        }
      };

      // ICE gathering state
      pc.onicegatheringstatechange = () => {
        console.log('ICE gathering state:', pc.iceGatheringState);
        if (pc.iceGatheringState === 'complete') {
          const offerData = pc.localDescription;
          setOffer(JSON.stringify(offerData, null, 2));
          setOfferGenerated(true);
          updateStatus('Offer generated! Copy it and send to Peer B.');
        }
      };

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        setPeerStatus(pc.connectionState.toUpperCase());
        
        if (pc.connectionState === 'connected') {
          updateStatus('✓ Successfully connected to Peer B! Video streaming...');
          setConnectionStatus('CONNECTED');
        } else if (pc.connectionState === 'failed') {
          updateStatus('Connection failed. Please try again.', true);
          setConnectionStatus('FAILED');
        }
      };

      // Create and set offer
      const offerDesc = await pc.createOffer();
      await pc.setLocalDescription(offerDesc);

      updateStatus('Gathering ICE candidates... Please wait.');

    } catch (error) {
      console.error('Error creating offer:', error);
      updateStatus(`Error creating offer: ${error.message}`, true);
    }
  };

  // Copy offer to clipboard
  const handleCopyOffer = async () => {
    try {
      await navigator.clipboard.writeText(offer);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Error copying:', error);
      alert('Failed to copy. Please select and copy manually.');
    }
  };

  // Set answer from Peer B
  const handleSetAnswer = async () => {
    try {
      const answerObj = JSON.parse(answer);
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answerObj)
      );
      updateStatus('Answer received! Establishing connection...');
      setAnswerSet(true);
      setConnectionStatus('CONNECTING');
    } catch (error) {
      console.error('Error setting answer:', error);
      updateStatus(`Error: ${error.message}`, true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  return (
    <div className="peer-a-container">
      <div className="container">
        <header>
          <h1>CAMERA FEED</h1>
          <div className="subtitle">Peer A - Surveillance Source</div>
          <div className="status-badge">
            <div className="status-indicator"></div>
            <span>{connectionStatus}</span>
          </div>
        </header>

        <div className="main-content">
          <div className="video-section">
            <div className="video-container">
              <div className="video-header">
                <div className="video-title">LIVE CAMERA</div>
                <div className="rec-indicator">
                  <div className="rec-dot"></div>
                  <span>STREAMING</span>
                </div>
              </div>
              <video ref={localVideoRef} autoPlay muted playsInline />
              <div className="video-overlay">
                <div className="timestamp">{timestamp}</div>
                <div className="cam-id">CAM-A-001</div>
              </div>
            </div>
          </div>

          <div className="control-panel">
            <div className="panel-section">
              <div className="section-title">Connection Details</div>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Role</span>
                  <span className="info-value">CAMERA SOURCE</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Peer ID</span>
                  <span className="info-value">PEER-A</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Status</span>
                  <span className="info-value">{peerStatus}</span>
                </div>
              </div>
            </div>

            <div className="panel-section">
              <div className="section-title">Setup Connection</div>
              <button 
                onClick={handleStartCamera}
                disabled={cameraStarted}
              >
                Initialize Camera
              </button>
            </div>

            <div className="panel-section">
              <div className="section-title">Offer (Send to Peer B)</div>
              <textarea 
                value={offer}
                readOnly
                placeholder="Offer will appear here..."
              />
              <button 
                onClick={handleCopyOffer}
                className="btn-secondary"
                disabled={!offerGenerated}
              >
                {copySuccess ? '✓ Copied!' : 'Copy Offer'}
              </button>
            </div>

            <div className="panel-section">
              <div className="section-title">Answer (Paste from Peer B)</div>
              <textarea 
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Paste answer from Peer B here..."
                disabled={answerSet}
              />
              <button 
                onClick={handleSetAnswer}
                className="btn-secondary"
                disabled={!answer.trim() || answerSet}
              >
                Set Answer
              </button>
            </div>

            <div className="panel-section">
              <div className={`connection-status ${isError ? 'disconnected' : ''}`}>
                {statusMessage}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeerACamera;