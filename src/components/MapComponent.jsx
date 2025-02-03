import React, { useRef, useState, useEffect } from "react";
import "../styles/MapComponent.css";
import {
  DrawingManager,
  GoogleMap,
  Polygon,
  Polyline,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { useLocation, useNavigate } from "react-router-dom";

const libraries = ["places", "drawing", "geometry"];

const MapComponent = () => {
  const mapRef = useRef();
  const polygonRefs = useRef([]);
  const polylineRefs = useRef([]);
  const [polygons, setPolygons] = useState([]);
  const [polylines, setPolylines] = useState([]);
  const [area, setArea] = useState(0);
  const [polylineLength, setPolylineLength] = useState(0);

  // Project Details State
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Active");
  const [adminEmail, setAdminEmail] = useState("");

  // Address-related state
  const [center, setCenter] = useState({ lat: 28.626137, lng: 79.821603 });
  const [markerPosition, setMarkerPosition] = useState(null);

  const { state } = useLocation(); // Get the address passed from UserDashboard
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const containerStyle = {
    width: "100%",
    height: "500px",
  };

  const geocodeAddress = async (address) => {
    const geocoder = new window.google.maps.Geocoder();
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results[0]) {
          resolve(results[0].geometry.location);
        } else {
          reject(new Error("Geocoding failed"));
        }
      });
    });
  };

  useEffect(() => {
    if (isLoaded && state?.address) {
      geocodeAddress(state.address)
        .then((location) => {
          const position = { lat: location.lat(), lng: location.lng() };
          setCenter(position);
          setMarkerPosition(position);
        })
        .catch((error) => {
          console.error("Error geocoding address:", error);
          alert("Unable to find the entered address.");
        });
    }

    // Fetch the admin email from local storage
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.email) {
      setAdminEmail(user.email);
    }
  }, [isLoaded, state]);

  const saveProject = async () => {
    if (!projectName.trim()) {
      alert("Please enter a project name.");
      return;
    }
    if (!description.trim()) {
      alert("Please enter a description.");
      return;
    }
    if (polygons.length === 0 && polylines.length === 0) {
      alert("Please draw at least one shape (polygon or polyline).");
      return;
    }

    // Prepare the project data
    const projectData = {
      name: projectName,
      description,
      status,
      admin: adminEmail,
      address: state?.address || "Unknown",
      polygons: polygons.map((polygon) => ({
        coordinates: polygon,
        addedBy: adminEmail, // or the user adding the polygon
      })),
      polylines: polylines.map((polyline) => ({
        coordinates: polyline,
        addedBy: adminEmail, // or the user adding the polyline
      })),
      totalArea: area,
      totalLength: polylineLength,
    };

    try {
      // Send the project data to the backend
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        alert("Project saved successfully!");
        navigate("/dashboard");
      } else {
        const errorData = await response.json();
        console.error("Error saving project:", errorData.message);
        alert("Failed to save project. Please try again.");
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("An error occurred while saving the project.");
    }
  };

  return isLoaded ? (
    <div className="map-container">
      <div className="navbar">
        <button onClick={() => navigate("/dashboard")}>Dashboard</button>
        <button onClick={saveProject}>Save Project</button>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>

      <GoogleMap
        zoom={15}
        center={center}
        onLoad={(map) => (mapRef.current = map)}
        mapContainerStyle={containerStyle}
      >
        <DrawingManager
          onOverlayComplete={({ type, overlay }) => {
            if (type === window.google.maps.drawing.OverlayType.POLYGON) {
              const newPolygon = overlay
                .getPath()
                .getArray()
                .map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }));
              overlay.setMap(null);
              setPolygons([...polygons, newPolygon]);
              calculateArea(newPolygon);
            } else if (type === window.google.maps.drawing.OverlayType.POLYLINE) {
              const newPolyline = overlay
                .getPath()
                .getArray()
                .map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }));
              overlay.setMap(null);
              setPolylines([...polylines, newPolyline]);
              calculatePolylineLength(newPolyline);
            }
          }}
        />
        {markerPosition && <Marker position={markerPosition} />}
        {polygons.map((polygon, index) => (
          <Polygon key={index} paths={polygon} options={{ fillColor: "#ff0000" }} />
        ))}
        {polylines.map((polyline, index) => (
          <Polyline key={index} path={polyline} options={{ strokeColor: "#0000ff" }} />
        ))}
      </GoogleMap>

      <div className="project-details">
        <h3>Project Details</h3>
        <label>
          Project Name:
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </label>
        <label>
          Description:
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Status:
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </label>
      </div>
    </div>
  ) : null;
};

export default MapComponent;
