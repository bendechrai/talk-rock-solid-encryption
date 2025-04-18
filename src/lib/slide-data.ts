import { ReactNode } from 'react';

/**
 * Defines the type of slide content
 */
export type SlideContentType = 'regular' | 'demo';

/**
 * Interface for Reveal.js data attributes
 * These map directly to Reveal.js section data attributes
 */
export interface RevealAttributes {
  'data-background-image'?: string;
  'data-background-color'?: string;
  'data-background-opacity'?: number;
  'data-background-size'?: 'cover' | 'contain' | 'auto';
  'data-background-position'?: string;
  'data-background-transition'?: 'none' | 'fade' | 'slide' | 'convex' | 'concave' | 'zoom';
  'data-transition'?: 'none' | 'fade' | 'slide' | 'convex' | 'concave' | 'zoom';
  'data-auto-animate'?: boolean;
  'data-auto-animate-easing'?: string;
  'data-auto-animate-duration'?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Main slide interface that aligns with Reveal.js expectations
 */
export interface Slide {
  id: string;
  title: string;
  contentType: SlideContentType;
  htmlContent?: string;
  demoId?: string;
  notes?: string;
  attributes: RevealAttributes;
}

export const slides: Slide[] = [
  {
    id: "1",
    title: "Building Rock-Solid Encrypted Applications",
    contentType: "regular",
    htmlContent: `
      <div class="title-slide">
        <h1>Building Rock-Solid Encrypted Applications</h1>
        <p>A technical talk for software developers, architects, and decision makers</p>
      </div>
    `,
    notes: 'Welcome everyone to "Building Rock-Solid Encrypted Applications". Phishing, data theft, and even authoritarianism are on the rise. We need to protect ourselves from adversaries, be they criminals, competitors, or countries.',
    attributes: {
      'data-background-image': "/backgrounds/hacker.png",
      'data-background-size': 'cover',
      'data-background-transition': 'slide',
      'data-transition': 'fade'
    }
  },
  {
    id: "2",
    title: "Introduction",
    contentType: "regular",
    htmlContent: `
      <h2>Introduction</h2>
      <ul>
        <li>Encryption isn't just a technical choice but a necessity</li>
        <li>Regulatory requirements (GDPR, CCPA, etc.)</li>
        <li>Company reputation and PR risk</li>
        <li>User trust and expectations</li>
        <li>Legal and ethical obligations</li>
      </ul>
    `,
    notes: "Emphasize that encryption isn't just a technical choice but increasingly a necessity. Simply adding encryption to your app isn't enough. Many applications claim to be \"encrypted\" but have fundamental security flaws in their implementation.",
    attributes: {}
  },
  {
    id: "3",
    title: "The Vulnerability of Plain Text",
    contentType: "regular",
    htmlContent: `
      <h2>The Vulnerability of Plain Text</h2>
      <ul>
        <li>Most basic version of our chat app</li>
        <li>Messages stored in plaintext</li>
        <li>No access control validation</li>
        <li>Common vulnerability in production applications</li>
      </ul>
    `,
    notes: "Let's start with the most basic version of our chat application. Here's \"Whisper\" in its initial form - a straightforward Next.js app where users can send messages to each other. But there's a problem. All messages are stored in plaintext. Anyone with database access can read every single conversation.",
    attributes: {}
  },
  {
    id: "4",
    title: "Basic Chat Demo",
    contentType: "demo",
    demoId: "demo-1",
    notes: "Demonstrate how changing a URL parameter can access any conversation. Emphasize this is how many apps actually operate in production.",
    attributes: {
      'data-transition': 'slide'
    }
  },
  {
    id: "5",
    title: "Basic Encryption: The False Sense of Security",
    contentType: "regular",
    htmlContent: `
      <h2>Basic Encryption: The False Sense of Security</h2>
      <ul>
        <li>Server-side encryption with a single key</li>
        <li>AES-256-GCM implementation</li>
        <li>Widely adopted, thoroughly vetted</li>
        <li>Provides both confidentiality and authentication</li>
        <li>Efficient with hardware acceleration</li>
      </ul>
    `,
    notes: "The obvious fix is to encrypt our messages. In our second version, we've implemented server-side encryption using AES-256-GCM. Why AES-256-GCM? It's widely adopted and thoroughly vetted by security experts. GCM mode provides both confidentiality and authentication in one package.",
    attributes: {}
  },
  {
    id: "6",
    title: "Symmetric Encryption Demo",
    contentType: "demo",
    demoId: "demo-2",
    notes: "Show the attack scenario. While this protects against a basic database leak, it creates a false sense of security. The problem is that we're using a single server key for all encryption. If that key is compromised, all messages can be decrypted.",
    attributes: {
      'data-transition': 'slide'
    }
  },
  {
    id: "7",
    title: "The Public-Private Key Revolution",
    contentType: "regular",
    htmlContent: `
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
    notes: "So how do we solve this? We need to ensure that even if our server is compromised, the attacker can't read our users' messages. This is where public-private key cryptography comes in. In version 3 of our app, each user generates their own key pair.",
    attributes: {}
  },
  {
    id: "7a",
    title: "Public-Private Key Encryption",
    contentType: "regular",
    htmlContent: `
      <h2>How Public-Private Key Encryption Works</h2>
      <div style="margin: 1.5rem 0; text-align: center;">
        <img src="/images/asymmetric-encryption.png" alt="Asymmetric Encryption Diagram" style="max-width: 100%; max-height: 60vh; object-fit: contain; border-radius: 4px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);" />
      </div>
      <p>Alice can send encrypted messages to Bob using his public key. Only Bob can decrypt them with his private key.</p>
    `,
    notes: "This diagram illustrates how public-private key encryption works. The public key can be freely shared, while the private key must be kept secret.",
    attributes: {}
  },
  {
    id: "8",
    title: "End-to-End Encryption Demo",
    contentType: "demo",
    demoId: "demo-3",
    notes: "Demonstrate end-to-end encryption where the server cannot read messages. Even if I have full server access, I can't read the message because I don't have Bob's private key. This is the foundation of end-to-end encryption.",
    attributes: {
      'data-transition': 'slide'
    }
  },
  {
    id: "9",
    title: "Perfect Forward Secrecy: Protecting the Timeline",
    contentType: "regular",
    htmlContent: `
      <h2>Perfect Forward Secrecy: Protecting the Timeline</h2>
      <ul>
        <li>Ensures past communication remains secure even if keys are compromised</li>
        <li>Generating ephemeral keys for each conversation session</li>
        <li>Key rotation protects past messages</li>
        <li>Shared secrets used only for one session and then discarded</li>
      </ul>
    `,
    notes: "Our app is now much more secure, but there's still a critical vulnerability: if someone's private key is ever compromised in the future, an attacker could go back and decrypt all of their past messages. This is where Perfect Forward Secrecy comes in.",
    attributes: {}
  },
  {
    id: "10",
    title: "The Multi-Device Challenge",
    contentType: "regular",
    htmlContent: `
      <h2>The Multi-Device Challenge</h2>
      <ul>
        <li>How to access encrypted messages on multiple devices</li>
        <li>Secure key transfer between devices</li>
        <li>QR code implementation for secure key transfer</li>
        <li>Private key never transmitted in plaintext</li>
        <li>Passphrase never sent over the network</li>
      </ul>
    `,
    notes: "Now we face another challenge: how do users access their encrypted messages on multiple devices? The private key that decrypts their messages exists only on one device, but users expect to seamlessly switch between their phone, laptop, and tablet.",
    attributes: {}
  },
  {
    id: "11",
    title: "Group Chat Complexities",
    contentType: "regular",
    htmlContent: `
      <h2>Group Chat Complexities</h2>
      <ul>
        <li>Unique challenges of group messaging</li>
        <li>Pairwise encryption approach</li>
        <li>Message encrypted separately for each recipient</li>
        <li>Trade-offs between security and efficiency</li>
      </ul>
    `,
    notes: "Individual conversations are now secure, but what about group chats? This introduces significant new challenges. The simplest approach, which we've implemented in our demo, is pairwise encryption.",
    attributes: {}
  },
  {
    id: "12",
    title: "Metadata Protection",
    contentType: "regular",
    htmlContent: `
      <h2>Metadata Protection</h2>
      <ul>
        <li>Protecting who is talking to whom</li>
        <li>Message padding to hide content length</li>
        <li>Timing obfuscation</li>
        <li>Metadata minimization techniques</li>
      </ul>
    `,
    notes: "Even with end-to-end encryption, metadata remains vulnerable. This includes information about who is communicating with whom, when, and how often. An attacker with access to this metadata could potentially identify relationships, discover organizational structures, or even infer the content of conversations based on patterns.",
    attributes: {}
  },
  {
    id: "13",
    title: "Conclusion",
    contentType: "regular",
    htmlContent: `
      <h2>Building Rock-Solid Encrypted Applications</h2>
      <ul>
        <li>Start with a security-first mindset</li>
        <li>Implement end-to-end encryption</li>
        <li>Use established cryptographic libraries</li>
        <li>Consider Perfect Forward Secrecy</li>
        <li>Don't forget about metadata protection</li>
        <li>Test, audit, and iterate</li>
      </ul>
    `,
    notes: "To summarize, building truly secure encrypted applications requires a holistic approach. Start with a security-first mindset, implement proper end-to-end encryption, use established cryptographic libraries, consider Perfect Forward Secrecy, protect metadata, and continuously test and audit your implementation.",
    attributes: {
      'data-background-color': "#000033",
      'data-background-opacity': 0.8,
      'data-transition': 'fade'
    }
  }
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

/**
 * Get Reveal.js compatible data attributes for a slide
 * @param slide The slide to get attributes for
 * @returns An object with all the data attributes for the slide
 */
export function getSlideAttributes(slide: Slide): Record<string, string | number | boolean> {
  return slide.attributes;
}
