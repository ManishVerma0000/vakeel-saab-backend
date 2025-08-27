// controllers/user.js

const {userLogin,userRegistration}=require('../services/user')

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, msg: "Email & Password required" });
    }
    // Check user (mock for now)
    if (email === "test@example.com" && password === "123456") {
      return res.json({ success: true, msg: "Login successful", token: "fake-jwt-token" });
    }
    res.status(401).json({ success: false, msg: "Invalid credentials" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


const register = async (req, res) => {
  const {response,statusCode,message}=await userRegistration(req.body)
  await res.status(statusCode).json({
    message:message,
    response:response
  })
};

const getProfile = async (req, res) => {
  try {
    // Mock profile
    const user = { id: 1, name: "Manish", email: "test@example.com" };
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ✅ export all functions as an object
module.exports = { loginUser, register, getProfile };
