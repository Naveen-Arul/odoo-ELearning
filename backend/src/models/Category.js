const { promisePool: pool } = require('../config/database');

class Category {
    // Get all categories
    static async findAll(includeInactive = false) {
        let query = `
            SELECT 
                c.*,
                (SELECT COUNT(*) FROM courses WHERE category_id = c.id) as course_count
            FROM categories c
        `;
        
        if (!includeInactive) {
            query += ` WHERE c.is_active = TRUE`;
        }
        
        query += ` ORDER BY c.name ASC`;
        
        const [rows] = await pool.execute(query);
        return rows;
    }

    // Get category by ID
    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT * FROM categories WHERE id = ?`,
            [id]
        );
        return rows[0];
    }

    // Create category (Admin only)
    static async create(categoryData) {
        const { name, description, icon, parent_id } = categoryData;
        
        const [result] = await pool.execute(
            `INSERT INTO categories (name, description, icon, parent_id) 
            VALUES (?, ?, ?, ?)`,
            [name, description, icon, parent_id]
        );
        
        return { id: result.insertId, ...categoryData };
    }

    // Update category (Admin only)
    static async update(id, categoryData) {
        const { name, description, icon, parent_id, is_active } = categoryData;
        
        const [result] = await pool.execute(
            `UPDATE categories 
            SET name = COALESCE(?, name),
                description = COALESCE(?, description),
                icon = COALESCE(?, icon),
                parent_id = ?,
                is_active = COALESCE(?, is_active)
            WHERE id = ?`,
            [name, description, icon, parent_id, is_active, id]
        );
        
        return result.affectedRows > 0;
    }

    // Delete category (Admin only)
    static async delete(id) {
        // Set courses in this category to NULL
        await pool.execute(
            `UPDATE courses SET category_id = NULL WHERE category_id = ?`,
            [id]
        );
        
        const [result] = await pool.execute(
            `DELETE FROM categories WHERE id = ?`,
            [id]
        );
        
        return result.affectedRows > 0;
    }

    // Get categories with subcategories
    static async findWithSubcategories() {
        const [rows] = await pool.execute(`
            SELECT * FROM categories WHERE is_active = TRUE ORDER BY name ASC
        `);

        // Build tree structure
        const categoryMap = new Map();
        const rootCategories = [];

        rows.forEach(cat => {
            categoryMap.set(cat.id, { ...cat, subcategories: [] });
        });

        rows.forEach(cat => {
            if (cat.parent_id) {
                const parent = categoryMap.get(cat.parent_id);
                if (parent) {
                    parent.subcategories.push(categoryMap.get(cat.id));
                }
            } else {
                rootCategories.push(categoryMap.get(cat.id));
            }
        });

        return rootCategories;
    }
}

module.exports = Category;
