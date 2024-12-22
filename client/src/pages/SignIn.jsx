import { useDispatch, useSelector } from 'react-redux';
import { signInStart, signInSuccess, signInFailure } from '../redux/user/userSlice';
import React, { useState } from 'react'; 
import { useNavigate, Link } from "react-router-dom";
import OAuth from '../components/OAuth';

const SignIn = () => {
  const dispatch = useDispatch();
  const { loading, error, currentUser } = useSelector((state) => state.user); // Access currentUser from state
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [showPopup, setShowPopup] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showConfirmationCodeInput, setShowConfirmationCodeInput] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState(null);
  const [passwordFeedback, setPasswordFeedback] = useState({
    minLength: false,
    upperCase: false,
    lowerCase: false,
    number: false,
    specialChar: false,
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [newPasswordData, setNewPasswordData] = useState({ newPassword: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleResetEmailChange = (e) => {
    setResetEmail(e.target.value);
  };

  const handleResetChange = (e) => {
    const { id, value } = e.target;
    setNewPasswordData({ ...newPasswordData, [id]: value });
    if (id === "newPassword") {
      validatePassword(value);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      dispatch(signInStart());
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      const data = await res.json();
      
      if (!data.success) {
        dispatch(signInFailure(data.message));
        return;
      }

      localStorage.setItem('currentUser', JSON.stringify(data.user));
      dispatch(signInSuccess(data.user));
      navigate('/');
    } catch (error) {
      console.error('Sign in error:', error);
      dispatch(signInFailure(error.message));
    }
  };

  const handlePasswordReset = async () => {
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (!data.exists) {
        alert("No account is associated with this email address.");
        return;
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);

      const codeRes = await fetch("/api/auth/send-confirmation-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: resetEmail, code }),
      });
      if (!codeRes.ok) {
        throw new Error("Failed to send the reset code.");
      }
      alert("Confirmation code sent to your email.");
      setShowConfirmationCodeInput(true);
    } catch (error) {
      console.error("Error in password reset flow:", error);
      alert("An error occurred while processing the password reset request.");
    }
  };

  const handleConfirmationSubmit = () => {
    if (confirmationCode === generatedCode) {
      setShowResetPassword(true);
      setShowConfirmationCodeInput(false);
    } else {
      alert("The confirmation code is incorrect.");
    }
  };

  const handlePasswordResetSubmit = async () => {
    if (newPasswordData.newPassword !== newPasswordData.confirmPassword) {
      alert("The new password and confirm password fields do not match.");
      return;
    }

    if (!validatePassword(newPasswordData.newPassword)) {
      alert("New password does not meet the required criteria.");
      return;
    }

    try {
      const res = await fetch("/api/user/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: resetEmail, password: newPasswordData.newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password.");
      }

      alert("Password reset successful. Please log in with your new password.");
      setShowResetPassword(false);
      setShowConfirmationCodeInput(false);
      setResetEmail("");
      setNewPasswordData({ newPassword: "", confirmPassword: "" });
      navigate("/sign-in"); // Redirect to the sign-in page
    } catch (error) {
      console.error("Error in resetting the password:", error);
      alert(error.message || "An error occurred while resetting the password.");
    }
  };

  return (
    <div className='p-3 max-w-lg mx-auto'>
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg max-w-md w-full text-center">
            <h2 className="text-xl font-semibold mb-4">Sign in as:</h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowPopup(false)}
                className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
              >
                Individual Landlord or Tenant
              </button>
              <button
                onClick={() => navigate("/real-estate-login")}
                className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600"
              >
                Real Estate Company
              </button>
              <button
                onClick={() => navigate("/real-estate-agent-login")}
                className="bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600"
              >
                Real Estate Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {!showPopup && !showResetPassword && !showConfirmationCodeInput && (
        <>
          <h1 className="text-3xl text-center font-semibold my-7">Sign In</h1>

          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <input
              type='email'
              placeholder='Email'
              className='border p-3 rounded-lg'
              id="email"
              onChange={handleChange}
            />

            <input
              type={showPassword ? 'text' : 'password'}
              placeholder='Password'
              className='border p-3 rounded-lg'
              id="password"
              onChange={handleChange}
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                onChange={toggleShowPassword}
              />
              <span>Show Password</span>
            </label>

            <button
              className='bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80'
              disabled={loading}
            >
              {loading ? "Loading..." : "Sign In"}
            </button>
            <OAuth />
          </form>

          <div className='flex gap-2 mt-5'>
            <p>Don't have an account?</p>
            <button
              onClick={() => navigate("/sign-up")}
              className='text-blue-700 underline focus:outline-none'
            >
              Sign Up
            </button>
          </div>

          <div className='mt-5'>
            <p className='text-center'>Forgot your password?</p>
            <input
              type='email'
              placeholder='Enter your email address'
              className='border p-3 rounded-lg w-full mt-2'
              value={resetEmail}
              onChange={handleResetEmailChange}
            />
            <button
              onClick={handlePasswordReset}
              className='bg-blue-500 text-white p-3 rounded-lg w-full mt-3 hover:opacity-95'
            >
              Reset Account Password
            </button>
          </div>
        </>
      )}

      {showConfirmationCodeInput && (
        <div className='mt-5'>
          <h1 className="text-3xl text-center font-semibold my-7">Enter Confirmation Code</h1>
          <input
            type='text'
            placeholder='Confirmation Code'
            className='border p-3 rounded-lg w-full mt-2'
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value)}
          />
          <button
            onClick={handleConfirmationSubmit}
            className='bg-blue-500 text-white p-3 rounded-lg w-full mt-3 hover:opacity-95'
          >
            Submit Confirmation Code
          </button>
        </div>
      )}

      {showResetPassword && (
        <div>
          <h1 className="text-3xl text-center font-semibold my-7">Reset Password</h1>

          <div className='flex flex-col gap-4'>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder='New Password'
              className='border p-3 rounded-lg'
              id="newPassword"
              onChange={handleResetChange}
            />

            <input
              type={showPassword ? 'text' : 'password'}
              placeholder='Confirm New Password'
              className='border p-3 rounded-lg'
              id="confirmPassword"
              onChange={handleResetChange}
            />

            <label className="flex items-center gap-2">
              <input type="checkbox" onChange={toggleShowPassword} />
              <span>Show Password</span>
            </label>

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
            <p className="text-sm">
              Password Strength: {passwordStrength < 50 ? "Weak" : passwordStrength < 80 ? "Moderate" : "Strong"}
            </p>

            <button
              className="bg-green-600 text-white p-3 rounded-lg uppercase hover:opacity-95"
              onClick={handlePasswordResetSubmit}
              disabled={
                newPasswordData.newPassword !== newPasswordData.confirmPassword
              }
            >
              Reset Password
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 mt-5">
        <p className="text-center">Are you a Real Estate Company?</p>
        <Link 
          to="/real-estate-signup"
          className="bg-green-700 text-white p-3 rounded-lg text-center uppercase hover:opacity-95"
        >
          Sign Up as Real Estate Company
        </Link>
      </div>
    </div>
  );
};

export default SignIn;
