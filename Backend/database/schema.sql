-- Medisync database schema (MySQL 8.0 / MariaDB 10.4+, InnoDB, utf8mb4).
-- Raw images/audio are never stored here; only metadata and opaque storage keys.
--
-- Import (XAMPP MariaDB on port 3306):
--   d:\xampp\mysql\bin\mysql.exe -u root -p -h 127.0.0.1 -P 3306 < Backend\database\schema.sql
-- or open this file in phpMyAdmin > Import.
--
-- The backend connects with DB_USER / DB_PASSWORD from Backend/.env. Create that user yourself, e.g.:
--   CREATE USER 'medisync_app'@'localhost' IDENTIFIED BY '<password from Backend/.env>';
--   GRANT SELECT, INSERT, UPDATE, DELETE ON medisync.* TO 'medisync_app'@'localhost';

CREATE DATABASE IF NOT EXISTS medisync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medisync;

CREATE TABLE IF NOT EXISTS sessions (
  id              CHAR(36)     NOT NULL,
  token_hash      CHAR(64)     NOT NULL COMMENT 'SHA-256 of the bearer token; the token itself is never stored',
  mode            ENUM('demo') NOT NULL DEFAULT 'demo',
  status          ENUM('active','closed') NOT NULL DEFAULT 'active',
  reply_language  ENUM('auto','en','fil') NOT NULL DEFAULT 'auto',
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_active_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at      DATETIME(3)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token_hash (token_hash),
  KEY ix_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS uploaded_files (
  id                 CHAR(36)     NOT NULL,
  session_id         CHAR(36)     NOT NULL,
  kind               ENUM('image','audio') NOT NULL,
  mime_type          VARCHAR(100) NOT NULL,
  size_bytes         INT UNSIGNED NOT NULL,
  sha256             CHAR(64)     NOT NULL,
  storage_key        VARCHAR(100) NULL COMMENT 'Random file name inside UPLOAD_DIR; NULL when the file was not retained',
  duration_ms        INT UNSIGNED NULL,
  detected_language  VARCHAR(8)   NULL,
  created_at         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_files_session (session_id, created_at),
  CONSTRAINT fk_files_session FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id  CHAR(36)     NOT NULL,
  role        ENUM('user','assistant') NOT NULL,
  input_mode  ENUM('text','voice','image') NULL COMMENT 'For user messages: how the content was provided',
  content     TEXT         NOT NULL,
  file_id     CHAR(36)     NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_messages_session (session_id, id),
  CONSTRAINT fk_messages_session FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_file FOREIGN KEY (file_id) REFERENCES uploaded_files (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assessments (
  id                CHAR(36)     NOT NULL,
  session_id        CHAR(36)     NOT NULL,
  user_message_id   BIGINT UNSIGNED NULL,
  reply_message_id  BIGINT UNSIGNED NULL,
  file_id           CHAR(36)     NULL,
  kind              ENUM('chat','image') NOT NULL,
  final_urgency     ENUM('emergency','urgent','soon','routine','self_care','undetermined') NOT NULL,
  model_urgency     ENUM('emergency','urgent','soon','routine','self_care','undetermined') NOT NULL,
  safety_override   TINYINT(1)   NOT NULL DEFAULT 0,
  output_valid      TINYINT(1)   NOT NULL,
  needs_more_info   TINYINT(1)   NULL,
  symptom_duration  VARCHAR(120) NULL,
  image_quality     ENUM('adequate','limited','unusable') NULL,
  uncertainty_note  VARCHAR(600) NULL,
  limitations       VARCHAR(600) NULL,
  model_name        VARCHAR(64)  NOT NULL,
  input_tokens      INT UNSIGNED NULL,
  output_tokens     INT UNSIGNED NULL,
  inference_ms      INT UNSIGNED NULL,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_assessments_session (session_id, created_at),
  CONSTRAINT fk_assessments_session FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_assessments_user_msg FOREIGN KEY (user_message_id) REFERENCES messages (id) ON DELETE SET NULL,
  CONSTRAINT fk_assessments_reply_msg FOREIGN KEY (reply_message_id) REFERENCES messages (id) ON DELETE SET NULL,
  CONSTRAINT fk_assessments_file FOREIGN KEY (file_id) REFERENCES uploaded_files (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assessment_findings (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  assessment_id  CHAR(36)      NOT NULL,
  category       ENUM('reported_symptom','relevant_history','visual_observation','possible_explanation',
                      'red_flag','specialty','care_advice','follow_up_question') NOT NULL,
  source         ENUM('patient','model','safety_rule') NOT NULL,
  content        VARCHAR(600)  NOT NULL,
  detail         VARCHAR(600)  NULL COMMENT 'e.g. rationale for a possible explanation',
  likelihood     ENUM('more_likely','possible','less_likely') NULL,
  rule_id        VARCHAR(64)   NULL,
  position       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_findings_assessment (assessment_id, category, position),
  CONSTRAINT fk_findings_assessment FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Privacy-conscious audit trail: event metadata only, never message content or files.
CREATE TABLE IF NOT EXISTS audit_events (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id   CHAR(36)     NULL,
  event_type   VARCHAR(64)  NOT NULL,
  outcome      ENUM('success','failure') NOT NULL,
  request_id   VARCHAR(64)  NULL,
  detail       JSON         NULL,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_audit_session (session_id, created_at),
  KEY ix_audit_type (event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
