-- LearnSphere eLearning Platform - Database Schema v2.0
-- Comprehensive schema for courses, lessons, quizzes, reviews, badges, and progress tracking
-- Created: Phase 3 - Database Schema Extension

USE learnsphere;

-- ============================================
-- CATEGORIES TABLE
-- For organizing courses into categories
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100) COMMENT 'Icon class or image path',
    parent_id INT DEFAULT NULL COMMENT 'For subcategories',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_parent (parent_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- COURSES TABLE
-- Main course information with visibility and access rules
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail VARCHAR(500) COMMENT 'Course cover image URL',
    category_id INT,
    instructor_id INT NOT NULL COMMENT 'User who created/manages the course',
    
    -- Visibility Rules (who can see the course)
    visibility ENUM('everyone', 'signed_in') DEFAULT 'everyone' 
        COMMENT 'everyone: visible to all, signed_in: only logged-in users',
    
    -- Access Rules (who can enroll/access content)
    access_rule ENUM('open', 'invitation', 'payment') DEFAULT 'open'
        COMMENT 'open: free enrollment, invitation: invite only, payment: requires purchase',
    
    price DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Course price (for payment access)',
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Course metadata
    duration_hours DECIMAL(5, 2) DEFAULT 0 COMMENT 'Estimated total course duration in hours',
    level ENUM('beginner', 'intermediate', 'advanced', 'all_levels') DEFAULT 'all_levels',
    language VARCHAR(50) DEFAULT 'English',
    
    -- Publishing status
    is_published BOOLEAN DEFAULT FALSE COMMENT 'Published to learner website',
    published_at TIMESTAMP NULL,
    
    -- Statistics (cached for performance)
    total_lessons INT DEFAULT 0,
    total_enrollments INT DEFAULT 0,
    average_rating DECIMAL(2, 1) DEFAULT 0.0,
    total_reviews INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_instructor (instructor_id),
    INDEX idx_category (category_id),
    INDEX idx_published (is_published),
    INDEX idx_visibility (visibility),
    INDEX idx_access_rule (access_rule),
    INDEX idx_created (created_at),
    FULLTEXT INDEX idx_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TAGS TABLE
-- Course tags for filtering and discovery
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- COURSE_TAGS TABLE
-- Many-to-many relationship between courses and tags
-- ============================================
CREATE TABLE IF NOT EXISTS course_tags (
    course_id INT NOT NULL,
    tag_id INT NOT NULL,
    
    PRIMARY KEY (course_id, tag_id),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- LESSONS TABLE
-- Individual lessons within a course
-- Supports: Video, Document, Image, Quiz types
-- ============================================
CREATE TABLE IF NOT EXISTS lessons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Lesson type with content storage
    lesson_type ENUM('video', 'document', 'image', 'quiz') NOT NULL,
    
    -- Content based on type
    content_url VARCHAR(500) COMMENT 'URL for video/document/image content',
    content_text LONGTEXT COMMENT 'Rich text content for document type',
    quiz_id INT DEFAULT NULL COMMENT 'Reference to quiz if lesson_type is quiz',
    
    -- Lesson metadata
    duration_minutes INT DEFAULT 0 COMMENT 'Duration in minutes (for video)',
    sort_order INT DEFAULT 0 COMMENT 'Order within the course',
    
    -- Completion requirements
    is_mandatory BOOLEAN DEFAULT TRUE COMMENT 'Required to complete course',
    is_preview BOOLEAN DEFAULT FALSE COMMENT 'Can be previewed without enrollment',
    
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    
    INDEX idx_course (course_id),
    INDEX idx_sort_order (course_id, sort_order),
    INDEX idx_type (lesson_type),
    INDEX idx_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- LESSON_ATTACHMENTS TABLE
-- Additional resources/files attached to lessons
-- ============================================
CREATE TABLE IF NOT EXISTS lesson_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lesson_id INT NOT NULL,
    
    name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) COMMENT 'pdf, docx, zip, etc.',
    file_size INT COMMENT 'Size in bytes',
    
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    INDEX idx_lesson (lesson_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- QUIZZES TABLE
-- Quiz configuration and settings
-- ============================================
CREATE TABLE IF NOT EXISTS quizzes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Quiz settings
    passing_score DECIMAL(5, 2) DEFAULT 70.00 COMMENT 'Percentage required to pass',
    time_limit_minutes INT DEFAULT NULL COMMENT 'NULL = no time limit',
    max_attempts INT DEFAULT NULL COMMENT 'NULL = unlimited attempts',
    show_correct_answers BOOLEAN DEFAULT TRUE COMMENT 'Show answers after completion',
    shuffle_questions BOOLEAN DEFAULT FALSE,
    shuffle_options BOOLEAN DEFAULT FALSE,
    
    -- Points settings (rewarded on completion)
    points_enabled BOOLEAN DEFAULT TRUE,
    
    total_questions INT DEFAULT 0 COMMENT 'Cached count',
    total_points INT DEFAULT 0 COMMENT 'Maximum points possible',
    
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add quiz reference to lessons table
ALTER TABLE lessons ADD CONSTRAINT fk_lesson_quiz 
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE SET NULL;

-- ============================================
-- QUIZ_REWARDS TABLE
-- Points awarded based on attempt number
-- Example: 1st attempt = 100pts, 2nd = 75pts, 3rd = 50pts
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_rewards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quiz_id INT NOT NULL,
    
    attempt_number INT NOT NULL COMMENT 'Which attempt this reward applies to',
    points INT NOT NULL COMMENT 'Points awarded for this attempt',
    
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_quiz_attempt (quiz_id, attempt_number),
    INDEX idx_quiz (quiz_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- QUESTIONS TABLE
-- Quiz questions with multiple choice support
-- ============================================
CREATE TABLE IF NOT EXISTS questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quiz_id INT NOT NULL,
    
    question_text TEXT NOT NULL,
    question_type ENUM('single_choice', 'multiple_choice', 'true_false', 'text') DEFAULT 'single_choice',
    
    -- Options stored as JSON array
    -- Format: [{"id": "a", "text": "Option A"}, {"id": "b", "text": "Option B"}]
    options JSON,
    
    -- Correct answer(s)
    -- For single_choice/true_false: "a" or "true"
    -- For multiple_choice: ["a", "c"] (JSON array)
    -- For text: "expected answer"
    correct_answer JSON NOT NULL,
    
    -- Optional explanation shown after answering
    explanation TEXT,
    
    points INT DEFAULT 1 COMMENT 'Points for this question',
    sort_order INT DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    INDEX idx_quiz (quiz_id),
    INDEX idx_sort_order (quiz_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ENROLLMENTS TABLE
-- Track user enrollment in courses
-- ============================================
CREATE TABLE IF NOT EXISTS enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    
    -- Enrollment status
    status ENUM('enrolled', 'in_progress', 'completed', 'dropped', 'expired') DEFAULT 'enrolled',
    
    -- Important dates
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL COMMENT 'When learner started first lesson',
    completed_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL COMMENT 'For time-limited access',
    
    -- Progress tracking
    progress_percentage DECIMAL(5, 2) DEFAULT 0.00,
    lessons_completed INT DEFAULT 0,
    total_time_spent INT DEFAULT 0 COMMENT 'Total seconds spent',
    last_accessed_at TIMESTAMP NULL,
    
    -- Certificate
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_url VARCHAR(500),
    certificate_issued_at TIMESTAMP NULL,
    
    -- Payment info (if applicable)
    payment_id VARCHAR(100) COMMENT 'Reference to payment transaction',
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Invitation info (if applicable)
    invited_by INT COMMENT 'User who sent invitation',
    invitation_token VARCHAR(100),
    invitation_accepted_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_enrollment (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user (user_id),
    INDEX idx_course (course_id),
    INDEX idx_status (status),
    INDEX idx_enrolled_at (enrolled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- LESSON_PROGRESS TABLE
-- Track individual lesson completion
-- ============================================
CREATE TABLE IF NOT EXISTS lesson_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    enrollment_id INT NOT NULL,
    
    status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
    
    -- Progress details
    progress_percentage DECIMAL(5, 2) DEFAULT 0.00 COMMENT 'For video: watched percentage',
    time_spent INT DEFAULT 0 COMMENT 'Seconds spent on this lesson',
    video_position INT DEFAULT 0 COMMENT 'Last video position in seconds',
    
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_lesson_progress (user_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_lesson (lesson_id),
    INDEX idx_enrollment (enrollment_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- QUIZ_ATTEMPTS TABLE
-- Track quiz attempts and scores
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    enrollment_id INT NOT NULL,
    
    attempt_number INT NOT NULL,
    
    -- Scoring
    score DECIMAL(5, 2) DEFAULT 0.00 COMMENT 'Percentage score',
    points_earned INT DEFAULT 0 COMMENT 'Points earned from rewards table',
    correct_answers INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    
    -- Status
    status ENUM('in_progress', 'completed', 'timed_out', 'abandoned') DEFAULT 'in_progress',
    passed BOOLEAN DEFAULT FALSE,
    
    -- Answers stored as JSON
    -- Format: {"question_id": {"answer": "a", "is_correct": true, "time_taken": 30}}
    answers JSON,
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    time_taken INT DEFAULT 0 COMMENT 'Seconds taken to complete',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_quiz (quiz_id),
    INDEX idx_enrollment (enrollment_id),
    INDEX idx_attempt (user_id, quiz_id, attempt_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- REVIEWS TABLE
-- Course ratings and reviews from learners
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    enrollment_id INT NOT NULL,
    
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    
    -- Review moderation
    is_approved BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Helpful votes
    helpful_count INT DEFAULT 0,
    
    -- Response from instructor
    instructor_response TEXT,
    instructor_responded_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_review (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_course (course_id),
    INDEX idx_rating (rating),
    INDEX idx_approved (is_approved),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BADGES TABLE
-- Define achievement badges
-- Newbie(20pts) -> Explorer(40) -> Achiever(60) -> Specialist(80) -> Expert(100) -> Master(120)
-- ============================================
CREATE TABLE IF NOT EXISTS badges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(255) COMMENT 'Icon URL or class',
    color VARCHAR(7) DEFAULT '#FFD700' COMMENT 'Badge color hex code',
    
    -- Points threshold to earn this badge
    points_required INT NOT NULL,
    
    -- Badge tier for ordering
    tier INT NOT NULL COMMENT 'Order/level of badge',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_points (points_required),
    INDEX idx_tier (tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USER_BADGES TABLE
-- Track badges earned by users
-- ============================================
CREATE TABLE IF NOT EXISTS user_badges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- How the badge was earned
    earned_via ENUM('points', 'achievement', 'manual') DEFAULT 'points',
    course_id INT COMMENT 'If earned through a specific course',
    
    UNIQUE KEY unique_user_badge (user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    
    INDEX idx_user (user_id),
    INDEX idx_badge (badge_id),
    INDEX idx_earned_at (earned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- COURSE_INVITATIONS TABLE
-- For invitation-only course access
-- ============================================
CREATE TABLE IF NOT EXISTS course_invitations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    
    -- Invitation can be by email or to existing user
    email VARCHAR(255),
    user_id INT,
    
    invited_by INT NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    
    status ENUM('pending', 'accepted', 'declined', 'expired') DEFAULT 'pending',
    accepted_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    
    message TEXT COMMENT 'Personal message with invitation',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_course (course_id),
    INDEX idx_email (email),
    INDEX idx_user (user_id),
    INDEX idx_token (token),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- NOTIFICATIONS TABLE
-- System notifications for users
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    type ENUM('enrollment', 'badge_earned', 'course_update', 'quiz_result', 'review_response', 'invitation', 'system') NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- Link to related entity
    related_type VARCHAR(50) COMMENT 'course, quiz, badge, etc.',
    related_id INT,
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_read (is_read),
    INDEX idx_type (type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ACTIVITY_LOG TABLE
-- Track user activities for analytics
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    
    action VARCHAR(100) NOT NULL COMMENT 'login, view_course, start_lesson, etc.',
    
    -- Related entity
    entity_type VARCHAR(50),
    entity_id INT,
    
    -- Additional context as JSON
    metadata JSON,
    
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at),
    INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default categories
INSERT INTO categories (name, description, icon) VALUES
('Programming', 'Software development and coding courses', 'fas fa-code'),
('Design', 'UI/UX, graphic design, and creative courses', 'fas fa-palette'),
('Business', 'Business, management, and entrepreneurship', 'fas fa-briefcase'),
('Marketing', 'Digital marketing and sales strategies', 'fas fa-bullhorn'),
('Data Science', 'Data analysis, ML, and AI courses', 'fas fa-chart-bar'),
('Photography', 'Photography and video production', 'fas fa-camera'),
('Music', 'Music theory and instrument lessons', 'fas fa-music'),
('Language', 'Foreign language learning', 'fas fa-language'),
('Health', 'Health, fitness, and wellness', 'fas fa-heartbeat'),
('Personal Development', 'Self-improvement and productivity', 'fas fa-user-graduate');

-- Insert default badges based on problem statement
-- Newbie(20pts) -> Explorer(40) -> Achiever(60) -> Specialist(80) -> Expert(100) -> Master(120)
INSERT INTO badges (name, description, icon, color, points_required, tier) VALUES
('Newbie', 'Welcome to LearnSphere! You\'ve started your learning journey.', 'fas fa-seedling', '#8BC34A', 20, 1),
('Explorer', 'You\'re exploring new knowledge! Keep going!', 'fas fa-compass', '#03A9F4', 40, 2),
('Achiever', 'Great progress! You\'re achieving your learning goals.', 'fas fa-trophy', '#FF9800', 60, 3),
('Specialist', 'You\'re becoming a specialist in your areas of interest.', 'fas fa-star', '#9C27B0', 80, 4),
('Expert', 'Impressive! You\'ve proven your expertise.', 'fas fa-award', '#E91E63', 100, 5),
('Master', 'Congratulations! You\'ve mastered the platform!', 'fas fa-crown', '#FFD700', 120, 6);

-- Insert some default tags
INSERT INTO tags (name, slug) VALUES
('JavaScript', 'javascript'),
('Python', 'python'),
('React', 'react'),
('Node.js', 'nodejs'),
('SQL', 'sql'),
('Machine Learning', 'machine-learning'),
('Web Development', 'web-development'),
('Mobile App', 'mobile-app'),
('Beginner Friendly', 'beginner-friendly'),
('Advanced', 'advanced'),
('Free', 'free'),
('Certificate', 'certificate'),
('Hands-on', 'hands-on'),
('Project Based', 'project-based'),
('Industry Expert', 'industry-expert');

-- ============================================
-- TRIGGER: Update course statistics after enrollment
-- ============================================
DELIMITER //

CREATE TRIGGER after_enrollment_insert
AFTER INSERT ON enrollments
FOR EACH ROW
BEGIN
    UPDATE courses 
    SET total_enrollments = total_enrollments + 1 
    WHERE id = NEW.course_id;
END //

CREATE TRIGGER after_enrollment_delete
AFTER DELETE ON enrollments
FOR EACH ROW
BEGIN
    UPDATE courses 
    SET total_enrollments = total_enrollments - 1 
    WHERE id = OLD.course_id;
END //

-- Trigger: Update course average rating after review
CREATE TRIGGER after_review_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    UPDATE courses 
    SET average_rating = (
        SELECT AVG(rating) FROM reviews 
        WHERE course_id = NEW.course_id AND is_approved = TRUE
    ),
    total_reviews = (
        SELECT COUNT(*) FROM reviews 
        WHERE course_id = NEW.course_id AND is_approved = TRUE
    )
    WHERE id = NEW.course_id;
END //

CREATE TRIGGER after_review_update
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
    UPDATE courses 
    SET average_rating = (
        SELECT AVG(rating) FROM reviews 
        WHERE course_id = NEW.course_id AND is_approved = TRUE
    ),
    total_reviews = (
        SELECT COUNT(*) FROM reviews 
        WHERE course_id = NEW.course_id AND is_approved = TRUE
    )
    WHERE id = NEW.course_id;
END //

-- Trigger: Update course lesson count after lesson changes
CREATE TRIGGER after_lesson_insert
AFTER INSERT ON lessons
FOR EACH ROW
BEGIN
    UPDATE courses 
    SET total_lessons = (
        SELECT COUNT(*) FROM lessons 
        WHERE course_id = NEW.course_id AND is_published = TRUE
    )
    WHERE id = NEW.course_id;
END //

CREATE TRIGGER after_lesson_delete
AFTER DELETE ON lessons
FOR EACH ROW
BEGIN
    UPDATE courses 
    SET total_lessons = (
        SELECT COUNT(*) FROM lessons 
        WHERE course_id = OLD.course_id AND is_published = TRUE
    )
    WHERE id = OLD.course_id;
END //

-- Trigger: Update quiz totals after question changes
CREATE TRIGGER after_question_insert
AFTER INSERT ON questions
FOR EACH ROW
BEGIN
    UPDATE quizzes 
    SET total_questions = (
        SELECT COUNT(*) FROM questions 
        WHERE quiz_id = NEW.quiz_id AND is_active = TRUE
    ),
    total_points = (
        SELECT COALESCE(SUM(points), 0) FROM questions 
        WHERE quiz_id = NEW.quiz_id AND is_active = TRUE
    )
    WHERE id = NEW.quiz_id;
END //

CREATE TRIGGER after_question_delete
AFTER DELETE ON questions
FOR EACH ROW
BEGIN
    UPDATE quizzes 
    SET total_questions = (
        SELECT COUNT(*) FROM questions 
        WHERE quiz_id = OLD.quiz_id AND is_active = TRUE
    ),
    total_points = (
        SELECT COALESCE(SUM(points), 0) FROM questions 
        WHERE quiz_id = OLD.quiz_id AND is_active = TRUE
    )
    WHERE id = OLD.quiz_id;
END //

-- Trigger: Award badges based on points
CREATE TRIGGER after_user_points_update
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    DECLARE badge_cursor_id INT;
    DECLARE badge_points INT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE badge_cur CURSOR FOR 
        SELECT id, points_required FROM badges 
        WHERE points_required <= NEW.total_points 
        AND is_active = TRUE;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Only process for learners with changed points
    IF NEW.role = 'learner' AND NEW.total_points != OLD.total_points THEN
        OPEN badge_cur;
        
        badge_loop: LOOP
            FETCH badge_cur INTO badge_cursor_id, badge_points;
            IF done THEN
                LEAVE badge_loop;
            END IF;
            
            -- Insert badge if not already earned
            INSERT IGNORE INTO user_badges (user_id, badge_id, earned_via)
            VALUES (NEW.id, badge_cursor_id, 'points');
        END LOOP;
        
        CLOSE badge_cur;
    END IF;
END //

DELIMITER ;

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- View: Course Overview with Statistics
CREATE OR REPLACE VIEW v_course_overview AS
SELECT 
    c.id,
    c.title,
    c.description,
    c.thumbnail,
    cat.name AS category_name,
    u.name AS instructor_name,
    c.visibility,
    c.access_rule,
    c.price,
    c.level,
    c.is_published,
    c.total_lessons,
    c.total_enrollments,
    c.average_rating,
    c.total_reviews,
    c.created_at,
    c.published_at
FROM courses c
LEFT JOIN categories cat ON c.category_id = cat.id
LEFT JOIN users u ON c.instructor_id = u.id;

-- View: Learner Progress Summary
CREATE OR REPLACE VIEW v_learner_progress AS
SELECT 
    u.id AS user_id,
    u.name,
    u.email,
    u.total_points,
    COUNT(DISTINCT e.id) AS courses_enrolled,
    COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) AS courses_completed,
    COUNT(DISTINCT ub.badge_id) AS badges_earned,
    SUM(e.total_time_spent) AS total_learning_time,
    AVG(e.progress_percentage) AS avg_progress
FROM users u
LEFT JOIN enrollments e ON u.id = e.user_id
LEFT JOIN user_badges ub ON u.id = ub.user_id
WHERE u.role = 'learner'
GROUP BY u.id, u.name, u.email, u.total_points;

-- View: Quiz Performance
CREATE OR REPLACE VIEW v_quiz_performance AS
SELECT 
    q.id AS quiz_id,
    q.title AS quiz_title,
    c.title AS course_title,
    COUNT(qa.id) AS total_attempts,
    AVG(qa.score) AS avg_score,
    SUM(CASE WHEN qa.passed = TRUE THEN 1 ELSE 0 END) AS pass_count,
    (SUM(CASE WHEN qa.passed = TRUE THEN 1 ELSE 0 END) / COUNT(qa.id) * 100) AS pass_rate
FROM quizzes q
JOIN courses c ON q.course_id = c.id
LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.status = 'completed'
GROUP BY q.id, q.title, c.title;

-- ============================================
-- STORED PROCEDURES
-- ============================================

DELIMITER //

-- Procedure: Enroll user in a course
CREATE PROCEDURE sp_enroll_user(
    IN p_user_id INT,
    IN p_course_id INT,
    IN p_payment_id VARCHAR(100),
    IN p_amount DECIMAL(10,2),
    OUT p_enrollment_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_access_rule VARCHAR(20);
    DECLARE v_existing INT;
    
    -- Check if already enrolled
    SELECT id INTO v_existing FROM enrollments 
    WHERE user_id = p_user_id AND course_id = p_course_id;
    
    IF v_existing IS NOT NULL THEN
        SET p_enrollment_id = v_existing;
        SET p_message = 'Already enrolled in this course';
    ELSE
        -- Get course access rule
        SELECT access_rule INTO v_access_rule FROM courses WHERE id = p_course_id;
        
        -- Insert enrollment
        INSERT INTO enrollments (user_id, course_id, payment_id, amount_paid)
        VALUES (p_user_id, p_course_id, p_payment_id, COALESCE(p_amount, 0));
        
        SET p_enrollment_id = LAST_INSERT_ID();
        SET p_message = 'Successfully enrolled';
        
        -- Create notification
        INSERT INTO notifications (user_id, type, title, message, related_type, related_id)
        VALUES (p_user_id, 'enrollment', 'Enrollment Successful', 
                CONCAT('You have been enrolled in a new course'), 
                'course', p_course_id);
    END IF;
END //

-- Procedure: Record quiz attempt and award points
CREATE PROCEDURE sp_submit_quiz_attempt(
    IN p_user_id INT,
    IN p_quiz_id INT,
    IN p_enrollment_id INT,
    IN p_answers JSON,
    IN p_time_taken INT,
    OUT p_attempt_id INT,
    OUT p_score DECIMAL(5,2),
    OUT p_points_earned INT,
    OUT p_passed BOOLEAN
)
BEGIN
    DECLARE v_attempt_number INT;
    DECLARE v_passing_score DECIMAL(5,2);
    DECLARE v_correct_count INT DEFAULT 0;
    DECLARE v_total_questions INT;
    
    -- Get attempt number
    SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt_number
    FROM quiz_attempts 
    WHERE user_id = p_user_id AND quiz_id = p_quiz_id;
    
    -- Get quiz settings
    SELECT passing_score, total_questions 
    INTO v_passing_score, v_total_questions
    FROM quizzes WHERE id = p_quiz_id;
    
    -- Calculate score (simplified - actual implementation would parse JSON answers)
    -- This would need to be expanded based on actual answer validation logic
    SET p_score = 0; -- Placeholder - would calculate from answers
    SET v_correct_count = 0; -- Placeholder
    
    -- Check if passed
    SET p_passed = (p_score >= v_passing_score);
    
    -- Get points from rewards table
    SELECT COALESCE(points, 0) INTO p_points_earned
    FROM quiz_rewards
    WHERE quiz_id = p_quiz_id AND attempt_number = v_attempt_number;
    
    -- If no specific reward for this attempt, check if there's a fallback
    IF p_points_earned IS NULL OR p_points_earned = 0 THEN
        SELECT COALESCE(points, 0) INTO p_points_earned
        FROM quiz_rewards
        WHERE quiz_id = p_quiz_id
        ORDER BY attempt_number DESC
        LIMIT 1;
    END IF;
    
    -- Only award points if passed
    IF NOT p_passed THEN
        SET p_points_earned = 0;
    END IF;
    
    -- Insert attempt record
    INSERT INTO quiz_attempts (
        user_id, quiz_id, enrollment_id, attempt_number,
        score, points_earned, correct_answers, total_questions,
        status, passed, answers, time_taken, completed_at
    ) VALUES (
        p_user_id, p_quiz_id, p_enrollment_id, v_attempt_number,
        p_score, p_points_earned, v_correct_count, v_total_questions,
        'completed', p_passed, p_answers, p_time_taken, NOW()
    );
    
    SET p_attempt_id = LAST_INSERT_ID();
    
    -- Update user points if awarded
    IF p_points_earned > 0 THEN
        UPDATE users 
        SET total_points = COALESCE(total_points, 0) + p_points_earned
        WHERE id = p_user_id AND role = 'learner';
    END IF;
END //

-- Procedure: Mark lesson as completed
CREATE PROCEDURE sp_complete_lesson(
    IN p_user_id INT,
    IN p_lesson_id INT,
    IN p_enrollment_id INT,
    IN p_time_spent INT
)
BEGIN
    DECLARE v_course_id INT;
    DECLARE v_total_lessons INT;
    DECLARE v_completed_lessons INT;
    
    -- Update or insert lesson progress
    INSERT INTO lesson_progress (user_id, lesson_id, enrollment_id, status, time_spent, completed_at)
    VALUES (p_user_id, p_lesson_id, p_enrollment_id, 'completed', p_time_spent, NOW())
    ON DUPLICATE KEY UPDATE
        status = 'completed',
        time_spent = time_spent + p_time_spent,
        completed_at = COALESCE(completed_at, NOW());
    
    -- Get course info
    SELECT course_id INTO v_course_id FROM lessons WHERE id = p_lesson_id;
    
    -- Count completed lessons
    SELECT COUNT(*) INTO v_completed_lessons
    FROM lesson_progress lp
    JOIN lessons l ON lp.lesson_id = l.id
    WHERE lp.enrollment_id = p_enrollment_id 
    AND lp.status = 'completed'
    AND l.is_mandatory = TRUE;
    
    -- Get total mandatory lessons
    SELECT COUNT(*) INTO v_total_lessons
    FROM lessons 
    WHERE course_id = v_course_id 
    AND is_mandatory = TRUE 
    AND is_published = TRUE;
    
    -- Update enrollment progress
    UPDATE enrollments
    SET 
        lessons_completed = v_completed_lessons,
        progress_percentage = (v_completed_lessons / v_total_lessons * 100),
        total_time_spent = total_time_spent + p_time_spent,
        last_accessed_at = NOW(),
        status = CASE 
            WHEN v_completed_lessons >= v_total_lessons THEN 'completed'
            ELSE 'in_progress'
        END,
        completed_at = CASE 
            WHEN v_completed_lessons >= v_total_lessons THEN NOW()
            ELSE completed_at
        END
    WHERE id = p_enrollment_id;
END //

DELIMITER ;

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
-- Total Tables: 17
-- 1. categories - Course categories
-- 2. courses - Main course data
-- 3. tags - Course tags
-- 4. course_tags - Course-tag relationships
-- 5. lessons - Course lessons
-- 6. lesson_attachments - Lesson files
-- 7. quizzes - Quiz configuration
-- 8. quiz_rewards - Points per attempt
-- 9. questions - Quiz questions
-- 10. enrollments - Course enrollments
-- 11. lesson_progress - Lesson completion tracking
-- 12. quiz_attempts - Quiz attempt records
-- 13. reviews - Course reviews/ratings
-- 14. badges - Achievement badges
-- 15. user_badges - Awarded badges
-- 16. course_invitations - Invitation-only access
-- 17. notifications - User notifications
-- 18. activity_log - Analytics

SELECT 'LearnSphere Database Schema v2.0 created successfully!' AS Status;
