-- LearnSphere Database Schema
-- Drop database if exists and create new
DROP DATABASE IF EXISTS learnsphere;
CREATE DATABASE learnsphere;
USE learnsphere;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'instructor', 'learner') DEFAULT 'learner',
    avatar VARCHAR(255),
    total_points INT DEFAULT 0 COMMENT 'Points for learners only',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Insert default admin user (password: Admin@123)
-- Admin and instructors don't need points, only learners do
INSERT INTO users (name, email, password, role, total_points) 
VALUES ('Admin User', 'admin@learnsphere.com', '$2b$10$kX5J8yHZqF7vqY5Rz8W3.uv4Kqp7Rz8W3uv4Kqp7Rz8W3uv4Kqp7R', 'admin', NULL);
