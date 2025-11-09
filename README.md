# 🍔 Menu Service API (Express + Prisma + PostgreSQL)

Menu Service to backendowa aplikacja REST API służąca do obsługi menu restauracyjnego
(zarządzanie produktami, kategoriami, składnikami, alergenami oraz zamówieniami).
Projekt wykorzystuje Express.js, Prisma ORM oraz bazę PostgreSQL.

## 📌 Kluczowe funkcjonalności

✅ System użytkowników (rejestracja, logowanie, weryfikacja tokenu)\
✅ Role: `admin` i `customer`\
✅ Admin może dodawać produkty do menu\
✅ Kategorie produktów (np. burgery, napoje, desery)\
✅ Produkty ze szczegółami (składniki, cena, dostępność, wartości odżywcze)\
✅ Relacje wiele-do-wielu:
- produkty ↔ składniki
- składniki ↔ alergeny

✅ Walidacja danych (`express-validator`)\
✅ Bezpieczeństwo (`helmet`, CORS, JWT)

---

## 🛠 Technologie

| Warstwa | Technologia |
|---------|-------------|
| Backend | Node.js / Express.js |
| Baza danych | PostgreSQL |
| ORM | Prisma |
| Autoryzacja | JWT |
| Walidacja | express-validator |
| Bezpieczeństwo | helmet, CORS |

---

## 🚀 Instalacja i uruchomienie

### 1️⃣ Klonowanie projektu
```bash
git clone <repo>
cd menu-service
