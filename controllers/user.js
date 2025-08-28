// controllers/user.js

const {userRegistration}=require('../services/user');
const { generateToken } = require('../utils/jwt.util');
const { getUser ,getAllUsers} = require('../utils/util');

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, msg: "Email & Password required" });
    }
    const userDetails=await getUserByEmail(email)
    if (email === userDetails.email && password === userDetails.password) {
      const token=await generateToken()
      return res.json({ success: true, msg: "Login successful", token: token });
    }
   await res.status(401).json({ success: false, msg: "Invalid credentials" });
  } catch (error) {
   await res.status(500).json({ success: false, error: error.message });
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
    const requestBody=req.body;
    const userDetails=getUser(requestBody.id)
    await res.status(200).json({
    data:userDetails,
    message:"user profile details are here"
   })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}


const allLawyers=async (req, res) => {
  try {
    const allUsers = getAllUsers();
  const lawyers = allUsers.filter(user => user.role === "LAWYER");
    await res.status(200).json({
    data:lawyers,
    message:"user profile details are here"
   })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ✅ export all functions as an object
module.exports = { loginUser, register, getProfile,allLawyers };
