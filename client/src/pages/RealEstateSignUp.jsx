import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const RealEstateSignUp = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [file, setFile] = useState(null); // State to store the uploaded file
  const [emailValid, setEmailValid] = useState(true);
  const [emailExists, setEmailExists] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState({
    minLength: false,
    upperCase: false,
    lowerCase: false,
    number: false,
    specialChar: false,
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const navigate = useNavigate();

  const passwordPolicy = {
    minLength: (password) => password.length >= 8,
    upperCase: (password) => /[A-Z]/.test(password),
    lowerCase: (password) => /[a-z]/.test(password),
    number: (password) => /[0-9]/.test(password),
    specialChar: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const calculatePasswordStrength = (feedback) => {
    const fulfilledCriteria = Object.values(feedback).filter(Boolean).length;
    return (fulfilledCriteria / Object.keys(feedback).length) * 100;
  };

  const validatePassword = (password) => {
    const feedback = {
      minLength: passwordPolicy.minLength(password),
      upperCase: passwordPolicy.upperCase(password),
      lowerCase: passwordPolicy.lowerCase(password),
      number: passwordPolicy.number(password),
      specialChar: passwordPolicy.specialChar(password),
    };
    setPasswordFeedback(feedback);
    setPasswordStrength(calculatePasswordStrength(feedback));
    return Object.values(feedback).every((criteria) => criteria);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkEmailExists = async (email) => {
    try {
      const response = await fetch(`/api/auth/check-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setEmailExists(data.exists);
      if (data.exists) {
        setError("This email is already registered. Please use a different email.");
      } else {
        setError(null);
      }
    } catch (err) {
      console.error("Error checking email:", err);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id === "email") {
      setEmailValid(validateEmail(value));
      if (validateEmail(value)) {
        checkEmailExists(value);
      }
    }

    if (id === "password") {
      validatePassword(value);
    }

    if (id === "confirmPassword") {
      setPasswordsMatch(value === formData.password);
    }

    setFormData({ ...formData, [id]: value });
  };

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (
      uploadedFile &&
      (uploadedFile.type === "application/pdf" || uploadedFile.type.startsWith("image/"))
    ) {
      setFile(uploadedFile);
      setError(null);
    } else {
      setFile(null);
      setError("Please upload a valid PDF or image file.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!emailValid || emailExists || !passwordsMatch || !file) {
      setError("Please ensure all fields are valid and a file is uploaded.");
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("companyName", formData.companyName);
    formDataToSend.append("email", formData.email);
    formDataToSend.append("file", file);

    try {
      setLoading(true);
      const res = await fetch("/api/auth/send-application", {
        method: "POST",
        body: formDataToSend,
      });

      const data = await res.json();

      if (!data.success) {
        setLoading(false);
        setError(data.message);
        return;
      }

      setLoading(false);
      setError(null);
      alert("Your application has been sent!");
      navigate("/sign-in");
    } catch (error) {
      setLoading(false);
      setError("An error occurred while sending your application.");
    }
  };

  const isFormComplete = () => {
    const { companyName, email } = formData;
    return (
      companyName.trim() !== "" &&
      emailValid &&
      !emailExists &&
      email.trim() !== "" &&
      passwordsMatch &&
      passwordStrength === 100 &&
      file !== null // Ensure a file is uploaded
    );
  };

  return (
    <div className="p-3 max-w-lg mx-auto">
      <h1 className="text-3xl text-center font-semibold my-7">
        Real Estate Company Application
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Real Estate Company Name (required)"
          className="border p-3 rounded-lg"
          id="companyName"
          onChange={handleChange}
          required
        />
        <input
          type="email"
          placeholder="Email (required)"
          className={`border p-3 rounded-lg ${
            emailValid && !emailExists ? "" : "border-red-500"
          }`}
          id="email"
          onChange={handleChange}
          required
        />
        {!emailValid && <p className="text-red-500 text-sm">Invalid email format</p>}
        {emailExists && (
          <p className="text-red-500 text-sm">
            This email is already registered. Please use a different email.
          </p>
        )}
        <input
          type="password"
          placeholder="Password (required)"
          className="border p-3 rounded-lg"
          id="password"
          onChange={handleChange}
          required
        />
        <div>
          <p>Password must meet the following criteria:</p>
          <ul>
            <li style={{ color: passwordFeedback.minLength ? "green" : "red" }}>
              At least 8 characters
            </li>
            <li style={{ color: passwordFeedback.upperCase ? "green" : "red" }}>
              At least one uppercase letter
            </li>
            <li style={{ color: passwordFeedback.lowerCase ? "green" : "red" }}>
              At least one lowercase letter
            </li>
            <li style={{ color: passwordFeedback.number ? "green" : "red" }}>
              At least one number
            </li>
            <li
              style={{ color: passwordFeedback.specialChar ? "green" : "red" }}
            >
              At least one special character (!@#$%^&*)
            </li>
          </ul>
        </div>

        {/* Password Strength Bar */}
        <div className="w-full bg-gray-300 rounded-lg h-2">
          <div
            className={`h-2 rounded-lg transition-all`}
            style={{
              width: `${passwordStrength}%`,
              backgroundColor:
                passwordStrength < 50
                  ? "red"
                  : passwordStrength < 80
                  ? "yellow"
                  : "green",
            }}
          />
        </div>
        <p className="text-sm">
          Password Strength:{" "}
          {passwordStrength < 50
            ? "Weak"
            : passwordStrength < 80
            ? "Moderate"
            : "Strong"}
        </p>

        <input
          type="password"
          placeholder="Confirm Password (required)"
          className={`border p-3 rounded-lg ${
            passwordsMatch ? "" : "border-red-500"
          }`}
          id="confirmPassword"
          onChange={handleChange}
          required
        />
        {!passwordsMatch && (
          <p className="text-red-500 text-sm">Passwords do not match</p>
        )}

        {/* File Upload */}
        <div>
          <label htmlFor="file" className="block font-medium">
            Upload proof of your company (PDF or Image, required):
          </label>
          <input
            type="file"
            id="file"
            className="border p-3 rounded-lg"
            onChange={handleFileChange}
            required
          />
        </div>

        <button
          className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
          disabled={loading || !isFormComplete()}
        >
          {loading ? "Loading..." : "Send Application"}
        </button>
      </form>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      <div className="flex gap-2 mt-5">
        <p>Have an Account?</p>
        <button
          className="text-blue-700 underline focus:outline-none"
          onClick={() => navigate("/sign-in")}
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

export default RealEstateSignUp;