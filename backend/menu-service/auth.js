const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
    }
  } else {
    next();
  }
};

const verifyToken = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token jest wymagany' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.users.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role_id: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Użytkownik nie istnieje' });
    }

    res.status(200).json({ user: { id: user.id, email: user.email, role_id: user.role_id } });
  } catch (error) {
    res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
  }
};

const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const user = await prisma.users.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, role_id: true },
    });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token, user: { id: user.id, email: user.email, role_id: user.role_id } });
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email już zarejestrowany' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const customerRole = await prisma.roles.findUnique({ where: { name: 'customer' } });
    const user = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        role_id: customerRole?.id || 2,
      },
      select: { id: true, email: true, role_id: true },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.status(201).json({ token, user: { id: user.id, email: user.email, role_id: user.role_id } });
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate, verifyToken, login, register };