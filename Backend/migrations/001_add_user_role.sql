-- Adds a role to every user. Existing and newly registered users default to 'patient'.
-- Promote a staff account manually:
--   UPDATE users SET role = 'staff' WHERE email = 'someone@hospital.com';
ALTER TABLE users
  ADD COLUMN role ENUM('patient', 'staff') NOT NULL DEFAULT 'patient' AFTER email;
