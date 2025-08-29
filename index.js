require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://192.168.0.30:3000',
    'http://192.168.0.180:3001',
    'https://001c128f27e7.ngrok-free.app',
    'http://001c128f27e7.ngrok-free.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
const { 
  users, 
  addUser, 
  getUser, 
  getUserByEmail,
  getAllUsers,
  updateUserStatus,
  getOnlineLawyers,
  startCall,
  endCall,
  getPeer,
  initializeSampleData,
  addSession,
  removeSession
} = require('./utils/util');

// Initialize sample data
initializeSampleData();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
function getSession(userId) {
  for (const client of wss.clients) {
    if (client.userId === userId) {
      return client;
    }
  }
  return null;
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// API Routes

// POST /register
app.post('/register', async (req, res) => {
  try {
    const { email, password, role = 'CLIENT' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user already exists
    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Add user
    const newUser = addUser(email, hashedPassword, role);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.username,
        role: newUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/lawyers/status', authenticateToken, (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'LAWYER') {
      return res.status(403).json({ error: 'Only lawyers can update status' });
    }

    if (!['ONLINE', 'BUSY'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ONLINE or BUSY' });
    }

    const user = getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    updateUserStatus(userId, status);

    res.json({
      message: 'Status updated successfully',
      status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/lawyers', (req, res) => {
  try {
    const allLawyers = getAllUsers().filter(user => user.role === 'LAWYER');
    res.json({
      lawyers: allLawyers.map(lawyer => ({
        id: lawyer.id,
        email: lawyer.username,
        role: lawyer.role,
        status: lawyer.status
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/debug', (req, res) => {
  try {
    const allUsers = getAllUsers();
    const sessions = Array.from(wss.clients).map(client => ({
      userId: client.userId,
      readyState: client.readyState
    }));
    
    res.json({
      users: allUsers.map(user => ({
        id: user.id,
        email: user.username,
        role: user.role,
        status: user.status
      })),
      sessions,
      totalUsers: allUsers.length,
      totalSessions: sessions.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  let userId = null;
  let userRole = null;

  console.log('🔌 New WebSocket connection');

  // Authenticate WebSocket connection
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle authentication
      if (data.type === 'authenticate') {
        const token = data.token;
        
        if (!token) {
          ws.send(JSON.stringify({ type: 'error', message: 'Token required' }));
          return;
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
            return;
          }

          userId = decoded.id;
          userRole = decoded.role;
          
          // Add session
          addSession(userId, ws);
          
          // Update user status to ONLINE
          updateUserStatus(userId, 'ONLINE');
          
          console.log(`✅ User ${decoded.email} authenticated`);

          // Broadcast updated user list
          broadcastUserList();
          
          // Send authentication success
          ws.send(JSON.stringify({
            type: 'authenticated',
            user: {
              id: decoded.id,
              email: decoded.email,
              role: decoded.role
            }
          }));
        });
        return;
      }

             // Handle chat messages
       if (data.type === 'chat') {
         console.log(`💬 Chat message from ${getUser(userId)?.username} to ${data.receiverId}`);
         const targetUser = getUser(data.receiverId);
         if (targetUser) {
           console.log(`🔍 Found target user: ${targetUser.username}`);
           const targetSession = getSession(data.receiverId);
           if (targetSession && targetSession.readyState === WebSocket.OPEN) {
             const chatMessage = {
               type: 'chat',
               senderId: userId,
               sender: getUser(userId)?.username,
               senderEmail: getUser(userId)?.username,
               message: data.message,
               timestamp: new Date().toISOString()
             };
             targetSession.send(JSON.stringify(chatMessage));
             console.log(`✅ Chat message sent to ${targetUser.username}`);
           } else {
             console.log(`❌ Target session not found or not open for ${targetUser.username}`);
           }
         } else {
           console.log(`❌ Target user not found with ID: ${data.receiverId}`);
         }
         return;
       }

if (['offer', 'answer', 'ice-candidate'].includes(data.type)) {
  console.log(`📡 Handling ${data.type} from user ${userId} to ${data.targetId}`);
  const targetUser = getUser(data.targetId);
  if (targetUser) {
    const targetSession = getSession(data.targetId);
    if (targetSession && targetSession.readyState === WebSocket.OPEN) {
      const message = {
        type: data.type,
        fromId: userId,
        targetId: data.targetId,
        data: data.data
      };
      targetSession.send(JSON.stringify(message));
      console.log(`✅ ${data.type.toUpperCase()} sent successfully`);
    } else {
      console.log(`❌ Target session not available for ${targetUser.username}`);
    }
  } else {
    console.log(`❌ Target user not found for ID: ${data.targetId}`);
  }
  return;
}

             // Handle call requests
       if (data.type === 'call-request') {
         console.log(`📞 Call request from ${getUser(userId)?.username} to ${data.receiverId}`);
         const receiver = getUser(data.receiverId);
         if (receiver) {
           console.log(`🔍 Found receiver: ${receiver.username}, status: ${receiver.status}`);
           if (receiver.status === 'ONLINE') {
             const receiverSession = getSession(data.receiverId);
             if (receiverSession && receiverSession.readyState === WebSocket.OPEN) {
               // Start call tracking
               startCall(userId, data.receiverId);
               
               receiverSession.send(JSON.stringify({
                 type: 'incoming-call',
                 callerId: userId,
                 callerEmail: getUser(userId)?.username
               }));
               
               console.log(`✅ Call notification sent to ${receiver.username}`);
             } else {
               console.log(`❌ Receiver session not found or not open for ${receiver.username}`);
             }
           } else {
             console.log(`❌ Receiver ${receiver.username} is not ONLINE (status: ${receiver.status})`);
           }
         } else {
           console.log(`❌ Receiver not found with ID: ${data.receiverId}`);
         }
         return;
       }

      // Handle call responses
      if (data.type === 'call-accepted') {
        const caller = getUser(data.callerId);
        if (caller) {
          const callerSession = getSession(data.callerId);
          if (callerSession && callerSession.readyState === WebSocket.OPEN) {
            callerSession.send(JSON.stringify({
              type: 'call-accepted',
              receiverId: userId,
              receiverEmail: getUser(userId)?.username
            }));
            
            console.log(`✅ Call accepted by ${getUser(userId)?.username} from ${caller.username}`);
          }
        }
        return;
      }

      if (data.type === 'call-rejected') {
        const caller = getUser(data.callerId);
        if (caller) {
          const callerSession = getSession(data.callerId);
          if (callerSession && callerSession.readyState === WebSocket.OPEN) {
            // End call tracking
            endCall(data.callerId);
            
            callerSession.send(JSON.stringify({
              type: 'call-rejected'
            }));
          }
        }
        return;
      }

      // Handle call end
      if (data.type === 'call-end') {
        const peerId = getPeer(userId);
        if (peerId) {
          const peerSession = getSession(peerId);
          if (peerSession && peerSession.readyState === WebSocket.OPEN) {
            peerSession.send(JSON.stringify({
              type: 'call-ended'
            }));
          }
          endCall(userId);
          broadcastUserList();
        }
        return;
      }

    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    if (userId) {
      console.log(`❌ User ${userId} disconnected`);
      
      // Remove session
      removeSession(userId);
      
      // If user was in a call, end it
      const peerId = getPeer(userId);
      if (peerId) {
        const peerSession = getSession(peerId);
        if (peerSession && peerSession.readyState === WebSocket.OPEN) {
          peerSession.send(JSON.stringify({
            type: 'call-ended'
          }));
        }
        endCall(userId);
      }
      
      // Broadcast updated user list
      broadcastUserList();
    }
  });
});

// Function to broadcast user list to all connected clients
function broadcastUserList() {
  const allLawyers = getAllUsers().filter(user => user.role === 'LAWYER');
  const allClients = getAllUsers().filter(user => user.role === 'CLIENT');
  
  // Send lawyers list to clients
  const clientMessage = JSON.stringify({
    type: 'user-list-update',
    lawyers: allLawyers.map(lawyer => ({
      id: lawyer.id,
      email: lawyer.username,
      role: lawyer.role,
      status: lawyer.status
    }))
  });

  const lawyerMessage = JSON.stringify({
    type: 'user-list-update',
    clients: allClients.map(client => ({
      id: client.id,
      email: client.username,
      role: client.role,
      status: client.status
    }))
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      // Send appropriate message based on user role
      if (client.userId) {
        const user = getUser(client.userId);
        if (user && user.role === 'LAWYER') {
          client.send(lawyerMessage);
        } else {
          client.send(clientMessage);
        }
      }
    }
  });
}



const PORT = process.env.PORT || 4000;
const HOST = '192.168.1.114'; // Accept connections from any IP address

server.listen(PORT, () => {
  console.log(`✅ Server running on:${PORT}`);
  console.log(`🌐 Accessible from network: http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔗 API endpoints:`);
  console.log(`   POST /register`);
  console.log(`   POST /login`);
  console.log(`   POST /lawyers/status`);
  console.log(`   GET /lawyers`);
  console.log(`   WebSocket /ws`);
});
