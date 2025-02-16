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
  const [center, setCenter] = useState({ lat: 28.7041, lng: 77.1025 }); // Default location
  const [userRole, setUserRole] = useState(""); // Store user role
  const polygonRefs = useRef([]);
  const polylineRefs = useRef([]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/profile`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (response.ok && data.user) {
          setUserRole(data.user.role); // ✅ Store user role
          console.log("Fetched User Role:", data.user.role); // Debugging log
        } else {
          console.error("Failed to fetch user role:", data.message);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    fetchUserRole();
  }, []);

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
          adminEmail: projectData.admin, 
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

  // 🌟 Hover Highlight Functions
  const highlightShape = (type, index) => {
    if (type === "polygon" && polygonRefs.current[index]) {
      polygonRefs.current[index].setOptions({
        strokeWeight: 5,
        fillOpacity: 0.7,
      });
    } else if (type === "polyline" && polylineRefs.current[index]) {
      polylineRefs.current[index].setOptions({
        strokeWeight: 6,
      });
    }
  };

  const resetHighlight = (type, index) => {
    if (type === "polygon" && polygonRefs.current[index]) {
      polygonRefs.current[index].setOptions({
        strokeWeight: 2,
        fillOpacity: 0.4,
      });
    } else if (type === "polyline" && polylineRefs.current[index]) {
      polylineRefs.current[index].setOptions({
        strokeWeight: 3,
      });
    }
  };

  const containerStyle = {
    width: "100%",
    height: "400px", // 📌 Reduced size for better UI
  };

  return isLoaded ? (
    <div className="viewing-project-container">
      {/* Navbar */}
      <header className="viewing-navbar">
        <h1>{projectData.projectName || "Project"}</h1>
        {userRole !== "contractor" && (
          <button className="request-access-btn" onClick={requestAccess}>
            Request Access
          </button>
        )}
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
            <Polygon
              key={index}
              paths={polygon.coordinates}
              options={{
                fillOpacity: 0.4,
                fillColor: "#ff0000",
                strokeColor: "#ff0000",
                strokeWeight: 2,
              }}
              onLoad={(polygonInstance) => (polygonRefs.current[index] = polygonInstance)}
            />
          ))}
  
          {polylines.map((polyline, index) => (
            <Polyline
              key={index}
              path={polyline.coordinates}
              options={{
                strokeColor: "#0000ff",
                strokeWeight: 3,
              }}
              onLoad={(polylineInstance) => (polylineRefs.current[index] = polylineInstance)}
            />
          ))}
        </GoogleMap>
      </div>
  
      {/* Shape Management Tables (Side by Side) */}
      <section className="viewing-shape-management tables-container">
        <div className="table-wrapper">
          <h4>Polygons:</h4>
          {polygons.length > 0 ? (
            <table className="shape-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Area (m²)</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {polygons.map((polygon, index) => (
                  <tr
                    key={index}
                    onMouseEnter={() => highlightShape("polygon", index)}
                    onMouseLeave={() => resetHighlight("polygon", index)}
                  >
                    <td>{index + 1}</td>
                    <td>{polygon.area ? polygon.area.toFixed(2) : "Calculating..."}</td>
                    <td>{polygon.location || "Fetching..."}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No polygons available.</p>
          )}
        </div>
  
        <div className="table-wrapper">
          <h4>Polylines:</h4>
          {polylines.length > 0 ? (
            <table className="shape-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Length (m)</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {polylines.map((polyline, index) => (
                  <tr
                    key={index}
                    onMouseEnter={() => highlightShape("polyline", index)}
                    onMouseLeave={() => resetHighlight("polyline", index)}
                  >
                    <td>{index + 1}</td>
                    <td>{polyline.length ? polyline.length.toFixed(2) : "Calculating..."}</td>
                    <td>{polyline.location || "Fetching..."}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No polylines available.</p>
          )}
        </div>
      </section>
    </div>
  ) : (
    <p>Loading...</p>
  );
};

export default ViewingComponent