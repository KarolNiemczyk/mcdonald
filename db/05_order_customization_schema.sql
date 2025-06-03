-- Seed product_customizations
INSERT INTO product_customizations (product_id, type, ingredient_id, name, additional_price) VALUES
(1, 'remove_ingredient', 1, 'No Lettuce', 0.00), -- Assuming ingredient_id 1 is Lettuce
(1, 'remove_ingredient', 2, 'No Tomato', 0.00), -- Assuming ingredient_id 2 is Tomato
(1, 'additive', NULL, 'Extra Cheese', 2.00),
(1, 'additive', NULL, 'Extra Sauce', 1.50);
