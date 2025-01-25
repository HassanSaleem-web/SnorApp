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
      // Geocode the address passed from UserDashboard
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

  const saveProject = () => {
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

    const projectData = {
      projectName,
      description,
      status,
      polygons,
      polylines,
      totalArea: area,
      totalLength: polylineLength,
    };

    console.log("Saved Project Data:", projectData);
    alert("Project saved successfully! Check the console for details.");
  };

  return isLoaded ? (
    <div className="map-container">
      <div className="navbar">
        <button onClick={() => navigate("/dashboard")}>Dashboard</button>
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
