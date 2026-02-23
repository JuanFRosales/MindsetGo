# MindsetGo
## Anonymous AI-Supported Conversational Mental Health Prototype

MindsetGo is an engineering thesis project focused on building a privacy-first conversational AI support system. The primary goal is to design and validate a technically secure, anonymous, and user-friendly platform for AI-assisted conversations related to mental wellbeing.

This repository contains the backend foundation of the system. While authentication and session management are implemented, they are not the end goal. They exist to enable a secure and anonymous environment in which conversational AI features can operate safely.

The current project phase focuses on:
* Preserving strict user anonymity
* Enforcing data minimization and automatic expiration
* Building a secure authentication and session architecture
* Ensuring a smooth and accessible user experience
* Designing a clean and calming interaction flow

> **Note:** Psychological profiling and professional evaluation of AI-generated summaries are considered possible future development directions. This project does not attempt to validate psychological accuracy or perform clinical analysis, as such evaluation would require qualified domain expertise.

---

## 1. Project Scope
The system is designed as a foundational prototype for an anonymous conversational support service.
The emphasis of this thesis is on:
* Technical architecture
* Privacy-by-design implementation
* Anonymous identity management
* Session lifecycle control
* Secure backend validation and logging
* Usability and interaction clarity

The AI component is integrated from a technical standpoint, but the research does not evaluate psychological correctness or diagnostic validity. Any future profiling or clinical assessment functionality would require collaboration with licensed professionals.

---

## 2. System Purpose
This backend prototype demonstrates how a mental wellbeing support platform can be implemented with anonymity as a default condition.

It provides:
* Anonymous onboarding via invite codes
* QR-based device linking
* WebAuthn passkey authentication
* Short-lived secure sessions
* Automatic data expiration
* Strict API validation and redacted logging

**No email, name, IP address, or device fingerprint is stored.** User identity is represented solely by a random UUID v7. The authentication layer serves as infrastructure that enables safe conversational interaction without compromising privacy.

---

## 3. Design Philosophy
MindsetGo is built around three core principles:

1. **Anonymity by Default** - Users should be able to access the service without revealing personal identity.
2. **Minimal Data Surface** - Only technically necessary information is stored. All time-sensitive data expires automatically.
3. **Calm and Clear User Experience** - The system aims to feel lightweight, predictable, and non-intrusive. Security mechanisms operate in the background without creating cognitive friction.

---

## 4. Architectural Overview

### High-Level Flow
1. Admin generates invite code
2. User initiates onboarding
3. Device linking via QR session
4. Anonymous user identity is created
5. WebAuthn passkey is registered
6. User authenticates with passkey
7. Backend issues short-lived session cookie
8. Conversational AI operates within authenticated session

### Technology Stack
* **Frontend:** tbd
* **Backend:** Fastify with TypeScript
* **Database:** SQLite
* **Authentication:** WebAuthn via `fido2-lib`

The architecture is modular and designed to support future AI feature expansion without structural redesign.

---

## 5. Research Positioning
This thesis evaluates:
* Whether a fully anonymous authentication model can be implemented securely
* Whether strict TTL-based data lifecycle management is feasible
* Whether strong privacy controls can coexist with good usability
* Whether the user experience remains intuitive despite high security constraints

**It does not evaluate:**
* Psychological diagnostic accuracy
* Clinical validity of AI outputs
* Professional mental health assessment quality

Those topics are reserved for potential future interdisciplinary research.
