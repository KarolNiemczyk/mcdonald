const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('./auth');
const LoyaltyPoints = require('./models/LoyaltyPoints');

const app = express();
const port = process.env.PORT || 3004;
const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/mcdonalds_kiosk';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Coś poszło nie tak!' });
});

app.post(
  '/api/loyalty/award',
  authenticate,
  [
    body('points').isInt({ min: 0 }).withMessage('Punkty muszą być liczbą nieujemną'),
    body('order_id').isInt().withMessage('ID zamówienia musi być liczbą całkowitą'),
    body('amount').isFloat({ min: 0 }).withMessage('Kwota musi być liczbą dodatnią'),
    body('items').isArray().withMessage('Elementy zamówienia muszą być tablicą'),
    body('items.*.product_id').isInt().withMessage('ID produktu musi być liczbą całkowitą'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Ilość musi być liczbą dodatnią'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { user_id } = req.user;
      const { points, order_id, amount, items } = req.body;

      const loyaltyRecord = await LoyaltyPoints.findOneAndUpdate(
        { user_id },
        {
          $inc: { points },
          $push: {
            order_history: {
              order_id,
              amount,
              items,
              timestamp: new Date(),
            },
          },
          $set: { updated_at: new Date() },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.status(200).json({ message: 'Punkty przyznane', points: loyaltyRecord.points });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.post(
  '/api/loyalty/redeem',
  authenticate,
  [
    body('points').isInt({ min: 1 }).withMessage('Punkty muszą być liczbą dodatnią'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { user_id } = req.user;
      const { points } = req.body;

      const loyaltyRecord = await LoyaltyPoints.findOne({ user_id });
      if (!loyaltyRecord || loyaltyRecord.points < points) {
        return res.status(400).json({ error: 'Niewystarczająca liczba punktów' });
      }

      const updatedRecord = await LoyaltyPoints.findOneAndUpdate(
        { user_id },
        { $inc: { points: -points }, $set: { updated_at: new Date() } },
        { new: true }
      );
      const discount = Math.floor(points / 100) * 10; // 100 points = 10 PLN zniżki

      res.status(200).json({ message: 'Punkty zrealizowane', discount, remainingPoints: updatedRecord.points });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
