/**
 * Defines the type of slide content
 */
export type SlideContentType = "regular" | "demo";

/**
 * Interface for Reveal.js data attributes
 * These map directly to Reveal.js section data attributes
 */
export interface RevealAttributes {
  "data-background-image"?: string;
  "data-background-color"?: string;
  "data-background-opacity"?: number;
  "data-background-size"?: "cover" | "contain" | "auto";
  "data-background-position"?: string;
  "data-background-transition"?:
    | "none"
    | "fade"
    | "slide"
    | "convex"
    | "concave"
    | "zoom";
  "data-transition"?: "none" | "fade" | "slide" | "convex" | "concave" | "zoom";
  "data-auto-animate"?: boolean;
  "data-auto-animate-easing"?: string;
  "data-auto-animate-duration"?: number;
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
        <h1><span>Building <span class="nowrap">Rock-Solid</span> Encrypted Applications</span></h1>
        <p class="byline">@bendechr.ai</p>
      </div>
    `,
    notes:
      "Welcome everyone! Today we're going to explore how to build truly secure encrypted" +
      " applications. Not just ones that claim to be secure, but ones that actually protect" +
      " your users' data against sophisticated adversaries.",
    attributes: {
      "data-background-image": "/backgrounds/hacker.png",
      "data-background-size": "cover",
    },
  },
  {
    id: "1.5",
    title: "There are three things in life that are certain:",
    contentType: "regular",
    htmlContent: `
      <h2>There are three things in life that are certain:</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <ul style="font-size: 2em;">
          <li class="fragment">Phishing</li>
          <li class="fragment">Data Theft</li>
          <li class="fragment">Authoritarianism</li>
        </ul>
      </div>
    `,
    notes:
      "There are three things in life that are certain: phishing, data theft, and authoritarianism. We need to protect ourselves from these threats.",
    attributes: {},
  },
  {
    id: "2",
    title: "Introduction",
    contentType: "regular",
    htmlContent: `
      <h2>Introduction</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <ul>
          <li class="fragment">Encryption isn't just a technical choice but a necessity</li>
          <li class="fragment">Regulatory requirements (GDPR, CCPA, etc.)</li>
          <li class="fragment">Company reputation and PR risk</li>
          <li class="fragment">User trust and expectations</li>
          <li class="fragment">Legal and ethical obligations</li>
        </ul>
      </div>
    `,
    notes:
      "Emphasize that encryption isn't just a technical choice but increasingly a necessity. Simply adding encryption to your app isn't enough. Many applications claim to be \"encrypted\" but have fundamental security flaws in their implementation.",
    attributes: {},
  },
  {
    id: "3",
    title: "The Vulnerability of Plain Text",
    contentType: "regular",
    htmlContent: `
      <h2>The Vulnerability of Plain Text</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <ul>
          <li class="fragment">Most basic version of our chat app</li>
          <li class="fragment">Messages stored in plaintext</li>
          <li class="fragment">No access control validation</li>
          <li class="fragment">Common vulnerability in production applications</li>
        </ul>
      </div>
    `,
    notes:
      "Let's start with the most basic version of our chat application. Here's \"Whisper\" in its initial form - a straightforward Next.js app where users can send messages to each other. But there's a problem. All messages are stored in plaintext. Anyone with database access can read every single conversation.",
    attributes: {},
  },
  {
    id: "4",
    title: "Basic Chat Demo",
    contentType: "demo",
    demoId: "demo-1",
    notes:
      "Demonstrate how changing a URL parameter can access any conversation. Emphasize this is how many apps actually operate in production.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "5",
    title: "Basic Encryption: The False Sense of Security",
    contentType: "regular",
    htmlContent: `
      <h2>Basic Encryption: The False Sense of Security</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <ul>
          <li class="fragment">Server-side encryption with a single key</li>
          <li class="fragment">AES-256-GCM implementation</li>
          <li class="fragment">Widely adopted, thoroughly vetted</li>
          <li class="fragment">Provides both confidentiality and authentication</li>
          <li class="fragment">Efficient with hardware acceleration</li>
        </ul>
      </div>
    `,
    notes:
      "The obvious fix is to encrypt our messages. In our second version, we've implemented server-side encryption using AES-256-GCM. Why AES-256-GCM? It's widely adopted and thoroughly vetted by security experts. GCM mode provides both confidentiality and authentication in one package.",
    attributes: {},
  },
  {
    id: "6",
    title: "Symmetric Encryption Demo",
    contentType: "demo",
    demoId: "demo-2",
    notes:
      "Show the attack scenario. While this protects against a basic database leak, it creates a false sense of security. The problem is that we're using a single server key for all encryption. If that key is compromised, all messages can be decrypted.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "7",
    title: "The Public-Private Key Revolution",
    contentType: "regular",
    htmlContent: `
      <h2>The Public-Private Key Revolution</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <ul>
          <li class="fragment">Using Diffie-Hellman key pairs for asymmetric encryption</li>
          <li class="fragment">Implementation using @noble/curves</li>
          <li class="fragment">End-to-end encryption where the server cannot read messages</li>
          <li class="fragment">Each user generates their own key pair</li>
          <li class="fragment">Messages encrypted with recipient's public key</li>
          <li class="fragment">Can only be decrypted with private key that never leaves the device</li>
        </ul>
      </div>
    `,
    notes:
      "So how do we solve this? We need to ensure that even if our server is compromised, the attacker can't read our users' messages. This is where public-private key cryptography comes in. In version 3 of our app, each user generates their own key pair.",
    attributes: {},
  },
  {
    id: "8",
    title: "Public-Private Key Encryption",
    contentType: "regular",
    htmlContent: `
      <h2>How Public-Private Key Encryption Works</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <img src="/images/asymmetric-encryption.png" alt="Asymmetric Encryption Diagram" style="max-width: 100%; max-height: 60vh; object-fit: contain; border-radius: 4px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);" />
      </div>
    `,
    notes:
      "This diagram illustrates how public-private key encryption works. The public key can be freely shared, while the private key must be kept secret.",
    attributes: {},
  },
  {
    id: "9",
    title: "End-to-End Encryption Demo",
    contentType: "demo",
    demoId: "demo-3",
    notes:
      "Demonstrate end-to-end encryption where the server cannot read messages. Even if I have full server access, I can't read the message because I don't have Bob's private key. This is the foundation of end-to-end encryption.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "10",
    title: "Perfect Forward Secrecy: Protecting the Timeline",
    contentType: "regular",
    htmlContent: `
      <h2>Perfect Forward Secrecy: Protecting the Timeline</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <ul>
          <li class="fragment">Ensures past communication remains secure even if keys are compromised</li>
          <li class="fragment">Generating ephemeral keys for each conversation session</li>
          <li class="fragment">Key rotation protects past messages</li>
          <li class="fragment">Shared secrets used only for one session and then discarded</li>
        </ul>
      </div>
    `,
    notes:
      "Our app is now much more secure, but there's still a critical vulnerability: if someone's private key is ever compromised in the future, an attacker could go back and decrypt all of their past messages. This is where Perfect Forward Secrecy comes in.",
    attributes: {},
  },
  {
    id: "11",
    title: "Ephemeral Key Management Challenges",
    contentType: "regular",
    htmlContent: `
      <h2>Ephemeral Key Management Challenges</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <ul>
          <li class="fragment">Ephemeral keys are temporary by design</li>
          <li class="fragment">Key expiration creates practical challenges:</li>
          <ul>
            <li class="fragment">What if a recipient hasn't been online recently?</li>
            <li class="fragment">How long should keys remain valid?</li>
            <li class="fragment">What happens when keys expire during a conversation?</li>
          </ul>
          <li class="fragment">Security vs. usability trade-offs</li>
        </ul>
      </div>
    `,
    notes:
      "Ephemeral keys create a fundamental challenge: if keys expire quickly (good for security), users who haven't been online won't have valid keys. If Alice wants to message Bob, but Bob hasn't logged in for days, his ephemeral keys will have expired. This creates a tension between security (short-lived keys) and usability (ensuring messages can be delivered).",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "12",
    title: "Real-World Ephemeral Key Solutions",
    contentType: "regular",
    htmlContent: `
      <h2>Real-World Ephemeral Key Solutions</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <ul>
          <li class="fragment">Signal Protocol's approach:</li>
          <ul>
            <li class="fragment">Pre-key bundles uploaded when online</li>
            <li class="fragment">One-time use keys for new conversations</li>
            <li class="fragment">Double Ratchet Algorithm for key evolution</li>
        </ul>
        <li class="fragment">Message queuing for offline recipients</li>
        <li class="fragment">Tiered key approach: identity, signed pre-keys, and one-time keys</li>
      </ul>
      </div>
    `,
    notes:
      "Real-world applications solve this with sophisticated key management. Signal uses a 'pre-key bundle' system where users upload multiple ephemeral keys when online. Messages to offline users can be queued until they return. The Double Ratchet Algorithm evolves keys with each message, maintaining forward secrecy while ensuring delivery. This creates a balance between security and practical usability.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "13",
    title: "Perfect Forward Secrecy Demo",
    contentType: "demo",
    demoId: "demo-4",
    notes:
      "Demonstrate how key rotation protects past messages. Show how ephemeral keys are generated for each conversation and how they prevent decryption of past messages even if the long-term private key is compromised. Use the Decryption Panel to demonstrate a key compromise scenario. Note that for this demo, ephemeral keys last longer than they would in production to make the demo practical.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "14",
    title: "Production PFS: Hybrid Encryption",
    contentType: "regular",
    htmlContent: `
      <h2>Production PFS: Hybrid Encryption</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <h3 class="fragment">Demo Implementation</h3>
        <ul>
          <li class="fragment">Direct asymmetric encryption</li>
          <li class="fragment">Separate encryption for each recipient</li>
          <li class="fragment">Multiple message copies stored</li>
          <li class="fragment">Slower but simpler to understand</li>
        </ul>
        <h3 class="fragment">Production Systems (Signal, etc.)</h3>
        <ul>
          <li class="fragment">Diffie-Hellman key exchange to derive shared secret</li>
          <li class="fragment">Shared secret used for symmetric encryption</li>
          <li class="fragment">Single message copy for all recipients</li>
          <li class="fragment">Faster and more storage-efficient</li>
        </ul>
      </div>
    `,
    notes:
      "Our demo uses direct asymmetric encryption for simplicity, but production systems like Signal use a more efficient approach. They use ephemeral keys to perform a Diffie-Hellman key exchange, deriving a shared secret. This shared secret is then used for symmetric encryption, which is much faster than asymmetric encryption. It also means only one copy of the message needs to be stored, rather than encrypting it separately for each recipient. This hybrid approach (asymmetric for key exchange, symmetric for message encryption) offers both security and performance benefits.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "15",
    title: "The Multi-Device Challenge",
    contentType: "regular",
    htmlContent: `
      <h2>The Multi-Device Challenge</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <ul>
          <li class="fragment">How to access encrypted messages on multiple devices</li>
          <li class="fragment">Secure key transfer between devices</li>
          <li class="fragment">QR code implementation for secure key transfer</li>
          <li class="fragment">Private key never transmitted in plaintext</li>
          <li class="fragment">Passphrase never sent over the network</li>
      </ul>
      </div>
    `,
    notes:
      "Now we face another challenge: how do users access their encrypted messages on multiple devices? The private key that decrypts their messages exists only on one device, but users expect to seamlessly switch between their phone, laptop, and tablet.",
    attributes: {},
  },
  {
    id: "16",
    title: "Group Chat Complexities",
    contentType: "regular",
    htmlContent: `
      <h2>Group Chat Complexities</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <ul>
          <li class="fragment">Unique challenges of group messaging</li>
          <li class="fragment">Pairwise encryption approach</li>
          <li class="fragment">Message encrypted separately for each recipient</li>
          <li class="fragment">Trade-offs between security and efficiency</li>
        </ul>
      </div>
    `,
    notes:
      "Individual conversations are now secure, but what about group chats? This introduces significant new challenges. The simplest approach, which we've implemented in our demo, is pairwise encryption.",
    attributes: {},
  },
  {
    id: "17",
    title: "Metadata Protection",
    contentType: "regular",
    htmlContent: `
      <h2>Metadata Protection</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <ul>
          <li class="fragment">Protecting who is talking to whom</li>
          <li class="fragment">Message padding to hide content length</li>
          <li class="fragment">Timing obfuscation</li>
          <li class="fragment">Metadata minimization techniques</li>
        </ul>
      </div>
    `,
    notes:
      "Even with end-to-end encryption, metadata remains vulnerable. This includes information about who is communicating with whom, when, and how often. An attacker with access to this metadata could potentially identify relationships, discover organizational structures, or even infer the content of conversations based on patterns.",
    attributes: {},
  },
  {
    id: "18",
    title: "Perfect Forward Secrecy: Key Generation",
    contentType: "regular",
    htmlContent: `
      <h2>Perfect Forward Secrecy: Key Generation</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 85vh; width: 100%;">
        <img class="fragment" src="/images/diagram-pfs-keygen.png" alt="Perfect Forward Secrecy Key Generation" style="margin: 0; width: 100%; height: 100%; object-fit: contain; border: none; box-shadow: none;" />
      </div>
    `,
    notes:
      "This flowchart illustrates how Perfect Forward Secrecy works. For each new conversation session, both parties generate temporary ephemeral key pairs. They exchange ephemeral public keys and use them with their own ephemeral private keys to create a shared secret. This shared secret is used only for this session and then discarded.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "19",
    title: "Perfect Forward Secrecy: Message Sending",
    contentType: "regular",
    htmlContent: `
      <h2>Perfect Forward Secrecy: Message Sending</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 85vh; width: 100%;">
        <img class="fragment" src="/images/diagram-pfs-send.png" alt="Perfect Forward Secrecy Message Sending" style="margin: 0; width: 100%; height: 100%; object-fit: contain; border: none; box-shadow: none;" />
      </div>
    `,
    notes:
      "This flowchart illustrates how Perfect Forward Secrecy works. For each new conversation session, both parties generate temporary ephemeral key pairs. They exchange ephemeral public keys and use them with their own ephemeral private keys to create a shared secret. This shared secret is used only for this session and then discarded.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "20",
    title: "Perfect Forward Secrecy: Message Reception",
    contentType: "regular",
    htmlContent: `
      <h2>Perfect Forward Secrecy: Message Reception</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 85vh; width: 100%;">
        <img class="fragment" src="/images/diagram-pfs-receive.png" alt="Perfect Forward Secrecy Message Reception" style="margin: 0; width: 100%; height: 100%; object-fit: contain; border: none; box-shadow: none;" />
      </div>
    `,
    notes:
      "This flowchart illustrates how Perfect Forward Secrecy works. For each new conversation session, both parties generate temporary ephemeral key pairs. They exchange ephemeral public keys and use them with their own ephemeral private keys to create a shared secret. This shared secret is used only for this session and then discarded.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "21",
    title: "Key Compromise Visualization",
    contentType: "regular",
    htmlContent: `
      <h2>Key Compromise Visualization</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <h3 class="fragment">Without Forward Secrecy</h3>
        <div class="compromise-diagram">
          <img src="/images/no-forward-secrecy.png" alt="Without Forward Secrecy" style="max-width: 100%; max-height: 40vh;" />
        </div>
        <p class="fragment">If private key is compromised, <strong>all past messages</strong> can be decrypted</p>
        <h3 class="fragment">With Forward Secrecy</h3>
          <div class="compromise-diagram">
            <img src="/images/with-forward-secrecy.png" alt="With Forward Secrecy" style="max-width: 100%; max-height: 40vh;" />
          </div>
          <p class="fragment">If private key is compromised, <strong>only current session</strong> is affected</p>
      </div>
    `,
    notes:
      "This visual comparison shows the difference between systems with and without Perfect Forward Secrecy. Without PFS, if a long-term private key is compromised, all past messages can be decrypted. With PFS, even if the long-term key is compromised, past messages remain secure because they were encrypted with ephemeral keys that no longer exist.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "22",
    title: "Multi-Device Key Transfer Flow",
    contentType: "regular",
    htmlContent: `
      <h2>Multi-Device Key Transfer Flow</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <img src="/images/key-transfer-flow.png" alt="Key Transfer Flow Diagram" style="max-width: 100%; max-height: 60vh; object-fit: contain; border-radius: 4px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);" />
      </div>
      <ol>
        <li class="fragment">New device generates random passphrase</li>
        <li class="fragment">QR code contains passphrase + transfer ID</li>
        <li class="fragment">Existing device encrypts private key with passphrase</li>
        <li class="fragment">Encrypted key sent to server with transfer ID</li>
        <li class="fragment">New device retrieves and decrypts the key</li>
      </ol>
    `,
    notes:
      "This diagram shows the secure key transfer process between devices. The QR code mechanism requires physical proximity as an added security measure. The private key is never transmitted in plaintext, and the symmetric encryption passphrase is never sent over the network - it's only exchanged via the QR code.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "23",
    title: "Group Chat Encryption Approaches",
    contentType: "regular",
    htmlContent: `
      <h2>Group Chat Encryption Approaches</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <h3 class="fragment">Pairwise Encryption</h3>
        <div class="approach-diagram">
          <img src="/images/pairwise-encryption.png" alt="Pairwise Encryption" style="max-width: 100%; max-height: 30vh;" />
        </div>
        <p class="fragment"><strong>Pros:</strong> Simple, secure</p>
        <p class="fragment"><strong>Cons:</strong> Scales poorly (n² problem)</p>
        <h3 class="fragment">Shared Group Key</h3>
        <div class="approach-diagram">
          <img src="/images/group-key.png" alt="Shared Group Key" style="max-width: 100%; max-height: 30vh;" />
        </div>
        <p class="fragment"><strong>Pros:</strong> Efficient</p>
        <p class="fragment"><strong>Cons:</strong> Complex key rotation when members leave</p>
      </div>
    `,
    notes:
      "Group chats introduce significant new challenges. The simplest approach is pairwise encryption - when Alice sends a message to a group with Bob and Charlie, her client encrypts the message separately for each recipient using their respective public keys. While secure, this doesn't scale well. The alternative is using a shared group key, but this creates complex key rotation problems when members leave the group.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "24",
    title: "Scaling to Massive Groups",
    contentType: "regular",
    htmlContent: `
      <h2>Scaling to Massive Groups: Hierarchical Key Bundles</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <img src="/images/hierarchical-keys.png" alt="Hierarchical Key Bundles" style="max-width: 100%; max-height: 50vh; object-fit: contain; border-radius: 4px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);" />
      </div>
      <ul>
        <li class="fragment">Divide large group into manageable subgroups</li>
        <li class="fragment">Each subgroup has its own subgroup key (SGK)</li>
        <li class="fragment">Main group key encrypted with each subgroup key</li>
        <li class="fragment">When member leaves, only rotate affected subgroup key</li>
        <li class="fragment">Dramatically reduces key rotation overhead</li>
      </ul>
    `,
    notes:
      "When scaling to groups with thousands or even hundreds of thousands of members, we need more sophisticated approaches. Hierarchical key bundles divide the large group into manageable subgroups. Each subgroup has its own key, and the main group key is encrypted with each subgroup key. When a member leaves, we only rotate the affected subgroup key and re-encrypt the group key with it, dramatically reducing the overhead.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "25",
    title: "Metadata Protection Techniques",
    contentType: "regular",
    htmlContent: `
      <h2>Metadata Protection Techniques</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <h3 class="fragment">Message Padding</h3>
        <div class="technique-icon">
          <img src="/images/padding-icon.png" alt="Message Padding" style="max-width: 80%; max-height: 15vh;" />
        </div>
        <p class="fragment">Standardize message sizes to hide actual length</p>
        <h3 class="fragment">Timing Obfuscation</h3>
        <div class="technique-icon">
          <img src="/images/timing-icon.png" alt="Timing Obfuscation" style="max-width: 80%; max-height: 15vh;" />
        </div>
        <p class="fragment">Random delays to prevent timing analysis</p>
        <h3 class="fragment">Decoy Traffic</h3>
        <div class="technique-icon">
          <img src="/images/decoy-icon.png" alt="Decoy Traffic" style="max-width: 80%; max-height: 15vh;" />
        </div>
        <p class="fragment">Fake messages to obscure real patterns</p>
      </div>
    `,
    notes:
      "Even with perfect encryption, metadata remains vulnerable. This includes who is talking to whom, when, and how often. Protection techniques include message padding to standardize sizes, timing obfuscation with random delays, and decoy traffic to obscure real communication patterns. Each technique comes with performance and usability trade-offs.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "26",
    title: "Security vs. Usability Trade-offs",
    contentType: "regular",
    htmlContent: `
      <h2>Security vs. Usability Trade-offs</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
        <img src="/images/security-usability.png" alt="Security vs Usability Spectrum" style="max-width: 100%; max-height: 50vh; object-fit: contain; border-radius: 4px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);" />
      </div>
      <ul>
        <li class="fragment">More security often means more friction</li>
        <li class="fragment">Key considerations:</li>
        <ul>
          <li class="fragment">User experience impact of security measures</li>
          <li class="fragment">Performance implications</li>
          <li class="fragment">Appropriate security for your threat model</li>
          <li class="fragment">Regulatory requirements</li>
        </ul>
      </ul>
    `,
    notes:
      "Security isn't binary - it's a spectrum. Every decision involves trade-offs between security, usability, and performance. The most secure system fails if users can't or won't use it properly. Your job is to make informed decisions based on your specific threat model and requirements.",
    attributes: {
      "data-transition": "slide",
    },
  },
  {
    id: "27",
    title: "Conclusion",
    contentType: "regular",
    htmlContent: `
      <h2>Building Rock-Solid Encrypted Applications</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
      <ul>
        <li class="fragment">Start with a security-first mindset</li>
        <li class="fragment">Implement end-to-end encryption</li>
        <li class="fragment">Use established cryptographic libraries</li>
        <li class="fragment">Consider Perfect Forward Secrecy</li>
        <li class="fragment">Don't forget about metadata protection</li>
        <li class="fragment">Test, audit, and iterate</li>
      </ul>
      </div>
    `,
    notes:
      "To summarize, building truly secure encrypted applications requires a holistic approach. Start with a security-first mindset, implement proper end-to-end encryption, use established cryptographic libraries, consider Perfect Forward Secrecy, protect metadata, and continuously test and audit your implementation.",
    attributes: {
      "data-background-color": "#000033",
      "data-background-opacity": 0.8,
      "data-transition": "fade",
    },
  },
  {
    id: "28",
    title: "Key Takeaways",
    contentType: "regular",
    htmlContent: `
      <h2>Key Takeaways</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh; width: 100%;">
      <ol>
        <li class="fragment">Never store sensitive data in plaintext</li>
        <li class="fragment">Don't rely solely on server-side encryption</li>
        <li class="fragment">Implement proper key management with user control</li>
        <li class="fragment">Consider perfect forward secrecy for temporal protection</li>
        <li class="fragment">Protect metadata, not just content</li>
        <li class="fragment">Design for the human element</li>
      </ol>
      </div>
    `,
    notes:
      "The most important takeaways: Never store sensitive data in plaintext. Don't rely solely on server-side encryption. Implement proper key management with user control. Consider perfect forward secrecy for temporal protection. Protect metadata, not just content. Design for the human element - the most secure system fails if users can't or won't use it properly.",
    attributes: {
      "data-transition": "fade",
    },
  },
  {
    id: "29",
    title: "Thank You",
    contentType: "regular",
    htmlContent: `
      <div class="title-slide">
        <h1>Thank You!</h1>
        <p class="byline">Questions?</p>
        <p class="contact">@bendechr.ai</p>
      </div>
    `,
    notes: "Thank you for your attention! I'm happy to take any questions.",
    attributes: {
      "data-background-image": "/backgrounds/thank-you.png",
      "data-background-size": "cover",
      "data-background-opacity": 0.8,
    },
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

/**
 * Get Reveal.js compatible data attributes for a slide
 * @param slide The slide to get attributes for
 * @returns An object with all the data attributes for the slide
 */
export function getSlideAttributes(
  slide: Slide
): Record<string, string | number | boolean> {
  return slide.attributes;
}
