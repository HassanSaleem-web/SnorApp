import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  GoogleMap,
  Polygon,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import "../styles/ViewingComponent.css";

const libraries = ["places", "drawing", "geometry"];

const ViewingComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef(null);

  const [projectData, setProjectData] = useState(location.state?.project || {});
  const [polygons, setPolygons] = useState(projectData.polygons || []);
  const [polylines, setPolylines] = useState(projectData.polylines || []);
  const [center, setCenter] = useState({ lat: 28.7041, lng: 77.1025 }); // Default (Temporary)
  const [loading, setLoading] = useState(false); // Loading state for button

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    if (projectData?.address && isLoaded) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: projectData.address }, (results, status) => {
        if (status === "OK" && results[0]) {
          const location = results[0].geometry.location;
          setCenter({ lat: location.lat(), lng: location.lng() });
        } else {
          console.error("Geocoding failed:", status);
        }
      });
    }
  }, [isLoaded, projectData]);

  // 📌 Handle Access Request
  const requestAccess = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("User not authenticated.");
      return;
    }
  
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/project/request-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: projectData._id,
          adminEmail: projectData.admin,  // ✅ Ensure this is included
        }),
      });
  
      const data = await response.json();
      if (response.ok) {
        alert("Request sent successfully!");
      } else {
        alert(data.message || "Failed to send request.");
      }
    } catch (error) {
      console.error("Error requesting access:", error);
      alert("Error requesting access.");
    }
  };
  

  const containerStyle = {
    width: "100%",
    height: "500px",
  };

  const polygonOptions = {
    fillOpacity: 0.4,
    fillColor: "#ff0000",
    strokeColor: "#ff0000",
    strokeWeight: 2,
  };

  const polylineOptions = {
    strokeColor: "#0000ff",
    strokeWeight: 3,
  };

  return isLoaded ? (
    <div className="viewing-project-container">
      {/* Navbar */}
      <header className="viewing-navbar">
        <h1>{projectData.projectName || "Project"}</h1>
        <button className="request-access-btn" onClick={requestAccess} disabled={loading}>
          {loading ? "Requesting..." : "Request Access"}
        </button>
        <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
      </header>

      {/* Project Details */}
      <section className="viewing-project-details">
        <p><strong>Description:</strong> {projectData.description}</p>
        <p><strong>Status:</strong> {projectData.status}</p>
        <p><strong>Total Area:</strong> {projectData.totalArea?.toFixed(2)} m²</p>
        <p><strong>Total Length:</strong> {projectData.totalLength?.toFixed(2)} m</p>
      </section>

      {/* Google Map */}
      <div className="viewing-map-container">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={15}
          onLoad={(map) => (mapRef.current = map)}
        >
          {polygons.map((polygon, index) => (
            <Polygon key={index} paths={polygon.coordinates} options={polygonOptions} />
          ))}

          {polylines.map((polyline, index) => (
            <Polyline key={index} path={polyline.coordinates} options={polylineOptions} />
          ))}
        </GoogleMap>
      </div>
    </div>
  ) : (
    <p>Loading...</p>
  );
};

export default ViewingComponent;
