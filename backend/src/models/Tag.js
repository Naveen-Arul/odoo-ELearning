const { promisePool: pool } = require('../config/database');

class Tag {
    // Get all tags
    static async findAll() {
        const [rows] = await pool.execute(`
            SELECT 
                t.*,
                (SELECT COUNT(*) FROM course_tags WHERE tag_id = t.id) as course_count
            FROM tags t
            ORDER BY t.name ASC
        `);
        return rows;
    }

    // Get tag by ID
    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT * FROM tags WHERE id = ?`,
            [id]
        );
        return rows[0];
    }

    // Find tag by slug
    static async findBySlug(slug) {
        const [rows] = await pool.execute(
            `SELECT * FROM tags WHERE slug = ?`,
            [slug]
        );
        return rows[0];
    }

    // Create tag (Admin only)
    static async create(tagData) {
        const { name } = tagData;
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        const [result] = await pool.execute(
            `INSERT INTO tags (name, slug) VALUES (?, ?)`,
            [name, slug]
        );
        
        return { id: result.insertId, name, slug };
    }

    // Update tag (Admin only)
    static async update(id, tagData) {
        const { name } = tagData;
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        const [result] = await pool.execute(
            `UPDATE tags SET name = ?, slug = ? WHERE id = ?`,
            [name, slug, id]
        );
        
        return result.affectedRows > 0;
    }

    // Delete tag (Admin only)
    static async delete(id) {
        // Remove from course_tags first
        await pool.execute(
            `DELETE FROM course_tags WHERE tag_id = ?`,
            [id]
        );
        
        const [result] = await pool.execute(
            `DELETE FROM tags WHERE id = ?`,
            [id]
        );
        
        return result.affectedRows > 0;
    }

    // Get popular tags (by course count)
    static async findPopular(limit = 10) {
        const [rows] = await pool.execute(`
            SELECT 
                t.*,
                COUNT(ct.course_id) as course_count
            FROM tags t
            LEFT JOIN course_tags ct ON t.id = ct.tag_id
            GROUP BY t.id
            ORDER BY course_count DESC
            LIMIT ?
        `, [limit]);
        
        return rows;
    }

    // Search tags
    static async search(query) {
        const [rows] = await pool.execute(`
            SELECT * FROM tags 
            WHERE name LIKE ? 
            ORDER BY name ASC
            LIMIT 20
        `, [`%${query}%`]);
        
        return rows;
    }
}

module.exports = Tag;
