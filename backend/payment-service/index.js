const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3003;
const prisma = new PrismaClient();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(helmet());
app.use(express.json());

// Logowanie przychodzącego body dla debugowania
app.use((req, res, next) => {
  console.log('Incoming request body:', req.body);
  next();
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Coś poszło nie tak!' });
});

// Nowy endpoint do walidacji kodu promocyjnego
app.post('/api/promo/validate', [
  body('code').isString().notEmpty().withMessage('Kod promocyjny jest wymagany'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const { code } = req.body;
    const promoCode = await prisma.promo_codes.findUnique({
      where: { code },
    });

    if (!promoCode || (promoCode.max_uses && promoCode.uses >= promoCode.max_uses) || new Date() > promoCode.valid_until) {
      return res.status(400).json({ error: 'Nieprawidłowy lub wygasły kod promocyjny' });
    }

    res.json({ discount: parseFloat(promoCode.discount) });
  } catch (error) {
    console.error('Promo validation error:', error);
    res.status(500).json({ error: 'Błąd serwera przy walidacji kodu' });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ status: 'Payment Service OK', timestamp: new Date().toISOString() });
});

app.post(
  '/api/payments',
  [
    body('order_id').isInt({ min: 1 }).withMessage('Nieprawidłowy ID zamówienia'),
    body('amount').isFloat({ min: 0 }).withMessage('Kwota musi być dodatnia'),
    body('payment_method').isIn(['card', 'cash', 'mobile_app']).withMessage('Nieprawidłowa metoda płatności'),
    body('promo_code').optional().isString().isLength({ max: 50 }).withMessage('Nieprawidłowy kod promocyjny'),
    body('mobile_transaction_id').if(body('payment_method').equals('mobile_app')).isString().withMessage('Nieprawidłowy ID transakcji mobilnej'),
    body('transaction_id').if(body('payment_method').equals('card')).isString().withMessage('Nieprawidłowy ID transakcji'),
    body('user_email').optional().isEmail().withMessage('Nieprawidłowy email użytkownika'),
    body('points_to_redeem').optional().isInt({ min: 0 }).withMessage('Punkty do wykorzystania muszą być liczbą nieujemną'),
    body('cart_items').isArray().withMessage('Cart items muszą być tablicą'),
    body('cart_items.*.product_id').isInt({ min: 1 }).withMessage('ID produktu musi być liczbą dodatnią'),
    body('cart_items.*.quantity').isInt({ min: 1 }).withMessage('Ilość musi być liczbą dodatnią'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { order_id, amount, payment_method, promo_code, mobile_transaction_id, transaction_id, user_email, points_to_redeem, cart_items } = req.body;

      const existingPayment = await prisma.payments.findUnique({
        where: { order_id },
      });
      if (existingPayment) {
        return res.status(400).json({ error: 'Płatność dla tego zamówienia już istnieje' });
      }

      const order = await prisma.orders.findUnique({
        where: { id: order_id },
      });
      if (!order) {
        return res.status(400).json({ error: 'Zamówienie nie istnieje' });
      }

      let promoDiscount = 0;
      if (promo_code) {
        const promoCode = await prisma.promo_codes.findUnique({
          where: { code: promo_code },
        });
        if (!promoCode || (promoCode.max_uses && promoCode.uses >= promoCode.max_uses) || new Date() > promoCode.valid_until) {
          return res.status(400).json({ error: 'Nieprawidłowy lub wygasły kod promocyjny' });
        }
        promoDiscount = Math.min(amount, parseFloat(promoCode.discount)); // Ograniczenie zniżki
      }

      const pointsDiscount = points_to_redeem ? Math.min(amount - promoDiscount, Math.floor(points_to_redeem / 100) * 10) : 0;
      const totalDiscount = promoDiscount + pointsDiscount;
      const finalAmount = Math.max(0, amount - totalDiscount);

      let payment;
      if (payment_method === 'card') {
        payment = await prisma.payments.create({
          data: {
            order_id,
            amount: finalAmount,
            payment_method,
            status: 'completed',
            transaction_id,
            promo_code,
            discount_amount: totalDiscount,
          },
        });
      } else if (payment_method === 'cash') {
        payment = await prisma.payments.create({
          data: {
            order_id,
            amount: finalAmount,
            payment_method,
            status: 'completed',
            transaction_id: null,
            promo_code,
            discount_amount: totalDiscount,
          },
        });
      } else if (payment_method === 'mobile_app') {
        payment = await prisma.payments.create({
          data: {
            order_id,
            amount: finalAmount,
            payment_method,
            status: 'completed',
            transaction_id: mobile_transaction_id || `mobile_${Date.now()}`,
            promo_code,
            discount_amount: totalDiscount,
          },
        });
      }

      if (payment.status === 'completed' && promo_code) {
        await prisma.promo_codes.update({
          where: { code: promo_code },
          data: { uses: { increment: 1 } },
        });
      }

      if (user_email && payment.status === 'completed') {
        if (points_to_redeem > 0) {
          await axios.post('http://loyalty-service:3004/api/loyalty/redeem', {
            email: user_email,
            points: points_to_redeem,
          });
        }

        const pointsEarned = Math.floor(finalAmount);
        if (pointsEarned > 0) {
          await axios.post('http://loyalty-service:3004/api/loyalty/award', {
            email: user_email,
            points: pointsEarned,
            order_id: order_id,
            amount: finalAmount,
            items: cart_items,
          });
        }
      }

      const confirmation = {
        order_id,
        payment_id: payment.id,
        amount: finalAmount,
        discount: totalDiscount,
        payment_method,
        status: payment.status,
        timestamp: payment.created_at,
      };

      res.status(201).json({ payment, confirmation });
    } catch (error) {
      console.error('Payment error:', error);
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