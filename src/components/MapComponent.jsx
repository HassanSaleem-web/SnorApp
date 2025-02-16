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

  const polygonOptions = {
    fillOpacity: 0.3,
    fillColor: "#ff0000",
    strokeColor: "#ff0000",
    strokeWeight: 2,
    draggable: true,
    editable: true,
  };

  const polylineOptions = {
    strokeColor: "#0000ff",
    strokeWeight: 3,
    draggable: true,
    editable: true,
  };

  const drawingManagerOptions = {
    drawingControl: true,
    drawingControlOptions: {
      position: window.google?.maps?.ControlPosition?.TOP_CENTER,
      drawingModes: [
        window.google?.maps?.drawing?.OverlayType?.POLYGON,
        window.google?.maps?.drawing?.OverlayType?.POLYLINE,
      ],
    },
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
  }, [isLoaded, state]);

  const onLoadMap = (map) => {
    mapRef.current = map;
  };

  const onLoadPolygon = (polygon, index) => {
    polygonRefs.current[index] = polygon;
  };

  const onLoadPolyline = (polyline, index) => {
    polylineRefs.current[index] = polyline;
  };

  const onOverlayComplete = ($overlayEvent) => {
    const { type, overlay } = $overlayEvent;

    if (type === window.google.maps.drawing.OverlayType.POLYGON) {
      const newPolygon = overlay
        .getPath()
        .getArray()
        .map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }));

      overlay.setMap(null);
      setPolygons([...polygons, newPolygon]);
      calculateArea(newPolygon);
    }

    if (type === window.google.maps.drawing.OverlayType.POLYLINE) {
      const newPolyline = overlay
        .getPath()
        .getArray()
        .map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }));

      overlay.setMap(null);
      setPolylines([...polylines, newPolyline]);
      calculatePolylineLength(newPolyline);
    }
  };

  const calculateArea = (polygon) => {
    if (window.google && window.google.maps.geometry) {
      const googlePolygon = new window.google.maps.Polygon({
        paths: polygon,
      });
      const areaInSquareMeters = window.google.maps.geometry.spherical.computeArea(
        googlePolygon.getPath()
      );
      setArea(areaInSquareMeters);
    }
  };

  const calculatePolylineLength = (polyline) => {
    if (window.google && window.google.maps.geometry) {
      const googlePolyline = new window.google.maps.Polyline({
        path: polyline,
      });
      const lengthInMeters = window.google.maps.geometry.spherical.computeLength(
        googlePolyline.getPath()
      );
      setPolylineLength(lengthInMeters);
    }
  };

  const clearMap = () => {
    setPolygons([]);
    setPolylines([]);
    setArea(0);
    setPolylineLength(0);
  };

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
  
    const token = localStorage.getItem("token");
    if (!token) {
      alert("User not authenticated. Please log in.");
      navigate("/login");
      return;
    }
  
    const userEmail = JSON.parse(localStorage.getItem("user"))?.email || "unknown";
  
    // **Debugging: Checking what data is being sent**
    console.log("Polygons before sending:", polygons);
    console.log("Polylines before sending:", polylines);
  
    const projectData = {
      projectName,
      description,
      status,
      address: state?.address || "Unknown Address",
      admin: userEmail,
      polygons: polygons.map((polygon) => ({
        coordinates: polygon.map((coord) => ({
          lat: coord.lat, 
          lng: coord.lng,
        })),
        addedBy: userEmail,
      })),
      polylines: polylines.map((polyline) => ({
        coordinates: polyline.map((coord) => ({
          lat: coord.lat, 
          lng: coord.lng,
        })),
        addedBy: userEmail,
      })),
      totalArea: area,
      totalLength: polylineLength,
    };
  
    console.log("Final project data being sent:", JSON.stringify(projectData, null, 2));
  
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        alert("Project saved successfully!");
        console.log("Saved Project Response:", data.project);
      } else {
        console.error("Backend error response:", data);
        alert(data.message || "Failed to save project.");
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("An error occurred while saving the project. Please try again.");
    }
  };
  
  
  
  
  return isLoaded ? (
    <div className="map-container">
      <div className="navbar">
        <button onClick={() => navigate("/dashboard-user")}>Dashboard</button>
        <button onClick={saveProject}>Save Project</button>
        <button onClick={clearMap}>Clear Map</button>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>

      <GoogleMap
        zoom={15}
        center={center}
        onLoad={onLoadMap}
        mapContainerStyle={containerStyle}
      >
        <DrawingManager
          onOverlayComplete={onOverlayComplete}
          options={drawingManagerOptions}
        />
        {markerPosition && <Marker position={markerPosition} />}
        {polygons.map((polygon, index) => (
          <Polygon
            key={`polygon-${index}`}
            onLoad={(event) => onLoadPolygon(event, index)}
            options={polygonOptions}
            paths={polygon}
            draggable
            editable
          />
        ))}
        {polylines.map((polyline, index) => (
          <Polyline
            key={`polyline-${index}`}
            onLoad={(event) => onLoadPolyline(event, index)}
            options={polylineOptions}
            path={polyline}
            draggable
            editable
          />
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

      <div className="details">
        <div>
          <h3>Polygon Coordinates:</h3>
          {polygons.length > 0 ? (
            polygons.map((polygon, idx) => (
              <ul key={`polygon-${idx}`}>
                <li><strong>Polygon {idx + 1}:</strong></li>
                {polygon.map((coord, i) => (
                  <li key={i}>
                    Lat: {coord.lat.toFixed(6)}, Lng: {coord.lng.toFixed(6)}
                  </li>
                ))}
              </ul>
            ))
          ) : (
            <p>No polygons drawn yet.</p>
          )}
        </div>
        <div>
          <h3>Total Polygon Area:</h3>
          <p>{area.toFixed(2)} m²</p>
        </div>
        <div>
          <h3>Polyline Coordinates:</h3>
          {polylines.length > 0 ? (
            polylines.map((polyline, idx) => (
              <ul key={`polyline-${idx}`}>
                <li><strong>Polyline {idx + 1}:</strong></li>
                {polyline.map((coord, i) => (
                  <li key={i}>
                    Lat: {coord.lat.toFixed(6)}, Lng: {coord.lng.toFixed(6)}
                  </li>
                ))}
              </ul>
            ))
          ) : (
            <p>No polylines drawn yet.</p>
          )}
        </div>
        <div>
          <h3>Total Polyline Length:</h3>
          <p>{polylineLength.toFixed(2)} m</p>
        </div>
      </div>
    </div>
  ) : null;
};

export default MapComponent;
