declare module 'reveal.js' {
  /**
   * Reveal.js slide event data
   */
  export interface RevealSlideChangedEvent {
    type: string;           // Event type (e.g., 'slidechanged')
    indexh: number;         // Horizontal index of the current slide
    indexv: number;         // Vertical index of the current slide
    previoush: number;      // Horizontal index of the previous slide
    previousv: number;      // Vertical index of the previous slide
    origin: HTMLElement;    // The slide that triggered the event
  }

  /**
   * Reveal.js fragment event data
   */
  export interface RevealFragmentEvent {
    type: string;           // Event type (e.g., 'fragmentshown', 'fragmenthidden')
    fragment: HTMLElement; // The fragment DOM element
  }

  /**
   * Comprehensive Reveal.js configuration options
   */
  export interface RevealOptions {
    // Core presentation setup
    controls?: boolean;      // Display presentation control arrows
    progress?: boolean;      // Display presentation progress bar
    center?: boolean;        // Vertical centering of slides
    width?: number;         // Presentation width
    height?: number;        // Presentation height
    minScale?: number;      // Minimum scaling factor
    maxScale?: number;      // Maximum scaling factor
    margin?: number;        // Factor of the display size used for slide spacing
    shuffle?: boolean;       // Randomize slide order
    rtl?: boolean;          // Right-to-left presentation direction
    loop?: boolean;         // Loop presentation
    navigationMode?: 'default' | 'linear' | 'grid'; // Navigation mode
    fragments?: boolean;     // Enable fragment animations
    embedded?: boolean;      // Flags if the presentation is running in embedded mode
    help?: boolean;         // Show help overlay when ? is pressed
    pause?: boolean;        // Pauses the presentation when focus is lost
    showNotes?: boolean;    // Show speaker notes

    // Transition settings
    transition?: 'none' | 'fade' | 'slide' | 'convex' | 'concave' | 'zoom'; // Transition style
    transitionSpeed?: 'default' | 'fast' | 'slow';  // Transition speed
    backgroundTransition?: 'none' | 'fade' | 'slide' | 'convex' | 'concave' | 'zoom'; // Background transition style

    // Plugins
    history?: boolean;       // Push slide changes to browser history
    hash?: boolean;          // Enable slide navigation via URL hash
    hashOneBasedIndex?: boolean; // Make the first slide have index 1 in the URL hash
    respondToHashChanges?: boolean; // Respond to hash changes

    // Input
    keyboard?: boolean | Record<string, Function>; // Enable keyboard shortcuts
    keyboardCondition?: null | ((event: KeyboardEvent) => boolean); // Function that determines keyboard event handling
    disableLayout?: boolean; // Disable layout (scaling, centering) logic
    overview?: boolean;      // Enable the slide overview mode
    touch?: boolean;         // Enable touch navigation
    hideInactiveCursor?: boolean; // Hide cursor when inactive
    hideInactiveTimeout?: number; // Timeout before the cursor is hidden (ms)

    // Advanced
    pdfMaxPagesPerSlide?: number; // Max number of pages per slide in PDF output
    pdfSeparateFragments?: boolean; // Separate fragments in PDF output
    pdfPageHeightOffset?: number; // Offset for calculating PDF page height
    viewDistance?: number;   // Number of slides away from the current that are visible
    mobileViewDistance?: number; // Number of slides away from the current that are visible on mobile
    display?: string;       // Display mode that will be used to show slides
    hideAddressBar?: boolean; // Hides the address bar on mobile devices

    // Presentation size
    width?: number | string; // The presentation width
    height?: number | string; // The presentation height
    margin?: number | string; // Factor of the display size used for slide spacing
    minScale?: number;      // Minimum scaling factor
    maxScale?: number;      // Maximum scaling factor
  }

  /**
   * Main Reveal.js class
   */
  class Reveal {
    constructor(container: HTMLElement, options?: RevealOptions);
    
    // Core methods
    initialize(): void;
    destroy(): void;
    sync(): void;
    
    // Navigation methods
    slide(indexh: number, indexv?: number, fragment?: number, origin?: number): void;
    left(): void;
    right(): void;
    up(): void;
    down(): void;
    prev(): void;
    next(): void;
    prevFragment(): boolean;
    nextFragment(): boolean;
    
    // Event handling
    on(type: string, listener: (event: any) => void): void;
    off(type: string, listener: (event: any) => void): void;
    
    // State methods
    isReady(): boolean;
    isOverview(): boolean;
    isPaused(): boolean;
    isAutoSliding(): boolean;
    
    // Slide information
    getIndices(): { h: number; v: number };
    getSlides(): HTMLElement[];
    getTotalSlides(): number;
    
    // Configuration
    getConfig(): RevealOptions;
    configure(options: Partial<RevealOptions>): void;
  }

  export default Reveal;
}
