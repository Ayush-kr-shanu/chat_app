import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../api/auth";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const login = await loginUser(form);

      console.log("LOGIN:", login);

      const accessToken = login.tokens?.accessToken;
      const refreshToken = login.tokens?.refreshToken;
      console.log("ACCESS TOKEN:", login?.tokens?.accessToken);
      console.log("REFRESH TOKEN:", login?.tokens?.refreshToken);
      console.log("VAR ACCESS TOKEN ", accessToken)
      console.log("VAR REFRESH TOKEN ", refreshToken);

      if (!accessToken) {
        throw new Error("Token missing");
      }

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(login.user));

      console.log("Stored token:", localStorage.getItem("accessToken"));

      navigate("/"); // 🔥 important fix
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Section */}
      <div className="hidden md:flex w-1/2 bg-linear-to-br from-indigo-600 to-purple-700 items-center justify-center text-white">
        <div className="text-center px-10">
          <h1 className="text-4xl font-bold mb-4">Chat App</h1>
          <p className="text-lg opacity-80">
            Connect with people in real-time. Fast, secure & modern.
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-gray-100">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Welcome Back 👋
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Enter your password"
              />
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition duration-200"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Footer */}
          <p className="text-sm text-gray-500 text-center mt-6">
            Don’t have an account?{" "}
            <span
              onClick={() => navigate("/register")}
              className="text-indigo-600 cursor-pointer hover:underline"
            >
              Register
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
