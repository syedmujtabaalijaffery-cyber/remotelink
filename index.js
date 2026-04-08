const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const sessions = {};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'client/host/index.html')));
app.get('/remote/:sessionId', (req, res) => res.sendFile(path.join(__dirname, 'client/remote/index.html')));
app.use('/assets', express.static(path.join(__dirname, 'client')));

io.on('connection', (socket) => {

  // HOST: creates session and waits
  socket.on('create-session', () => {
    const sessionId = uuidv4().substring(0, 8).toUpperCase();
    sessions[sessionId] = { hostId: socket.id, remoteId: null, status: 'waiting' };
    socket.join(sessionId);
    socket.emit('session-created', { sessionId });
    console.log('Session created:', sessionId);
  });

  // REMOTE: arrives at the link page
  socket.on('join-session', ({ sessionId }) => {
    const s = sessions[sessionId];
    if (!s) { socket.emit('error-msg', 'Session not found.'); return; }
    if (s.status !== 'waiting') { socket.emit('error-msg', 'Session busy.'); return; }
    s.remoteId = socket.id;
    s.status = 'pending';
    socket.join(sessionId);
    // Show DENY/ALLOW to remote user
    socket.emit('show-permission');
  });

  // REMOTE: clicked ALLOW
  socket.on('remote-allow', ({ sessionId }) => {
    const s = sessions[sessionId];
    if (!s) return;
    s.status = 'connected';
    // Tell host remote allowed — host will now show "connected" and wait for stream
    io.to(s.hostId).emit('remote-accepted');
    // Tell remote to start sharing screen
    socket.emit('start-sharing');
  });

  // REMOTE: clicked DENY
  socket.on('remote-deny', ({ sessionId }) => {
    const s = sessions[sessionId];
    if (!s) return;
    s.status = 'waiting';
    s.remoteId = null;
    io.to(s.hostId).emit('remote-denied');
  });

  // WebRTC: REMOTE sends offer (remote is the one sharing screen)
  socket.on('offer', ({ sessionId, offer }) => {
    const s = sessions[sessionId];
    if (s) io.to(s.hostId).emit('offer', { offer });
  });

  // WebRTC: HOST sends answer
  socket.on('answer', ({ sessionId, answer }) => {
    const s = sessions[sessionId];
    if (s) io.to(s.remoteId).emit('answer', { answer });
  });

  // ICE candidates
  socket.on('ice-candidate', ({ sessionId, candidate, from }) => {
    const s = sessions[sessionId];
    if (!s) return;
    const targetId = from === 'remote' ? s.hostId : s.remoteId;
    if (targetId) io.to(targetId).emit('ice-candidate', { candidate });
  });

  // End session
  socket.on('end-session', ({ sessionId }) => {
    io.to(sessionId).emit('session-ended');
    delete sessions[sessionId];
  });

  socket.on('disconnect', () => {
    for (const [id, s] of Object.entries(sessions)) {
      if (s.hostId === socket.id || s.remoteId === socket.id) {
        io.to(id).emit('session-ended');
        delete sessions[id];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
