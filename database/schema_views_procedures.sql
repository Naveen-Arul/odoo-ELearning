-- LearnSphere - Views and Stored Procedures
-- Run this after tables are created

USE learnsphere;

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- View: Course Overview with Statistics
DROP VIEW IF EXISTS v_course_overview;
CREATE VIEW v_course_overview AS
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
DROP VIEW IF EXISTS v_learner_progress;
CREATE VIEW v_learner_progress AS
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
DROP VIEW IF EXISTS v_quiz_performance;
CREATE VIEW v_quiz_performance AS
SELECT 
    q.id AS quiz_id,
    q.title AS quiz_title,
    c.title AS course_title,
    COUNT(qa.id) AS total_attempts,
    AVG(qa.score) AS avg_score,
    SUM(CASE WHEN qa.passed = TRUE THEN 1 ELSE 0 END) AS pass_count,
    (SUM(CASE WHEN qa.passed = TRUE THEN 1 ELSE 0 END) / NULLIF(COUNT(qa.id), 0) * 100) AS pass_rate
FROM quizzes q
JOIN courses c ON q.course_id = c.id
LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.status = 'completed'
GROUP BY q.id, q.title, c.title;

-- ============================================
-- STORED PROCEDURES
-- ============================================

DROP PROCEDURE IF EXISTS sp_enroll_user;
DROP PROCEDURE IF EXISTS sp_submit_quiz_attempt;
DROP PROCEDURE IF EXISTS sp_complete_lesson;

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
        progress_percentage = (v_completed_lessons / NULLIF(v_total_lessons, 0) * 100),
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

SELECT 'Views and Stored Procedures created successfully!' AS Status;
