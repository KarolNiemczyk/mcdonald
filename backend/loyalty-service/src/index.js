const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { body, validationResult, query } = require('express-validator');
const LoyaltyPoints = require('./models/LoyaltyPoints');

const app = express();
const port = process.env.PORT || 3004;
const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/mcdonalds_kiosk';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(helmet());
app.use(express.json());

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Coś poszło nie tak!' });
});

app.get('/api/loyalty/test', async (req, res) => {
  try {
    const testRecord = await LoyaltyPoints.create({
      user_id: 'test_user@example.com',
      points: 0,
      order_history: [],
    });
    res.status(200).json({ message: 'Test record created', record: testRecord });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(
  '/api/loyalty/award',
  [
    body('email').isEmail().withMessage('Email musi być poprawnym adresem email'),
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
      const { email, points, order_id, amount, items } = req.body;

      let loyaltyRecord = await LoyaltyPoints.findOne({ user_id: email });

      let updatedRecord;
      if (loyaltyRecord) {
        updatedRecord = await LoyaltyPoints.findOneAndUpdate(
          { user_id: email },
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
          { new: true }
        );
      } else {
        updatedRecord = await LoyaltyPoints.create({
          user_id: email,
          points,
          order_history: [
            {
              order_id,
              amount,
              items,
              timestamp: new Date(),
            },
          ],
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      res.status(200).json({ message: 'Punkty przyznane', points: updatedRecord.points });
    } catch (error) {
      console.error('Award points error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

app.post(
  '/api/loyalty/redeem',
  [
    body('email').isEmail().withMessage('Email musi być poprawnym adresem email'),
    body('points').isInt({ min: 1 }).withMessage('Punkty muszą być liczbą dodatnią'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, points } = req.body;

      const loyaltyRecord = await LoyaltyPoints.findOne({ user_id: email });
      if (!loyaltyRecord || loyaltyRecord.points < points) {
        return res.status(400).json({ error: 'Niewystarczająca liczba punktów' });
      }

      const updatedRecord = await LoyaltyPoints.findOneAndUpdate(
        { user_id: email },
        { $inc: { points: -points }, $set: { updated_at: new Date() } },
        { new: true }
      );
      const discount = points / 10; // 1 punkt = 0.10 PLN (10 punktów = 1 PLN)

      res.status(200).json({ message: 'Punkty zrealizowane', discount, remainingPoints: updatedRecord.points });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.get(
  '/api/loyalty/balance',
  [
    query('email').isEmail().withMessage('Email musi być poprawnym adresem email'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email } = req.query;

      let loyaltyRecord = await LoyaltyPoints.findOne({ user_id: email });

      if (!loyaltyRecord) {
        loyaltyRecord = await LoyaltyPoints.create({
          user_id: email,
          points: 0,
          order_history: [],
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      res.status(200).json({ points: loyaltyRecord.points });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.get(
  '/api/loyalty/most_ordered',
  [
    query('email').isEmail().withMessage('Email musi być poprawnym adresem email'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email } = req.query;
      const loyaltyRecord = await LoyaltyPoints.findOne({ user_id: email });

      if (!loyaltyRecord || !loyaltyRecord.order_history || loyaltyRecord.order_history.length === 0) {
        console.log('Brak historii zamówień dla użytkownika:', email);
        return res.status(404).json({ error: 'Brak historii zamówień' });
      }

      // Analiza historii zamówień
      const productCounts = {};
      loyaltyRecord.order_history.forEach(order => {
        order.items.forEach(item => {
          const productId = item.product_id || item.productId; // Obsługa różnych formatów
          if (productId) {
            productCounts[productId] = (productCounts[productId] || 0) + (item.quantity || 1);
          } else {
            console.warn('Brak productId w elemencie zamówienia:', item);
          }
        });
      });

      console.log('Product counts:', productCounts);

      // Znalezienie produktu z największą liczbą zamówień
      let mostOrderedProductId = null;
      let maxCount = 0;
      for (const [productId, count] of Object.entries(productCounts)) {
        if (count > maxCount) {
          maxCount = count;
          mostOrderedProductId = productId;
        }
      }

      if (!mostOrderedProductId) {
        console.log('Brak najczęściej zamawianego produktu dla użytkownika:', email);
        return res.status(404).json({ error: 'Brak najczęściej zamawianego produktu' });
      }

      console.log('Most ordered product ID:', mostOrderedProductId, 'Count:', maxCount);
      res.status(200).json({mostOrderedProductId});
    } catch (error) {
      console.error('Error fetching most ordered:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

app.listen(port, () => {
  console.log(`Loyalty Service listening at http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});