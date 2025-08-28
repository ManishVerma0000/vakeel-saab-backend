
const jwt=require('jsonwebtoken')

const SECRET = process.env.SECRET_KEY; // move to env

 function generateToken(id) {
  return jwt.sign(id, SECRET, { expiresIn: "1h" });
}

 function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    throw new Error("Invalid token");
  }
}

module.exports={generateToken,verifyToken}