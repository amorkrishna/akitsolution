import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}

export function SEO({
  title = "Akit Solution - Premium IT & Security Solutions",
  description = "Akit Solution offers premium IT, networking, and security solutions including CCTV installation, server setups, and professional IT support.",
  keywords = "Akit Solution, IT Support, CCTV Installation, Networking, Server Setup, Hardware, Security Solutions",
  image = "/og-image.png", // fallback image
  url = "https://akitsolution.store"
}: SEOProps) {
  // Ensure title always has a suffix if it's not the default
  const fullTitle = title.includes("Akit Solution") ? title : `${title} | Akit Solution`;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
