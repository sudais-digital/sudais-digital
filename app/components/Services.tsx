"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

type ServiceKey =
  | "socialMedia"
  | "seo"
  | "googleAds"
  | "metaAds"
  | "contentMarketing"
  | "businessGrowth";

const services: {
  key: ServiceKey;
  icon: string;
}[] = [
  {
    key: "socialMedia",
    icon: "📈",
  },
  {
    key: "seo",
    icon: "🔍",
  },
  {
    key: "googleAds",
    icon: "🎯",
  },
  {
    key: "metaAds",
    icon: "📱",
  },
  {
    key: "contentMarketing",
    icon: "✍️",
  },
  {
    key: "businessGrowth",
    icon: "🚀",
  },
];

const translations: Record<
  string,
  {
    heading: string;
    subheading: string;
    learnMore: string;
    services: Record<
      ServiceKey,
      {
        title: string;
        description: string;
      }
    >;
  }
> = {
  en: {
    heading: "Our Professional Services",
    subheading: "Everything you need to grow your business online.",
    learnMore: "Learn More",
    services: {
      socialMedia: {
        title: "Social Media Marketing",
        description:
          "Professional marketing solutions for all major social media platforms.",
      },
      seo: {
        title: "SEO Optimization",
        description:
          "Improve your website rankings and grow organic traffic.",
      },
      googleAds: {
        title: "Google Ads",
        description:
          "Launch high-performing Google advertising campaigns.",
      },
      metaAds: {
        title: "Meta Ads",
        description:
          "Reach your audience through Facebook and Instagram advertising.",
      },
      contentMarketing: {
        title: "Content Marketing",
        description:
          "Boost your brand with high-quality content strategies.",
      },
      businessGrowth: {
        title: "Business Growth",
        description:
          "Complete digital growth solutions for startups and businesses.",
      },
    },
  },

  romanUrdu: {
    heading: "Hamari Professional Services",
    subheading: "Online business grow karne ke liye har zaroori service.",
    learnMore: "Mazeed Dekhein",
    services: {
      socialMedia: {
        title: "Social Media Marketing",
        description:
          "Tamam major social media platforms ke liye professional marketing solutions.",
      },
      seo: {
        title: "SEO Optimization",
        description:
          "Apni website ranking improve karein aur organic traffic barhayein.",
      },
      googleAds: {
        title: "Google Ads",
        description:
          "High-performing Google advertising campaigns launch karein.",
      },
      metaAds: {
        title: "Meta Ads",
        description:
          "Facebook aur Instagram ads ke zariye apni audience tak pohanchein.",
      },
      contentMarketing: {
        title: "Content Marketing",
        description:
          "High-quality content strategies ke sath apna brand grow karein.",
      },
      businessGrowth: {
        title: "Business Growth",
        description:
          "Startups aur businesses ke liye complete digital growth solutions.",
      },
    },
  },

  ur: {
    heading: "ہماری پیشہ ورانہ خدمات",
    subheading: "اپنے کاروبار کو آن لائن بڑھانے کے لیے ہر ضروری خدمت۔",
    learnMore: "مزید دیکھیں",
    services: {
      socialMedia: {
        title: "سوشل میڈیا مارکیٹنگ",
        description:
          "تمام بڑی سوشل میڈیا پلیٹ فارمز کے لیے پیشہ ورانہ مارکیٹنگ حل۔",
      },
      seo: {
        title: "ایس ای او آپٹیمائزیشن",
        description:
          "اپنی ویب سائٹ کی رینکنگ بہتر کریں اور آرگینک ٹریفک بڑھائیں۔",
      },
      googleAds: {
        title: "گوگل اشتہارات",
        description:
          "بہتر کارکردگی والی گوگل اشتہاری مہمات شروع کریں۔",
      },
      metaAds: {
        title: "میٹا اشتہارات",
        description:
          "فیس بک اور انسٹاگرام اشتہارات کے ذریعے اپنی آڈینس تک پہنچیں۔",
      },
      contentMarketing: {
        title: "کانٹینٹ مارکیٹنگ",
        description:
          "اعلیٰ معیار کی کانٹینٹ حکمت عملی سے اپنے برانڈ کو بڑھائیں۔",
      },
      businessGrowth: {
        title: "کاروباری ترقی",
        description:
          "اسٹارٹ اپس اور کاروباروں کے لیے مکمل ڈیجیٹل ترقی کے حل۔",
      },
    },
  },

  ar: {
    heading: "خدماتنا الاحترافية",
    subheading: "كل ما تحتاجه لتنمية أعمالك عبر الإنترنت.",
    learnMore: "اعرف المزيد",
    services: {
      socialMedia: {
        title: "التسويق عبر وسائل التواصل",
        description:
          "حلول تسويق احترافية لجميع منصات التواصل الاجتماعي الرئيسية.",
      },
      seo: {
        title: "تحسين محركات البحث",
        description: "حسّن ترتيب موقعك وزد الزيارات العضوية.",
      },
      googleAds: {
        title: "إعلانات Google",
        description: "أطلق حملات إعلانية عالية الأداء على Google.",
      },
      metaAds: {
        title: "إعلانات Meta",
        description:
          "صل إلى جمهورك عبر إعلانات Facebook وInstagram.",
      },
      contentMarketing: {
        title: "تسويق المحتوى",
        description:
          "عزّز علامتك التجارية باستراتيجيات محتوى عالية الجودة.",
      },
      businessGrowth: {
        title: "نمو الأعمال",
        description:
          "حلول نمو رقمي متكاملة للشركات الناشئة والأعمال.",
      },
    },
  },
};

export default function Services() {
  const { language } = useLanguage();

  const pageText =
    translations[String(language)] ?? translations.en;

  return (
    <section id="services" className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 text-center">
          <h2 className="text-4xl font-bold text-gray-900">
            {pageText.heading}
          </h2>

          <p className="mt-4 text-gray-600">
            {pageText.subheading}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const serviceText =
              pageText.services[service.key];

            return (
              <div
                key={service.key}
                className="rounded-2xl bg-white p-8 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="text-5xl">
                  {service.icon}
                </div>

                <h3 className="mt-5 text-2xl font-bold text-gray-900">
                  {serviceText.title}
                </h3>

                <p className="mt-4 text-gray-600">
                  {serviceText.description}
                </p>

                <Link
                  href="/services"
                  className="mt-6 inline-flex rounded-lg bg-blue-700 px-6 py-3 text-white transition hover:bg-blue-800"
                >
                  {pageText.learnMore}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}