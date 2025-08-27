
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
  users.set(id, { id, username, passwordHash, role, status: role === "LAWYER" ? "ONLINE" : undefined });
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

/**
 * Session management
 */
function addSession(userId, ws) {
  sessions.set(userId, ws);
}

function getSession(userId) {
  return sessions.get(userId);
}

function removeSession(userId) {
  sessions.delete(userId);
}

/**
 * Call management
 */
function startCall(callerId, receiverId) {
  calls.set(callerId, receiverId);
  calls.set(receiverId, callerId);
}

function endCall(userId) {
  const peerId = calls.get(userId);
  if (peerId) {
    calls.delete(userId);
    calls.delete(peerId);
  }
  return peerId;
}

function getPeer(userId) {
  return calls.get(userId);
}

module.exports = {
  users,
  sessions,
  calls,
  addUser,
  getUser,
  getAllUsers,
  removeUser,
  addSession,
  getSession,
  removeSession,
  startCall,
  endCall,
  getPeer,
};
