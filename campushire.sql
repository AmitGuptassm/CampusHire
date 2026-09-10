CREATE DATABASE campushire;

USE campushire;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'recruiter') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
show tables
describe users
USE campushire;

CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    college VARCHAR(150),
    course VARCHAR(100),
    graduation_year INT,
    cgpa DECIMAL(3,2),
    skills VARCHAR(500),

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
USE campushire;

ALTER TABLE students
ADD COLUMN resume VARCHAR(255);
USE campushire;
select * from users;

USE campushire;

CREATE TABLE companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    location VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,

    company_id INT NOT NULL,

    title VARCHAR(150) NOT NULL,

    description TEXT,

    location VARCHAR(150),

    job_type VARCHAR(50),

    experience VARCHAR(100),

    salary VARCHAR(100),

    eligibility VARCHAR(255),

    skills VARCHAR(500),

    application_deadline DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE
);

INSERT INTO companies
(name, description, website, location)
VALUES

(
    'TCS',
    'Tata Consultancy Services is a global IT services, consulting and business solutions organization.',
    'https://www.tcs.com',
    'Mumbai'
),

(
    'Wipro',
    'Wipro is a global information technology, consulting and business process services company.',
    'https://www.wipro.com',
    'Bengaluru'
),

(
    'Infosys',
    'Infosys is a global leader in next-generation digital services and consulting.',
    'https://www.infosys.com',
    'Bengaluru'
),

(
    'Accenture',
    'Accenture is a global professional services company providing technology and consulting services.',
    'https://www.accenture.com',
    'Bengaluru'
),

(
    'Deloitte',
    'Deloitte provides consulting, financial advisory, risk advisory, tax and related professional services.',
    'https://www.deloitte.com',
    'Gurugram'
);

INSERT INTO jobs
(
    company_id,
    title,
    description,
    location,
    job_type,
    experience,
    salary,
    eligibility,
    skills,
    application_deadline
)
VALUES

(
    1,
    'Software Engineer',
    'Work on software development and technology solutions for enterprise clients.',
    'Bengaluru',
    'Full Time',
    'Fresher',
    '₹4 - ₹7 LPA',
    'MCA / B.Tech / B.E.',
    'Java, SQL, HTML, CSS, JavaScript',
    '2026-09-30'
),

(
    2,
    'Graduate Software Trainee',
    'Join a technology team and work on software development and digital solutions.',
    'Hyderabad',
    'Full Time',
    'Fresher',
    '₹4 - ₹6 LPA',
    'MCA / B.Tech / B.E.',
    'Java, Python, SQL',
    '2026-09-25'
),

(
    3,
    'Systems Engineer',
    'Work on application development, maintenance and technology solutions.',
    'Pune',
    'Full Time',
    'Fresher',
    '₹4 - ₹6 LPA',
    'MCA / B.Tech / B.E.',
    'Java, Python, SQL',
    '2026-10-05'
),

(
    4,
    'Associate Software Engineer',
    'Work with technology teams to develop and implement software solutions.',
    'Bengaluru',
    'Full Time',
    'Fresher',
    '₹5 - ₹8 LPA',
    'MCA / B.Tech / B.E.',
    'Java, Python, SQL, JavaScript',
    '2026-10-10'
),

(
    5,
    'Technology Analyst',
    'Work on technology consulting and software development projects.',
    'Gurugram',
    'Full Time',
    'Fresher',
    '₹5 - ₹8 LPA',
    'MCA / B.Tech / B.E.',
    'Java, SQL, Python',
    '2026-10-15'
);
SELECT
    jobs.id,
    companies.name AS company,
    jobs.title,
    jobs.location,
    jobs.job_type,
    jobs.salary
FROM jobs
JOIN companies
ON jobs.company_id = companies.id;

SELECT * FROM jobs;
SELECT * FROM companies;
CREATE TABLE applications (

    id INT AUTO_INCREMENT PRIMARY KEY,

    student_id INT NOT NULL,

    job_id INT NOT NULL,

    status VARCHAR(50) DEFAULT 'Pending',

    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(student_id, job_id),

    FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,

    FOREIGN KEY (job_id)
        REFERENCES jobs(id)
        ON DELETE CASCADE

);
USE campushire;
DESCRIBE student_profiles;
SELECT * FROM student_profiles;
SELECT * FROM companies;
describe JOBS;
select * from jobs;
USE campushire;

ALTER TABLE jobs
ADD COLUMN deadline DATE;
SELECT * FROM applications;
SELECT * FROM users
WHERE role = 'recruiter';

USE campushire;

CREATE TABLE recruiter_profiles (

    id INT AUTO_INCREMENT PRIMARY KEY,

    recruiter_id INT NOT NULL UNIQUE,

    company_name VARCHAR(255),

    company_website VARCHAR(500),

    company_location VARCHAR(255),

    company_description TEXT,

    FOREIGN KEY (recruiter_id)
        REFERENCES users(id)
        ON DELETE CASCADE

);

DESCRIBE jobs;