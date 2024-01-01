-- init-db.sql
CREATE TABLE IF NOT EXISTS orderbook (
    order_id SERIAL PRIMARY KEY,
    owner_address VARCHAR(255),
    price NUMERIC,
    size NUMERIC,
    acceptable_range NUMERIC,
    is_buy BOOLEAN
);
