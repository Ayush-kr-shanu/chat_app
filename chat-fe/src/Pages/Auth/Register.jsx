import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../api/auth";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);

    try {
      delete form.confirmPassword;
      const res = await registerUser(form)
      console.log("REGISTER:", res);
      navigate("/login");
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Section */}
      <div className="hidden md:flex w-1/2 bg-linear-to-br from-purple-600 to-indigo-700 items-center justify-center text-white">
        <div className="text-center px-10">
          <h1 className="text-4xl font-bold mb-4">Join Chat App 🚀</h1>
          <p className="text-lg opacity-80">
            Create your account and start chatting instantly.
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-gray-100">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Create Account
          </h2>

          {error && (
            <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Name"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            {/* Email */}
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="Email"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            {/* Phone */}
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
              placeholder="Phone"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            {/* Password */}
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Password"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            {/* Confirm Password */}
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm Password"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition duration-200"
            >
              {loading ? "Creating..." : "Register"}
            </button>
          </form>

          {/* Footer */}
          <p className="text-sm text-gray-500 text-center mt-6">
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-indigo-600 cursor-pointer hover:underline"
            >
              Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
