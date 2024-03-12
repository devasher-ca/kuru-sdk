-- init-db.sql
CREATE TABLE IF NOT EXISTS orderbook (
    order_id SERIAL PRIMARY KEY,
    owner_address VARCHAR(255),
    size NUMERIC,
    price NUMERIC,
    is_buy BOOLEAN,
    is_updated BOOLEAN
);

CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    owner_address VARCHAR(255),
    size NUMERIC,
    price NUMERIC,
    is_buy BOOLEAN
);

CREATE TABLE IF NOT EXISTS trades (
    taker_address VARCHAR(255),
    size NUMERIC,
    is_buy BOOLEAN,
    timestamp NUMERIC
);
