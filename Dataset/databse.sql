-- Create the main database for the Q&A platform
CREATE DATABASE QNA;

-- Select the newly created database for use
USE QNA;

-- Create the users table to store all registered user details
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    age VARCHAR(10) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    school VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(100) NOT NULL,
    verification_expiry TIMESTAMP NOT NULL,
    reset_token VARCHAR(100) NOT NULL,
    reset_token_expiry TIMESTAMP NOT NULL
);

-- Create the question table to store user-submitted questions and their responses
CREATE TABLE IF NOT EXISTS question (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL,
    question VARCHAR(2500) NOT NULL,
    answers VARCHAR(2500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create the mentors table to store mentor profiles
CREATE TABLE IF NOT EXISTS mentors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  experience VARCHAR(100) NOT NULL,
  bio TEXT NOT NULL,
  image VARCHAR(255) NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  availability TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the mentor_bookings table to handle mentor session appointments
CREATE TABLE IF NOT EXISTS mentor_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  mentor_id INT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time VARCHAR(20) NOT NULL,
  notes TEXT NOT NULL,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mentor_id) REFERENCES mentors(id) ON DELETE CASCADE
);

-- Create the quiz_results table to store the outcome of user career quizzes
CREATE TABLE quiz_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  answers JSON NOT NULL,
  recommendation TEXT NOT NULL,
  potential_careers TEXT NOT NULL,
  strengths TEXT NOT NULL,
  next_steps TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Promote a specific user to admin (replace <admin_email> with the actual email)
-- This gives any user admin rights and access to the admin dashboard
UPDATE users SET is_admin = true WHERE email = '<admin_email>';

-- Insert mentor: Dr. Anita Sharma, if not already present in the table
-- Note: Mentors can also be added dynamically through the Admin Dashboard
INSERT INTO mentors (name, specialty, experience, bio, image, rate, availability)
SELECT 'Dr. Anita Sharma', 'Career Counseling', '15+ years', 
       'Dr. Sharma is a certified career counselor with expertise in helping students identify their strengths and choose the right career path.', 
       '/Photos/mentors/anita.jpg', 1500.00, 'Monday to Friday, 9 AM - 5 PM'
WHERE NOT EXISTS (SELECT 1 FROM mentors WHERE name = 'Dr. Anita Sharma');

-- Insert mentor: Rajesh Kumar, if not already present in the table
-- Note: Mentors can also be added dynamically through the Admin Dashboard
INSERT INTO mentors (name, specialty, experience, bio, image, rate, availability)
SELECT 'Rajesh Kumar', 'Technology Careers', '10+ years', 
       'Rajesh is a tech industry veteran who has worked with major tech companies and now helps students navigate the technology career landscape.', 
       '/Photos/mentors/rajesh.jpg', 1200.00, 'Tuesday to Saturday, 10 AM - 6 PM'
WHERE NOT EXISTS (SELECT 1 FROM mentors WHERE name = 'Rajesh Kumar');

-- Insert mentor: Priya Mehta, if not already present in the table
-- Note: Mentors can also be added dynamically through the Admin Dashboard
INSERT INTO mentors (name, specialty, experience, bio, image, rate, availability)
SELECT 'Priya Mehta', 'Business & Entrepreneurship', '8+ years', 
       'Priya has founded two successful startups and specializes in guiding students interested in business, finance, and entrepreneurship.', 
       '/Photos/mentors/priya.jpg', 1300.00, 'Monday, Wednesday, Friday, 11 AM - 7 PM'
WHERE NOT EXISTS (SELECT 1 FROM mentors WHERE name = 'Priya Mehta');
