require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { AccessToken } = require('livekit-server-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const DEFAULT_SETTINGS = {
  resolution: '720p',
  videoBitrate: 1500,
  audioBitrate: 64,
};

// Initialize settings file if not exists
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
}

// Get Live settings
app.get('/settings', (req, res) => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json(DEFAULT_SETTINGS);
    }
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// Update Live settings
app.post('/settings', (req, res) => {
  const { resolution, videoBitrate, audioBitrate } = req.body;
  const settings = { resolution, videoBitrate, audioBitrate };
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Simple dashboard UI
app.get('/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LiveKit Universal Dashboard</title>
        <style>
            body { 
                font-family: 'Inter', -apple-system, sans-serif; 
                background: radial-gradient(circle at top right, #1a1a2e, #16213e); 
                color: #ffffff; 
                display: flex; 
                justify-content: center; 
                align-items: center;
                height: 100vh;
                margin: 0;
            }
            .card { 
                background: rgba(30, 30, 46, 0.95); 
                padding: 40px; 
                border-radius: 20px; 
                width: 450px; 
                box-shadow: 0 15px 35px rgba(0,0,0,0.4); 
                border: 1px solid rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
            }
            h1 { font-size: 28px; margin-bottom: 30px; text-align: center; color: #4FC3F7; letter-spacing: 1px; }
            .field { margin-bottom: 25px; }
            label { display: block; margin-bottom: 10px; font-size: 14px; color: #aaa; font-weight: 500; text-transform: uppercase; }
            select, input { 
                width: 100%; 
                padding: 12px 15px; 
                border-radius: 10px; 
                border: 1px solid #333; 
                background: #2b2b3b; 
                color: #fff; 
                box-sizing: border-box; 
                transition: all 0.3s ease;
                font-size: 16px;
            }
            select:focus, input:focus {
                border-color: #4FC3F7;
                outline: none;
                box-shadow: 0 0 10px rgba(79, 195, 247, 0.3);
            }
            button { 
                width: 100%; 
                padding: 15px; 
                border: none; 
                border-radius: 10px; 
                background: linear-gradient(135deg, #4FC3F7 0%, #0288D1 100%); 
                color: #fff; 
                font-size: 16px;
                font-weight: bold; 
                cursor: pointer; 
                margin-top: 15px;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            button:hover { 
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(79, 195, 247, 0.4);
            }
            button:active { transform: translateY(0); }
            .msg { text-align: center; margin-top: 20px; font-size: 15px; font-weight: 500; height: 20px; }
            .status-bar { display: flex; justify-content: space-between; margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #333; padding-top: 15px; }
            .status-item { display: flex; alignItems: center; gap: 5px; }
            .dot { height: 8px; width: 8px; border-radius: 50%; background: #4caf50; display: inline-block; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Live Streaming Dashboard</h1>
            <div class="field">
                <label>Target Resolution</label>
                <select id="resolution">
                    <option value="480p">480p (Standard Definition)</option>
                    <option value="720p">720p (High Definition)</option>
                    <option value="1080p">1080p (Full HD)</option>
                </select>
            </div>
            <div class="field">
                <label>Video Bitrate (kbps)</label>
                <input type="number" id="videoBitrate" placeholder="e.g. 1500" min="500" max="8000">
            </div>
            <div class="field">
                <label>Audio Bitrate (kbps)</label>
                <input type="number" id="audioBitrate" placeholder="e.g. 64" min="32" max="256">
            </div>
            <button onclick="saveSettings()">Apply Global Changes</button>
            <div id="msg" class="msg"></div>
            
            <div class="status-bar">
                <div class="status-item"><span class="dot"></span> Backend Active</div>
                <div id="last-updated">Last update: Loading...</div>
            </div>
        </div>
        <script>
            async function loadSettings() {
                try {
                    const res = await fetch('/settings');
                    const data = await res.json();
                    document.getElementById('resolution').value = data.resolution;
                    document.getElementById('videoBitrate').value = data.videoBitrate;
                    document.getElementById('audioBitrate').value = data.audioBitrate;
                    document.getElementById('last-updated').innerText = "Settings Loaded";
                } catch(e) {
                    document.getElementById('msg').innerText = "Failed to load settings";
                }
            }
            async function saveSettings() {
                const btn = document.querySelector('button');
                btn.innerText = "Applying...";
                btn.disabled = true;
                
                try {
                    const res = await fetch('/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            resolution: document.getElementById('resolution').value,
                            videoBitrate: parseInt(document.getElementById('videoBitrate').value),
                            audioBitrate: parseInt(document.getElementById('audioBitrate').value)
                        })
                    });
                    const msg = document.getElementById('msg');
                    if (res.ok) {
                        msg.innerText = "✓ Settings pushed to all users";
                        msg.style.color = "#4caf50";
                        document.getElementById('last-updated').innerText = "Last update: Just now";
                    } else {
                        msg.innerText = "✗ Error updating settings";
                        msg.style.color = "#f44336";
                    }
                } catch(e) {
                    document.getElementById('msg').innerText = "✗ Connection Error";
                } finally {
                    btn.innerText = "Apply Global Changes";
                    btn.disabled = false;
                    setTimeout(() => { document.getElementById('msg').innerText = ""; }, 3000);
                }
            }
            loadSettings();
        </script>
    </body>
    </html>
  `);
});

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

// Existing /getToken endpoint
app.post('/getToken', async (req, res) => {
  const { roomName, participantName, isHost } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'Missing roomName or participantName' });
  }

  try {
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost || false,
    });

    const token = await at.toJwt();
    res.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// In-memory store for invitations (In a real app, use a DB)
const invitations = [];

// Send an invitation to a user
app.post('/invite', (req, res) => {
  const { host, invitee, roomName } = req.body;
  if (!host || !invitee || !roomName) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  const invite = { host, invitee, roomName, status: 'pending', id: Date.now().toString() };
  invitations.push(invite);
  console.log(`[Invite] ${host} invited ${invitee} to room ${roomName}`);
  res.json({ success: true, inviteId: invite.id });
});

// Get invitations for a user
app.get('/invitations/:username', (req, res) => {
  const { username } = req.params;
  const userInvites = invitations.filter(i => i.invitee === username && i.status === 'pending');
  res.json(userInvites);
});

// Accept or decline an invitation
app.post('/respond-invite', (req, res) => {
  const { inviteId, status } = req.body; // status: 'accepted' or 'declined'
  const inviteIndex = invitations.findIndex(i => i.id === inviteId);
  if (inviteIndex === -1) {
    return res.status(404).json({ error: 'Invite not found' });
  }
  invitations[inviteIndex].status = status;
  res.json({ success: true, invite: invitations[inviteIndex] });
});

// Get participants in a room (LiveKit Server SDK can do this too, but for simplicity)
const roomParticipants = {}; // roomName -> [participantName]

// Update /getTokenLiveKit to register participants
app.post('/getTokenLiveKit', async (req, res) => {
  const { roomName, participantName, isHost, isCoHost } = req.body;

  if (!API_KEY || !API_SECRET) {
    console.error('LIVEKIT_API_KEY or LIVEKIT_API_SECRET not set');
    return res.status(500).json({ error: 'Server configuration error: API keys missing' });
  }

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'Missing roomName or participantName' });
  }

  try {
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity: participantName,
    });

    // Only host and co-host can publish
    const canPublish = isHost === true || isCoHost === true;

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: canPublish,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost || false,
    });

    const token = await at.toJwt();
    
    // Register participant in our in-memory store
    if (!roomParticipants[roomName]) roomParticipants[roomName] = [];
    if (!roomParticipants[roomName].includes(participantName)) {
      roomParticipants[roomName].push(participantName);
    }

    console.log(`[Token] Generated for ${participantName} (Host: ${isHost}, CoHost: ${isCoHost}, CanPublish: ${canPublish})`);
    res.json({ token });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Internal server error while generating token' });
  }
});

// Endpoint to get all participants in a room
app.get('/room-participants/:roomName', (req, res) => {
  const { roomName } = req.params;
  res.json(roomParticipants[roomName] || []);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('-------------------------------------------');
  console.log(`LiveKit backend running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`Settings API: http://localhost:${PORT}/settings`);
  console.log(`Token API: http://localhost:${PORT}/getTokenLiveKit`);
  console.log('-------------------------------------------');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
