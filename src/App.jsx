import React, { useState } from 'react';
import PeerACamera from './PeerACamera';
import PeerBViewer from './PeerBViewer';
import './App.css';

function App() {
  const [view, setView] = useState('select');

  if (view === 'peerA') {
    return <PeerACamera />;
  }

  if (view === 'peerB') {
    return <PeerBViewer />;
  }

  return (
    <div className="app-container">
      <div className="selector-container">
        <header className="selector-header">
          <h1>P2P SURVEILLANCE</h1>
          <div className="subtitle">WebRTC Remote Camera System</div>
        </header>

        <div className="selection-grid">
          <div className="peer-card peer-a" onClick={() => setView('peerA')}>
            <div className="card-icon">📹</div>
            <h2>PEER A</h2>
            <div className="card-label">Camera Source</div>
            <p>Stream camera feed to remote viewer</p>
            <div className="card-badge">BROADCASTER</div>
          </div>

          <div className="peer-card peer-b" onClick={() => setView('peerB')}>
            <div className="card-icon">📺</div>
            <h2>PEER B</h2>
            <div className="card-label">Viewer</div>
            <p>Receive and monitor remote camera feed</p>
            <div className="card-badge">MONITOR</div>
          </div>
        </div>

        <div className="info-section">
          <h3>How It Works</h3>
          <ol>
            <li>Open <strong>Peer A</strong> on the device with the camera</li>
            <li>Initialize camera and copy the generated offer</li>
            <li>Open <strong>Peer B</strong> on the viewing device</li>
            <li>Paste the offer and generate answer</li>
            <li>Copy answer and paste it back into Peer A</li>
            <li>Connection established - live streaming begins!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;