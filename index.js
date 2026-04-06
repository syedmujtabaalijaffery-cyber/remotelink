const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

// Store active sessions
const sessions = {};

// Route: Host generates a session link
app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/host/index.html'));
});

// Route: Remote user joins via link
app.get('/remote/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/remote/index.html'));
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/host/index.html'));
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Host creates a session
  socket.on('create-session', () => {
    const sessionId = uuidv4().substring(0, 8).toUpperCase();
    sessions[sessionId] = {
      hostId: socket.id,
      remoteId: null,
      status: 'waiting'
    };
    socket.join(sessionId);
    socket.emit('session-created', { sessionId });
    console.log(`Session created: ${sessionId} by host: ${socket.id}`);
  });

  // Remote user requests to join
  socket.on('request-access', ({ sessionId }) => {
    const session = sessions[sessionId];
    if (!session) {
      socket.emit('session-not-found');
      return;
    }
    if (session.status !== 'waiting') {
      socket.emit('session-busy');
      return;
    }
    session.remoteId = socket.id;
    session.status = 'pending';
    socket.join(sessionId);
    // Notify host that someone wants access
    io.to(session.hostId).emit('access-requested', { sessionId, remoteId: socket.id });
    console.log(`Access requested for session: ${sessionId}`);
  });

  // Host allows access
  socket.on('allow-access', ({ sessionId }) => {
    const session = sessions[sessionId];
    if (!session) return;
    session.status = 'connected';
    io.to(session.remoteId).emit('access-allowed', { sessionId });
    console.log(`Access allowed for session: ${sessionId}`);
  });

  // Host denies access
  socket.on('deny-access', ({ sessionId }) => {
    const session = sessions[sessionId];
    if (!session) return;
    session.status = 'waiting';
    io.to(session.remoteId).emit('access-denied');
    session.remoteId = null;
    console.log(`Access denied for session: ${sessionId}`);
  });

  // WebRTC Signaling - Offer from host to remote
  socket.on('offer', ({ sessionId, offer }) => {
    const session = sessions[sessionId];
    if (!session) return;
    io.to(session.remoteId).emit('offer', { offer });
  });

  // WebRTC Signaling - Answer from remote to host
  socket.on('answer', ({ sessionId, answer }) => {
    const session = sessions[sessionId];
    if (!session) return;
    io.to(session.hostId).emit('answer', { answer });
  });

  // ICE Candidates
  socket.on('ice-candidate', ({ sessionId, candidate, target }) => {
    const session = sessions[sessionId];
    if (!session) return;
    const targetId = target === 'host' ? session.hostId : session.remoteId;
    if (targetId) {
      io.to(targetId).emit('ice-candidate', { candidate });
    }
  });

  // Remote control events (mouse, keyboard)
  socket.on('remote-control', ({ sessionId, event }) => {
    const session = sessions[sessionId];
    if (!session) return;
    io.to(session.hostId).emit('remote-control', { event });
  });

  // Disconnect session
  socket.on('end-session', ({ sessionId }) => {
    const session = sessions[sessionId];
    if (!session) return;
    io.to(sessionId).emit('session-ended');
    delete sessions[sessionId];
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up sessions
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
  console.log(`🌐 Open: http://localhost:${PORT}\n`);
});
