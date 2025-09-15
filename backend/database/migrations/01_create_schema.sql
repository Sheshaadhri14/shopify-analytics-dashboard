-- 1. CREATE DATABASE
-- (If not already created via psql)
-- CREATE DATABASE xeno_multitenant;
--run this in terminal 
--- psql -U postgres
--\i 'C:/Users/yourname/Documents/project/database/migrations/01_create_schema.sql'
-- check it by running \dt
\c xeno_multitenant

-- 2. create extension we may need
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. Tenants & branches
CREATE TABLE tenants (
  tenant_id SERIAL PRIMARY KEY,
  store_domain TEXT UNIQUE NOT NULL,
  display_name TEXT,
  access_token TEXT,
  webhook_secret TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE branches (
  branch_id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- 4. canonical tables with tenant_id + branch_id (branch_id nullable)
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  branch_id INT REFERENCES branches(branch_id),
  shopify_customer_id BIGINT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  address JSONB,
  metadata JSONB,
  created_at TIMESTAMP
);

CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  branch_id INT REFERENCES branches(branch_id),
  shopify_product_id BIGINT,
  title TEXT,
  handle TEXT,
  price NUMERIC,
  inventory INT,
  metadata JSONB,
  created_at TIMESTAMP
);

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  branch_id INT REFERENCES branches(branch_id),
  shopify_order_id BIGINT,
  customer_shopify_id BIGINT,
  total_amount NUMERIC,
  financial_status TEXT,
  line_items JSONB,
  metadata JSONB,
  created_at TIMESTAMP
);

CREATE TABLE custom_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  branch_id INT REFERENCES branches(branch_id),
  event_type TEXT NOT NULL,
  shopify_resource_id BIGINT,
  payload JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- 5. staging table for raw webhooks (helpful for debugging & retries)
CREATE TABLE webhook_staging (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INT,
  topic TEXT,
  raw_payload JSONB,
  headers JSONB,
  received_at TIMESTAMP DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

-- 6. Indexes for analytics queries
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at);
CREATE INDEX idx_customers_tenant_email ON customers(tenant_id, email);
CREATE INDEX idx_events_tenant_created ON custom_events(tenant_id, created_at);

-- 7. Row Level Security (RLS)
-- Create a role for app connections (e.g., xeno_app_user). We'll create policies assuming the app sets current_setting('app.current_tenant').

-- For simplicity here we demonstrate enabling RLS on key tables:
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE customers 
ADD CONSTRAINT customers_unique UNIQUE (tenant_id, shopify_customer_id);

-- Products: prevent duplicate shopify_product_id per tenant

ALTER TABLE products
ADD CONSTRAINT unique_product_per_tenant
UNIQUE (tenant_id, shopify_product_id);

-- Orders: prevent duplicate shopify_order_id per tenant
ALTER TABLE orders
ADD CONSTRAINT unique_order_per_tenant
UNIQUE (tenant_id, shopify_order_id);
-- Policy: allow access only when tenant_id equals the session setting
-- Note: session setting may be NULL for background system roles; allow superusers or migration role later.
CREATE POLICY tenant_isolation_customers ON customers
  USING (tenant_id::text = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_products ON products
  USING (tenant_id::text = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_orders ON orders
  USING (tenant_id::text = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_events ON custom_events
  USING (tenant_id::text = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true));

-- 8. Create service role (app user) and grant rights
-- Run as superuser:
CREATE ROLE xeno_app_user LOGIN PASSWORD 'REPLACE_WITH_SECURE_PASSWORD';
GRANT USAGE ON SCHEMA public TO xeno_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON customers, products, orders, custom_events, webhook_staging TO xeno_app_user;
-- Allow xeno_app_user to set the app.current_tenant
GRANT pg_read_all_settings TO xeno_app_user; -- not strictly necessary; treat with caution

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO xeno_app_user;
GRANT USAGE, SELECT ON SEQUENCE tenants_tenant_id_seq TO xeno_app_user;
GRANT USAGE, SELECT ON SEQUENCE customers_id_seq TO xeno_app_user;
GRANT USAGE, SELECT ON SEQUENCE products_id_seq TO xeno_app_user;
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO xeno_app_user;

-- Also grant on tenants table (missing from original)
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants TO xeno_app_user;
-- Note: For RLS to work you must connect as xeno_app_user and set:
-- SELECT set_config('app.current_tenant', '2', true);
ALTER TABLE customers ADD COLUMN updated_at TIMESTAMP;
ALTER TABLE products ADD COLUMN updated_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP;
ALTER TABLE branches ADD COLUMN updated_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN updated_at TIMESTAMP;
ALTER TABLE custom_events ADD COLUMN updated_at TIMESTAMP;
ALTER TABLE webhook_staging ADD COLUMN processed_at TIMESTAMP;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
-- Customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS data JSONB;

-- Products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS data JSONB;

-- Orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS data JSONB;

ALTER TABLE branches
ADD COLUMN shopify_branch_id BIGINT;

-- Optional: make it unique per tenant for ON CONFLICT upsert
CREATE UNIQUE INDEX idx_tenant_shopify_branch ON branches(tenant_id, shopify_branch_id);

-- migrations/20250914_add_user_admin_and_branch_shopify_id.sql

-- ensure users has tenant_id and is_admin
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(tenant_id) ON DELETE SET NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- ensure branches has shopify_branch_id
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS shopify_branch_id BIGINT;

-- unique index on tenant + shopify_branch_id (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_tenant_shopify_branch') THEN
    CREATE UNIQUE INDEX idx_tenant_shopify_branch ON branches(tenant_id, shopify_branch_id);
  END IF;
END$$;

CREATE VIEW events AS
SELECT * FROM custom_events;
