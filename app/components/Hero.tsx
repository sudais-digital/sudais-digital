export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white">
      <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center justify-between">

        {/* Left Side */}
        <div className="max-w-2xl">
          <span className="bg-white/20 px-4 py-2 rounded-full text-sm font-semibold">
            🌍 Trusted by Digital Marketers Worldwide
          </span>

          <h1 className="text-5xl lg:text-7xl font-extrabold mt-6 leading-tight">
            Grow Your Business With
            <span className="block text-yellow-300">
              Sudais Digital
            </span>
          </h1>

          <p className="mt-6 text-lg text-blue-100 leading-8">
            Professional Digital Marketing Platform for businesses, creators,
            influencers and agencies. Order high-quality marketing services,
            manage campaigns and grow your online presence worldwide.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <button className="bg-white text-blue-700 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition">
              🚀 Get Started
            </button>

            <button className="border border-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-blue-700 transition">
              View Services
            </button>
          </div>

          <div className="flex gap-10 mt-12">
            <div>
              <h2 className="text-3xl font-bold">100K+</h2>
              <p className="text-blue-100">Orders Completed</p>
            </div>

            <div>
              <h2 className="text-3xl font-bold">190+</h2>
              <p className="text-blue-100">Countries Supported</p>
            </div>

            <div>
              <h2 className="text-3xl font-bold">24/7</h2>
              <p className="text-blue-100">Support</p>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="mt-16 lg:mt-0">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-[360px]">

            <h2 className="text-2xl font-bold text-gray-800">
              Dashboard Preview
            </h2>

            <div className="mt-6 space-y-4">

              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-bold text-blue-700">Wallet Balance</h3>
                <p className="text-3xl font-bold text-gray-800">$1,250.00</p>
              </div>

              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="font-bold text-green-700">Completed Orders</h3>
                <p className="text-2xl font-bold text-gray-800">12,584</p>
              </div>

              <div className="bg-purple-50 rounded-xl p-4">
                <h3 className="font-bold text-purple-700">Referral Earnings</h3>
                <p className="text-2xl font-bold text-gray-800">$540.00</p>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}