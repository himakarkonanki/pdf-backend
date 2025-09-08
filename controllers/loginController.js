// controllers/loginController.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const usersFile = path.join(__dirname, '../users.json');

function getUsers() {
  const data = fs.readFileSync(usersFile, 'utf-8');
  return JSON.parse(data);
}

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (user && await bcrypt.compare(password, user.password)) {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
};
