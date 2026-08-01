import Link from "next/link";

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between px-6 py-24 lg:flex-row">
        <div className="max-w-2xl">
          <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
            🌍 Trusted by Digital Marketers Worldwide
          </span>

          <h1 className="mt-6 text-5xl font-extrabold leading-tight lg:text-7xl">
            Grow Your Business With
            <span className="block text-yellow-300">
              Sudais Digital
            </span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-blue-100">
            Professional Digital Marketing Platform for businesses, creators,
            influencers and agencies. Order high-quality marketing services,
            manage campaigns and grow your online presence worldwide.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="rounded-xl bg-white px-8 py-4 font-bold text-blue-700 transition hover:bg-gray-100"
            >
              🚀 Get Started
            </Link>

            <Link
              href="/services"
              className="rounded-xl border border-white px-8 py-4 font-bold transition hover:bg-white hover:text-blue-700"
            >
              View Services
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-10">
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

        <div className="mt-16 lg:mt-0">
          <div className="w-full max-w-[360px] rounded-3xl bg-white p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800">
              Dashboard Preview
            </h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-blue-50 p-4">
                <h3 className="font-bold text-blue-700">
                  Wallet Balance
                </h3>
                <p className="text-3xl font-bold text-gray-800">
                  $1,250.00
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-4">
                <h3 className="font-bold text-green-700">
                  Completed Orders
                </h3>
                <p className="text-2xl font-bold text-gray-800">
                  12,584
                </p>
              </div>

              <div className="rounded-xl bg-purple-50 p-4">
                <h3 className="font-bold text-purple-700">
                  Referral Earnings
                </h3>
                <p className="text-2xl font-bold text-gray-800">
                  $540.00
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}