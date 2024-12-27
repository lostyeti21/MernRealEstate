import { useDispatch, useSelector } from 'react-redux';
import { signInStart, signInSuccess, signInFailure } from '../redux/user/userSlice';
import React, { useState } from 'react'; 
import { useNavigate, Link } from "react-router-dom";
import OAuth from '../components/OAuth';
import styled from 'styled-components';

const StyledPopup = styled.div`
  .cards {
    display: flex;
    gap: 20px;
    justify-content: center;
    padding: 20px;
  }

  .card {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    height: 150px;
    width: 250px;
    border-radius: 10px;
    color: white;
    cursor: pointer;
    transition: 400ms;
  }

  .card.user {
    background-color: #3b82f6;
  }

  .card.agent {
    background-color: #22c55e;
  }

  .card.company {
    background-color: #f43f5e;
  }

  .card p.title {
    font-size: 1.2em;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .card p.description {
    font-size: 0.9em;
  }

  .card:hover {
    transform: scale(1.1, 1.1);
  }

  .cards:hover > .card:not(:hover) {
    filter: blur(10px);
    transform: scale(0.9, 0.9);
  }
`;

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

      // Store user data in Redux and localStorage
      const userData = {
        ...data.user,
        token: data.user.token
      };

      localStorage.setItem('currentUser', JSON.stringify(userData));
      dispatch(signInSuccess(userData));

      // Navigate based on user type
      if (userData.isAgent) {
        navigate('/agent-dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
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

  const handleSignInChoice = (type) => {
    switch (type) {
      case 'user':
        setShowPopup(false); // Hide the popup
        // Stay on current page since we're already on the user sign-in page
        break;
      case 'agent':
        navigate('/real-estate-agent-login');
        break;
      case 'company':
        navigate('/real-estate-login');
        break;
      default:
        break;
    }
  };

  return (
    <div className='p-3 max-w-lg mx-auto'>
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <StyledPopup className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-center mb-6">Sign in as:</h2>
            <div className="cards">
              <div className="card user" onClick={() => handleSignInChoice('user')}>
                <p className="title">Regular User</p>
                <p className="description">Find or list your property</p>
              </div>
              <div className="card agent" onClick={() => handleSignInChoice('agent')}>
                <p className="title">Real Estate Agent</p>
                <p className="description">Manage your listings</p>
              </div>
              <div className="card company" onClick={() => handleSignInChoice('company')}>
                <p className="title">Real Estate Company</p>
                <p className="description">Manage your agency</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setShowPopup(false);
                navigate('/');
              }}
              className="mt-6 text-gray-600 hover:text-gray-800 block mx-auto"
            >
              Close
            </button>
          </StyledPopup>
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



    </div>
  );
};

export default SignIn;