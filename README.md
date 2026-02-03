# MindsetGo
# Anonymous Conversational Support Service – Prototype

This project is a small-scale prototype developed as part of an engineering thesis. It explores a conversational support service that uses an AI language model to structure and summarize user-generated text while prioritizing anonymity, data minimization, and privacy by design.

The AI does **not** act as a psychologist, provide diagnoses, or replace human professionals. Its role is limited to producing summaries and structured representations of conversations that can be used for technical evaluation and system design purposes.

---

## Project Goals

- Build an anonymous, conversation-based service without collecting personal data  
- Enable multi-day or multi-week conversation sessions using a pseudonymous user identifier  
- Generate summaries and lightweight user profiles from conversations  
- Demonstrate a privacy-first system architecture suitable for sensitive domains  
- Keep the implementation simple and robust for an engineering thesis scope  

---

## Current architecture

Flow overview

1. Admin creates an invite code  
2. Browser creates a QR session  
3. QR is linked to the invite  
4. Backend creates a user and resolution  
5. User registers a WebAuthn passkey  
6. Passkey is stored in the database  
7. User logs in using the passkey  
8. Session is created

Frontend is a plain `demo.html`. Backend uses Fastify and SQLite.

---

## Technology choices

Backend
- Fastify
- TypeScript
- SQLite
- fido2-lib