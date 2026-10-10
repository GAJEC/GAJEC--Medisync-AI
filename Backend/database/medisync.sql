-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 10, 2026 at 03:08 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `medisync`
--

-- --------------------------------------------------------

--
-- Table structure for table `ai_intakes`
--

CREATE TABLE `ai_intakes` (
  `id` int(11) NOT NULL,
  `reference` varchar(20) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `conversation_id` int(11) DEFAULT NULL,
  `concern` varchar(255) NOT NULL,
  `urgency` enum('emergency','urgent','soon','routine','self_care','undetermined') NOT NULL DEFAULT 'undetermined',
  `red_flags` text DEFAULT NULL,
  `suggested_specialty` varchar(100) DEFAULT NULL,
  `doctor_id` int(11) DEFAULT NULL,
  `review_status` enum('Pending','Reviewed','Clinical review') NOT NULL DEFAULT 'Pending',
  `status` enum('Active','Reviewed','Escalated','Closed') NOT NULL DEFAULT 'Active',
  `notes` text DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `id` int(11) NOT NULL,
  `reference` varchar(20) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `doctor_id` int(11) DEFAULT NULL,
  `reason` varchar(255) NOT NULL,
  `visit_type` enum('consult','follow-up','checkup') NOT NULL DEFAULT 'consult',
  `mode` enum('In-person','Online') NOT NULL DEFAULT 'In-person',
  `scheduled_at` datetime NOT NULL,
  `status` enum('Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
  `cancelled_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `source` enum('Patient Portal','Front Desk') NOT NULL DEFAULT 'Patient Portal'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `conversations`
--

CREATE TABLE `conversations` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(120) NOT NULL,
  `pinned_at` datetime DEFAULT NULL,
  `archived_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `conversation_messages`
--

CREATE TABLE `conversation_messages` (
  `id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `sender` enum('patient','assistant') NOT NULL,
  `body` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `data_requests`
--

CREATE TABLE `data_requests` (
  `id` int(11) NOT NULL,
  `reference` varchar(20) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('access','delete') NOT NULL,
  `note` text DEFAULT NULL,
  `status` enum('Pending','In review','Completed','Rejected') NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `specialty` varchar(100) NOT NULL,
  `head_doctor_id` int(11) DEFAULT NULL,
  `opens_at` time NOT NULL DEFAULT '08:00:00',
  `closes_at` time NOT NULL DEFAULT '17:00:00',
  `daily_capacity` int(11) NOT NULL DEFAULT 40,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`, `specialty`, `head_doctor_id`, `opens_at`, `closes_at`, `daily_capacity`, `status`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'Adult Medicine', 'Internal Medicine', 1, '07:00:00', '19:00:00', 90, 'Active', '2nd Floor, Main Building. Provides diagnosis and long-term management of adult illnesses.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(2, 'Primary Care', 'Family Medicine', 5, '07:00:00', '20:00:00', 110, 'Active', 'Ground Floor, Outpatient Wing. Provides first-contact, whole-family care for patients of every age.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(3, 'Child Health', 'Pediatrics', 9, '07:00:00', '19:00:00', 80, 'Active', '3rd Floor, Main Building. Provides health care for newborns, children and adolescents.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(4, 'Neurosciences', 'Neurology', 13, '08:00:00', '18:00:00', 45, 'Active', '5th Floor, Medical Arts Building. Provides disorders of the brain, spinal cord, nerves and muscles.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(5, 'Heart Institute', 'Cardiology', 17, '07:00:00', '19:00:00', 70, 'Active', '4th Floor, Main Building. Provides diseases of the heart and blood vessels.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(6, 'Emergency Department', 'Emergency Medicine', 21, '00:00:00', '23:59:00', 150, 'Active', 'Ground Floor, Emergency Wing (24 hours). Provides immediate assessment and stabilisation of urgent and life-threatening conditions.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(7, 'Skin and Aesthetic Center', 'Dermatology', 25, '09:00:00', '18:00:00', 50, 'Active', '2nd Floor, Medical Arts Building. Provides conditions of the skin, hair and nails.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(8, 'Women\'s Health', 'Obstetrics and Gynecology', 29, '07:00:00', '20:00:00', 80, 'Active', '3rd Floor, Maternal Care Wing. Provides pregnancy, childbirth and women\'s reproductive health.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(9, 'Bone and Joint Center', 'Orthopedics', 33, '08:00:00', '18:00:00', 60, 'Active', '1st Floor, Medical Arts Building. Provides injuries and diseases of the bones, joints, ligaments and muscles.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(10, 'Eye Center', 'Ophthalmology', 37, '08:00:00', '17:00:00', 55, 'Active', '2nd Floor, Outpatient Wing. Provides diseases and surgery of the eye and vision.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(11, 'Ear, Nose and Throat Center', 'Otolaryngology (ENT)', 41, '08:00:00', '18:00:00', 50, 'Active', '2nd Floor, Outpatient Wing. Provides conditions of the ear, nose, throat, head and neck.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(12, 'Behavioral Health', 'Psychiatry', 45, '08:00:00', '19:00:00', 40, 'Active', '6th Floor, Medical Arts Building. Provides mental health and emotional well-being.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(13, 'Surgical Services', 'General Surgery', 49, '07:00:00', '18:00:00', 50, 'Active', '4th Floor, Surgical Wing. Provides surgical treatment of abdominal, soft-tissue and other common conditions.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(14, 'Anesthesia and Perioperative Care', 'Anesthesiology', 53, '06:00:00', '20:00:00', 40, 'Active', '4th Floor, Surgical Wing. Provides safe anaesthesia, sedation and pain control around surgery.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(15, 'Diagnostic Imaging', 'Radiology', 56, '06:00:00', '22:00:00', 120, 'Active', 'Basement, Main Building. Provides medical imaging and image-guided procedures.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(16, 'Laboratory Medicine', 'Pathology', 59, '06:00:00', '22:00:00', 200, 'Active', 'Basement, Main Building. Provides laboratory diagnosis of disease from blood, tissue and other samples.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(17, 'Lung and Respiratory Center', 'Pulmonology', 62, '08:00:00', '18:00:00', 50, 'Active', '5th Floor, Main Building. Provides diseases of the lungs and breathing.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(18, 'Digestive Health Center', 'Gastroenterology', 66, '07:00:00', '18:00:00', 50, 'Active', '3rd Floor, Medical Arts Building. Provides disorders of the digestive tract, liver and pancreas.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(19, 'Kidney Care and Dialysis Center', 'Nephrology', 70, '06:00:00', '20:00:00', 45, 'Active', '5th Floor, Medical Arts Building. Provides kidney disease, dialysis and fluid and electrolyte problems.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(20, 'Diabetes and Endocrine Center', 'Endocrinology', 73, '08:00:00', '18:00:00', 50, 'Active', '3rd Floor, Medical Arts Building. Provides diabetes, thyroid and other hormone disorders.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(21, 'Cancer Institute', 'Oncology', 76, '08:00:00', '18:00:00', 40, 'Active', '7th Floor, Medical Arts Building. Provides diagnosis, treatment and supportive care for cancer.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(22, 'Infection Control and Travel Medicine', 'Infectious Disease', 80, '08:00:00', '17:00:00', 35, 'Active', '5th Floor, Main Building. Provides complicated infections, antimicrobial therapy and infection prevention.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(23, 'Arthritis and Rheumatology Clinic', 'Rheumatology', 83, '08:00:00', '17:00:00', 35, 'Active', '1st Floor, Medical Arts Building. Provides arthritis and autoimmune diseases of the joints, muscles and connective tissue.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(24, 'Urology and Men’s Health', 'Urology', 86, '08:00:00', '18:00:00', 45, 'Active', '2nd Floor, Surgical Wing. Provides conditions of the urinary tract and men\'s reproductive health.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(25, 'Rehabilitation Medicine', 'Physical Medicine and Rehabilitation', 89, '07:00:00', '19:00:00', 60, 'Active', 'Ground Floor, Rehabilitation Wing. Provides restoring movement, function and independence after illness or injury.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(26, 'Healthy Aging Center', 'Geriatrics', 92, '08:00:00', '17:00:00', 35, 'Active', '1st Floor, Outpatient Wing. Provides comprehensive care for older adults.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(27, 'Blood Disorders Center', 'Hematology', 95, '08:00:00', '17:00:00', 30, 'Active', '7th Floor, Medical Arts Building. Provides diseases of the blood, bone marrow and clotting system.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(28, 'Plastic and Reconstructive Surgery', 'Plastic Surgery', 98, '08:00:00', '17:00:00', 30, 'Active', '2nd Floor, Surgical Wing. Provides reconstructive and aesthetic surgery.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(29, 'Chest Surgery Unit', 'Thoracic Surgery', 101, '07:00:00', '17:00:00', 20, 'Active', '4th Floor, Surgical Wing. Provides surgery of the lungs, chest wall and oesophagus.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(30, 'Vascular and Endovascular Center', 'Vascular Surgery', 103, '08:00:00', '17:00:00', 25, 'Active', '4th Floor, Surgical Wing. Provides diseases of the arteries and veins.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(31, 'Brain and Spine Surgery', 'Neurosurgery', 106, '07:00:00', '17:00:00', 20, 'Active', '5th Floor, Surgical Wing. Provides surgery of the brain, spine and peripheral nerves.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(32, 'Pain Management Clinic', 'Pain Medicine', 109, '08:00:00', '17:00:00', 25, 'Active', '1st Floor, Rehabilitation Wing. Provides assessment and treatment of acute and chronic pain.', '2026-10-09 22:27:14', '2026-10-09 22:27:14'),
(33, 'Executive Check-up and Wellness', 'Preventive Medicine', 111, '06:00:00', '15:00:00', 60, 'Active', 'Ground Floor, Outpatient Wing. Provides health screening, risk reduction and wellness programmes.', '2026-10-09 22:27:14', '2026-10-09 22:27:14');

-- --------------------------------------------------------

--
-- Table structure for table `doctors`
--

CREATE TABLE `doctors` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `specialty` varchar(100) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `department_id` int(11) DEFAULT NULL,
  `license` varchar(60) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `intro` text DEFAULT NULL,
  `work_start` time NOT NULL DEFAULT '08:00:00',
  `work_end` time NOT NULL DEFAULT '17:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `doctors`
--

INSERT INTO `doctors` (`id`, `name`, `specialty`, `active`, `created_at`, `department_id`, `license`, `email`, `intro`, `work_start`, `work_end`) VALUES
(1, 'Dr. Maria Santos', 'Internal Medicine', 1, '2026-10-09 22:27:14', 1, 'PRC-MD-100011', 'maria.santos@medisync-hospital.example', 'With 18 years in Internal Medicine, Dr. Maria Santos focuses on diagnosis and long-term management of adult illnesses. Special interests include hypertension, type 2 diabetes and preventive health checks. She coordinates care for adults with several chronic conditions at once.', '08:00:00', '17:00:00'),
(2, 'Dr. Ramon Villanueva', 'Internal Medicine', 1, '2026-10-09 22:27:14', 1, 'PRC-MD-100048', 'ramon.villanueva@medisync-hospital.example', 'Dr. Ramon Villanueva has practised Internal Medicine for 12 years, specialising in diagnosis and long-term management of adult illnesses. Special interests include unexplained fever, fatigue and weight loss work-ups and hospital medicine. He is often the first doctor to evaluate adults whose symptoms do not yet point to a single cause.', '07:00:00', '15:00:00'),
(3, 'Dr. Liza Aquino', 'Internal Medicine', 1, '2026-10-09 22:27:14', 1, 'PRC-MD-100085', 'liza.aquino@medisync-hospital.example', 'A board-certified Internal Medicine physician, Dr. Liza Aquino brings 9 years of experience in diagnosis and long-term management of adult illnesses. Special interests include thyroid and metabolic problems, high cholesterol and medication reviews for older adults. She simplifies complex medication lists and explains each change clearly.', '10:00:00', '19:00:00'),
(4, 'Dr. Paolo Ignacio', 'Internal Medicine', 1, '2026-10-09 22:27:14', 1, 'PRC-MD-100122', 'paolo.ignacio@medisync-hospital.example', 'Dr. Paolo Ignacio is a Internal Medicine specialist with 6 years of experience in diagnosis and long-term management of adult illnesses. Special interests include dengue and other acute infections, pre-operative medical clearance and adult vaccination. He works closely with the surgical teams on clearance before operations.', '13:00:00', '19:00:00'),
(5, 'Dr. Daniel Reyes', 'Family Medicine', 1, '2026-10-09 22:27:14', 2, 'PRC-MD-101011', 'daniel.reyes@medisync-hospital.example', 'With 15 years in Family Medicine, Dr. Daniel Reyes focuses on first-contact, whole-family care for patients of every age. Special interests include common colds, cough and flu, family health planning and annual physical exams. He follows entire households over the years and knows when to refer to a specialist.', '08:00:00', '17:00:00'),
(6, 'Dr. Andrea Mercado', 'Family Medicine', 1, '2026-10-09 22:27:14', 2, 'PRC-MD-101048', 'andrea.mercado@medisync-hospital.example', 'Dr. Andrea Mercado has practised Family Medicine for 10 years, specialising in first-contact, whole-family care for patients of every age. Special interests include women\'s and men\'s wellness visits, school and work medical certificates and lifestyle counselling. She focuses on prevention and practical, everyday health goals.', '07:00:00', '16:00:00'),
(7, 'Dr. Joel Pascual', 'Family Medicine', 1, '2026-10-09 22:27:14', 2, 'PRC-MD-101085', 'joel.pascual@medisync-hospital.example', 'A board-certified Family Medicine physician, Dr. Joel Pascual brings 7 years of experience in first-contact, whole-family care for patients of every age. Special interests include minor injuries and wound care, skin rashes and urinary tract infections. He handles walk-in concerns that need prompt but non-emergency attention.', '12:00:00', '20:00:00'),
(8, 'Dr. Camille Dizon', 'Family Medicine', 1, '2026-10-09 22:27:14', 2, 'PRC-MD-101122', 'camille.dizon@medisync-hospital.example', 'Dr. Camille Dizon is a Family Medicine specialist with 4 years of experience in first-contact, whole-family care for patients of every age. Special interests include smoking cessation, weight management and mental well-being check-ins. She helps patients build sustainable habits with regular follow-up.', '09:00:00', '18:00:00'),
(9, 'Dr. Angela Cruz', 'Pediatrics', 1, '2026-10-09 22:27:14', 3, 'PRC-MD-102011', 'angela.cruz@medisync-hospital.example', 'With 16 years in Pediatrics, Dr. Angela Cruz focuses on health care for newborns, children and adolescents. Special interests include newborn and well-baby visits, childhood immunizations and growth and development monitoring. Parents value her calm explanations and practical feeding advice.', '08:00:00', '17:00:00'),
(10, 'Dr. Miguel Fernandez', 'Pediatrics', 1, '2026-10-09 22:27:14', 3, 'PRC-MD-102048', 'miguel.fernandez@medisync-hospital.example', 'Dr. Miguel Fernandez has practised Pediatrics for 11 years, specialising in health care for newborns, children and adolescents. Special interests include childhood asthma and allergies, recurrent fever and ear and throat infections. He makes examinations gentle and child-friendly.', '09:00:00', '18:00:00'),
(11, 'Dr. Bea Lopez', 'Pediatrics', 1, '2026-10-09 22:27:14', 3, 'PRC-MD-102085', 'bea.lopez@medisync-hospital.example', 'A board-certified Pediatrics physician, Dr. Bea Lopez brings 8 years of experience in health care for newborns, children and adolescents. Special interests include adolescent health, school-age behavioural concerns and nutrition and picky eating. She gives teenagers private time to discuss their own health questions.', '10:00:00', '19:00:00'),
(12, 'Dr. Carlo Mendoza', 'Pediatrics', 1, '2026-10-09 22:27:14', 3, 'PRC-MD-102122', 'carlo.mendoza@medisync-hospital.example', 'Dr. Carlo Mendoza is a Pediatrics specialist with 5 years of experience in health care for newborns, children and adolescents. Special interests include diarrhoea and dehydration, skin conditions in children and catch-up vaccination. He works with parents on clear home-care plans and warning signs.', '07:00:00', '15:00:00'),
(13, 'Dr. Gabriel Mendoza', 'Neurology', 1, '2026-10-09 22:27:14', 4, 'PRC-MD-103011', 'gabriel.mendoza@medisync-hospital.example', 'With 20 years in Neurology, Dr. Gabriel Mendoza focuses on disorders of the brain, spinal cord, nerves and muscles. Special interests include stroke prevention and recovery, transient ischaemic attacks and carotid disease follow-up. He leads the hospital stroke pathway and secondary-prevention clinic.', '08:00:00', '17:00:00'),
(14, 'Dr. Isabel Torres', 'Neurology', 1, '2026-10-09 22:27:14', 4, 'PRC-MD-103048', 'isabel.torres@medisync-hospital.example', 'Dr. Isabel Torres has practised Neurology for 13 years, specialising in disorders of the brain, spinal cord, nerves and muscles. Special interests include migraine and chronic headache, dizziness and vertigo and facial nerve palsy. She builds personalised headache plans that reduce reliance on pain relievers.', '09:00:00', '18:00:00'),
(15, 'Dr. Victor Navarro', 'Neurology', 1, '2026-10-09 22:27:14', 4, 'PRC-MD-103085', 'victor.navarro@medisync-hospital.example', 'A board-certified Neurology physician, Dr. Victor Navarro brings 10 years of experience in disorders of the brain, spinal cord, nerves and muscles. Special interests include epilepsy and seizures, EEG interpretation and fainting episodes. He explains seizure safety and driving guidance to patients and families.', '08:00:00', '16:00:00'),
(16, 'Dr. Rhea Gonzales', 'Neurology', 1, '2026-10-09 22:27:14', 4, 'PRC-MD-103122', 'rhea.gonzales@medisync-hospital.example', 'Dr. Rhea Gonzales is a Neurology specialist with 6 years of experience in disorders of the brain, spinal cord, nerves and muscles. Special interests include numbness, tingling and neuropathy, Parkinson\'s disease and tremor and memory concerns. She performs nerve conduction studies and coordinates rehabilitation referrals.', '10:00:00', '18:00:00'),
(17, 'Dr. Antonio Del Rosario', 'Cardiology', 1, '2026-10-09 22:27:14', 5, 'PRC-MD-104011', 'antonio.delrosario@medisync-hospital.example', 'With 22 years in Cardiology, Dr. Antonio Del Rosario focuses on diseases of the heart and blood vessels. Special interests include coronary artery disease, chest pain evaluation and stress testing. He oversees non-invasive cardiac testing for the hospital.', '07:00:00', '15:00:00'),
(18, 'Dr. Patricia Lim', 'Cardiology', 1, '2026-10-09 22:27:14', 5, 'PRC-MD-104048', 'patricia.lim@medisync-hospital.example', 'Dr. Patricia Lim has practised Cardiology for 14 years, specialising in diseases of the heart and blood vessels. Special interests include heart failure, echocardiography and valvular heart disease. She runs the heart failure clinic and monitors patients closely after admission.', '08:00:00', '17:00:00'),
(19, 'Dr. Enrique Bautista', 'Cardiology', 1, '2026-10-09 22:27:14', 5, 'PRC-MD-104085', 'enrique.bautista@medisync-hospital.example', 'A board-certified Cardiology physician, Dr. Enrique Bautista brings 11 years of experience in diseases of the heart and blood vessels. Special interests include palpitations and arrhythmias, atrial fibrillation and Holter monitoring. He interprets rhythm studies and manages blood-thinning therapy.', '10:00:00', '19:00:00'),
(20, 'Dr. Sofia Ramos', 'Cardiology', 1, '2026-10-09 22:27:14', 5, 'PRC-MD-104122', 'sofia.ramos@medisync-hospital.example', 'Dr. Sofia Ramos is a Cardiology specialist with 7 years of experience in diseases of the heart and blood vessels. Special interests include difficult-to-control hypertension, cardiac risk assessment and preventive cardiology. She focuses on lowering cardiovascular risk before heart disease develops.', '09:00:00', '18:00:00'),
(21, 'Dr. Roberto Castillo', 'Emergency Medicine', 1, '2026-10-09 22:27:14', 6, 'PRC-MD-105011', 'roberto.castillo@medisync-hospital.example', 'With 17 years in Emergency Medicine, Dr. Roberto Castillo focuses on immediate assessment and stabilisation of urgent and life-threatening conditions. Special interests include trauma resuscitation, chest pain and stroke alerts and emergency airway management. He leads the emergency team during critical cases and mass-casualty drills.', '07:00:00', '19:00:00'),
(22, 'Dr. Kristine Salazar', 'Emergency Medicine', 1, '2026-10-09 22:27:14', 6, 'PRC-MD-105048', 'kristine.salazar@medisync-hospital.example', 'Dr. Kristine Salazar has practised Emergency Medicine for 12 years, specialising in immediate assessment and stabilisation of urgent and life-threatening conditions. Special interests include severe infections and sepsis, acute breathing difficulty and poisoning. She coordinates rapid admission to intensive care when needed.', '19:00:00', '23:59:00'),
(23, 'Dr. Mark Javier', 'Emergency Medicine', 1, '2026-10-09 22:27:14', 6, 'PRC-MD-105085', 'mark.javier@medisync-hospital.example', 'A board-certified Emergency Medicine physician, Dr. Mark Javier brings 8 years of experience in immediate assessment and stabilisation of urgent and life-threatening conditions. Special interests include fractures and dislocations, burns and lacerations and acute abdominal pain. He manages injuries from road, work and sports accidents.', '07:00:00', '19:00:00'),
(24, 'Dr. Ella Morales', 'Emergency Medicine', 1, '2026-10-09 22:27:14', 6, 'PRC-MD-105122', 'ella.morales@medisync-hospital.example', 'Dr. Ella Morales is a Emergency Medicine specialist with 5 years of experience in immediate assessment and stabilisation of urgent and life-threatening conditions. Special interests include paediatric emergencies, allergic reactions and heat-related illness. She is trained in paediatric advanced life support.', '13:00:00', '23:59:00'),
(25, 'Dr. Nicole Tan', 'Dermatology', 1, '2026-10-09 22:27:14', 7, 'PRC-MD-106011', 'nicole.tan@medisync-hospital.example', 'With 12 years in Dermatology, Dr. Nicole Tan focuses on conditions of the skin, hair and nails. Special interests include acne and acne scarring, rosacea and pigmentation disorders. She tailors skin-care routines to each patient’s skin type and budget.', '09:00:00', '18:00:00'),
(26, 'Dr. Jose Manalo', 'Dermatology', 1, '2026-10-09 22:27:14', 7, 'PRC-MD-106048', 'jose.manalo@medisync-hospital.example', 'Dr. Jose Manalo has practised Dermatology for 15 years, specialising in conditions of the skin, hair and nails. Special interests include eczema and atopic dermatitis, psoriasis and chronic itching. He manages long-term inflammatory skin disease, including in children.', '08:00:00', '16:00:00'),
(27, 'Dr. Trisha Uy', 'Dermatology', 1, '2026-10-09 22:27:14', 7, 'PRC-MD-106085', 'trisha.uy@medisync-hospital.example', 'A board-certified Dermatology physician, Dr. Trisha Uy brings 8 years of experience in conditions of the skin, hair and nails. Special interests include fungal and bacterial skin infections, warts and skin growths and mole checks. She performs minor skin procedures and biopsies in the clinic.', '10:00:00', '18:00:00'),
(28, 'Dr. Rafael Ocampo', 'Dermatology', 1, '2026-10-09 22:27:14', 7, 'PRC-MD-106122', 'rafael.ocampo@medisync-hospital.example', 'Dr. Rafael Ocampo is a Dermatology specialist with 6 years of experience in conditions of the skin, hair and nails. Special interests include hair loss, nail disorders and skin allergies and hives. He investigates the underlying causes of hair and nail changes.', '13:00:00', '18:00:00'),
(29, 'Dr. Teresa Garcia', 'Obstetrics and Gynecology', 1, '2026-10-09 22:27:14', 8, 'PRC-MD-107011', 'teresa.garcia@medisync-hospital.example', 'With 19 years in Obstetrics and Gynecology, Dr. Teresa Garcia focuses on pregnancy, childbirth and women\'s reproductive health. Special interests include prenatal care, high-risk pregnancy and normal and caesarean delivery. She has guided thousands of mothers from early pregnancy to delivery.', '07:00:00', '16:00:00'),
(30, 'Dr. Monica Flores', 'Obstetrics and Gynecology', 1, '2026-10-09 22:27:14', 8, 'PRC-MD-107048', 'monica.flores@medisync-hospital.example', 'Dr. Monica Flores has practised Obstetrics and Gynecology for 13 years, specialising in pregnancy, childbirth and women\'s reproductive health. Special interests include menstrual problems, polycystic ovary syndrome and menopause care. She takes time to explain hormonal changes and treatment choices.', '09:00:00', '18:00:00'),
(31, 'Dr. Lorenzo Sison', 'Obstetrics and Gynecology', 1, '2026-10-09 22:27:14', 8, 'PRC-MD-107085', 'lorenzo.sison@medisync-hospital.example', 'A board-certified Obstetrics and Gynecology physician, Dr. Lorenzo Sison brings 10 years of experience in pregnancy, childbirth and women\'s reproductive health. Special interests include pelvic ultrasound, ovarian cysts and fibroids and minimally invasive gynecologic surgery. He performs laparoscopic procedures with shorter recovery times.', '08:00:00', '17:00:00'),
(32, 'Dr. Grace Hernandez', 'Obstetrics and Gynecology', 1, '2026-10-09 22:27:14', 8, 'PRC-MD-107122', 'grace.hernandez@medisync-hospital.example', 'Dr. Grace Hernandez is a Obstetrics and Gynecology specialist with 6 years of experience in pregnancy, childbirth and women\'s reproductive health. Special interests include family planning and contraception, pap smear and cervical screening and infertility evaluation. She provides confidential, judgement-free reproductive health counselling.', '11:00:00', '20:00:00'),
(33, 'Dr. Fernando Aguilar', 'Orthopedics', 1, '2026-10-09 22:27:14', 9, 'PRC-MD-108011', 'fernando.aguilar@medisync-hospital.example', 'With 21 years in Orthopedics, Dr. Fernando Aguilar focuses on injuries and diseases of the bones, joints, ligaments and muscles. Special interests include hip and knee replacement, osteoarthritis and joint deformities. He has performed joint replacements for more than two decades.', '08:00:00', '16:00:00'),
(34, 'Dr. Adrian Valdez', 'Orthopedics', 1, '2026-10-09 22:27:14', 9, 'PRC-MD-108048', 'adrian.valdez@medisync-hospital.example', 'Dr. Adrian Valdez has practised Orthopedics for 12 years, specialising in injuries and diseases of the bones, joints, ligaments and muscles. Special interests include sports injuries, ACL and meniscus tears and shoulder dislocation. He helps athletes and active adults return safely to activity.', '09:00:00', '18:00:00'),
(35, 'Dr. Jasmine Rivera', 'Orthopedics', 1, '2026-10-09 22:27:14', 9, 'PRC-MD-108085', 'jasmine.rivera@medisync-hospital.example', 'A board-certified Orthopedics physician, Dr. Jasmine Rivera brings 9 years of experience in injuries and diseases of the bones, joints, ligaments and muscles. Special interests include back and neck pain, spine disorders and osteoporosis. She favours non-surgical treatment first and refers to spine surgery when needed.', '08:00:00', '17:00:00'),
(36, 'Dr. Kevin Domingo', 'Orthopedics', 1, '2026-10-09 22:27:14', 9, 'PRC-MD-108122', 'kevin.domingo@medisync-hospital.example', 'Dr. Kevin Domingo is a Orthopedics specialist with 5 years of experience in injuries and diseases of the bones, joints, ligaments and muscles. Special interests include fracture care, hand and wrist injuries and carpal tunnel syndrome. He follows fractures from casting through rehabilitation.', '10:00:00', '18:00:00'),
(37, 'Dr. Benjamin Chua', 'Ophthalmology', 1, '2026-10-09 22:27:14', 10, 'PRC-MD-109011', 'benjamin.chua@medisync-hospital.example', 'With 18 years in Ophthalmology, Dr. Benjamin Chua focuses on diseases and surgery of the eye and vision. Special interests include cataract surgery, blurred vision in older adults and lens implants. He performs small-incision cataract surgery with same-day discharge.', '08:00:00', '16:00:00'),
(38, 'Dr. Clarissa Yap', 'Ophthalmology', 1, '2026-10-09 22:27:14', 10, 'PRC-MD-109048', 'clarissa.yap@medisync-hospital.example', 'Dr. Clarissa Yap has practised Ophthalmology for 11 years, specialising in diseases and surgery of the eye and vision. Special interests include glaucoma, diabetic eye disease and retinal screening. She monitors patients with diabetes and high eye pressure to protect their sight.', '09:00:00', '17:00:00'),
(39, 'Dr. Dominic Lacson', 'Ophthalmology', 1, '2026-10-09 22:27:14', 10, 'PRC-MD-109085', 'dominic.lacson@medisync-hospital.example', 'A board-certified Ophthalmology physician, Dr. Dominic Lacson brings 7 years of experience in diseases and surgery of the eye and vision. Special interests include red, itchy or painful eyes, eye injuries and dry eye. He sees urgent eye complaints the same day when possible.', '08:00:00', '17:00:00'),
(40, 'Dr. Hannah Go', 'Ophthalmology', 1, '2026-10-09 22:27:14', 10, 'PRC-MD-109122', 'hannah.go@medisync-hospital.example', 'Dr. Hannah Go is a Ophthalmology specialist with 5 years of experience in diseases and surgery of the eye and vision. Special interests include children\'s vision and squint, refraction and eyeglass prescriptions and lazy eye. She makes eye examinations comfortable for young children.', '10:00:00', '17:00:00'),
(41, 'Dr. Leonardo Santiago', 'Otolaryngology (ENT)', 1, '2026-10-09 22:27:14', 11, 'PRC-MD-110011', 'leonardo.santiago@medisync-hospital.example', 'With 17 years in Otolaryngology (ENT), Dr. Leonardo Santiago focuses on conditions of the ear, nose, throat, head and neck. Special interests include chronic sinusitis, nasal obstruction and endoscopic sinus surgery. He treats long-standing sinus problems that have not improved with medicines.', '08:00:00', '17:00:00'),
(42, 'Dr. Margarita Cabrera', 'Otolaryngology (ENT)', 1, '2026-10-09 22:27:14', 11, 'PRC-MD-110048', 'margarita.cabrera@medisync-hospital.example', 'Dr. Margarita Cabrera has practised Otolaryngology (ENT) for 12 years, specialising in conditions of the ear, nose, throat, head and neck. Special interests include hearing loss, ear infections and ringing in the ears. She works with audiologists on hearing tests and hearing-aid referrals.', '09:00:00', '18:00:00'),
(43, 'Dr. Nathan Soriano', 'Otolaryngology (ENT)', 1, '2026-10-09 22:27:14', 11, 'PRC-MD-110085', 'nathan.soriano@medisync-hospital.example', 'A board-certified Otolaryngology (ENT) physician, Dr. Nathan Soriano brings 8 years of experience in conditions of the ear, nose, throat, head and neck. Special interests include tonsil and adenoid problems, snoring and sleep apnea and voice changes. He evaluates children and adults with recurrent throat infections.', '10:00:00', '18:00:00'),
(44, 'Dr. Pia Robles', 'Otolaryngology (ENT)', 1, '2026-10-09 22:27:14', 11, 'PRC-MD-110122', 'pia.robles@medisync-hospital.example', 'Dr. Pia Robles is a Otolaryngology (ENT) specialist with 5 years of experience in conditions of the ear, nose, throat, head and neck. Special interests include neck lumps, thyroid nodules and nosebleeds. She performs clinic-based scope examinations of the nose and throat.', '08:00:00', '16:00:00'),
(45, 'Dr. Eduardo Pineda', 'Psychiatry', 1, '2026-10-09 22:27:14', 12, 'PRC-MD-111011', 'eduardo.pineda@medisync-hospital.example', 'With 19 years in Psychiatry, Dr. Eduardo Pineda focuses on mental health and emotional well-being. Special interests include depression, bipolar disorder and medication management. He provides careful, long-term follow-up with attention to side effects.', '08:00:00', '17:00:00'),
(46, 'Dr. Lourdes Tolentino', 'Psychiatry', 1, '2026-10-09 22:27:14', 12, 'PRC-MD-111048', 'lourdes.tolentino@medisync-hospital.example', 'Dr. Lourdes Tolentino has practised Psychiatry for 13 years, specialising in mental health and emotional well-being. Special interests include anxiety and panic attacks, stress and burnout and sleep problems. She combines medication with practical coping strategies.', '10:00:00', '19:00:00'),
(47, 'Dr. Arnel Bernardo', 'Psychiatry', 1, '2026-10-09 22:27:14', 12, 'PRC-MD-111085', 'arnel.bernardo@medisync-hospital.example', 'A board-certified Psychiatry physician, Dr. Arnel Bernardo brings 9 years of experience in mental health and emotional well-being. Special interests include ADHD in adolescents and adults, substance use concerns and anger and impulse control. He works with families to create structured treatment plans.', '09:00:00', '18:00:00'),
(48, 'Dr. Joanna Esguerra', 'Psychiatry', 1, '2026-10-09 22:27:14', 12, 'PRC-MD-111122', 'joanna.esguerra@medisync-hospital.example', 'Dr. Joanna Esguerra is a Psychiatry specialist with 6 years of experience in mental health and emotional well-being. Special interests include postpartum mood changes, grief and adjustment and trauma-related symptoms. She offers a supportive, confidential space for difficult life transitions.', '11:00:00', '19:00:00'),
(49, 'Dr. Ricardo Lorenzo', 'General Surgery', 1, '2026-10-09 22:27:14', 13, 'PRC-MD-112011', 'ricardo.lorenzo@medisync-hospital.example', 'With 22 years in General Surgery, Dr. Ricardo Lorenzo focuses on surgical treatment of abdominal, soft-tissue and other common conditions. Special interests include gallbladder disease, hernia repair and laparoscopic surgery. He specialises in minimally invasive operations with faster recovery.', '07:00:00', '15:00:00'),
(50, 'Dr. Cecilia Mariano', 'General Surgery', 1, '2026-10-09 22:27:14', 13, 'PRC-MD-112048', 'cecilia.mariano@medisync-hospital.example', 'Dr. Cecilia Mariano has practised General Surgery for 14 years, specialising in surgical treatment of abdominal, soft-tissue and other common conditions. Special interests include breast lumps and breast surgery, thyroid surgery and skin and soft-tissue masses. She guides patients through biopsy results and surgical options.', '08:00:00', '17:00:00'),
(51, 'Dr. Alfredo Velasco', 'General Surgery', 1, '2026-10-09 22:27:14', 13, 'PRC-MD-112085', 'alfredo.velasco@medisync-hospital.example', 'A board-certified General Surgery physician, Dr. Alfredo Velasco brings 10 years of experience in surgical treatment of abdominal, soft-tissue and other common conditions. Special interests include appendicitis, bowel obstruction and emergency abdominal surgery. He is part of the on-call team for urgent surgical cases.', '09:00:00', '18:00:00'),
(52, 'Dr. Bianca Serrano', 'General Surgery', 1, '2026-10-09 22:27:14', 13, 'PRC-MD-112122', 'bianca.serrano@medisync-hospital.example', 'Dr. Bianca Serrano is a General Surgery specialist with 5 years of experience in surgical treatment of abdominal, soft-tissue and other common conditions. Special interests include abscess drainage, wound and ulcer care and minor surgical procedures. She runs the minor-procedure clinic for day-case treatment.', '10:00:00', '18:00:00'),
(53, 'Dr. Gregorio Saldana', 'Anesthesiology', 1, '2026-10-09 22:27:14', 14, 'PRC-MD-113011', 'gregorio.saldana@medisync-hospital.example', 'With 20 years in Anesthesiology, Dr. Gregorio Saldana focuses on safe anaesthesia, sedation and pain control around surgery. Special interests include pre-anaesthesia assessment, general anaesthesia and airway management. He reviews medical risks with patients before planned operations.', '06:00:00', '14:00:00'),
(54, 'Dr. Rosalind Mateo', 'Anesthesiology', 1, '2026-10-09 22:27:14', 14, 'PRC-MD-113048', 'rosalind.mateo@medisync-hospital.example', 'Dr. Rosalind Mateo has practised Anesthesiology for 12 years, specialising in safe anaesthesia, sedation and pain control around surgery. Special interests include obstetric anaesthesia, epidural labour analgesia and spinal anaesthesia. She supports mothers through comfortable, safe deliveries.', '12:00:00', '20:00:00'),
(55, 'Dr. Ian Panganiban', 'Anesthesiology', 1, '2026-10-09 22:27:14', 14, 'PRC-MD-113085', 'ian.panganiban@medisync-hospital.example', 'A board-certified Anesthesiology physician, Dr. Ian Panganiban brings 7 years of experience in safe anaesthesia, sedation and pain control around surgery. Special interests include paediatric anaesthesia, procedural sedation and post-operative pain control. He prepares children and parents for anaesthesia with clear explanations.', '08:00:00', '16:00:00'),
(56, 'Dr. Herminio Lacsamana', 'Radiology', 1, '2026-10-09 22:27:14', 15, 'PRC-MD-114011', 'herminio.lacsamana@medisync-hospital.example', 'Dr. Herminio Lacsamana is a Radiology specialist with 19 years of experience in medical imaging and image-guided procedures. Special interests include CT scans, MRI of the brain and spine and emergency imaging. He reports urgent scans for the emergency department.', '06:00:00', '14:00:00'),
(57, 'Dr. Divina Roxas', 'Radiology', 1, '2026-10-09 22:27:14', 15, 'PRC-MD-114048', 'divina.roxas@medisync-hospital.example', 'With 13 years in Radiology, Dr. Divina Roxas focuses on medical imaging and image-guided procedures. Special interests include ultrasound, breast imaging and mammography and thyroid ultrasound. She performs ultrasound-guided biopsies.', '08:00:00', '17:00:00'),
(58, 'Dr. Oscar Belmonte', 'Radiology', 1, '2026-10-09 22:27:14', 15, 'PRC-MD-114085', 'oscar.belmonte@medisync-hospital.example', 'Dr. Oscar Belmonte has practised Radiology for 8 years, specialising in medical imaging and image-guided procedures. Special interests include chest X-rays, musculoskeletal imaging and joint MRI. He works closely with the orthopaedic and sports medicine teams.', '14:00:00', '22:00:00'),
(59, 'Dr. Lucia Evangelista', 'Pathology', 1, '2026-10-09 22:27:14', 16, 'PRC-MD-115011', 'lucia.evangelista@medisync-hospital.example', 'A board-certified Pathology physician, Dr. Lucia Evangelista brings 21 years of experience in laboratory diagnosis of disease from blood, tissue and other samples. Special interests include tissue biopsy diagnosis, cancer pathology and frozen sections during surgery. She provides rapid diagnoses to surgeons during operations.', '07:00:00', '16:00:00'),
(60, 'Dr. Samuel Concepcion', 'Pathology', 1, '2026-10-09 22:27:14', 16, 'PRC-MD-115048', 'samuel.concepcion@medisync-hospital.example', 'Dr. Samuel Concepcion is a Pathology specialist with 11 years of experience in laboratory diagnosis of disease from blood, tissue and other samples. Special interests include clinical chemistry, blood bank and transfusion and laboratory quality. He oversees the accuracy of routine and emergency laboratory tests.', '13:00:00', '22:00:00'),
(61, 'Dr. Wilma Abad', 'Pathology', 1, '2026-10-09 22:27:14', 16, 'PRC-MD-115085', 'wilma.abad@medisync-hospital.example', 'With 7 years in Pathology, Dr. Wilma Abad focuses on laboratory diagnosis of disease from blood, tissue and other samples. Special interests include cytology and pap smear review, microbiology and infection testing. She supervises culture and sensitivity testing for infections.', '06:00:00', '15:00:00'),
(62, 'Dr. Arturo Galang', 'Pulmonology', 1, '2026-10-09 22:27:14', 17, 'PRC-MD-116011', 'arturo.galang@medisync-hospital.example', 'Dr. Arturo Galang has practised Pulmonology for 18 years, specialising in diseases of the lungs and breathing. Special interests include asthma, COPD and pulmonary function testing. He helps patients use inhalers correctly and avoid flare-ups.', '08:00:00', '17:00:00'),
(63, 'Dr. Corazon Dimaculangan', 'Pulmonology', 1, '2026-10-09 22:27:14', 17, 'PRC-MD-116048', 'corazon.dimaculangan@medisync-hospital.example', 'A board-certified Pulmonology physician, Dr. Corazon Dimaculangan brings 12 years of experience in diseases of the lungs and breathing. Special interests include tuberculosis, chronic cough and pneumonia follow-up. She manages TB treatment programmes in coordination with public health.', '09:00:00', '18:00:00'),
(64, 'Dr. Jerome Agustin', 'Pulmonology', 1, '2026-10-09 22:27:14', 17, 'PRC-MD-116085', 'jerome.agustin@medisync-hospital.example', 'Dr. Jerome Agustin is a Pulmonology specialist with 8 years of experience in diseases of the lungs and breathing. Special interests include sleep apnea, shortness of breath work-ups and bronchoscopy. He runs sleep studies and adjusts CPAP therapy.', '10:00:00', '18:00:00'),
(65, 'Dr. Nina Quiambao', 'Pulmonology', 1, '2026-10-09 22:27:14', 17, 'PRC-MD-116122', 'nina.quiambao@medisync-hospital.example', 'With 5 years in Pulmonology, Dr. Nina Quiambao focuses on diseases of the lungs and breathing. Special interests include lung nodules, smoking-related lung disease and pre-employment chest findings. She follows up abnormal chest X-ray and CT findings.', '08:00:00', '16:00:00'),
(66, 'Dr. Vicente Macaraeg', 'Gastroenterology', 1, '2026-10-09 22:27:14', 18, 'PRC-MD-117011', 'vicente.macaraeg@medisync-hospital.example', 'Dr. Vicente Macaraeg has practised Gastroenterology for 20 years, specialising in disorders of the digestive tract, liver and pancreas. Special interests include upper endoscopy, colonoscopy and colon cancer screening and gastrointestinal bleeding. He leads the hospital endoscopy unit.', '07:00:00', '15:00:00'),
(67, 'Dr. Rosario Buenaventura', 'Gastroenterology', 1, '2026-10-09 22:27:14', 18, 'PRC-MD-117048', 'rosario.buenaventura@medisync-hospital.example', 'A board-certified Gastroenterology physician, Dr. Rosario Buenaventura brings 13 years of experience in disorders of the digestive tract, liver and pancreas. Special interests include acid reflux and heartburn, stomach ulcers and H. pylori infection. She helps patients adjust diet and medicines for lasting relief.', '08:00:00', '17:00:00'),
(68, 'Dr. Dennis Lagman', 'Gastroenterology', 1, '2026-10-09 22:27:14', 18, 'PRC-MD-117085', 'dennis.lagman@medisync-hospital.example', 'Dr. Dennis Lagman is a Gastroenterology specialist with 9 years of experience in disorders of the digestive tract, liver and pancreas. Special interests include fatty liver and hepatitis, abnormal liver tests and jaundice. He monitors chronic liver disease and coordinates liver imaging.', '09:00:00', '18:00:00'),
(69, 'Dr. Kim Ventura', 'Gastroenterology', 1, '2026-10-09 22:27:14', 18, 'PRC-MD-117122', 'kim.ventura@medisync-hospital.example', 'With 5 years in Gastroenterology, Dr. Kim Ventura focuses on disorders of the digestive tract, liver and pancreas. Special interests include irritable bowel syndrome, chronic diarrhoea or constipation and bloating and abdominal pain. She takes a step-by-step approach to persistent bowel symptoms.', '10:00:00', '18:00:00'),
(70, 'Dr. Leopoldo Samson', 'Nephrology', 1, '2026-10-09 22:27:14', 19, 'PRC-MD-118011', 'leopoldo.samson@medisync-hospital.example', 'Dr. Leopoldo Samson has practised Nephrology for 19 years, specialising in kidney disease, dialysis and fluid and electrolyte problems. Special interests include chronic kidney disease, haemodialysis and dialysis access planning. He supervises the dialysis unit and its long-term patients.', '06:00:00', '14:00:00'),
(71, 'Dr. Marites Ilagan', 'Nephrology', 1, '2026-10-09 22:27:14', 19, 'PRC-MD-118048', 'marites.ilagan@medisync-hospital.example', 'A board-certified Nephrology physician, Dr. Marites Ilagan brings 12 years of experience in kidney disease, dialysis and fluid and electrolyte problems. Special interests include diabetic and hypertensive kidney disease, protein in the urine and slowing kidney decline. She focuses on protecting kidney function early.', '08:00:00', '17:00:00'),
(72, 'Dr. Jonas Ferrer', 'Nephrology', 1, '2026-10-09 22:27:14', 19, 'PRC-MD-118085', 'jonas.ferrer@medisync-hospital.example', 'Dr. Jonas Ferrer is a Nephrology specialist with 7 years of experience in kidney disease, dialysis and fluid and electrolyte problems. Special interests include kidney stones, electrolyte imbalance and acute kidney injury. He works with urology on recurrent stone prevention.', '12:00:00', '20:00:00'),
(73, 'Dr. Felicidad Tuazon', 'Endocrinology', 1, '2026-10-09 22:27:14', 20, 'PRC-MD-119011', 'felicidad.tuazon@medisync-hospital.example', 'With 18 years in Endocrinology, Dr. Felicidad Tuazon focuses on diabetes, thyroid and other hormone disorders. Special interests include type 1 and type 2 diabetes, insulin therapy and diabetes education. She teaches practical blood-sugar monitoring and insulin adjustment.', '08:00:00', '17:00:00'),
(74, 'Dr. Rogelio Cuenca', 'Endocrinology', 1, '2026-10-09 22:27:14', 20, 'PRC-MD-119048', 'rogelio.cuenca@medisync-hospital.example', 'Dr. Rogelio Cuenca has practised Endocrinology for 11 years, specialising in diabetes, thyroid and other hormone disorders. Special interests include hyperthyroidism and hypothyroidism, goitre and thyroid nodules. He coordinates thyroid ultrasound and biopsy when needed.', '09:00:00', '18:00:00'),
(75, 'Dr. Abigail Sarmiento', 'Endocrinology', 1, '2026-10-09 22:27:14', 20, 'PRC-MD-119085', 'abigail.sarmiento@medisync-hospital.example', 'A board-certified Endocrinology physician, Dr. Abigail Sarmiento brings 7 years of experience in diabetes, thyroid and other hormone disorders. Special interests include obesity and metabolic syndrome, polycystic ovary syndrome and adrenal and pituitary disorders. She builds weight and metabolic plans with dietitians.', '10:00:00', '18:00:00'),
(76, 'Dr. Augusto Lazaro', 'Oncology', 1, '2026-10-09 22:27:14', 21, 'PRC-MD-120011', 'augusto.lazaro@medisync-hospital.example', 'Dr. Augusto Lazaro is a Oncology specialist with 21 years of experience in diagnosis, treatment and supportive care for cancer. Special interests include breast cancer, chemotherapy planning and targeted therapy. He leads the multidisciplinary breast cancer conference.', '08:00:00', '16:00:00'),
(77, 'Dr. Imelda Rosales', 'Oncology', 1, '2026-10-09 22:27:14', 21, 'PRC-MD-120048', 'imelda.rosales@medisync-hospital.example', 'With 14 years in Oncology, Dr. Imelda Rosales focuses on diagnosis, treatment and supportive care for cancer. Special interests include lung and colorectal cancer, immunotherapy and clinical follow-up after treatment. She coordinates surgery, radiation and medical treatment into one plan.', '09:00:00', '18:00:00'),
(78, 'Dr. Raymond Tiongson', 'Oncology', 1, '2026-10-09 22:27:14', 21, 'PRC-MD-120085', 'raymond.tiongson@medisync-hospital.example', 'Dr. Raymond Tiongson has practised Oncology for 9 years, specialising in diagnosis, treatment and supportive care for cancer. Special interests include lymphoma and leukaemia, cancer-related anaemia and treatment side-effect management. He works closely with haematology on blood cancers.', '08:00:00', '17:00:00'),
(79, 'Dr. Lea Valencia', 'Oncology', 1, '2026-10-09 22:27:14', 21, 'PRC-MD-120122', 'lea.valencia@medisync-hospital.example', 'A board-certified Oncology physician, Dr. Lea Valencia brings 6 years of experience in diagnosis, treatment and supportive care for cancer. Special interests include cancer screening advice, palliative and supportive care and pain control in cancer. She focuses on comfort, dignity and family communication.', '10:00:00', '18:00:00'),
(80, 'Dr. Simeon Dela Paz', 'Infectious Disease', 1, '2026-10-09 22:27:14', 22, 'PRC-MD-121011', 'simeon.delapaz@medisync-hospital.example', 'Dr. Simeon Dela Paz is a Infectious Disease specialist with 17 years of experience in complicated infections, antimicrobial therapy and infection prevention. Special interests include difficult-to-treat infections, antibiotic stewardship and hospital-acquired infections. He advises other doctors on choosing the right antibiotic.', '08:00:00', '17:00:00'),
(81, 'Dr. Rowena Marquez', 'Infectious Disease', 1, '2026-10-09 22:27:14', 22, 'PRC-MD-121048', 'rowena.marquez@medisync-hospital.example', 'With 11 years in Infectious Disease, Dr. Rowena Marquez focuses on complicated infections, antimicrobial therapy and infection prevention. Special interests include HIV care, sexually transmitted infections and hepatitis B and C. She provides confidential, stigma-free long-term care.', '09:00:00', '17:00:00'),
(82, 'Dr. Jericho Alcantara', 'Infectious Disease', 1, '2026-10-09 22:27:14', 22, 'PRC-MD-121085', 'jericho.alcantara@medisync-hospital.example', 'Dr. Jericho Alcantara has practised Infectious Disease for 6 years, specialising in complicated infections, antimicrobial therapy and infection prevention. Special interests include dengue, typhoid and leptospirosis, travel vaccines and fever after travel. He counsels travellers before and after trips abroad.', '08:00:00', '16:00:00'),
(83, 'Dr. Consuelo Arellano', 'Rheumatology', 1, '2026-10-09 22:27:14', 23, 'PRC-MD-122011', 'consuelo.arellano@medisync-hospital.example', 'A board-certified Rheumatology physician, Dr. Consuelo Arellano brings 16 years of experience in arthritis and autoimmune diseases of the joints, muscles and connective tissue. Special interests include rheumatoid arthritis, lupus and biologic therapy. She monitors autoimmune disease activity and medication safety.', '08:00:00', '17:00:00'),
(84, 'Dr. Manuel Gatchalian', 'Rheumatology', 1, '2026-10-09 22:27:14', 23, 'PRC-MD-122048', 'manuel.gatchalian@medisync-hospital.example', 'Dr. Manuel Gatchalian is a Rheumatology specialist with 10 years of experience in arthritis and autoimmune diseases of the joints, muscles and connective tissue. Special interests include gout, joint swelling and stiffness and joint injections. He helps patients prevent painful gout attacks.', '09:00:00', '17:00:00'),
(85, 'Dr. Yvonne Caballero', 'Rheumatology', 1, '2026-10-09 22:27:14', 23, 'PRC-MD-122085', 'yvonne.caballero@medisync-hospital.example', 'With 6 years in Rheumatology, Dr. Yvonne Caballero focuses on arthritis and autoimmune diseases of the joints, muscles and connective tissue. Special interests include ankylosing spondylitis, fibromyalgia and inflammatory back pain. She combines medicines with exercise programmes for chronic pain.', '08:00:00', '16:00:00'),
(86, 'Dr. Teodoro Escobar', 'Urology', 1, '2026-10-09 22:27:14', 24, 'PRC-MD-123011', 'teodoro.escobar@medisync-hospital.example', 'Dr. Teodoro Escobar has practised Urology for 19 years, specialising in conditions of the urinary tract and men\'s reproductive health. Special interests include kidney and bladder stones, stone surgery and lithotripsy and blood in the urine. He offers minimally invasive stone removal.', '08:00:00', '16:00:00'),
(87, 'Dr. Rodel Padilla', 'Urology', 1, '2026-10-09 22:27:14', 24, 'PRC-MD-123048', 'rodel.padilla@medisync-hospital.example', 'A board-certified Urology physician, Dr. Rodel Padilla brings 12 years of experience in conditions of the urinary tract and men\'s reproductive health. Special interests include enlarged prostate, prostate cancer screening and urinary frequency in men. He explains PSA results and treatment options clearly.', '09:00:00', '18:00:00'),
(88, 'Dr. Melissa Yu', 'Urology', 1, '2026-10-09 22:27:14', 24, 'PRC-MD-123085', 'melissa.yu@medisync-hospital.example', 'Dr. Melissa Yu is a Urology specialist with 7 years of experience in conditions of the urinary tract and men\'s reproductive health. Special interests include urinary incontinence, recurrent urinary tract infections and bladder problems in women. She provides female urology care in a private setting.', '10:00:00', '18:00:00'),
(89, 'Dr. Cristina Vergara', 'Physical Medicine and Rehabilitation', 1, '2026-10-09 22:27:14', 25, 'PRC-MD-124011', 'cristina.vergara@medisync-hospital.example', 'With 15 years in Physical Medicine and Rehabilitation, Dr. Cristina Vergara focuses on restoring movement, function and independence after illness or injury. Special interests include stroke rehabilitation, mobility and gait training and spasticity management. She leads the inpatient rehabilitation team.', '07:00:00', '16:00:00'),
(90, 'Dr. Rolando Mangubat', 'Physical Medicine and Rehabilitation', 1, '2026-10-09 22:27:14', 25, 'PRC-MD-124048', 'rolando.mangubat@medisync-hospital.example', 'Dr. Rolando Mangubat has practised Physical Medicine and Rehabilitation for 10 years, specialising in restoring movement, function and independence after illness or injury. Special interests include back and neck pain rehabilitation, post-operative therapy and work-related injuries. He designs return-to-work programmes with physical therapists.', '09:00:00', '18:00:00'),
(91, 'Dr. Aira De Guzman', 'Physical Medicine and Rehabilitation', 1, '2026-10-09 22:27:14', 25, 'PRC-MD-124085', 'aira.deguzman@medisync-hospital.example', 'A board-certified Physical Medicine and Rehabilitation physician, Dr. Aira De Guzman brings 5 years of experience in restoring movement, function and independence after illness or injury. Special interests include sports rehabilitation, posture and ergonomic problems and pain after fractures. She prescribes exercise plans that patients can continue at home.', '10:00:00', '19:00:00'),
(92, 'Dr. Remedios Bautista', 'Geriatrics', 1, '2026-10-09 22:27:14', 26, 'PRC-MD-125011', 'remedios.bautista@medisync-hospital.example', 'Dr. Remedios Bautista is a Geriatrics specialist with 20 years of experience in comprehensive care for older adults. Special interests include memory loss and dementia, comprehensive geriatric assessment and caregiver support. She works with families on safe, practical care plans at home.', '08:00:00', '17:00:00'),
(93, 'Dr. Florencio Andrada', 'Geriatrics', 1, '2026-10-09 22:27:14', 26, 'PRC-MD-125048', 'florencio.andrada@medisync-hospital.example', 'With 12 years in Geriatrics, Dr. Florencio Andrada focuses on comprehensive care for older adults. Special interests include falls and balance problems, many medicines at once and frailty. He reduces unnecessary medicines to prevent side effects and falls.', '09:00:00', '17:00:00'),
(94, 'Dr. Marilou Sevilla', 'Geriatrics', 1, '2026-10-09 22:27:14', 26, 'PRC-MD-125085', 'marilou.sevilla@medisync-hospital.example', 'Dr. Marilou Sevilla has practised Geriatrics for 7 years, specialising in comprehensive care for older adults. Special interests include incontinence in older adults, sleep and mood changes with ageing and advance care planning. She helps patients and families discuss goals of care early.', '08:00:00', '16:00:00'),
(95, 'Dr. Ernesto Valenzuela', 'Hematology', 1, '2026-10-09 22:27:14', 27, 'PRC-MD-126011', 'ernesto.valenzuela@medisync-hospital.example', 'A board-certified Hematology physician, Dr. Ernesto Valenzuela brings 18 years of experience in diseases of the blood, bone marrow and clotting system. Special interests include anaemia, bone marrow examination and leukaemia. He investigates abnormal blood counts and their causes.', '08:00:00', '17:00:00'),
(96, 'Dr. Lilibeth Fajardo', 'Hematology', 1, '2026-10-09 22:27:14', 27, 'PRC-MD-126048', 'lilibeth.fajardo@medisync-hospital.example', 'Dr. Lilibeth Fajardo is a Hematology specialist with 11 years of experience in diseases of the blood, bone marrow and clotting system. Special interests include bleeding and clotting disorders, deep vein thrombosis and anticoagulation management. She manages blood-thinning medicines safely.', '09:00:00', '17:00:00'),
(97, 'Dr. Christian Labrador', 'Hematology', 1, '2026-10-09 22:27:14', 27, 'PRC-MD-126085', 'christian.labrador@medisync-hospital.example', 'With 6 years in Hematology, Dr. Christian Labrador focuses on diseases of the blood, bone marrow and clotting system. Special interests include thalassaemia, low platelet counts and transfusion planning. He coordinates regular transfusion schedules for chronic patients.', '08:00:00', '16:00:00'),
(98, 'Dr. Esperanza Tolentino', 'Plastic Surgery', 1, '2026-10-09 22:27:14', 28, 'PRC-MD-127011', 'esperanza.tolentino@medisync-hospital.example', 'Dr. Esperanza Tolentino has practised Plastic Surgery for 17 years, specialising in reconstructive and aesthetic surgery. Special interests include breast reconstruction, scar revision and reconstruction after cancer surgery. She restores form and function after major surgery or injury.', '08:00:00', '16:00:00'),
(99, 'Dr. Raul Montenegro', 'Plastic Surgery', 1, '2026-10-09 22:27:14', 28, 'PRC-MD-127048', 'raul.montenegro@medisync-hospital.example', 'A board-certified Plastic Surgery physician, Dr. Raul Montenegro brings 11 years of experience in reconstructive and aesthetic surgery. Special interests include burn reconstruction, cleft lip and palate and hand surgery. He takes part in community cleft-repair missions.', '09:00:00', '17:00:00'),
(100, 'Dr. Danica Sy', 'Plastic Surgery', 1, '2026-10-09 22:27:14', 28, 'PRC-MD-127085', 'danica.sy@medisync-hospital.example', 'Dr. Danica Sy is a Plastic Surgery specialist with 6 years of experience in reconstructive and aesthetic surgery. Special interests include facial aesthetic procedures, eyelid surgery and keloid management. She discusses realistic expectations before any cosmetic procedure.', '10:00:00', '17:00:00'),
(101, 'Dr. Mariano Ledesma', 'Thoracic Surgery', 1, '2026-10-09 22:27:14', 29, 'PRC-MD-128011', 'mariano.ledesma@medisync-hospital.example', 'With 20 years in Thoracic Surgery, Dr. Mariano Ledesma focuses on surgery of the lungs, chest wall and oesophagus. Special interests include lung cancer surgery, minimally invasive chest surgery and lung nodules. He performs video-assisted thoracic surgery.', '07:00:00', '15:00:00'),
(102, 'Dr. Charmaine Quinto', 'Thoracic Surgery', 1, '2026-10-09 22:27:14', 29, 'PRC-MD-128048', 'charmaine.quinto@medisync-hospital.example', 'Dr. Charmaine Quinto has practised Thoracic Surgery for 9 years, specialising in surgery of the lungs, chest wall and oesophagus. Special interests include pleural effusion and empyema, chest trauma and oesophageal disorders. She works with pulmonology on chest drainage and infections.', '09:00:00', '17:00:00'),
(103, 'Dr. Delfin Amador', 'Vascular Surgery', 1, '2026-10-09 22:27:14', 30, 'PRC-MD-129011', 'delfin.amador@medisync-hospital.example', 'A board-certified Vascular Surgery physician, Dr. Delfin Amador brings 16 years of experience in diseases of the arteries and veins. Special interests include peripheral artery disease, diabetic foot and leg circulation and endovascular procedures. He helps prevent amputations through early circulation treatment.', '08:00:00', '17:00:00'),
(104, 'Dr. Marissa Abella', 'Vascular Surgery', 1, '2026-10-09 22:27:14', 30, 'PRC-MD-129048', 'marissa.abella@medisync-hospital.example', 'Dr. Marissa Abella is a Vascular Surgery specialist with 10 years of experience in diseases of the arteries and veins. Special interests include varicose veins, venous ulcers and dialysis fistula creation. She creates and maintains dialysis access with the kidney team.', '09:00:00', '17:00:00'),
(105, 'Dr. Paulo Encarnacion', 'Vascular Surgery', 1, '2026-10-09 22:27:14', 30, 'PRC-MD-129085', 'paulo.encarnacion@medisync-hospital.example', 'With 5 years in Vascular Surgery, Dr. Paulo Encarnacion focuses on diseases of the arteries and veins. Special interests include aortic aneurysm screening, carotid artery disease and leg swelling. He uses duplex ultrasound to assess blood flow.', '08:00:00', '16:00:00'),
(106, 'Dr. Honorato Villareal', 'Neurosurgery', 1, '2026-10-09 22:27:14', 31, 'PRC-MD-130011', 'honorato.villareal@medisync-hospital.example', 'Dr. Honorato Villareal has practised Neurosurgery for 22 years, specialising in surgery of the brain, spine and peripheral nerves. Special interests include brain tumours, head injury and brain haemorrhage. He leads emergency neurosurgical care for trauma patients.', '07:00:00', '15:00:00'),
(107, 'Dr. Agnes Paredes', 'Neurosurgery', 1, '2026-10-09 22:27:14', 31, 'PRC-MD-130048', 'agnes.paredes@medisync-hospital.example', 'A board-certified Neurosurgery physician, Dr. Agnes Paredes brings 12 years of experience in surgery of the brain, spine and peripheral nerves. Special interests include herniated discs, spinal stenosis and minimally invasive spine surgery. She offers spine surgery only after conservative treatment has been tried.', '08:00:00', '17:00:00'),
(108, 'Dr. Jayson Carreon', 'Neurosurgery', 1, '2026-10-09 22:27:14', 31, 'PRC-MD-130085', 'jayson.carreon@medisync-hospital.example', 'Dr. Jayson Carreon is a Neurosurgery specialist with 6 years of experience in surgery of the brain, spine and peripheral nerves. Special interests include hydrocephalus, nerve compression and paediatric neurosurgery. He cares for children with congenital brain and spine conditions.', '09:00:00', '17:00:00'),
(109, 'Dr. Gerardo Malabanan', 'Pain Medicine', 1, '2026-10-09 22:27:14', 32, 'PRC-MD-131011', 'gerardo.malabanan@medisync-hospital.example', 'With 14 years in Pain Medicine, Dr. Gerardo Malabanan focuses on assessment and treatment of acute and chronic pain. Special interests include chronic back pain, nerve blocks and spinal injections. He offers image-guided procedures to reduce long-term pain.', '08:00:00', '17:00:00');
INSERT INTO `doctors` (`id`, `name`, `specialty`, `active`, `created_at`, `department_id`, `license`, `email`, `intro`, `work_start`, `work_end`) VALUES
(110, 'Dr. Rachelle Pangilinan', 'Pain Medicine', 1, '2026-10-09 22:27:14', 32, 'PRC-MD-131048', 'rachelle.pangilinan@medisync-hospital.example', 'Dr. Rachelle Pangilinan has practised Pain Medicine for 8 years, specialising in assessment and treatment of acute and chronic pain. Special interests include neuropathic pain, cancer pain and safe use of pain medicines. She reduces reliance on strong pain relievers through combined therapies.', '09:00:00', '17:00:00'),
(111, 'Dr. Wilfredo Catapang', 'Preventive Medicine', 1, '2026-10-09 22:27:14', 33, 'PRC-MD-132011', 'wilfredo.catapang@medisync-hospital.example', 'A board-certified Preventive Medicine physician, Dr. Wilfredo Catapang brings 16 years of experience in health screening, risk reduction and wellness programmes. Special interests include executive check-ups, cancer and heart screening and occupational health. He explains screening results and builds a follow-up plan for each patient.', '06:00:00', '14:00:00'),
(112, 'Dr. Joy Bacani', 'Preventive Medicine', 1, '2026-10-09 22:27:14', 33, 'PRC-MD-132048', 'joy.bacani@medisync-hospital.example', 'Dr. Joy Bacani is a Preventive Medicine specialist with 9 years of experience in health screening, risk reduction and wellness programmes. Special interests include pre-employment medical exams, adult vaccination and nutrition counselling. She focuses on keeping working adults healthy and productive.', '07:00:00', '15:00:00'),
(113, 'Dr. Kristoffer Lagdameo', 'Preventive Medicine', 1, '2026-10-09 22:27:14', 33, 'PRC-MD-132085', 'kristoffer.lagdameo@medisync-hospital.example', 'With 5 years in Preventive Medicine, Dr. Kristoffer Lagdameo focuses on health screening, risk reduction and wellness programmes. Special interests include travel health advice, lifestyle risk assessment and workplace wellness programmes. He designs preventive programmes for company partners.', '08:00:00', '15:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `doctor_schedule_exceptions`
--

CREATE TABLE `doctor_schedule_exceptions` (
  `doctor_id` int(11) NOT NULL,
  `day` date NOT NULL,
  `status` enum('Leave','Blocked') NOT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category` enum('appointments','hospital') NOT NULL,
  `type` enum('reminder','profile','hospital') NOT NULL,
  `title` varchar(150) NOT NULL,
  `body` varchar(500) NOT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patient_consents`
--

CREATE TABLE `patient_consents` (
  `user_id` int(11) NOT NULL,
  `routing` tinyint(1) NOT NULL DEFAULT 1,
  `staff_review` tinyint(1) NOT NULL DEFAULT 1,
  `history_personalization` tinyint(1) NOT NULL DEFAULT 0,
  `reminders` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patient_profiles`
--

CREATE TABLE `patient_profiles` (
  `user_id` int(11) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `sex` enum('Female','Male','Prefer not to say') DEFAULT NULL,
  `mobile` varchar(30) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `allergies` text DEFAULT NULL,
  `medications` text DEFAULT NULL,
  `medical_history` text DEFAULT NULL,
  `emergency_name` varchar(150) DEFAULT NULL,
  `emergency_phone` varchar(30) DEFAULT NULL,
  `consult_type` enum('In-person','Online') NOT NULL DEFAULT 'In-person',
  `language` enum('English','Filipino') NOT NULL DEFAULT 'English',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff_activity_log`
--

CREATE TABLE `staff_activity_log` (
  `id` int(11) NOT NULL,
  `actor_id` int(11) DEFAULT NULL,
  `action` varchar(60) NOT NULL,
  `entity_type` varchar(30) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `summary` varchar(255) NOT NULL,
  `notes` varchar(1000) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff_profiles`
--

CREATE TABLE `staff_profiles` (
  `user_id` int(11) NOT NULL,
  `staff_role` enum('Hospital Administrator','Appointment Coordinator','Doctor','Read-only Staff') NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `firstname` varchar(100) NOT NULL,
  `lastname` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` enum('patient','staff') NOT NULL DEFAULT 'patient',
  `theme` enum('light','dark') NOT NULL DEFAULT 'light',
  `password` varchar(255) NOT NULL,
  `password_changed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `account_status` enum('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `firstname`, `lastname`, `email`, `role`, `theme`, `password`, `password_changed_at`, `created_at`, `account_status`) VALUES
(1, 'Staff', 'MediSync', 'staff@gmail.com', 'staff', 'light', 'caa449921f43408484c85fed39714375:4be5eeecde63549afab8a5fafa980a5ff7a458b10a8abdac23ac85e5929271e681a46424604f191fb1e57172cdeb523ad7ae84475a13c4df0a53ac9c50892c6d', NULL, '2026-10-10 01:07:40', 'Active'),
(2, 'Patient', 'Medisync', 'patient@gmail.com', 'patient', 'light', '56754797b3efbd94aa4ea4a91acb0f04:dcc30c1899afa0e43c45004f403b618ae988af922647f9d2443e38f7cd175833465b2e679e8d1a91e7e7abdc8f876068a81734faee81ace40628c4b57a27ab86', NULL, '2026-10-10 01:08:13', 'Active');

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` char(32) NOT NULL,
  `user_id` int(11) NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_seen_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_sessions`
--

INSERT INTO `user_sessions` (`id`, `user_id`, `user_agent`, `ip`, `created_at`, `last_seen_at`, `expires_at`, `revoked_at`) VALUES
('5c190a424ba9ef7977e30e19cbeb8949', 1, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '127.0.0.1', '2026-10-10 01:07:40', '2026-10-10 01:07:40', '2026-10-10 10:07:40', '2026-10-10 09:07:49'),
('e4af723e7d198d5154c0cb8f4b1c8edf', 2, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '127.0.0.1', '2026-10-10 01:08:13', '2026-10-10 01:08:13', '2026-10-10 10:08:13', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ai_intakes`
--
ALTER TABLE `ai_intakes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_ai_intakes_reference` (`reference`),
  ADD UNIQUE KEY `uq_ai_intakes_conversation` (`conversation_id`),
  ADD KEY `idx_ai_intakes_review` (`review_status`,`created_at`),
  ADD KEY `fk_ai_intakes_patient` (`patient_id`),
  ADD KEY `fk_ai_intakes_doctor` (`doctor_id`),
  ADD KEY `fk_ai_intakes_reviewer` (`reviewed_by`);

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_appointments_reference` (`reference`),
  ADD KEY `idx_appointments_patient` (`patient_id`,`scheduled_at`),
  ADD KEY `fk_appointments_doctor` (`doctor_id`);

--
-- Indexes for table `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conversations_user` (`user_id`,`updated_at`);

--
-- Indexes for table `conversation_messages`
--
ALTER TABLE `conversation_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conversation_messages_conversation` (`conversation_id`,`id`);

--
-- Indexes for table `data_requests`
--
ALTER TABLE `data_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_data_requests_reference` (`reference`),
  ADD KEY `idx_data_requests_user` (`user_id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_departments_name` (`name`);

--
-- Indexes for table `doctors`
--
ALTER TABLE `doctors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_doctors_department` (`department_id`);

--
-- Indexes for table `doctor_schedule_exceptions`
--
ALTER TABLE `doctor_schedule_exceptions`
  ADD PRIMARY KEY (`doctor_id`,`day`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user` (`user_id`,`created_at`);

--
-- Indexes for table `patient_consents`
--
ALTER TABLE `patient_consents`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `patient_profiles`
--
ALTER TABLE `patient_profiles`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `staff_activity_log`
--
ALTER TABLE `staff_activity_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_staff_activity_created` (`created_at`),
  ADD KEY `idx_staff_activity_entity` (`entity_type`,`entity_id`),
  ADD KEY `fk_staff_activity_actor` (`actor_id`);

--
-- Indexes for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `fk_staff_profiles_department` (`department_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_sessions_user` (`user_id`,`revoked_at`,`expires_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ai_intakes`
--
ALTER TABLE `ai_intakes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `conversations`
--
ALTER TABLE `conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `conversation_messages`
--
ALTER TABLE `conversation_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `data_requests`
--
ALTER TABLE `data_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=100;

--
-- AUTO_INCREMENT for table `doctors`
--
ALTER TABLE `doctors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=340;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staff_activity_log`
--
ALTER TABLE `staff_activity_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ai_intakes`
--
ALTER TABLE `ai_intakes`
  ADD CONSTRAINT `fk_ai_intakes_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_ai_intakes_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_ai_intakes_patient` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ai_intakes_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `fk_appointments_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_appointments_patient` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `conversations`
--
ALTER TABLE `conversations`
  ADD CONSTRAINT `fk_conversations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `conversation_messages`
--
ALTER TABLE `conversation_messages`
  ADD CONSTRAINT `fk_conversation_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `data_requests`
--
ALTER TABLE `data_requests`
  ADD CONSTRAINT `fk_data_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `doctors`
--
ALTER TABLE `doctors`
  ADD CONSTRAINT `fk_doctors_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `doctor_schedule_exceptions`
--
ALTER TABLE `doctor_schedule_exceptions`
  ADD CONSTRAINT `fk_schedule_exceptions_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `patient_consents`
--
ALTER TABLE `patient_consents`
  ADD CONSTRAINT `fk_patient_consents_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `patient_profiles`
--
ALTER TABLE `patient_profiles`
  ADD CONSTRAINT `fk_patient_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `staff_activity_log`
--
ALTER TABLE `staff_activity_log`
  ADD CONSTRAINT `fk_staff_activity_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  ADD CONSTRAINT `fk_staff_profiles_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_staff_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `fk_user_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
