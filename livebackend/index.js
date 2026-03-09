require('dotenv').config();
const express = require('express');
const { AccessToken } = require('livekit-server-sdk');

const app = express();
app.use(express.json());

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

app.post('/getToken', async (req, res) => {
  const { roomName, participantName, isHost } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'Missing roomName or participantName' });
  }

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: participantName,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // If user is host, give them administrative permissions
    roomAdmin: isHost || false,
  });

  const token = await at.toJwt();
  res.json({ token });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`LiveKit backend running on port ${PORT}`);
});
