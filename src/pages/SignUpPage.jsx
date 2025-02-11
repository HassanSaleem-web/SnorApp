import React, { useState } from "react";
import { auth, provider } from "../services/FireBaseConfig";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../styles/SignUpPage.css"; // Optional CSS file for styling

const SignUpPage = () => {
  const [role, setRole] = useState(null); // To store the selected role
  const [loading, setLoading] = useState(false); // Loading state for better UX
  const navigate = useNavigate();

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    if (!role) {
      alert("Please select a role before signing up.");
      return;
    }

    setLoading(true); // Show loading state
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
     

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/google-signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role }),
      });
      
      // Check if the response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Unexpected response format. Please check the backend.");
      }

      const data = await response.json();

      if (response.ok) {
        console.log("data", data);
        localStorage.setItem("token", JSON.stringify(idToken));
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate(role === "user" ? "/dashboard-user" : "/dashboard-contractor");
      } else {
        alert(data.message || "Sign-in failed.");
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error.message);
      alert("Failed to sign in. Please try again.");
    } finally {
      setLoading(false); // Hide loading state
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h1>Welcome to Snør</h1>
        <p>Sign up as User or Contractor to begin!</p>

        {/* Role Selection */}
        <div className="role-selection">
          <h3>Select Your Role:</h3>
          <div className="role-buttons">
            <button
              className={`role-btn ${role === "user" ? "active" : ""}`}
              onClick={() => setRole("user")}
              disabled={loading} // Disable buttons during loading
            >
              Sign Up as User
            </button>
            <button
              className={`role-btn ${role === "contractor" ? "active" : ""}`}
              onClick={() => setRole("contractor")}
              disabled={loading} // Disable buttons during loading
            >
              Sign Up as Contractor
            </button>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <button
          className="google-btn"
          onClick={handleGoogleSignIn}
          disabled={loading} // Disable button during loading
        >
          {loading ? (
            <span>Signing In...</span>
          ) : (
            <>
              <img
                src="/assets/google-icon.png" /* Path to the downloaded image */
                alt="Google Icon"
                className="google-icon"
              />
              Sign Up with Google
            </>
          )}
        </button>

        {/* Login Option */}
        <p className="login-option">
          Already registered? <a href="/login">Log In</a>
        </p>

        {/* Terms and Conditions */}
        <p className="terms">
          By signing up, you agree to our{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Terms & Conditions
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>.
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
