import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  type?: string;
  keywords?: string;
}

export function SEOHead({ title, description, url, image, type = "website", keywords }: SEOHeadProps) {
  return (
    <Helmet>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Open Graph */}
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      {url && <meta property="og:url" content={url} />}
      {url && <link rel="canonical" href={url} />}
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:width" content="1200" />}
      {image && <meta property="og:image:height" content="630" />}
      {type && <meta property="og:type" content={type} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      {image && <meta name="twitter:image" content={image} />}
      
      {/* Robots */}
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
    </Helmet>
  );
}

// LocalBusiness JSON-LD for Google My Business / Maps
export function LocalBusinessJsonLd({ settings }: { settings: any }) {
  useEffect(() => {
    const id = "localbusiness-jsonld";
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: settings.company_name || "AK IT Solution",
      description: "AK IT Solution — Professional CCTV Installation Service, Network Setup, Attendance Device Installation & IT Support in Dhaka & across Bangladesh. আমরা ঢাকা সহ সারা বাংলাদেশে সিসিটিভি ইনস্টলেশন, নেটওয়ার্ক সেটআপ, অ্যাটেনডেন্স ডিভাইস ইনস্টলেশন ও আইটি সাপোর্ট সার্ভিস প্রদান করি।",
      url: "https://akitsolution.store",
      telephone: settings.phone || "01919-060590",
      email: settings.email || "akitsolution77@gmail.com",
      address: {
        "@type": "PostalAddress",
        streetAddress: settings.address || "Suvastu Arcade (ICT Bhaban), Mohottuli, Dhaka",
        addressLocality: "Dhaka",
        addressCountry: "BD",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: "23.7508",
        longitude: "90.3849",
      },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Saturday", "Sunday"],
        opens: "10:00",
        closes: "20:00",
      },
      priceRange: "৳৳",
      currenciesAccepted: "BDT",
      paymentAccepted: "Cash, bKash, Nagad, Bank Transfer",
      image: settings.logo_url || "https://akitsolution.store/og-image.png",
      sameAs: [
        "https://www.facebook.com/profile.php?id=61573238854096",
        "https://maps.google.com/maps?vet=10CAAQoqAOahcKEwiomuvbvvaUAxUAAAAAHQAAAAAQDw..i&pvq=Cg0vZy8xMXN2NnEyZ2pxIhAKCmljdCBiaGFiYW4QAhgD&lqi=ChhpY3QgYmhhYmFuIGVsZXBoYW50IHJvYWRIlvSE6-i4gIAIWiIQABABGAAYASIYaWN0IGJoYWJhbiBlbGVwaGFudCByb2FkkgEPc2hvcHBpbmdfY2VudGVy&fvr=1&cs=1&um=1&ie=UTF-8&fb=1&gl=bd&sa=X&ftid=0x3755b9363e67d0a7:0x29f78b6a505d1267"
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "IT Services & Products",
        itemListElement: [
          { "@type": "OfferCatalog", name: "CCTV Camera Installation Service Bangladesh" },
          { "@type": "OfferCatalog", name: "Network Setup Service Bangladesh" },
          { "@type": "OfferCatalog", name: "Attendance Device Installation Bangladesh" },
          { "@type": "OfferCatalog", name: "IT Support Service Bangladesh" },
          { "@type": "OfferCatalog", name: "Server Configuration Bangladesh" },
          { "@type": "OfferCatalog", name: "CCTV Repair & Maintenance Bangladesh" },
          { "@type": "OfferCatalog", name: "CCTV Cameras" },
          { "@type": "OfferCatalog", name: "Networking Equipment" },
          { "@type": "OfferCatalog", name: "Attendance Devices" },
        ],
      },
    };

    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => { document.getElementById(id)?.remove(); };
  }, [settings]);

  return null;
}

// Service JSON-LD
export function ServiceListJsonLd({ services }: { services: Array<{ id: string; name: string; price: number; description?: string | null; category?: string }> }) {
  useEffect(() => {
    const id = "service-jsonld";
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    if (!services.length) return;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "AK IT Solution Services",
      url: "https://akitsolution.store/",
      numberOfItems: services.length,
      itemListElement: services.slice(0, 30).map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Service",
          name: s.name,
          ...(s.description && { description: s.description }),
          provider: { "@type": "Organization", name: "AK IT Solution" },
          areaServed: { "@type": "Country", name: "Bangladesh" },
          offers: {
            "@type": "Offer",
            price: s.price.toFixed(2),
            priceCurrency: "BDT",
          },
        },
      })),
    };

    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => { document.getElementById(id)?.remove(); };
  }, [services]);

  return null;
}

interface ProductJsonLdProps {
  products: Array<{
    id: string;
    name: string;
    price: number;
    description?: string | null;
    image_url?: string | null;
    category?: string;
    brand?: string | null;
    stock_quantity?: number;
    discount_percentage?: number | null;
  }>;
}

export function ProductListJsonLd({ products }: ProductJsonLdProps) {
  useEffect(() => {
    const existingScript = document.getElementById("product-jsonld");
    if (existingScript) existingScript.remove();

    if (!products.length) return;

    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "AK IT Solution Products",
      url: "https://akitsolution.store/",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 50).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: p.name,
          url: `https://akitsolution.store/?product=${p.id}`,
          ...(p.image_url && { image: p.image_url }),
          ...(p.description && { description: p.description }),
          ...(p.brand && { brand: { "@type": "Brand", name: p.brand } }),
          offers: {
            "@type": "Offer",
            price: p.discount_percentage
              ? (p.price * (1 - p.discount_percentage / 100)).toFixed(2)
              : p.price.toFixed(2),
            priceCurrency: "BDT",
            availability: (p.stock_quantity ?? 0) > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: "AK IT Solution" },
          },
        },
      })),
    };

    const script = document.createElement("script");
    script.id = "product-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(itemList);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById("product-jsonld");
      if (el) el.remove();
    };
  }, [products]);

  return null;
}
