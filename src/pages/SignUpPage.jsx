import React, { useState } from "react";
import { auth, provider } from "../services/FireBaseConfig";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../styles/SignUpPage.css";

const SignUpPage = () => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Function to fetch user address using Geolocation + Google Reverse Geocoding API
  const fetchUserAddress = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        return data.results[0].formatted_address; // Extract formatted address
      }
      return null;
    } catch (error) {
      console.error("Error fetching address:", error);
      return null;
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    if (!role) {
      alert("Please select a role before signing up.");
      return;
    }

    setLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      let address = null;

      if (role === "user" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            address = await fetchUserAddress(latitude, longitude);
            proceedWithSignIn(idToken, address);
          },
          (error) => {
            console.error("Geolocation error:", error);
            proceedWithSignIn(idToken, null);
          }
        );
      } else {
        proceedWithSignIn(idToken, null);
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error.message);
      alert("Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  // Proceed with sign-in and send data to the backend
  const proceedWithSignIn = async (idToken, address) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/google-signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role, address }), // Send address if available
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Unexpected response format. Please check the backend.");
      }

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", JSON.stringify(idToken));
        localStorage.setItem("user", JSON.stringify(data.user));
        if (address) localStorage.setItem("address", JSON.stringify(address)); // Store address

        navigate(role === "user" ? "/dashboard-user" : "/dashboard-contractor");
      } else {
        alert(data.message || "Sign-in failed.");
      }
    } catch (error) {
      console.error("Sign-In Error:", error.message);
      alert("Failed to complete sign-in. Please try again.");
    } finally {
      setLoading(false);
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
              disabled={loading}
            >
              Sign Up as HomeOwner
            </button>
            <button
              className={`role-btn ${role === "contractor" ? "active" : ""}`}
              onClick={() => setRole("contractor")}
              disabled={loading}
            >
              Sign Up as Contractor
            </button>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <button
          className="google-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <span>Signing In...</span>
          ) : (
            <>
              <img
                src="/assets/google-icon.png"
                alt="Google Icon"
                className="google-icon"
              />
              Sign Up with Google
            </>
          )}
        </button>

        <p className="login-option">
          Already registered? <a href="/login">Log In</a>
        </p>

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
