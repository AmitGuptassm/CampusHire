require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();

// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(express.json());

// =========================
// SERVE FRONTEND
// =========================

app.use(express.static(path.join(__dirname, "../frontend")));

// =========================
// MYSQL CONNECTION
// =========================

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect((err) => {
  if (err) {
    console.log("MySQL connection failed!");
    console.log(err);
    return;
  }

  console.log("MySQL connected successfully!");
});

// =========================
// TEST ROUTE
// =========================

app.get("/", (req, res) => {
  res.send("CampusHire Backend is Running!");
});

// =========================
// REGISTER API
// =========================

app.post("/api/register", async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      role,
    } = req.body;

    if (!fullName || !email || !phone || !password || !role) {
      return res.status(400).json({
        message: "Please fill all fields.",
      });
    }

    if (role !== "student" && role !== "recruiter") {
      return res.status(400).json({
        message: "Invalid user role.",
      });
    }

    const checkQuery = `
      SELECT id
      FROM users
      WHERE email = ?
    `;

    db.query(
      checkQuery,
      [email],
      async (err, results) => {
        if (err) {
          console.log(err);

          return res.status(500).json({
            message: "Database error.",
          });
        }

        if (results.length > 0) {
          return res.status(409).json({
            message: "Email is already registered.",
          });
        }

        const hashedPassword =
          await bcrypt.hash(password, 10);

        const insertQuery = `
          INSERT INTO users
          (
            full_name,
            email,
            phone,
            password,
            role
          )
          VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
          insertQuery,
          [
            fullName,
            email,
            phone,
            hashedPassword,
            role,
          ],
          (err, result) => {
            if (err) {
              console.log(err);

              return res.status(500).json({
                message: "Registration failed.",
              });
            }

            res.status(201).json({
              message:
                "Account created successfully!",
              userId: result.insertId,
            });
          }
        );
      }
    );
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Something went wrong.",
    });
  }
});

// =========================
// LOGIN API
// =========================

app.post("/api/login", (req, res) => {
  const {
    email,
    password,
    role,
  } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({
      message: "Please fill all fields.",
    });
  }

  const query = `
    SELECT *
    FROM users
    WHERE email = ?
    AND role = ?
  `;

  db.query(
    query,
    [email, role],
    async (err, results) => {
      if (err) {
        console.log(err);

        return res.status(500).json({
          message: "Database error.",
        });
      }

      if (results.length === 0) {
        return res.status(401).json({
          message:
            "Invalid email, password or account type.",
        });
      }

      const user = results[0];

      const passwordMatch =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!passwordMatch) {
        return res.status(401).json({
          message:
            "Invalid email, password or account type.",
        });
      }

      delete user.password;

      res.status(200).json({
        message: "Login successful!",
        user: user,
      });
    }
  );
});

// =========================================
// GET STUDENT PROFILE
// =========================================

app.get(
  "/api/student/profile/:userId",
  (req, res) => {
    const userId = req.params.userId;

    const query = `
      SELECT
        u.id,
        u.full_name AS name,
        u.email,
        u.phone,
        sp.college,
        sp.course,
        sp.skills,
        sp.resume
      FROM users u
      LEFT JOIN student_profiles sp
        ON u.id = sp.student_id
      WHERE u.id = ?
      AND u.role = 'student'
    `;

    db.query(
      query,
      [userId],
      (err, results) => {
        if (err) {
          console.log(
            "Profile loading error:",
            err
          );

          return res.status(500).json({
            message: "Database error.",
          });
        }

        if (results.length === 0) {
          return res.status(404).json({
            message: "Student not found.",
          });
        }

        res.status(200).json({
          profile: results[0],
        });
      }
    );
  }
);

// =========================================
// UPDATE STUDENT PROFILE
// =========================================

app.put(
  "/api/student/profile/:userId",
  (req, res) => {
    const userId = req.params.userId;

    const {
      phone,
      college,
      course,
      skills,
      resume,
    } = req.body;

    const updateUserQuery = `
      UPDATE users
      SET phone = ?
      WHERE id = ?
      AND role = 'student'
    `;

    db.query(
      updateUserQuery,
      [phone, userId],
      (userErr) => {
        if (userErr) {
          console.log(
            "User update error:",
            userErr
          );

          return res.status(500).json({
            message:
              "Unable to update user.",
          });
        }

        const checkProfileQuery = `
          SELECT id
          FROM student_profiles
          WHERE student_id = ?
        `;

        db.query(
          checkProfileQuery,
          [userId],
          (checkErr, profileResults) => {
            if (checkErr) {
              console.log(
                "Profile check error:",
                checkErr
              );

              return res.status(500).json({
                message:
                  "Unable to check profile.",
              });
            }

            if (profileResults.length > 0) {
              const updateProfileQuery = `
                UPDATE student_profiles
                SET
                  college = ?,
                  course = ?,
                  skills = ?,
                  resume = ?
                WHERE student_id = ?
              `;

              db.query(
                updateProfileQuery,
                [
                  college,
                  course,
                  skills,
                  resume,
                  userId,
                ],
                (profileErr) => {
                  if (profileErr) {
                    console.log(
                      "Profile update error:",
                      profileErr
                    );

                    return res.status(500).json({
                      message:
                        "Unable to update profile.",
                    });
                  }

                  return res.status(200).json({
                    message:
                      "Profile updated successfully.",
                  });
                }
              );
            } else {
              const insertProfileQuery = `
                INSERT INTO student_profiles
                (
                  student_id,
                  college,
                  course,
                  skills,
                  resume
                )
                VALUES (?, ?, ?, ?, ?)
              `;

              db.query(
                insertProfileQuery,
                [
                  userId,
                  college,
                  course,
                  skills,
                  resume,
                ],
                (insertErr) => {
                  if (insertErr) {
                    console.log(
                      "Profile insert error:",
                      insertErr
                    );

                    return res.status(500).json({
                      message:
                        "Unable to create profile.",
                    });
                  }

                  return res.status(200).json({
                    message:
                      "Profile saved successfully.",
                  });
                }
              );
            }
          }
        );
      }
    );
  }
);

// =========================
// GET ALL JOBS
// =========================

app.get("/api/jobs", (req, res) => {
  const query = `
    SELECT
      jobs.id,
      jobs.title,
      jobs.description,
      jobs.location,
      jobs.job_type,
      jobs.experience,
      jobs.salary,
      jobs.eligibility,
      jobs.skills,
      jobs.application_deadline,

      companies.id AS company_id,
      companies.name AS company_name,
      companies.website AS company_website

    FROM jobs

    INNER JOIN companies
      ON jobs.company_id = companies.id

    ORDER BY jobs.created_at DESC
  `;

  db.query(
    query,
    (err, results) => {
      if (err) {
        console.log(
          "Jobs error:",
          err
        );

        return res.status(500).json({
          message:
            "Unable to fetch jobs.",
        });
      }

      res.status(200).json({
        jobs: results,
      });
    }
  );
});

// =========================
// UPDATE JOB
// =========================

app.put("/api/jobs/:id", (req, res) => {
  const jobId = req.params.id;

  const {
    title,
    description,
    location,
    jobType,
    experience,
    salary,
    eligibility,
    skills,
    deadline,
  } = req.body;

  const query = `
    UPDATE jobs
    SET
      title = ?,
      description = ?,
      location = ?,
      job_type = ?,
      experience = ?,
      salary = ?,
      eligibility = ?,
      skills = ?,
      application_deadline = ?
    WHERE id = ?
  `;

  db.query(
    query,
    [
      title,
      description,
      location,
      jobType,
      experience,
      salary,
      eligibility,
      skills,
      deadline || null,
      jobId,
    ],
    (err, result) => {
      if (err) {
        console.log(
          "Job update error:",
          err
        );

        return res.status(500).json({
          message:
            "Unable to update job.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Job not found.",
        });
      }

      return res.status(200).json({
        message:
          "Job updated successfully!",
      });
    }
  );
});

// =========================
// GET SINGLE JOB
// =========================

app.get("/api/jobs/:id", (req, res) => {
  const jobId = req.params.id;

  const query = `
    SELECT
      jobs.id,
      jobs.title,
      jobs.description,
      jobs.location,
      jobs.job_type,
      jobs.experience,
      jobs.salary,
      jobs.eligibility,
      jobs.skills,
      jobs.application_deadline,

      recruiter_profiles.company_name,
      recruiter_profiles.company_website,
      recruiter_profiles.company_location,
      recruiter_profiles.company_description,

      users.full_name AS recruiter_name,
      users.email AS recruiter_email

    FROM jobs

    INNER JOIN users
      ON jobs.recruiter_id = users.id

    LEFT JOIN recruiter_profiles
      ON jobs.recruiter_id =
         recruiter_profiles.recruiter_id

    WHERE jobs.id = ?
  `;

  db.query(
    query,
    [jobId],
    (err, results) => {
      if (err) {
        console.log(
          "Job details error:",
          err
        );

        return res.status(500).json({
          message:
            "Unable to fetch job details.",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          message: "Job not found.",
        });
      }

      res.status(200).json({
        job: results[0],
      });
    }
  );
});

// =========================
// APPLY FOR JOB
// =========================

app.post(
  "/api/applications",
  (req, res) => {
    const {
      studentId,
      jobId,
    } = req.body;

    if (!studentId || !jobId) {
      return res.status(400).json({
        message:
          "Student ID and Job ID are required.",
      });
    }

    const checkQuery = `
      SELECT id
      FROM applications
      WHERE student_id = ?
      AND job_id = ?
    `;

    db.query(
      checkQuery,
      [studentId, jobId],
      (err, results) => {
        if (err) {
          console.log(
            "Application check error:",
            err
          );

          return res.status(500).json({
            message: "Database error.",
          });
        }

        if (results.length > 0) {
          return res.status(409).json({
            message:
              "You have already applied for this job.",
          });
        }

        const insertQuery = `
          INSERT INTO applications
          (
            student_id,
            job_id,
            status
          )
          VALUES (?, ?, 'Pending')
        `;

        db.query(
          insertQuery,
          [studentId, jobId],
          (err, result) => {
            if (err) {
              console.log(
                "Application insert error:",
                err
              );

              return res.status(500).json({
                message:
                  "Unable to submit application.",
              });
            }

            res.status(201).json({
              message:
                "Application submitted successfully!",
              applicationId:
                result.insertId,
            });
          }
        );
      }
    );
  }
);

// =========================
// GET STUDENT APPLICATIONS
// =========================

app.get(
  "/api/applications/student/:studentId",
  (req, res) => {
    const studentId =
      req.params.studentId;

    const query = `
      SELECT
        applications.id AS application_id,
        applications.status,
        applications.applied_at,

        jobs.id AS job_id,
        jobs.title,
        jobs.location,
        jobs.job_type,
        jobs.salary,

        COALESCE(
          recruiter_profiles.company_name,
          companies.name
        ) AS company_name

      FROM applications

      INNER JOIN jobs
        ON applications.job_id = jobs.id

      LEFT JOIN recruiter_profiles
        ON jobs.recruiter_id =
           recruiter_profiles.recruiter_id

      LEFT JOIN companies
        ON jobs.company_id =
           companies.id

      WHERE applications.student_id = ?

      ORDER BY applications.applied_at DESC
    `;

    db.query(
      query,
      [studentId],
      (err, results) => {
        if (err) {
          console.log(
            "Applications error:",
            err
          );

          return res.status(500).json({
            message:
              "Unable to fetch applications.",
          });
        }

        res.status(200).json({
          applications: results,
        });
      }
    );
  }
);

// =========================
// POST A NEW JOB
// =========================

app.post("/api/jobs", (req, res) => {
  const {
    title,
    description,
    location,
    jobType,
    experience,
    salary,
    deadline,
    skills,
    eligibility,
    recruiterId,
  } = req.body;

  if (
    !title ||
    !description ||
    !location ||
    !jobType ||
    !experience ||
    !salary ||
    !deadline ||
    !skills ||
    !eligibility ||
    !recruiterId
  ) {
    return res.status(400).json({
      message:
        "Please fill all job details.",
    });
  }

  const companyQuery = `
    SELECT
      users.id AS recruiter_id,
      recruiter_profiles.id AS profile_id

    FROM users

    INNER JOIN recruiter_profiles
      ON users.id =
         recruiter_profiles.recruiter_id

    WHERE users.id = ?
    AND users.role = 'recruiter'
  `;

  db.query(
    companyQuery,
    [recruiterId],
    (err, results) => {
      if (err) {
        console.log(
          "Recruiter check error:",
          err
        );

        return res.status(500).json({
          message: "Database error.",
        });
      }

      if (results.length === 0) {
        return res.status(400).json({
          message:
            "Please complete your Company Profile before posting a job.",
        });
      }

      const companyId = 1;

      const insertJobQuery = `
        INSERT INTO jobs
        (
          company_id,
          title,
          description,
          location,
          job_type,
          experience,
          salary,
          application_deadline,
          skills,
          eligibility,
          recruiter_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertJobQuery,
        [
          companyId,
          title,
          description,
          location,
          jobType,
          experience,
          salary,
          deadline,
          skills,
          eligibility,
          recruiterId,
        ],
        (err, result) => {
          if (err) {
            console.log(
              "Job posting error:",
              err
            );

            return res.status(500).json({
              message:
                "Unable to post job.",
            });
          }

          res.status(201).json({
            message:
              "Job posted successfully!",
            jobId: result.insertId,
          });
        }
      );
    }
  );
});

