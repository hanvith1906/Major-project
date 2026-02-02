import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCar, FaEnvelope, FaSignInAlt, FaShieldAlt } from "react-icons/fa";

const Login = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    // Simple email validation
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    // Save email to localStorage
    localStorage.setItem("userEmail", email);

    // Navigate to upload page
    navigate("/upload");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 py-6 px-8 text-center">
            <div className="flex items-center justify-center space-x-3">
              <FaCar className="text-white text-3xl" />
              <h1 className="text-2xl font-bold text-white">
                License Plate Detection
              </h1>
            </div>
            <p className="mt-2 text-indigo-100">
              Secure vehicle identification system
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-indigo-100 p-4 rounded-full">
                <FaShieldAlt className="text-indigo-600 text-3xl" />
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label
                  htmlFor="email"
                  className="block text-gray-700 font-medium mb-2"
                >
                  Your Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    placeholder="example@domain.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                  />
                </div>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center space-x-2"
              >
                <FaSignInAlt />
                <span>Continue to Detection</span>
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>We'll send detection results to this email and via SMS</p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 text-center">
            <p className="text-xs text-gray-500">
              Secure system compliant with data protection regulations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
