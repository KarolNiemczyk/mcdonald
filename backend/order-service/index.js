const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3002;
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.use(cors());
app.use(helmet());
app.use(express.json());

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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Coś poszło nie tak!' });
});

app.post(
  '/api/orders',
  authenticate,
  [
    body('userId').optional().isString().withMessage('ID użytkownika musi być ciągiem znaków'),
    body('delivery_option').isIn(['on-site', 'delivery', 'pickup']).withMessage('Nieprawidłowa opcja dostawy'),
    body('table_number').if(body('delivery_option').equals('on-site')).isInt({ min: 1 }).withMessage('Numer stolika musi być liczbą dodatnią'),
    body('delivery_address.street').if(body('delivery_option').equals('delivery')).notEmpty().withMessage('Ulica jest wymagana'),
    body('delivery_address.city').if(body('delivery_option').equals('delivery')).notEmpty().withMessage('Miasto jest wymagane'),
    body('delivery_address.postalCode').if(body('delivery_option').equals('delivery')).notEmpty().withMessage('Kod pocztowy jest wymagany'),
    body('items').isArray({ min: 1 }).withMessage('Zamówienie musi zawierać co najmniej jeden produkt'),
    body('items.*.productId').isInt({ min: 1 }).withMessage('ID produktu musi być liczbą dodatnią'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Ilość musi być liczbą dodatnią'),
    body('items.*.customizations').optional().isObject().withMessage('Dostosowania muszą być obiektem'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { userId, delivery_option, table_number, delivery_address, items } = req.body;
      let total_price = 0;

      // Calculate total price
      for (const item of items) {
        const product = await prisma.products.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          return res.status(400).json({ error: `Produkt o ID ${item.productId} nie istnieje` });
        }
        total_price += product.price * item.quantity;
      }

      // Prepare order data
      const orderData = {
        user_id: userId === 'guest' ? null : String(userId), // Convert userId to String
        delivery_option,
        table_number: delivery_option === 'on-site' ? parseInt(table_number) : null,
        delivery_address: delivery_option === 'delivery' ? delivery_address : null,
        total_price,
        order_items: {
          create: items.map(item => ({
            product_id: item.productId,
            quantity: item.quantity,
            customizations: item.customizations || {},
          })),
        },
      };

      // Create order
      const order = await prisma.orders.create({
        data: orderData,
        include: { order_items: true },
      });

      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }
);

app.listen(port, () => {
  console.log(`Order Service listening at http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});