// =========================
// GET RECRUITER JOBS
// =========================

app.get(
  "/api/recruiter/jobs/:recruiterId",
  (req, res) => {
    const recruiterId =
      req.params.recruiterId;

    const query = `
      SELECT
        id,
        title,
        description,
        location,
        job_type,
        experience,
        salary,
        eligibility,
        skills,
        application_deadline AS deadline,
        created_at

      FROM jobs

      WHERE recruiter_id = ?

      ORDER BY created_at DESC
    `;

    db.query(
      query,
      [recruiterId],
      (err, results) => {
        if (err) {
          console.log(
            "Recruiter jobs error:",
            err
          );

          return res.status(500).json({
            message:
              "Unable to fetch jobs.",
          });
        }

        return res.status(200).json({
          jobs: results,
        });
      }
    );
  }
);

// =========================
// GET APPLICANTS FOR A JOB
// =========================

app.get(
  "/api/jobs/:jobId/applicants",
  (req, res) => {
    const jobId =
      req.params.jobId;

    const query = `
      SELECT
        applications.id AS application_id,
        applications.status,
        applications.applied_at,

        users.id AS student_id,
        users.full_name,
        users.email,
        users.phone,

        student_profiles.college,
        student_profiles.course,
        student_profiles.skills,
        student_profiles.resume

      FROM applications

      JOIN users
        ON applications.student_id =
           users.id

      LEFT JOIN student_profiles
        ON users.id =
           student_profiles.student_id

      WHERE applications.job_id = ?

      ORDER BY applications.applied_at DESC
    `;

    db.query(
      query,
      [jobId],
      (err, results) => {
        if (err) {
          console.log(
            "Applicants error:",
            err
          );

          return res.status(500).json({
            message:
              "Unable to fetch applicants.",
          });
        }

        res.status(200).json({
          applicants: results,
        });
      }
    );
  }
);

