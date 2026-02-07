const { promisePool } = require('../config/database');

class User {
  // Create new user
  static async create(userData) {
    const { name, email, password, role = 'learner' } = userData;
    // Only learners get points tracking, admin/instructor get NULL
    const totalPoints = role === 'learner' ? 0 : null;
    const query = 'INSERT INTO users (name, email, password, role, total_points) VALUES (?, ?, ?, ?, ?)';
    const [result] = await promisePool.execute(query, [name, email, password, role, totalPoints]);
    return result.insertId;
  }

  // Find user by email
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const [rows] = await promisePool.execute(query, [email]);
    return rows[0];
  }

  // Find user by ID
  static async findById(id) {
    const query = 'SELECT id, name, email, role, avatar, total_points, created_at FROM users WHERE id = ?';
    const [rows] = await promisePool.execute(query, [id]);
    return rows[0];
  }

  // Update user points (only for learners)
  static async updatePoints(userId, points) {
    // Only update points for learners
    const query = 'UPDATE users SET total_points = total_points + ? WHERE id = ? AND role = "learner"';
    const [result] = await promisePool.execute(query, [points, userId]);
    return result.affectedRows > 0;
  }

  // Check if email exists
  static async emailExists(email) {
    const query = 'SELECT id FROM users WHERE email = ?';
    const [rows] = await promisePool.execute(query, [email]);
    return rows.length > 0;
  }
}

module.exports = User;
