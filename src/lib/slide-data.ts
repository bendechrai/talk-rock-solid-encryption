import { ReactNode } from 'react';

export type SlideType = "content" | "demo";

export type SlideComponentType = 'title' | 'bullets' | 'image' | 'code' | 'custom';

export interface SlideComponentData {
  type: SlideComponentType;
  props: Record<string, any>;
}

export interface Slide {
  id: string;
  title: string;
  type: SlideType;
  content?: string | SlideComponentData;
  demoId?: string;
  notes?: string;
  backgroundImage?: string;
  subslides?: Slide[];
}

export const slides: Slide[] = [
  {
    id: "1",
    title: "Building Rock-Solid Encrypted Applications",
    type: "content",
    content: {
      type: 'title',
      props: {
        title: "Building Rock-Solid Encrypted Applications",
        subtitle: "A technical talk for software developers, architects, and decision makers"
      }
    },
    backgroundImage: "/backgrounds/hacker.png",
    notes:
      'Welcome everyone to "Building Rock-Solid Encrypted Applications". Phishing, data theft, and even authoritarianism are on the rise. We need to protect ourselves from adversaries, be they criminals, competitors, or countries.',
  },
  {
    id: "2",
    title: "Introduction",
    type: "content",
    content: `
      <h2>Introduction</h2>
      <ul>
        <li>Encryption isn't just a technical choice but a necessity</li>
        <li>Regulatory requirements (GDPR, CCPA, etc.)</li>
        <li>Company reputation and PR risk</li>
        <li>User trust and expectations</li>
        <li>Legal and ethical obligations</li>
      </ul>
    `,
    notes:
      "Emphasize that encryption isn't just a technical choice but increasingly a necessity. Simply adding encryption to your app isn't enough. Many applications claim to be \"encrypted\" but have fundamental security flaws in their implementation.",
  },
  {
    id: "3",
    title: "The Vulnerability of Plain Text",
    type: "content",
    content: `
      <h2>The Vulnerability of Plain Text</h2>
      <ul>
        <li>Most basic version of our chat app</li>
        <li>Messages stored in plaintext</li>
        <li>No access control validation</li>
        <li>Common vulnerability in production applications</li>
      </ul>
    `,
    notes:
      "Let's start with the most basic version of our chat application. Here's \"Whisper\" in its initial form - a straightforward Next.js app where users can send messages to each other. But there's a problem. All messages are stored in plaintext. Anyone with database access can read every single conversation.",
  },
  {
    id: "4",
    title: "Basic Chat Demo",
    type: "demo",
    demoId: "demo-1",
    notes:
      "Demonstrate how changing a URL parameter can access any conversation. Emphasize this is how many apps actually operate in production.",
  },
  {
    id: "5",
    title: "Basic Encryption: The False Sense of Security",
    type: "content",
    content: `
      <h2>Basic Encryption: The False Sense of Security</h2>
      <ul>
        <li>Server-side encryption with a single key</li>
        <li>AES-256-GCM implementation</li>
        <li>Widely adopted, thoroughly vetted</li>
        <li>Provides both confidentiality and authentication</li>
        <li>Efficient with hardware acceleration</li>
      </ul>
    `,
    notes:
      "The obvious fix is to encrypt our messages. In our second version, we've implemented server-side encryption using AES-256-GCM. Why AES-256-GCM? It's widely adopted and thoroughly vetted by security experts. GCM mode provides both confidentiality and authentication in one package.",
  },
  {
    id: "6",
    title: "Symmetric Encryption Demo",
    type: "demo",
    demoId: "demo-2",
    notes:
      "Show the attack scenario. While this protects against a basic database leak, it creates a false sense of security. The problem is that we're using a single server key for all encryption. If that key is compromised, all messages can be decrypted.",
  },
  {
    id: "7",
    title: "The Public-Private Key Revolution",
    type: "content",
    content: `
      <h2>The Public-Private Key Revolution</h2>
      <ul>
        <li>Using Diffie-Hellman key pairs for asymmetric encryption</li>
        <li>Implementation using @noble/curves</li>
        <li>End-to-end encryption where the server cannot read messages</li>
        <li>Each user generates their own key pair</li>
        <li>Messages encrypted with recipient's public key</li>
        <li>Can only be decrypted with private key that never leaves the device</li>
      </ul>
    `,
    notes:
      "So how do we solve this? We need to ensure that even if our server is compromised, the attacker can't read our users' messages. This is where public-private key cryptography comes in. In version 3 of our app, each user generates their own key pair.",
  },
  {
    id: "7a",
    title: "Public-Private Key Encryption",
    type: "content",
    content: `
      <h2>How Public-Private Key Encryption Works</h2>
      <div style="margin: 1.5rem 0; text-align: center;">
        <img src="/images/asymmetric-encryption.png" alt="Asymmetric Encryption Diagram" style="max-width: 100%; max-height: 60vh; object-fit: contain; border-radius: 4px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);" />
      </div>
      <p>Alice can send encrypted messages to Bob using his public key. Only Bob can decrypt them with his private key.</p>
    `,
    notes:
      "This diagram illustrates how public-private key encryption works. The public key can be freely shared, while the private key must be kept secret.",
  },
  {
    id: "8",
    title: "End-to-End Encryption Demo",
    type: "demo",
    demoId: "demo-3",
    notes:
      "Demonstrate end-to-end encryption where the server cannot read messages. Even if I have full server access, I can't read the message because I don't have Bob's private key. This is the foundation of end-to-end encryption.",
  },
  {
    id: "9",
    title: "Perfect Forward Secrecy: Protecting the Timeline",
    type: "content",
    content: `
      <h2>Perfect Forward Secrecy: Protecting the Timeline</h2>
      <ul>
        <li>Ensures past communication remains secure even if keys are compromised</li>
        <li>Generating ephemeral keys for each conversation session</li>
        <li>Key rotation protects past messages</li>
        <li>Shared secrets used only for one session and then discarded</li>
      </ul>
    `,
    notes:
      "Our app is now much more secure, but there's still a critical vulnerability: if someone's private key is ever compromised in the future, an attacker could go back and decrypt all of their past messages. This is where Perfect Forward Secrecy comes in.",
  },
  {
    id: "10",
    title: "The Multi-Device Challenge",
    type: "content",
    content: `
      <h2>The Multi-Device Challenge</h2>
      <ul>
        <li>How to access encrypted messages on multiple devices</li>
        <li>Secure key transfer between devices</li>
        <li>QR code implementation for secure key transfer</li>
        <li>Private key never transmitted in plaintext</li>
        <li>Passphrase never sent over the network</li>
      </ul>
    `,
    notes:
      "Now we face another challenge: how do users access their encrypted messages on multiple devices? The private key that decrypts their messages exists only on one device, but users expect to seamlessly switch between their phone, laptop, and tablet.",
  },
  {
    id: "11",
    title: "Group Chat Complexities",
    type: "content",
    content: `
      <h2>Group Chat Complexities</h2>
      <ul>
        <li>Unique challenges of group messaging</li>
        <li>Pairwise encryption approach</li>
        <li>Message encrypted separately for each recipient</li>
        <li>Trade-offs between security and efficiency</li>
      </ul>
    `,
    notes:
      "Individual conversations are now secure, but what about group chats? This introduces significant new challenges. The simplest approach, which we've implemented in our demo, is pairwise encryption.",
  },
  {
    id: "12",
    title: "Metadata Protection",
    type: "content",
    content: `
      <h2>Metadata Protection</h2>
      <ul>
        <li>Protecting who is talking to whom</li>
        <li>Techniques for metadata protection:</li>
        <li>Message padding - standardizing message sizes</li>
        <li>Traffic analysis resistance</li>
        <li>Minimal logging</li>
      </ul>
    `,
    notes:
      "Even with perfect encryption, we're still leaking important information: metadata. This includes who is talking to whom, when they're talking, how frequently, and how much data they're exchanging.",
  },
  {
    id: "13",
    title: "Conclusion",
    type: "content",
    content: `
      <h2>Conclusion</h2>
      <ul>
        <li>Encryption is a journey, not a destination</li>
        <li>Start with the basics, then iterate</li>
        <li>Security vs. usability trade-offs</li>
        <li>Stay informed about evolving threats and techniques</li>
        <li>Thank you for attending!</li>
      </ul>
    `,
    notes:
      "To wrap up, remember that encryption is a journey, not a destination. Start with the basics, then iterate. Always consider the trade-offs between security and usability. And stay informed about evolving threats and techniques.",
  },
];

