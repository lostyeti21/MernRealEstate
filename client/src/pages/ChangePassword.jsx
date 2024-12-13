import React, { useState } from "react";
import { useSelector } from "react-redux";

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState({
    minLength: false,
    upperCase: false,
    lowerCase: false,
    number: false,
    specialChar: false,
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const { currentUser } = useSelector((state) => state.user);

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

  const handleSendConfirmationCode = async () => {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);

      const response = await fetch("/api/auth/send-confirmation-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: currentUser.email, code }),
      });

      if (!response.ok) {
        throw new Error("Failed to send confirmation code.");
      }

      setConfirmationStep(true);
      setError(null);
    } catch (error) {
      setError("Failed to send confirmation code. Please try again.");
    }
  };

  const handleVerifyCodeAndChangePassword = async () => {
    if (enteredCode !== generatedCode) {
      setError("The confirmation code is incorrect. Please check your email.");
      return;
    }

    if (!validatePassword(newPassword)) {
      setError("New password does not meet the required criteria.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const userId = currentUser?._id;

      const res = await fetch(`/api/user/change-password/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to change password.");
      }

      setSuccess("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setEnteredCode("");
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!confirmationStep) {
      handleSendConfirmationCode();
    } else {
      handleVerifyCodeAndChangePassword();
    }
  };

  return (
    <div className="p-5 max-w-md mx-auto">
      <h1 className="text-3xl font-semibold text-center mb-5">
        Change Password for Your Account
      </h1>

      {!confirmationStep ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Old Password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="border p-3 rounded-lg"
            required
          />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              validatePassword(e.target.value);
            }}
            className="border p-3 rounded-lg"
            required
          />
          <ul className="text-sm mb-3">
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
              At least one special character (!@#$%^&*).
            </li>
          </ul>
          <div className="w-full bg-gray-300 rounded-lg h-2">
            <div
              className="h-2 rounded-lg transition-all"
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
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border p-3 rounded-lg"
            required
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showPassword"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
            />
            <label htmlFor="showPassword">Show Passwords</label>
          </div>
          {error && <p className="text-red-500">{error}</p>}
          {success && <p className="text-green-500">{success}</p>}
          <button
            type="submit"
            className="bg-blue-700 text-white p-3 rounded-lg uppercase hover:opacity-90"
          >
            {confirmationStep ? "Verify and Change Password" : "Send Confirmation Code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter Confirmation Code"
            value={enteredCode}
            onChange={(e) => setEnteredCode(e.target.value)}
            className="border p-3 rounded-lg"
            required
          />
          {error && <p className="text-red-500">{error}</p>}
          {success && <p className="text-green-500">{success}</p>}
          <button
            type="submit"
            className="bg-blue-700 text-white p-3 rounded-lg uppercase hover:opacity-90"
          >
            Verify and Change Password
          </button>
        </form>
      )}
    </div>
  );
};

export default ChangePassword;
