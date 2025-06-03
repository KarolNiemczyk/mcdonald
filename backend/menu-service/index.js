const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, verifyToken, login, register } = require('./auth');

const app = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Coś poszło nie tak!' });
});

app.post('/api/register', [
  body('email').isEmail().withMessage('Nieprawidłowy email'),
  body('password').isLength({ min: 6 }).withMessage('Hasło musi mieć co najmniej 6 znaków'),
], register);

app.post('/api/login', [
  body('email').isEmail().withMessage('Nieprawidłowy email'),
  body('password').notEmpty().withMessage('Hasło jest wymagane'),
], login);

app.post('/api/auth/verify', [
  body('token').notEmpty().withMessage('Token jest wymagany'),
], verifyToken);

app.get('/api/menu', async (req, res, next) => {
  try {
    const categories = await prisma.categories.findMany({
      include: {
        products: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    });
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

app.get('/api/products/:id', async (req, res, next) => {
  try {
    const product = await prisma.products.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        category: true,
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });
    if (!product) {
      return res.status(404).json({ error: 'Produkt nie znaleziony' });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
});

app.post(
  '/api/products',
  authenticate,
  [
    body('name').notEmpty().withMessage('Nazwa produktu jest wymagana'),
    body('price').isFloat({ min: 0 }).withMessage('Cena musi być liczbą dodatnią'),
    body('category_id').isInt().withMessage('ID kategorii musi być liczbą całkowitą'),
    body('nutritional_info.calories').optional().isInt({ min: 0 }).withMessage('Kalorie muszą być liczbą nieujemną'),
    body('ingredients').optional().isArray().withMessage('Składniki muszą być tablicą'),
    body('ingredients.*').isString().notEmpty().withMessage('Każdy składnik musi być niepustym ciągiem znaków'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Wymagana autoryzacja' });
      }
      if (req.user.role_id !== 1) {
        return res.status(403).json({ error: 'Tylko użytkownicy z role_id=1 mogą dodawać produkty' });
      }

      const { name, description, price, category_id, ingredients, availability, nutritional_info } = req.body;

      const category = await prisma.categories.findUnique({
        where: { id: parseInt(category_id) },
      });
      if (!category) {
        return res.status(400).json({ error: `Kategoria o ID ${category_id} nie istnieje` });
      }

      const ingredientConnections = [];
      if (ingredients && ingredients.length > 0) {
        for (const ingredientName of ingredients) {
          const ingredient = await prisma.ingredients.upsert({
            where: { name: ingredientName },
            update: {},
            create: {
              name: ingredientName,
              description: `Składnik: ${ingredientName}`,
            },
          });
          ingredientConnections.push({ ingredient_id: ingredient.id });
        }
      }

      const product = await prisma.products.create({
        data: {
          name,
          description,
          price: parseFloat(price),
          category_id: parseInt(category_id),
          availability: availability ?? true,
          nutritional_info: nutritional_info || null,
          ingredients: {
            create: ingredientConnections,
          },
        },
        include: {
          ingredients: {
            include: {
              ingredient: true,
            },
          },
        },
      });

      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }
);

app.listen(port, () => {
  console.log(`Menu Service listening at http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});