// =========================
// UPDATE APPLICATION STATUS
// =========================

app.put(
  "/api/applications/:applicationId/status",
  (req, res) => {
    const applicationId =
      req.params.applicationId;

    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Applied",
      "Shortlisted",
      "Selected",
      "Rejected",
    ];

    if (
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        message:
          "Invalid application status.",
      });
    }

    const query = `
      UPDATE applications
      SET status = ?
      WHERE id = ?
    `;

    db.query(
      query,
      [status, applicationId],
      (err, result) => {
        if (err) {
          console.log(
            "Status update error:",
            err
          );

          return res.status(500).json({
            message:
              "Unable to update application status.",
          });
        }

        if (
          result.affectedRows === 0
        ) {
          return res.status(404).json({
            message:
              "Application not found.",
          });
        }

        res.status(200).json({
          message:
            "Application status updated successfully.",
        });
      }
    );
  }
);

// =========================
// SAVE / UPDATE RECRUITER PROFILE
// =========================

app.post(
  "/api/recruiter/profile",
  (req, res) => {
    const {
      recruiterId,
      companyName,
      companyWebsite,
      companyLocation,
      companyDescription,
    } = req.body;

    if (!recruiterId) {
      return res.status(400).json({
        message:
          "Recruiter ID is required.",
      });
    }

    const query = `
      INSERT INTO recruiter_profiles
      (
        recruiter_id,
        company_name,
        company_website,
        company_location,
        company_description
      )
      VALUES (?, ?, ?, ?, ?)

      ON DUPLICATE KEY UPDATE
        company_name =
          VALUES(company_name),
        company_website =
          VALUES(company_website),
        company_location =
          VALUES(company_location),
        company_description =
          VALUES(company_description)
    `;

    db.query(
      query,
      [
        recruiterId,
        companyName || null,
        companyWebsite || null,
        companyLocation || null,
        companyDescription || null,
      ],
      (err) => {
        if (err) {
          console.log(
            "Recruiter profile save error:",
            err
          );

          return res.status(500).json({
            message:
              "Unable to save recruiter profile.",
          });
        }

        res.status(200).json({
          message:
            "Recruiter profile saved successfully!",
        });
      }
    );
  }
);

