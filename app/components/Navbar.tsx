import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-blue-700 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-2xl font-bold">
          Sudais Digital
        </Link>

        <ul className="hidden gap-8 font-medium md:flex">
          <li>
            <Link href="/" className="transition hover:text-blue-200">
              Home
            </Link>
          </li>

          <li>
            <Link
              href="/services"
              className="transition hover:text-blue-200"
            >
              Services
            </Link>
          </li>

          <li>
            <Link
              href="/premium"
              className="transition hover:text-blue-200"
            >
              Premium
            </Link>
          </li>

          <li>
            <Link
              href="/referrals"
              className="transition hover:text-blue-200"
            >
              Referral
            </Link>
          </li>

          <li>
            <a
              href="#contact"
              className="transition hover:text-blue-200"
            >
              Contact
            </a>
          </li>
        </ul>

        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-white px-4 py-2 transition hover:bg-white hover:text-blue-700"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="rounded-lg bg-white px-4 py-2 font-semibold text-blue-700 transition hover:bg-gray-100"
          >
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}