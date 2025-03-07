import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import OAuth from "../components/OAuth";
import Background from "../components/Background";

const SignUp = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [emailExists, setEmailExists] = useState(false); // Tracks if the email is already registered
  const [generatedCode, setGeneratedCode] = useState(null);
  const [enteredCode, setEnteredCode] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Tracks if the password is visible
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstname: "",
    middlename: "",
    lastname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [emailValid, setEmailValid] = useState(true);
  const [passwordFeedback, setPasswordFeedback] = useState({
    minLength: false,
    upperCase: false,
    lowerCase: false,
    number: false,
    specialChar: false,
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

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
        setError(null); // Clear any previous error messages
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
        checkEmailExists(value); // Check if the email is already registered
      }
    }

    if (id === "password") {
      validatePassword(value);
    }

    if (id === "confirmPassword") {
      setPasswordsMatch(value === formData.password);
    }

    if (id === "confirmationCode") {
      setEnteredCode(value);
    }

    setFormData({ ...formData, [id]: value });
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword); // Toggle password visibility
  };

  const handleSendConfirmationCode = async () => {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);

      const response = await fetch("/api/auth/send-confirmation-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email, code }),
      });

      if (!response.ok) {
        throw new Error("Failed to send the confirmation code.");
      }

      setConfirmationStep(true);
      setError(null);
    } catch (error) {
      console.error("Error in sending confirmation code:", error.message);
      setError("Failed to send confirmation code. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!confirmationStep) {
      handleSendConfirmationCode();
      return;
    }

    if (enteredCode !== generatedCode) {
      setError("The confirmation code is incorrect. Please check your email.");
      return;
    }

    try {
      setLoading(true);
      const combinedUsername = `${formData.firstname.trim()} ${
        formData.middlename ? formData.middlename.trim() + " " : ""
      }${formData.lastname.trim()}`.trim();

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          ...formData, 
          username: combinedUsername,
          password: formData.password // Correctly send the password
        }),
      });

      const data = await res.json();

      if (data.success === false) {
        setLoading(false);
        setError(data.message);
        return;
      }

      setLoading(false);
      setError(null);
      navigate("/sign-in");
    } catch (error) {
      setLoading(false);
      setError(error.message);
    }
  };

  const isFormComplete = () => {
    const { firstname, lastname, email } = formData;
    return (
      firstname.trim() !== "" &&
      lastname.trim() !== "" &&
      emailValid &&
      email.trim() !== "" &&
      passwordsMatch &&
      !emailExists // Ensure the email is not already registered
    );
  };

  return (
    <div className="relative w-full min-h-screen">
      <Background />
      <div className="absolute w-full" style={{ top: '-180px' }}>
        <h1 className="text-[120px] font-bold text-gray-100 uppercase whitespace-nowrap text-center" style={{ letterSpacing: '-0.05em' }}>
          <span style={{ color: '#d2d1e6', opacity: 0.6 }}>LANDLORD</span>
          <span style={{ color: '#009688', opacity: 0.2 }}> / TENANT</span>
        </h1>
      </div>

      <div className="p-2 max-w-lg mx-auto" style={{ marginTop: '12%' }}>
        <h1 className="text-3xl text-center font-semibold my-7">
          {confirmationStep ? "Confirm Your Email" : "Sign Up"}
        </h1>

      {!confirmationStep && (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">First Name <span className="text-red-500">(Required)</span></label>
              <input
                type="text"
                id="firstname"
                className='border p-4 rounded-lg text-lg w-full'
                value={formData.firstname}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Middle Name <span className="text-gray-500">(Optional)</span></label>
              <input
                type="text"
                id="middlename"
                className='border p-4 rounded-lg text-lg w-full'
                value={formData.middlename}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Last Name <span className="text-red-500">(Required)</span></label>
              <input
                type="text"
                id="lastname"
                className='border p-4 rounded-lg text-lg w-full'
                value={formData.lastname}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Email <span className="text-red-500">(Required)</span></label>
              <input
                type="email"
                id="email"
                className={`border p-4 rounded-lg text-lg w-full ${emailValid ? "" : "border-red-500"}`}
                value={formData.email}
                onChange={handleChange}
                required
              />
              {!emailValid && <p className="text-red-500 text-sm">Invalid email format</p>}
              {emailExists && (
                <p className="text-red-500 text-sm">
                  This email is already registered. Please use a different email.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Password <span className="text-red-500">(Required)</span></label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className='border p-4 rounded-lg text-lg w-full'
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

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
                <li style={{ color: passwordFeedback.specialChar ? "green" : "red" }}>
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

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Confirm Password <span className="text-red-500">(Required)</span></label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                className={`border p-4 rounded-lg text-lg w-full ${passwordsMatch ? "" : "border-red-500"}`}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              {!passwordsMatch && <p className="text-red-500 text-sm">Passwords do not match</p>}
            </div>

            <label className="flex items-center gap-2">
              <input type="checkbox" onChange={toggleShowPassword} />
              <span>Show Passwords</span>
            </label>

            <button
              className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
              disabled={loading || passwordStrength < 100 || !isFormComplete()}
            >
              {loading ? "Loading..." : "Sign Up"}
            </button>
          </form>
        </>
      )}

      {confirmationStep && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Enter Confirmation Code</label>
            <input
              type="text"
              id="confirmationCode"
              className='border p-4 rounded-lg text-lg w-full'
              value={enteredCode}
              onChange={handleChange}
              required
            />
          </div>
          <button
            className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95"
            type="submit"
          >
            Confirm Email Address
          </button>
        </form>
      )}

      {error && <p className="text-red-500 m-0 mt-4">{error}</p>}

      <div className="flex gap-2 mt-5">
        <p>Have an Account?</p>
        <Link to="/sign-in">
          <span className="text-blue-700">Sign In</span>
        </Link>
      </div>
      </div>
    </div>
  );
};

export default SignUp;
