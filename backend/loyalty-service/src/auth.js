const axios = require('axios');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const response = await axios.post('http://localhost:3001/api/auth/verify', { token });
      req.user = response.data.user;
      next();
    } catch (error) {
      return res.status(401).json({ error: error.response?.data?.error || 'Nieprawidłowy lub wygasły token' });
    }
  } else {
    return res.status(401).json({ error: 'Wymagana autoryzacja' });
  }
};

module.exports = { authenticate };