
const users = new Map();
let nextId = 1;

// Active WebSocket sessions: Map<userId, ws>
const sessions = new Map();

// Active calls: Map<userId, peerId>
const calls = new Map();

/**
 * User management
 */
function addUser(username, passwordHash, role = "CLIENT") {
  const id = nextId++;
  users.set(id, { 
    id, 
    username, 
    passwordHash, 
    role, 
    status: role === "LAWYER" ? "ONLINE" : undefined 
  });
  return users.get(id);
}

function getUser(id) {
  return users.get(id);
}

function getAllUsers() {
  return Array.from(users.values());
}

function removeUser(id) {
  users.delete(id);
  sessions.delete(id);
  calls.delete(id);
}

function updateUserStatus(userId, status) {
  const user = getUser(userId);
  if (user) {
    user.status = status;
    return user;
  }
  return null;
}

function getOnlineLawyers() {
  return getAllUsers().filter(user => user.role === "LAWYER" && user.status === "ONLINE");
}

function getUserByEmail(email) {
  for (const user of users.values()) {
    if (user.username === email) {
      return user;
    }
  }
  return null;
}

/**
 * Session management
 */
function addSession(userId, ws) {
  sessions.set(userId, ws);
  ws.userId = userId; // Store userId in websocket object for easy access
  console.log(`📱 Session added for user ${userId}`);
}

function getSession(userId) {
  const session = sessions.get(userId);
  if (session) {
    console.log(`🔍 Found session for user ${userId}, readyState: ${session.readyState}`);
  } else {
    console.log(`❌ No session found for user ${userId}`);
  }
  return session;
}

function removeSession(userId) {
  const session = sessions.get(userId);
  if (session) {
    delete session.userId; // Clean up the userId reference
  }
  sessions.delete(userId);
  console.log(`🗑️ Session removed for user ${userId}`);
}

function getAllSessions() {
  return Array.from(sessions.entries());
}

/**
 * Call management
 */
function startCall(callerId, receiverId) {
  calls.set(callerId, receiverId);
  calls.set(receiverId, callerId);
  
  // Update user statuses to BUSY (for lawyers)
  const caller = getUser(callerId);
  const receiver = getUser(receiverId);
  
  if (caller && caller.role === "LAWYER") {
    updateUserStatus(callerId, "BUSY");
  }
  if (receiver && receiver.role === "LAWYER") {
    updateUserStatus(receiverId, "BUSY");
  }
}

function endCall(userId) {
  const peerId = calls.get(userId);
  if (peerId) {
    calls.delete(userId);
    calls.delete(peerId);
    
    // Reset user statuses to ONLINE (for lawyers)
    const user = getUser(userId);
    const peer = getUser(peerId);
    
    if (user && user.role === "LAWYER") {
      updateUserStatus(userId, "ONLINE");
    }
    if (peer && peer.role === "LAWYER") {
      updateUserStatus(peerId, "ONLINE");
    }
  }
  return peerId;
}

function getPeer(userId) {
  return calls.get(userId);
}

function isInCall(userId) {
  return calls.has(userId);
}

function getAllActiveCalls() {
  return Array.from(calls.entries());
}

// Initialize some sample data
function initializeSampleData() {
  // Clear existing data
  users.clear();
  sessions.clear();
  calls.clear();
  nextId = 1;
  
  // Add some sample lawyers
  addUser("lawyer1@example.com", "$2b$10$example.hash", "LAWYER");
  addUser("lawyer2@example.com", "$2b$10$example.hash", "LAWYER");
  addUser("lawyer3@example.com", "$2b$10$example.hash", "LAWYER");
  
  // Add some sample clients
  addUser("client1@example.com", "$2b$10$example.hash", "CLIENT");
  addUser("client2@example.com", "$2b$10$example.hash", "CLIENT");
}

module.exports = {
  users,
  sessions,
  calls,
  addUser,
  getUser,
  getAllUsers,
  removeUser,
  updateUserStatus,
  getOnlineLawyers,
  getUserByEmail,
  addSession,
  getSession,
  removeSession,
  getAllSessions,
  startCall,
  endCall,
  getPeer,
  isInCall,
  getAllActiveCalls,
  initializeSampleData
};
