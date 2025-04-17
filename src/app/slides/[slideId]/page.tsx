import SlidePageClient from './page.client';

// Server component that renders the client component
// This avoids the params.slideId issue by moving all param handling to the client
export default function SlidePage() {
  return <SlidePageClient />;
}
