-- Tworzenie tabeli dla kategorii menu
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tworzenie tabeli dla produktów
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(5,2) NOT NULL CHECK (price >= 0),
    availability BOOLEAN DEFAULT TRUE,
    nutritional_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tworzenie tabeli dla składników
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- Tabela łącząca produkty ze składnikami (relacja wiele-do-wielu)
CREATE TABLE product_ingredients (
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id INT REFERENCES ingredients(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, ingredient_id)
);

-- Tworzenie tabeli dla alergenów
CREATE TABLE allergens (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- Tabela łącząca składniki z alergenami (relacja wiele-do-wielu)
CREATE TABLE ingredient_allergens (
    ingredient_id INT REFERENCES ingredients(id) ON DELETE CASCADE,
    allergen_id INT REFERENCES allergens(id) ON DELETE CASCADE,
    PRIMARY KEY (ingredient_id, allergen_id)
);
CREATE TABLE product_customizations (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('remove_ingredient', 'additive')),
    ingredient_id INT REFERENCES ingredients(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    additional_price DECIMAL(5,2) DEFAULT 0.00 CHECK (additional_price >= 0)
);

-- Indeksy dla poprawy wydajności zapytań
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_product_ingredients_product_id ON product_ingredients(product_id);
CREATE INDEX idx_ingredient_allergens_ingredient_id ON ingredient_allergens(ingredient_id);