// =========================
// GET RECRUITER PROFILE
// =========================

app.get(
  "/api/recruiter/profile/:recruiterId",
  (req, res) => {
    const recruiterId =
      req.params.recruiterId;

    const query = `
      SELECT
        recruiter_id,
        company_name,
        company_website,
        company_location,
        company_description

      FROM recruiter_profiles

      WHERE recruiter_id = ?
    `;

    db.query(
      query,
      [recruiterId],
      (err, results) => {
        if (err) {
          console.log(
            "Recruiter profile fetch error:",
            err
          );

          return res.status(500).json({
            message:
              "Unable to fetch recruiter profile.",
          });
        }

        if (results.length === 0) {
          return res.status(200).json({
            profile: null,
          });
        }

        res.status(200).json({
          profile: results[0],
        });
      }
    );
  }
);

// =========================
// GET RECRUITER APPLICANTS
// =========================

app.get(
  "/api/recruiter/applicants/:recruiterId",
  (req, res) => {
    const recruiterId =
      req.params.recruiterId;

    const query = `
      SELECT
        applications.id AS application_id,
        applications.status,
        applications.applied_at,

        users.id AS student_user_id,
        users.full_name,
        users.email,
        users.phone,

        students.college,
        students.course,
        students.graduation_year,
        students.cgpa,
        students.skills,
        students.resume,

        jobs.id AS job_id,
        jobs.title AS job_title,
        jobs.location AS job_location

      FROM applications

      INNER JOIN jobs
        ON applications.job_id =
           jobs.id

      INNER JOIN students
        ON applications.student_id =
           students.id

      INNER JOIN users
        ON students.user_id =
           users.id

      WHERE jobs.recruiter_id = ?

      ORDER BY applications.applied_at DESC
    `;

    db.query(
      query,
      [recruiterId],
      (err, results) => {
        if (err) {
          console.log(
            "Recruiter applicants error:",
            err
          );

          return res.status(500).json({
            message:
              "Unable to fetch applicants.",
          });
        }

        res.status(200).json({
          applicants: results,
        });
      }
    );
  }
);

