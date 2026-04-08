const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Serve static folders
app.use('/host', express.static(path.join(__dirname, 'client/host')));
app.use('/remote-assets', express.static(path.join(__dirname, 'client/remote')));

// Store active sessions
const sessions = {};

// Root → Host page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/host/index.html'));
});

// Remote user page
app.get('/remote/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/remote/index.html'));
});

// ── Socket.io ──────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('create-session', () => {
    const sessionId = uuidv4().substring(0, 8).toUpperCase();
    sessions[sessionId] = { hostId: socket.id, remoteId: null, status: 'waiting' };
    socket.join(sessionId);
    socket.emit('session-created', { sessionId });
  });

  socket.on('request-access', ({ sessionId }) => {
    const session = sessions[sessionId];
    if (!session) { socket.emit('session-not-found'); return; }
    if (session.status !== 'waiting') { socket.emit('session-busy'); return; }
    session.remoteId = socket.id;
    session.status = 'pending';
    socket.join(sessionId);
    io.to(session.hostId).emit('access-requested', { sessionId });
  });

  socket.on('allow-access', ({ sessionId }) => {
    const session = sessions[sessionId];
    if (!session) return;
    session.status = 'connected';
    io.to(session.remoteId).emit('access-allowed');
  });

  socket.on('deny-access', ({ sessionId }) => {
    const session = sessions[sessionId];
    if (!session) return;
    session.status = 'waiting';
    io.to(session.remoteId).emit('access-denied');
    session.remoteId = null;
  });

  socket.on('offer', ({ sessionId, offer }) => {
    const session = sessions[sessionId];
    if (session && session.remoteId) io.to(session.remoteId).emit('offer', { offer });
  });

  socket.on('answer', ({ sessionId, answer }) => {
    const session = sessions[sessionId];
    if (session) io.to(session.hostId).emit('answer', { answer });
  });

  socket.on('ice-candidate', ({ sessionId, candidate, target }) => {
    const session = sessions[sessionId];
    if (!session) return;
    const targetId = target === 'host' ? session.hostId : session.remoteId;
    if (targetId) io.to(targetId).emit('ice-candidate', { candidate });
  });

  socket.on('end-session', ({ sessionId }) => {
    io.to(sessionId).emit('session-ended');
    delete sessions[sessionId];
  });

  socket.on('disconnect', () => {
    for (const [sessionId, session] of Object.entries(sessions)) {
      if (session.hostId === socket.id || session.remoteId === socket.id) {
        io.to(sessionId).emit('session-ended');
        delete sessions[sessionId];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
});
