-- Update admin and instructor accounts to have NULL points
-- Only learners should track points

USE learnsphere;

-- Set total_points to NULL for admin and instructor roles
UPDATE users 
SET total_points = NULL 
WHERE role IN ('admin', 'instructor');

-- Verify the update
SELECT id, name, email, role, total_points 
FROM users 
ORDER BY role, id;
