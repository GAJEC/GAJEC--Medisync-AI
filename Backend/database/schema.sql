-- MediSync database schema (MariaDB 10.4+ / MySQL 8).
-- Idempotent: safe to run again on an existing database.
--   npm run db:migrate
-- Promote a staff account manually:
--   UPDATE users SET role = 'staff' WHERE email = 'someone@hospital.com';

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  firstname VARCHAR(100) NOT NULL,
  lastname VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role ENUM('patient', 'staff') NOT NULL DEFAULT 'patient',
  password VARCHAR(255) NOT NULL,
  password_changed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('patient', 'staff') NOT NULL DEFAULT 'patient' AFTER email;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP NULL DEFAULT NULL AFTER password;

-- One row per signed-in device. The JWT carries the session id (sid); revoking a row signs that device out.
CREATE TABLE IF NOT EXISTS user_sessions (
  id CHAR(32) NOT NULL,
  user_id INT NOT NULL,
  user_agent VARCHAR(255) NULL,
  ip VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_user_sessions_user (user_id, revoked_at, expires_at),
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS patient_profiles (
  user_id INT NOT NULL,
  date_of_birth DATE NULL,
  sex ENUM('Female', 'Male', 'Prefer not to say') NULL,
  mobile VARCHAR(30) NULL,
  address VARCHAR(255) NULL,
  allergies TEXT NULL,
  medications TEXT NULL,
  medical_history TEXT NULL,
  emergency_name VARCHAR(150) NULL,
  emergency_phone VARCHAR(30) NULL,
  consult_type ENUM('In-person', 'Online') NOT NULL DEFAULT 'In-person',
  language ENUM('English', 'Filipino') NOT NULL DEFAULT 'English',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_patient_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- routing is required for the service to work, so it is always 1.
CREATE TABLE IF NOT EXISTS patient_consents (
  user_id INT NOT NULL,
  routing TINYINT(1) NOT NULL DEFAULT 1,
  staff_review TINYINT(1) NOT NULL DEFAULT 1,
  history_personalization TINYINT(1) NOT NULL DEFAULT 0,
  reminders TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_patient_consents_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS doctors (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS appointments (
  id INT NOT NULL AUTO_INCREMENT,
  reference VARCHAR(20) NOT NULL,
  patient_id INT NOT NULL,
  doctor_id INT NULL,
  reason VARCHAR(255) NOT NULL,
  visit_type ENUM('consult', 'follow-up', 'checkup') NOT NULL DEFAULT 'consult',
  mode ENUM('In-person', 'Online') NOT NULL DEFAULT 'In-person',
  scheduled_at DATETIME NOT NULL,
  status ENUM('Scheduled', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
  cancelled_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_appointments_reference (reference),
  KEY idx_appointments_patient (patient_id, scheduled_at),
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Bodies must never contain sensitive health details (they show up in previews).
CREATE TABLE IF NOT EXISTS notifications (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  category ENUM('appointments', 'hospital') NOT NULL,
  type ENUM('reminder', 'profile', 'hospital') NOT NULL,
  title VARCHAR(150) NOT NULL,
  body VARCHAR(500) NOT NULL,
  read_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user (user_id, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS conversations (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversations_user (user_id, updated_at),
  CONSTRAINT fk_conversations_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS conversation_messages (
  id INT NOT NULL AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  sender ENUM('patient', 'assistant') NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversation_messages_conversation (conversation_id, id),
  CONSTRAINT fk_conversation_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS data_requests (
  id INT NOT NULL AUTO_INCREMENT,
  reference VARCHAR(20) NOT NULL,
  user_id INT NOT NULL,
  type ENUM('access', 'delete') NOT NULL,
  note TEXT NULL,
  status ENUM('Pending', 'In review', 'Completed', 'Rejected') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_data_requests_reference (reference),
  KEY idx_data_requests_user (user_id),
  CONSTRAINT fk_data_requests_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