// =========================
// GET APPLICATION DETAILS
// =========================

app.get(
  "/api/applications/:applicationId",
  (req, res) => {
    const applicationId =
      req.params.applicationId;

    const query = `
      SELECT
        applications.id AS application_id,
        applications.status,
        applications.applied_at,

        users.id AS student_user_id,
        users.full_name,
        users.email,
        users.phone,

        students.college,
        students.course,
        students.graduation_year,
        students.cgpa,
        students.skills,
        students.resume,

        jobs.id AS job_id,
        jobs.title AS job_title,
        jobs.location AS job_location

      FROM applications

      INNER JOIN jobs
        ON applications.job_id =
           jobs.id

      INNER JOIN students
        ON applications.student_id =
           students.id

      INNER JOIN users
        ON students.user_id =
           users.id

      WHERE applications.id = ?
    `;

    db.query(
      query,
      [applicationId],
      (err, results) => {
        if (err) {
          console.log(
            "Applicant profile error:",
            err
          );

          return res.status(500).json({
            message:
              "Unable to fetch applicant profile.",
          });
        }

        if (results.length === 0) {
          return res.status(404).json({
            message:
              "Applicant not found.",
          });
        }

        res.status(200).json({
          applicant: results[0],
        });
      }
    );
  }
);

// =========================
// DELETE JOB
// =========================