/**
 * Get a slide by its ID
 * @param id The slide ID to find
 * @returns The slide or undefined if not found
 */
export function getSlideById(id: string): Slide | undefined {
  return slides.find((slide) => slide.id === id);
}

/**
 * Get the next slide ID
 * @param currentId The current slide ID
 * @returns The next slide ID or the current ID if at the end
 */
export function getNextSlideId(currentId: string): string {
  const currentIndex = slides.findIndex((slide) => slide.id === currentId);
  if (currentIndex === -1 || currentIndex === slides.length - 1) {
    return currentId;
  }
  return slides[currentIndex + 1].id;
}

/**
 * Get the previous slide ID
 * @param currentId The current slide ID
 * @returns The previous slide ID or the current ID if at the beginning
 */
export function getPrevSlideId(currentId: string): string {
  const currentIndex = slides.findIndex((slide) => slide.id === currentId);
  if (currentIndex <= 0) {
    return currentId;
  }
  return slides[currentIndex - 1].id;
}

/**
 * Get the first slide ID
 * @returns The ID of the first slide
 */
export function getFirstSlideId(): string {
  return slides[0].id;
}

/**
 * Get the last slide ID
 * @returns The ID of the last slide
 */
export function getLastSlideId(): string {
  return slides[slides.length - 1].id;
}
