export default function Navbar() {
  return (
    <nav className="bg-blue-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold">Sudais Digital</h1>

        <ul className="hidden md:flex gap-8 font-medium">
          <li><a href="#">Home</a></li>
          <li><a href="#">Services</a></li>
          <li><a href="#">Premium</a></li>
          <li><a href="#">Referral</a></li>
          <li><a href="#">Contact</a></li>
        </ul>

        <div className="flex gap-3">
          <button className="px-4 py-2 border border-white rounded-lg hover:bg-white hover:text-blue-700 transition">
            Login
          </button>

          <button className="px-4 py-2 bg-white text-blue-700 rounded-lg font-semibold hover:bg-gray-100 transition">
            Register
          </button>
        </div>
      </div>
    </nav>
  );
}