# MindsetGo
## Anonymous AI-Supported Conversational Mental Health Prototype

MindsetGo is an engineering thesis project focused on building a privacy-first conversational AI support system. The primary goal is to design and validate a technically secure, anonymous, and user-friendly platform for AI-assisted conversations related to mental wellbeing.

This repository contains the prototype implementation of the system including both backend and frontend components. While authentication and session management are implemented, they are not the end goal. They exist to enable a secure and anonymous environment in which conversational AI features can operate safely.

The current project phase focuses on:

* Preserving strict user anonymity
* Enforcing data minimization and automatic expiration
* Building a secure authentication and session architecture
* Implementing AI-assisted conversational features
* Ensuring a smooth and accessible user experience
* Designing a calm and clear interaction flow

> **Note:** Psychological profiling and professional evaluation of AI-generated summaries are considered possible future development directions. This project does not attempt to validate psychological accuracy or perform clinical analysis, as such evaluation would require qualified domain expertise.

---

# 1. Project Scope

The system is designed as a foundational prototype for an anonymous conversational support service.

The emphasis of this project is on:

* Technical architecture
* Privacy-by-design implementation
* Anonymous identity management
* Session lifecycle control
* Secure backend validation and logging
* Usability and interaction clarity
* Integration of AI-assisted conversational support

The AI component is integrated from a technical standpoint, but the research does not evaluate psychological correctness or diagnostic validity. Any future profiling or clinical assessment functionality would require collaboration with licensed professionals.

---

# 2. System Purpose

This prototype demonstrates how a mental wellbeing support platform can be implemented with anonymity as a default condition.

It provides:

* Anonymous onboarding via invite codes
* QR-based device linking
* WebAuthn passkey authentication
* Short-lived secure sessions
* AI-assisted conversational responses
* AI-generated conversation summaries
* Automatic data expiration
* Strict API validation and redacted logging

No email, name, IP address, or phone numjber is stored.  
User identity is represented solely by a random UUID v7.

The authentication layer exists as infrastructure that enables safe conversational interaction without compromising privacy.

---

# 3. Design Philosophy

MindsetGo is built around three core principles.

### 1. Anonymity by Default

Users should be able to access the service without revealing personal identity.

### 2. Minimal Data Surface

Only technically necessary information is stored.  
Time-sensitive data expires automatically using TTL-based cleanup.

### 3. Calm and Clear User Experience

The system aims to feel lightweight, predictable, and non-intrusive.  
Security mechanisms operate in the background without creating cognitive friction for the user.

---

# 4. Architectural Overview

## High-Level Flow

1. Admin generates an invite code
2. User opens onboarding page
3. Device linking occurs via QR session
4. Anonymous user identity is created
5. WebAuthn passkey is registered
6. User authenticates with passkey
7. Backend issues a short-lived session cookie
8. User interacts with conversational AI
9. Conversations can be summarized by AI for reflection

---

# 5. Technology Stack

## Frontend

* React
* TypeScript
* Vite
* React Router
* QR code generation for device linking

The frontend provides the user interface for onboarding, authentication, and AI conversations.

## Backend

* Fastify
* TypeScript
* REST API architecture
* Secure cookie-based sessions
* Schema validation
* Structured logging

The backend manages authentication, sessions, data lifecycle control, and AI integration.

## Database

* SQLite
* Lightweight storage for:
  * anonymous user identities
  * invite codes
  * sessions
  * conversation messages
  * AI summaries
* Automatic expiration logic for time-sensitive data

## Authentication

* WebAuthn passkeys
* `fido2-lib`
* QR-based device linking for onboarding

Authentication is passwordless and identity-minimizing.

## AI Integration

The system includes AI-assisted features such as:

* conversational replies
* conversation summarization
* profile-like reflections based on conversation history

These features are implemented as backend services that process anonymized message data.

---

# 6. System Components

The prototype currently includes the following major functional modules.

### Anonymous Onboarding

Users join the system using admin-generated invite codes.  
Onboarding creates an anonymous user identity without collecting personal information.

### Device Linking

A QR session system allows secure linking between devices during onboarding.

### WebAuthn Authentication

Users authenticate using passkeys instead of passwords.

### Secure Session Management

Short-lived session cookies provide authenticated access while minimizing long-term exposure.

### Conversational AI

Users can interact with an AI assistant designed to support reflective conversation about wellbeing.

### AI Conversation Summaries

The system can generate summaries of conversations to help users reflect on themes and patterns.

### Admin Tools

Admin functionality exists for generating invite codes and managing onboarding access.

---

# 7. Privacy and Security Principles

The system intentionally minimizes the data surface.

The following design constraints are enforced.

* No personally identifiable information is collected
* No email addresses are required
* No usernames are required
* No IP addresses are stored
* User identity exists only as a random UUID

All time-sensitive records such as sessions and linking tokens are automatically expired and cleaned up.

Logging is redacted to avoid exposing sensitive data.

---

# 8. Repository Structure

The repository is organized into two main components.
