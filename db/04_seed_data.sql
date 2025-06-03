-- Dodawanie kategorii
INSERT INTO categories (name, description) VALUES
('Burgers', 'Classic and specialty burgers'),
('Drinks', 'Beverages and shakes');

-- Dodawanie produktów
INSERT INTO products (category_id, name, description, price, availability, nutritional_info) VALUES
(1, 'Big Mac', 'Two beef patties with special sauce', 5.99, TRUE, '{"calories": 540, "fat": 28, "protein": 25}'),
(2, 'Cola', 'Refreshing cola drink', 1.99, TRUE, '{"calories": 200, "sugar": 54}');

-- Dodawanie składników
INSERT INTO ingredients (name, description) VALUES
('Beef Patty', '100% beef patty'),
('Lettuce', 'Fresh lettuce'),
('Cola Syrup', 'Sweet cola syrup');

-- Powiązanie produktów ze składnikami
INSERT INTO product_ingredients (product_id, ingredient_id) VALUES
(1, 1), (1, 2), (2, 3);

-- Dodawanie alergenów
INSERT INTO allergens (name) VALUES
('Gluten'), ('Peanuts');

-- Powiązanie składników z alergenami
INSERT INTO ingredient_allergens (ingredient_id, allergen_id) VALUES
(1, 1);

-- Dodawanie użytkownika testowego
INSERT INTO users (email, password, role_id) VALUES
('test@example.com', '$2b$10$RJD6WbB3fRLea48dC/MIX.T8U6Zwln1d3jYtlJnj6Pxng9X4pUQKy', 1);
