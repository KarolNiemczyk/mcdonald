const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3003;
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
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

// Test route
app.get('/api/test', (req, res) => {
  res.json({ status: 'Payment Service OK', timestamp: new Date().toISOString() });
});

app.post(
  '/api/payments',
  authenticate,
  [
    body('order_id').isInt({ min: 1 }).withMessage('Nieprawidłowy ID zamówienia'),
    body('amount').isFloat({ min: 0 }).withMessage('Kwota musi być dodatnia'),
    body('payment_method').isIn(['card', 'cash', 'mobile_app']).withMessage('Nieprawidłowa metoda płatności'),
    body('promo_code').optional().isString().isLength({ max: 50 }).withMessage('Nieprawidłowy kod promocyjny'),
    body('card_payment_id').if(body('payment_method').equals('card')).isString().withMessage('Nieprawidłowy ID płatności kartą'),
    body('mobile_transaction_id').if(body('payment_method').equals('mobile_app')).isString().withMessage('Nieprawidłowy ID transakcji mobilnej')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { order_id, amount, payment_method, promo_code, card_payment_id, mobile_transaction_id } = req.body;

      const order = await prisma.orders.findUnique({
        where: { id: order_id }
      });
      if (!order) {
        return res.status(400).json({ error: 'Zamówienie nie istnieje' });
      }

      let discount = 0;
      if (promo_code) {
        const promoCode = await prisma.promo_codes.findUnique({
          where: { code: promo_code }
        });
        if (!promoCode || promoCode.uses >= promoCode.max_uses || new Date() > promoCode.valid_until) {
          return res.status(400).json({ error: 'Nieprawidłowy lub wygasły kod promocyjny' });
        }
        discount = promoCode.discount;
      }

      let payment;
      if (payment_method === 'card') {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round((amount - discount) * 100),
          currency: 'pln',
          payment_method: card_payment_id,
          confirm: true,
          return_url: 'http://localhost:3000'
        });

        payment = await prisma.payments.create({
          data: {
            order_id,
            amount,
            payment_method,
            status: paymentIntent.status === 'succeeded' ? 'completed' : 'failed',
            transaction_id: paymentIntent.id,
            promo_code,
            discount_amount: discount
          }
        });
      } else if (payment_method === 'cash') {
        payment = await prisma.payments.create({
          data: {
            order_id,
            amount,
            payment_method,
            status: 'pending',
            transaction_id: null,
            promo_code,
            discount_amount: discount
          }
        });
      } else if (payment_method === 'mobile_app') {
        const simulatedMobileResponse = { transactionId: mobile_transaction_id || `mobile_${Date.now()}` };
        payment = await prisma.payments.create({
          data: {
            order_id,
            amount,
            payment_method,
            status: 'completed',
            transaction_id: simulatedMobileResponse.transactionId,
            promo_code,
            discount_amount: discount
          }
        });
      }

      if (payment.status === 'completed' && promo_code) {
        await prisma.promo_codes.update({
          where: { code: promo_code },
          data: { uses: { increment: 1 } }
        });
      }

      const confirmation = {
        order_id,
        payment_id: payment.id,
        amount: payment.amount,
        discount: discount,
        payment_method,
        status: payment.status,
        timestamp: payment.created_at
      };

      res.status(201).json({ payment, confirmation });
    } catch (error) {
      next(error);
    }
  }
);

app.listen(port, () => {
  console.log(`Payment Service listening at http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});