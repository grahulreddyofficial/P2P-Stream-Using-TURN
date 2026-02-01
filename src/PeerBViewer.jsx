import React, { useState, useEffect, useRef } from 'react';
import './PeerBViewer.css';

const PeerBViewer = () => {
  const [connectionStatus, setConnectionStatus] = useState('WAITING');
  const [peerStatus, setPeerStatus] = useState('STANDBY');
  const [recordingStatus, setRecordingStatus] = useState('RECEIVING');
  const [offer, setOffer] = useState('');
  const [answer, setAnswer] = useState('');
  const [statusMessage, setStatusMessage] = useState('Waiting for offer from Peer A...');
  const [isError, setIsError] = useState(false);
  const [offerSet, setOfferSet] = useState(false);
  const [answerGenerated, setAnswerGenerated] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [timestamp, setTimestamp] = useState('00:00:00');
  
  // Stats
  const [videoBitrate, setVideoBitrate] = useState(0);
  const [audioBitrate, setAudioBitrate] = useState(0);
  const [packetLoss, setPacketLoss] = useState('0');
  const [latency, setLatency] = useState(0);

  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const statsIntervalRef = useRef(null);

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

  // Set offer from Peer A
  const handleSetOffer = async () => {
    try {
      updateStatus('Processing offer from Peer A...');
      
      const offerObj = JSON.parse(offer);
      
      // Create peer connection
      const pc = await createPeerConnection();
      peerConnectionRef.current = pc;

      // Handle incoming stream
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          updateStatus('✓ Receiving video stream from Peer A!');
          setRecordingStatus('LIVE');
        }
      };

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
          const answerData = pc.localDescription;
          setAnswer(JSON.stringify(answerData, null, 2));
          setAnswerGenerated(true);
          updateStatus('Answer generated! Copy it and send to Peer A.');
        }
      };

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        setPeerStatus(pc.connectionState.toUpperCase());
        
        if (pc.connectionState === 'connected') {
          updateStatus('✓ Successfully connected to Peer A! Receiving stream...');
          setConnectionStatus('CONNECTED');
          startStatsMonitoring();
        } else if (pc.connectionState === 'failed') {
          updateStatus('Connection failed. Please try again.', true);
          setConnectionStatus('FAILED');
          stopStatsMonitoring();
        } else if (pc.connectionState === 'disconnected') {
          setConnectionStatus('DISCONNECTED');
          setRecordingStatus('OFFLINE');
          stopStatsMonitoring();
        }
      };

      // Set remote description (offer)
      await pc.setRemoteDescription(new RTCSessionDescription(offerObj));
      
      // Create and set answer
      const answerDesc = await pc.createAnswer();
      await pc.setLocalDescription(answerDesc);

      updateStatus('Gathering ICE candidates... Please wait.');
      setConnectionStatus('PROCESSING');
      setOfferSet(true);

    } catch (error) {
      console.error('Error setting offer:', error);
      updateStatus(`Error: ${error.message}`, true);
    }
  };

  // Copy answer to clipboard
  const handleCopyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Error copying:', error);
      alert('Failed to copy. Please select and copy manually.');
    }
  };

  // Stats monitoring
  const startStatsMonitoring = () => {
    statsIntervalRef.current = setInterval(async () => {
      if (!peerConnectionRef.current) return;

      try {
        const stats = await peerConnectionRef.current.getStats();
        let vBitrate = 0;
        let aBitrate = 0;
        let pLoss = 0;
        let rtt = 0;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp') {
            if (report.kind === 'video') {
              vBitrate = Math.round((report.bytesReceived * 8) / 1000);
            } else if (report.kind === 'audio') {
              aBitrate = Math.round((report.bytesReceived * 8) / 1000);
            }
            
            if (report.packetsLost && report.packetsReceived) {
              pLoss = ((report.packetsLost / (report.packetsLost + report.packetsReceived)) * 100).toFixed(1);
            }
          }
          
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime || 0;
          }
        });

        setVideoBitrate(vBitrate);
        setAudioBitrate(aBitrate);
        setPacketLoss(pLoss);
        setLatency(Math.round(rtt * 1000));

      } catch (error) {
        console.error('Error getting stats:', error);
      }
    }, 1000);
  };

  const stopStatsMonitoring = () => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStatsMonitoring();
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  return (
    <div className="peer-b-container">
      <div className="container">
        <header>
          <h1>MONITOR</h1>
          <div className="subtitle">Peer B - Surveillance Viewer</div>
          <div className="status-badge">
            <div className="status-indicator"></div>
            <span>{connectionStatus}</span>
          </div>
        </header>

        <div className="main-content">
          <div className="video-section">
            <div className="video-container">
              <div className="video-header">
                <div className="video-title">REMOTE FEED</div>
                <div className="rec-indicator">
                  <div className="rec-dot"></div>
                  <span>{recordingStatus}</span>
                </div>
              </div>
              <video ref={remoteVideoRef} autoPlay playsInline />
              <div className="video-overlay">
                <div className="timestamp">{timestamp}</div>
                <div className="cam-id">CAM-A-001</div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{videoBitrate}</div>
                <div className="stat-label">Video Kbps</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{audioBitrate}</div>
                <div className="stat-label">Audio Kbps</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{packetLoss}%</div>
                <div className="stat-label">Packet Loss</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{latency}ms</div>
                <div className="stat-label">Latency</div>
              </div>
            </div>
          </div>

          <div className="control-panel">
            <div className="panel-section">
              <div className="section-title">Connection Details</div>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Role</span>
                  <span className="info-value">VIEWER</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Peer ID</span>
                  <span className="info-value">PEER-B</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Status</span>
                  <span className="info-value">{peerStatus}</span>
                </div>
              </div>
            </div>

            <div className="panel-section">
              <div className="section-title">Offer (Paste from Peer A)</div>
              <textarea 
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                placeholder="Paste offer from Peer A here..."
                disabled={offerSet}
              />
              <button 
                onClick={handleSetOffer}
                disabled={!offer.trim() || offerSet}
              >
                Set Offer
              </button>
            </div>

            <div className="panel-section">
              <div className="section-title">Answer (Send to Peer A)</div>
              <textarea 
                value={answer}
                readOnly
                placeholder="Answer will appear here..."
              />
              <button 
                onClick={handleCopyAnswer}
                className="btn-secondary"
                disabled={!answerGenerated}
              >
                {copySuccess ? '✓ Copied!' : 'Copy Answer'}
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

export default PeerBViewer;