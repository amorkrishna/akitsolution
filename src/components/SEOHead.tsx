import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  type?: string;
  keywords?: string;
}

export function SEOHead({ title, description, url, image, type = "website", keywords }: SEOHeadProps) {
  useEffect(() => {
    if (title) document.title = title;

    const setMeta = (property: string, content: string, isName = false) => {
      const attr = isName ? "name" : "property";
      let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, property);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    if (description) {
      setMeta("description", description, true);
      setMeta("og:description", description);
      setMeta("twitter:description", description);
    }
    if (keywords) {
      setMeta("keywords", keywords, true);
    }
    if (title) {
      setMeta("og:title", title);
      setMeta("twitter:title", title);
    }
    if (url) {
      setMeta("og:url", url);
      // Canonical link
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = url;
    }
    if (image) {
      setMeta("og:image", image);
      setMeta("og:image:width", "1200");
      setMeta("og:image:height", "630");
      setMeta("twitter:image", image);
    }
    if (type) setMeta("og:type", type);
    setMeta("twitter:card", "summary_large_image", true);
    // Robots
    setMeta("robots", "index, follow, max-snippet:-1, max-image-preview:large", true);
  }, [title, description, url, image, type, keywords]);

  return null;
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