app.delete(
  "/api/jobs/:id",
  (req, res) => {
    const jobId =
      req.params.id;

    const query = `
      DELETE FROM jobs
      WHERE id = ?
    `;

    db.query(
      query,
      [jobId],
      (err, result) => {
        if (err) {
          console.log(
            "Job delete error:",
            err
          );

          return res.status(500).json({
            message:
              "Unable to delete job.",
          });
        }

        if (
          result.affectedRows === 0
        ) {
          return res.status(404).json({
            message:
              "Job not found.",
          });
        }

        return res.status(200).json({
          message:
            "Job deleted successfully!",
        });
      }
    );
  }
);

// =========================
// RECRUITER DASHBOARD
// =========================

app.get(
  "/api/recruiter/dashboard/:recruiterId",
  (req, res) => {
    const recruiterId =
      req.params.recruiterId;

    const query = `
      SELECT

        (
          SELECT COUNT(*)
          FROM jobs
          WHERE recruiter_id = ?
        ) AS totalJobs,

        (
          SELECT COUNT(*)
          FROM applications
          INNER JOIN jobs
            ON applications.job_id =
               jobs.id
          WHERE jobs.recruiter_id = ?
        ) AS totalApplicants,

        (
          SELECT COUNT(*)
          FROM applications
          INNER JOIN jobs
            ON applications.job_id =
               jobs.id
          WHERE jobs.recruiter_id = ?
          AND applications.status =
              'Pending'
        ) AS pendingApplicants,

        (
          SELECT COUNT(*)
          FROM applications
          INNER JOIN jobs
            ON applications.job_id =
               jobs.id
          WHERE jobs.recruiter_id = ?
          AND applications.status =
              'Selected'
        ) AS selectedApplicants,

        (
          SELECT COUNT(*)
          FROM applications
          INNER JOIN jobs
            ON applications.job_id =
               jobs.id
          WHERE jobs.recruiter_id = ?
          AND applications.status =
              'Shortlisted'
        ) AS shortlistedApplicants
    `;

    db.query(
      query,
      [
        recruiterId,
        recruiterId,
        recruiterId,
        recruiterId,
        recruiterId,
      ],
      (err, results) => {
        if (err) {
          console.log(
            "Recruiter dashboard error:",
            err
          );

          return res.status(500).json({
            message:
              "Unable to load dashboard.",
          });
        }

        return res.status(200).json({
          stats: results[0],
        });
      }
    );
  }
);

// =========================
// STUDENT DASHBOARD
// =========================

