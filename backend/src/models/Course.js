const { promisePool: pool } = require('../config/database');

class Course {
    // Create a new course (Admin/Instructor only)
    static async create(courseData) {
        const {
            title,
            description = null,
            thumbnail = null,
            category_id = null,
            instructor_id,
            visibility = 'everyone',
            access_rule = 'open',
            price = 0,
            currency = 'USD',
            duration_hours = 0,
            level = 'all_levels',
            language = 'English'
        } = courseData;

        const [result] = await pool.execute(
            `INSERT INTO courses (
                title, description, thumbnail, category_id, instructor_id,
                visibility, access_rule, price, currency, duration_hours,
                level, language, is_published
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
            [
                title, 
                description || null, 
                thumbnail || null, 
                category_id || null, 
                instructor_id,
                visibility, 
                access_rule, 
                price || 0, 
                currency || 'USD', 
                duration_hours || 0,
                level || 'all_levels', 
                language || 'English'
            ]
        );

        return { id: result.insertId, ...courseData };
    }

    // Get course by ID with instructor and category info
    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT 
                c.*,
                cat.name AS category_name,
                u.name AS instructor_name,
                u.email AS instructor_email,
                u.avatar AS instructor_avatar
            FROM courses c
            LEFT JOIN categories cat ON c.category_id = cat.id
            LEFT JOIN users u ON c.instructor_id = u.id
            WHERE c.id = ?`,
            [id]
        );
        return rows[0];
    }

    // Get all courses with filters and pagination
    static async findAll(filters = {}) {
        const {
            instructor_id,
            category_id,
            visibility,
            access_rule,
            is_published,
            level,
            search,
            page = 1,
            limit = 10,
            sort_by = 'created_at',
            sort_order = 'DESC'
        } = filters;

        let query = `
            SELECT 
                c.*,
                cat.name AS category_name,
                u.name AS instructor_name
            FROM courses c
            LEFT JOIN categories cat ON c.category_id = cat.id
            LEFT JOIN users u ON c.instructor_id = u.id
            WHERE 1=1
        `;
        const params = [];

        // Apply filters
        if (instructor_id) {
            query += ` AND c.instructor_id = ?`;
            params.push(instructor_id);
        }

        if (category_id) {
            query += ` AND c.category_id = ?`;
            params.push(category_id);
        }

        if (visibility) {
            query += ` AND c.visibility = ?`;
            params.push(visibility);
        }

        if (access_rule) {
            query += ` AND c.access_rule = ?`;
            params.push(access_rule);
        }

        if (is_published !== undefined) {
            query += ` AND c.is_published = ?`;
            params.push(is_published);
        }

        if (level) {
            query += ` AND c.level = ?`;
            params.push(level);
        }

        if (search) {
            query += ` AND (c.title LIKE ? OR c.description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        // Get total count
        const countQuery = query.replace(
            /SELECT[\s\S]*?FROM/,
            'SELECT COUNT(*) as total FROM'
        );
        const [countResult] = await pool.execute(countQuery, params);
        const total = countResult[0].total;

        // Apply sorting and pagination
        const allowedSortFields = ['created_at', 'title', 'price', 'total_enrollments', 'average_rating'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        query += ` ORDER BY c.${sortField} ${sortDirection}`;
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [rows] = await pool.execute(query, params);

        return {
            courses: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // Get courses for instructor (their own courses)
    static async findByInstructor(instructorId, filters = {}) {
        return this.findAll({ ...filters, instructor_id: instructorId });
    }

    // Update course
    static async update(id, courseData) {
        const allowedFields = [
            'title', 'description', 'thumbnail', 'category_id',
            'visibility', 'access_rule', 'price', 'currency',
            'duration_hours', 'level', 'language'
        ];

        const updates = [];
        const params = [];

        for (const field of allowedFields) {
            if (courseData[field] !== undefined) {
                updates.push(`${field} = ?`);
                params.push(courseData[field]);
            }
        }

        if (updates.length === 0) {
            return null;
        }

        params.push(id);
        const query = `UPDATE courses SET ${updates.join(', ')} WHERE id = ?`;
        
        const [result] = await pool.execute(query, params);
        return result.affectedRows > 0;
    }

    // Publish course
    static async publish(id) {
        const [result] = await pool.execute(
            `UPDATE courses SET is_published = TRUE, published_at = NOW() WHERE id = ?`,
            [id]
        );
        return result.affectedRows > 0;
    }

    // Unpublish course
    static async unpublish(id) {
        const [result] = await pool.execute(
            `UPDATE courses SET is_published = FALSE WHERE id = ?`,
            [id]
        );
        return result.affectedRows > 0;
    }

    // Delete course
    static async delete(id) {
        const [result] = await pool.execute(
            `DELETE FROM courses WHERE id = ?`,
            [id]
        );
        return result.affectedRows > 0;
    }

    // Check if user owns the course
    static async isOwner(courseId, userId) {
        const [rows] = await pool.execute(
            `SELECT id FROM courses WHERE id = ? AND instructor_id = ?`,
            [courseId, userId]
        );
        return rows.length > 0;
    }

    // Get course with lessons
    static async findWithLessons(id) {
        const course = await this.findById(id);
        if (!course) return null;

        const [lessons] = await pool.execute(
            `SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC`,
            [id]
        );

        course.lessons = lessons;
        return course;
    }

    // Get courses for learner website (published only)
    static async findPublished(filters = {}) {
        return this.findAll({ ...filters, is_published: true });
    }

    // Add tags to course
    static async addTags(courseId, tagIds) {
        if (!tagIds || tagIds.length === 0) return;

        const values = tagIds.map(tagId => `(${courseId}, ${tagId})`).join(', ');
        await pool.execute(
            `INSERT IGNORE INTO course_tags (course_id, tag_id) VALUES ${values}`
        );
    }

    // Remove all tags from course
    static async removeTags(courseId) {
        await pool.execute(
            `DELETE FROM course_tags WHERE course_id = ?`,
            [courseId]
        );
    }

    // Update course tags
    static async updateTags(courseId, tagIds) {
        await this.removeTags(courseId);
        await this.addTags(courseId, tagIds);
    }

    // Get course tags
    static async getTags(courseId) {
        const [rows] = await pool.execute(
            `SELECT t.* FROM tags t
            JOIN course_tags ct ON t.id = ct.tag_id
            WHERE ct.course_id = ?`,
            [courseId]
        );
        return rows;
    }

    // Get course statistics for dashboard
    static async getStats(instructorId = null) {
        let query = `
            SELECT 
                COUNT(*) as total_courses,
                SUM(CASE WHEN is_published = TRUE THEN 1 ELSE 0 END) as published_courses,
                SUM(CASE WHEN is_published = FALSE THEN 1 ELSE 0 END) as draft_courses,
                SUM(total_enrollments) as total_enrollments,
                AVG(average_rating) as avg_rating
            FROM courses
        `;
        const params = [];

        if (instructorId) {
            query += ` WHERE instructor_id = ?`;
            params.push(instructorId);
        }

        const [rows] = await pool.execute(query, params);
        return rows[0];
    }
}

module.exports = Course;
