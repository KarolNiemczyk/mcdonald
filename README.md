# 🍔 Menu Service API (Express + Prisma + PostgreSQL)

Menu Service is a backend REST API responsible for managing a restaurant menu  
(products, categories, ingredients, allergens, and ordering system).  
The project is built with Express.js, Prisma ORM, and a PostgreSQL database.

## 📌 Key Features

✅ User system (registration, login, token verification)  
✅ Roles: `admin` and `customer`  
✅ Admin can add products to the menu  
✅ Product categories (e.g., burgers, drinks, desserts)  
✅ Detailed product info (ingredients, price, availability, nutrition data)  
✅ Many-to-many relations:
- products ↔ ingredients  
- ingredients ↔ allergens  

✅ Data validation (`express-validator`)  
✅ Security (`helmet`, CORS, JWT)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js / Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT |
| Validation | express-validator |
| Security | helmet, CORS |

---

## 🚀 Installation & Setup

### 1️⃣ Clone the repository
```bash
git clone <repo>
cd menu-service
