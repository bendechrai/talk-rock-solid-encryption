# Building Rock-Solid Encrypted Applications

This project is a demonstration for a 60-minute technical talk on implementing secure encryption in web applications. It showcases the evolution of a chat application called 'Whisper' from completely insecure to properly encrypted.

## Project Overview

This is a **demonstration project** designed to illustrate encryption concepts in an educational context, not a production-ready application. The project contains:

1. A slide presentation system built with Reveal.js and Next.js
2. Interactive demos showing different encryption approaches (plaintext, symmetric, asymmetric, and more)
3. Code examples that can be examined during the presentation
4. An in-memory database for simplified demonstration without external dependencies

## Presentation Structure

### Introduction (5 minutes)
- Why encryption matters: regulatory requirements, company reputation, user trust
- The importance of proper implementation

### Evolution of a Secure Chat Application (45 minutes)

1. **The Vulnerability of Plain Text** (Demo 1)
   - Basic chat application with plaintext messages
   - Demonstration of database vulnerabilities
   - Common security flaws in production applications

2. **Basic Encryption: The False Sense of Security** (Demo 2)
   - Server-side encryption with AES-256-GCM
   - Single key implementation and its vulnerabilities
   - Attack demonstration

3. **The Public-Private Key Revolution** (Demo 3)
   - End-to-end encryption with Diffie-Hellman key pairs
   - Implementation using @noble/curves
   - Demonstration of secure messaging

4. **Perfect Forward Secrecy**
   - Protecting past messages with ephemeral keys
   - Key rotation implementation

5. **The Multi-Device Challenge**
   - Secure key transfer between devices
   - QR code implementation for physical proximity verification

6. **Group Chat Complexities**
   - Challenges unique to group messaging
   - Pairwise encryption approach

7. **Metadata Protection**
   - The importance of protecting metadata
   - Implementation techniques

### Conclusion and Q&A (10 minutes)
- Recap of key principles
- Resources for further learning
- Q&A session

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the presentation.

The presentation will start with the first slide, and you can navigate through the slides using the arrow keys. When you reach a demo slide, the corresponding chat application demo will be displayed.

## Technical Implementation

This project uses:

- **Next.js**: For the application framework
- **React**: For the UI components
- **crypto-js**: For basic encryption in Demo 2
- **@noble/curves**: For advanced asymmetric encryption in Demo 3
- **In-memory database**: For simplified data storage without external dependencies
- **reveal.js**: For the slide presentation system

## Demo Applications

1. **Demo 1**: Basic chat with plaintext messages
2. **Demo 2**: Chat with symmetric encryption (AES-256-GCM)
3. **Demo 3**: Chat with asymmetric encryption (public/private key pairs)

Each demo builds upon the previous one, showcasing the evolution of security in the application.

## License

This project is MIT licensed.
