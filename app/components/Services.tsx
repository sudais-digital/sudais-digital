const services = [
  {
    title: "Social Media Marketing",
    description: "Professional marketing solutions for all major social media platforms.",
    icon: "📈",
  },
  {
    title: "SEO Optimization",
    description: "Improve your website rankings and grow organic traffic.",
    icon: "🔍",
  },
  {
    title: "Google Ads",
    description: "Launch high-performing Google advertising campaigns.",
    icon: "🎯",
  },
  {
    title: "Meta Ads",
    description: "Reach your audience through Facebook and Instagram advertising.",
    icon: "📱",
  },
  {
    title: "Content Marketing",
    description: "Boost your brand with high-quality content strategies.",
    icon: "✍️",
  },
  {
    title: "Business Growth",
    description: "Complete digital growth solutions for startups and businesses.",
    icon: "🚀",
  },
];

export default function Services() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-gray-900">
            Our Professional Services
          </h2>

          <p className="text-gray-600 mt-4">
            Everything you need to grow your business online.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

          {services.map((service, index) => (

            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition duration-300"
            >
              <div className="text-5xl">{service.icon}</div>

              <h3 className="text-2xl font-bold mt-5">
                {service.title}
              </h3>

              <p className="text-gray-600 mt-4">
                {service.description}
              </p>

              <button className="mt-6 bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition">
                Learn More
              </button>
            </div>

          ))}

        </div>

      </div>
    </section>
  );
}