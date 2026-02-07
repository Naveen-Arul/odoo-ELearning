-- Run this script in MySQL to create the database
CREATE DATABASE IF NOT EXISTS learnsphere;
USE learnsphere;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'instructor', 'learner') DEFAULT 'learner',
    avatar VARCHAR(255),
    total_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Insert default admin user (password: Admin@123)
-- Password hash for Admin@123
INSERT INTO users (name, email, password, role, total_points) 
VALUES ('Admin User', 'admin@learnsphere.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxF3P8uS6', 'admin', 0)
ON DUPLICATE KEY UPDATE name=name;

SELECT 'Database setup complete!' AS message;