app.get(
  "/api/student/dashboard/:userId",
  (req, res) => {
    const userId =
      req.params.userId;

    const query = `
      SELECT

        (
          SELECT COUNT(*)
          FROM applications

          INNER JOIN students
            ON applications.student_id =
               students.id

          WHERE students.user_id = ?
        ) AS totalApplications,

        (
          SELECT COUNT(*)
          FROM applications

          INNER JOIN students
            ON applications.student_id =
               students.id

          WHERE students.user_id = ?
          AND applications.status =
              'Pending'
        ) AS pendingApplications,

        (
          SELECT COUNT(*)
          FROM applications

          INNER JOIN students
            ON applications.student_id =
               students.id

          WHERE students.user_id = ?
          AND applications.status =
              'Shortlisted'
        ) AS shortlistedApplications,

        (
          SELECT COUNT(*)
          FROM applications

          INNER JOIN students
            ON applications.student_id =
               students.id

          WHERE students.user_id = ?
          AND applications.status =
              'Selected'
        ) AS selectedApplications
    `;

    db.query(
      query,
      [
        userId,
        userId,
        userId,
        userId,
      ],
      (err, results) => {
        if (err) {
          console.log(
            "Student dashboard error:",
            err
          );

          return res.status(500).json({
            message:
              "Unable to load student dashboard.",
          });
        }

        return res.status(200).json({
          stats: results[0],
        });
      }
    );
  }
);

// =========================================
// SAVE JOB
// =========================================

app.post(
  "/api/saved-jobs",
  (req, res) => {
    const {
      student_id,
      job_id,
    } = req.body;

    if (!student_id || !job_id) {
      return res.status(400).json({
        message:
          "Student ID and Job ID are required.",
      });
    }

    const sql = `
      INSERT INTO saved_jobs
      (
        student_id,
        job_id
      )
      VALUES (?, ?)
    `;

    db.query(
      sql,
      [
        student_id,
        job_id,
      ],
      (error) => {
        if (error) {
          if (
            error.code ===
            "ER_DUP_ENTRY"
          ) {
            return res.status(409).json({
              message:
                "Job already saved.",
            });
          }

          console.error(
            "Save job error:",
            error
          );

          return res.status(500).json({
            message:
              "Unable to save job.",
          });
        }

        return res.status(201).json({
          message:
            "Job saved successfully.",
        });
      }
    );
  }
);

// =========================================
// GET SAVED JOBS
// =========================================

app.get(
  "/api/saved-jobs/:studentId",
  (req, res) => {
    const studentId =
      req.params.studentId;

    console.log(
      "GET SAVED JOBS REQUEST:",
      studentId
    );

    const sql = `
      SELECT

        saved_jobs.id
          AS saved_job_id,

        saved_jobs.student_id,

        saved_jobs.job_id,

        saved_jobs.saved_at,

        jobs.id
          AS job_id,

        jobs.title,

        jobs.description,

        jobs.location,

        jobs.job_type,

        jobs.experience,

        jobs.salary,

        jobs.eligibility,

        jobs.skills,

        jobs.application_deadline
          AS deadline,

        jobs.recruiter_id,

        jobs.created_at

      FROM saved_jobs

      INNER JOIN jobs
        ON saved_jobs.job_id =
           jobs.id

      WHERE saved_jobs.student_id = ?

      ORDER BY saved_jobs.saved_at DESC
    `;

    db.query(
      sql,
      [studentId],
      (error, results) => {
        if (error) {
          console.error(
            "Get saved jobs FULL error:",
            error
          );

          return res.status(500).json({
            message:
              "Unable to fetch saved jobs.",

            sqlError:
              error.sqlMessage ||
              error.message,

            code:
              error.code,

            errno:
              error.errno,
          });
        }

        console.log(
          "Saved jobs found:",
          results.length
        );

        return res.status(200).json({
          savedJobs: results,
        });
      }
    );
  }
);

// =========================================
// REMOVE SAVED JOB
// =========================================

app.delete(
  "/api/saved-jobs/:studentId/:jobId",
  (req, res) => {
    const studentId =
      req.params.studentId;

    const jobId =
      req.params.jobId;

    const sql = `
      DELETE FROM saved_jobs
      WHERE student_id = ?
      AND job_id = ?
    `;

    db.query(
      sql,
      [
        studentId,
        jobId,
      ],
      (error, result) => {
        if (error) {
          console.error(
            "Remove saved job error:",
            error
          );

          return res.status(500).json({
            message:
              "Unable to remove saved job.",
          });
        }

        if (
          result.affectedRows === 0
        ) {
          return res.status(404).json({
            message:
              "Saved job not found.",
          });
        }

        return res.status(200).json({
          message:
            "Job removed from saved jobs.",
        });
      }
    );
  }
);

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
