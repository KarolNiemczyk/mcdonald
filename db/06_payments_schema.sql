CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('card', 'cash', 'mobile_app')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    transaction_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    promo_code VARCHAR(50),
    discount_amount DECIMAL(10,2) CHECK (discount_amount >= 0)
);

CREATE TABLE promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount DECIMAL(5,2) NOT NULL CHECK (discount >= 0),
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    max_uses INTEGER CHECK (max_uses > 0),
    uses INTEGER DEFAULT 0 CHECK (uses >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_promo_codes_code ON promo_codes(code);

-- Seed promo code
INSERT INTO promo_codes (code, discount, valid_from, valid_until, max_uses) VALUES
    ('SAVE10', 10.00, '2025-06-01', '2025-12-31', 100);