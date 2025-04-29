"use client";

import React, { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

// Import Reveal.js CSS
import "reveal.js/dist/reveal.css";
// Import our custom theme instead of the default
import "@/styles/theme-cybersecurity.css";
import "@/styles/reveal-override.css";
import "@/styles/Presentation.css";

// Import slide data
import { slides, getSlideAttributes } from "@/lib/slide-data";

// Import demo components with dynamic loading
const Demo1 = dynamic(() => import("@/components/demos/demo-1/Demo1"), {
  loading: () => (
    <div className="loading-demo">
      Loading Demo 1...<span className="cursor"></span>
    </div>
  ),
});

const Demo2 = dynamic(() => import("@/components/demos/demo-2/Demo2"), {
  loading: () => (
    <div className="loading-demo">
      Loading Demo 2...<span className="cursor"></span>
    </div>
  ),
});

const Demo3 = dynamic(() => import("@/components/demos/demo-3/Demo3"), {
  loading: () => (
    <div className="loading-demo">
      Loading Demo 3...<span className="cursor"></span>
    </div>
  ),
});

const Demo4 = dynamic(() => import("@/components/demos/demo-4/Demo4"), {
  loading: () => (
    <div className="loading-demo">
      Loading Demo 4...<span className="cursor"></span>
    </div>
  ),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TitleSlide = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <div className="title-slide">
    <h1>{title}</h1>
    {subtitle && <p>{subtitle}</p>}
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SectionSlide = ({ title }: { title: string }) => (
  <div className="section-slide">
    <h2>{title}</h2>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CodeSnippetSlide = ({
  title,
  code,
  language = "javascript",
}: {
  title: string;
  code: string;
  language?: string;
}) => (
  <div className="code-snippet-slide">
    <h2>{title}</h2>
    <pre>
      <code className={language}>{code}</code>
    </pre>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ImageLeftSlide = ({
  title,
  image,
  children,
}: {
  title: string;
  image: string;
  children: React.ReactNode;
}) => (
  <div className="image-left-slide">
    <div className="image-container">
      <img src={image} alt={title} />
    </div>
    <div className="content-container">
      <h2>{title}</h2>
      {children}
    </div>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ImageRightSlide = ({
  title,
  image,
  children,
}: {
  title: string;
  image: string;
  children: React.ReactNode;
}) => (
  <div className="image-right-slide">
    <div className="image-container">
      <img src={image} alt={title} />
    </div>
    <div className="content-container">
      <h2>{title}</h2>
      {children}
    </div>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ImageLargeSlide = ({
  title,
  image,
  caption,
}: {
  title: string;
  image: string;
  caption?: string;
}) => (
  <div className="image-large-slide">
    <h2>{title}</h2>
    <div className="image-container">
      <img src={image} alt={title} />
    </div>
    {caption && <p className="caption">{caption}</p>}
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DemoSlide = ({ title, demoId }: { title: string; demoId: string }) => {
  let DemoComponent = null;

  switch (demoId) {
    case "demo-1":
      DemoComponent = Demo1;
      break;
    case "demo-2":
      DemoComponent = Demo2;
      break;
    case "demo-3":
      DemoComponent = Demo3;
      break;
    case "demo-4":
      DemoComponent = Demo4;
      break;
    default:
      return (
        <div className="demo-slide">
          <h2>{title}</h2>
          <div>Demo not found</div>
        </div>
      );
  }

  return (
    <div className="demo-slide">
      <h2>{title}</h2>
      <div className="demo-container">
        <DemoComponent />
      </div>
    </div>
  );
};

import { useState } from "react";

export default function Presentation() {
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined" || !revealRef.current) return;

    const initReveal = async () => {
      try {
        // Dynamically import Reveal.js
        const Reveal = (await import("reveal.js")).default;

        // Import plugins
        await import("reveal.js/plugin/notes/notes");
        const RevealNotes = (await import("reveal.js/plugin/notes/notes")).default;

        // Import highlight.js plugin for code syntax highlighting
        const RevealHighlight = (
          await import("reveal.js/plugin/highlight/highlight")
        ).default;

        // Initialize Reveal.js with options
        const deck = new Reveal(revealRef.current, {
          hash: true,
          hashOneBasedIndex: false,
          navigationMode: "default",
          history: true,
          controls: false,
          progress: false,
          center: false,
          transition: "fade",
          backgroundTransition: "fade",
          width: 1920,
          height: 1080,
          margin: 0.1,
          minScale: 0.2,
          maxScale: 2.0,
          disableLayout: false,
          // Workaround for TypeScript error with plugins property
          // @ts-expect-error - plugins is a valid Reveal.js option but not in the type definition
          plugins: [RevealHighlight, RevealNotes],
        });

        // Initialize Reveal
        await deck.initialize();

        // Customize the URL format to match the desired pattern
        // This overrides Reveal's default hash pattern
        const customizeURLFormat = () => {
          // Get the current slide index
          const indices = deck.getIndices();
          const slideIndex = indices.h;

          // Update the URL to the desired format: /presentation/#1 instead of /presentation/#/1
          if (slideIndex === 0) {
            window.history.replaceState(null, "", "/presentation/#");
          } else {
            window.history.replaceState(
              null,
              "",
              `/presentation/#${slideIndex}`
            );
          }
        };

        // Call initially to set the correct format
        customizeURLFormat();

        // Add event listener to update URL on slide change
        deck.on("slidechanged", () => {
          customizeURLFormat();
        });
      } catch (error) {
        console.error("Error initializing Reveal.js:", error);
      }
    };

    initReveal();
  }, []);

  return (
    <>
      <div className="reveal" ref={revealRef}>
        <div className="slides">
          {slides.map((slide) => {
            // Create a section element with the appropriate attributes from our slide data
            const sectionProps = {
              ...getSlideAttributes(slide),
              "data-notes": slide.notes,
            };

            // Add content type as data attribute for CSS targeting
            sectionProps["data-content-type"] = slide.contentType;

            // Render different content based on slide type
            if (slide.contentType === "demo") {
              return (
                <section key={slide.id} {...sectionProps}>
                  <DemoSlide title={slide.title} demoId={slide.demoId || ""} />
                </section>
              );
            } else {
              // Regular content slide - use the HTML content directly
              return (
                <section key={slide.id} {...sectionProps}>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: slide.htmlContent || "",
                    }}
                  />
                </section>
              );
            }
          })}
        </div>
      </div>
    </>
  );
}
