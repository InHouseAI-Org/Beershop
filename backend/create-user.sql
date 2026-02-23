-- Create PostgreSQL user for beershop application
CREATE USER bs_user WITH PASSWORD 'bs_password';

-- Grant privileges to create databases
ALTER USER bs_user CREATEDB;

-- Grant all privileges on database beershop (run after database is created)
GRANT ALL PRIVILEGES ON DATABASE beershop TO bs_user;
