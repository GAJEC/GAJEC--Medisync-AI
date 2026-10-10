# Problem
Healthcare facilities often face delayed patient intake, inconsistent triage decisions, and limited clinician capacity during peak demand. Patients may also struggle to describe symptoms clearly, while staff need a faster and more consistent way to identify urgent cases and route them appropriately.

# Project Name
MediSync AI

# Brief Description
MediSync AI is an AI-powered healthcare support system designed to improve patient triage, clinical intake, and medical response workflows. The platform combines a patient-facing assistant experience with an internal AI inference service that can analyze text, images, and audio to support urgency assessment and improve operational decision-making.

The project includes:
- a FastAPI-based AI inference layer
- a Fastify backend for API and authentication flows
- a frontend client for staff/patient interactions
- model evaluation scripts for triage and speech performance
- safety controls and prompt boundaries for clinical use

# Tools
- Python 3.x
- FastAPI
- Node.js
- Fastify
- MySQL
- Vite
- JavaScript / HTML / CSS
- Hugging Face transformers-based model hosting
- Whisper for speech transcription
- MedGemma for medical chat and image reasoning
- Meralion for audio analysis
- Git / GitHub

# Asset
- AI inference service for internal medical workflows
- Patient-facing assistant layer named Syncia
- Triage evaluation framework for urgency analysis
- Audio and image processing pipeline for clinical inputs
- Safety and validation modules for request handling and model behavior
- Backend API services for patient and staff features

# Models
- MedGemma: medical conversation and image analysis model
- Whisper: speech-to-text transcription model
- Meralion: audio analysis model
- Safety rule set: red-flag detection and content guards
- Prompt configuration: language-aware patient-facing instructions

# System Overview
MediSync AI is structured in three main layers:
1. Frontend
   - Web interface for patient/staff engagement
   - Provides access to the support workflow

2. Backend
   - Fastify API server
   - Authentication, routing, rate limiting, and MIME-safe uploads
   - Connects frontend interactions with the AI services

3. AI Service
   - Internal FastAPI service behind Syncia
   - Handles medical chat, image analysis, audio transcription, and audio analysis
   - Uses secure internal tokens and health/readiness endpoints

# Features
- Patient intake support
- Urgency triage assistance
- Multimodal analysis (audio, image, text)
- Internal model health and readiness monitoring
- Rate-limited and authenticated AI endpoints
- Safety-first clinical evaluation workflows

# Safety & Evaluation
This project includes evaluation scripts to assess triage behavior and speech recognition quality. All included test vignettes are synthetic and should not be treated as real clinical guidance. The system is designed with caution and review requirements for healthcare use.

# Project Structure
- AI/ — AI inference service and evaluation scripts
- Backend/ — REST API backend
- Frontend/ — web client and UI assets
- README.md — project summary

# Notes
This repository is intended for healthcare-oriented AI experimentation and workflow support. Any real-world clinical deployment must be reviewed by qualified professionals, validated against approved data, and aligned with local medical and data privacy regulations.
