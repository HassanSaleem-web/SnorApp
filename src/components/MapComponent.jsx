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
  const [homes, setHomes] = useState([]); // ✅ Store homes found inside shapes
  const [savedShapes, setSavedShapes] = useState([]); // Stores saved shapes
  const [showShapesList, setShowShapesList] = useState(false);
  const [hoveredAddress, setHoveredAddress] = useState(null);
  //const [canDraw, setCanDraw] = useState(true); // 🔥 Controls shape drawing
  const [contextMenu, setContextMenu] = useState(null);

  const [area, setArea] = useState(0);
  const [polylineLength, setPolylineLength] = useState(0);

  // Project Details State
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Active");
  const [showHomesList, setShowHomesList] = useState(false); // ✅ Controls dropdown visibility

  // Address-related state
  const [center, setCenter] = useState({ lat: 28.626137, lng: 79.821603 });
  const [markerPosition, setMarkerPosition] = useState(null);
  const [isFetchingAddresses, setIsFetchingAddresses] = useState(false); // 🚀 NEW

  const { state } = useLocation(); // Get the address passed from UserDashboard
  const navigate = useNavigate();
  const [showProjectModal, setShowProjectModal] = useState(false); // Controls modal visibility

  // Open the modal
  const openProjectModal = () => {
    setShowProjectModal(true);
  };
  
  // Close the modal and trigger save
  const handleProjectSave = () => {
    if (!projectName.trim()) {
      alert("Project name is required.");
      return;
    }
    if (!description.trim()) {
      alert("Description is required.");
      return;
    }
  
    setShowProjectModal(false);
    saveProject(); // Call existing function
    navigate("/dashboard-user");
  };
  
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
    // 🚨 Prevent drawing if there are existing shapes
    if (polygons.length > 0 || polylines.length > 0) {
      alert("Cannot make a new shape. Either save the current shape or clear the map first.");
      $overlayEvent.overlay.setMap(null); // Remove newly drawn shape
      return;
    }
  
    const { type, overlay } = $overlayEvent;
  
    if (type === window.google.maps.drawing.OverlayType.POLYGON) {
      const newPolygon = overlay
        .getPath()
        .getArray()
        .map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }));
  
      overlay.setMap(null);
      setPolygons([newPolygon]);
      fetchNearbyHomes(newPolygon);
    }
  
    if (type === window.google.maps.drawing.OverlayType.POLYLINE) {
      const newPolyline = overlay
        .getPath()
        .getArray()
        .map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }));
  
      overlay.setMap(null);
      setPolylines([newPolyline]);
      fetchNearbyHomes(newPolyline);
    }
  };
  
  
  const handleRightClick = (event, type, index) => {
    setContextMenu({
      position: { 
        x: event.domEvent.clientX,  // Get the mouse click position
        y: event.domEvent.clientY 
      },
      type,
      index,
    });
  };
  
  const handleDeleteShap = () => {
    if (contextMenu?.type === "polygon") {
      setPolygons((prev) => prev.filter((_, i) => i !== contextMenu.index));
    } else if (contextMenu?.type === "polyline") {
      setPolylines((prev) => prev.filter((_, i) => i !== contextMenu.index));
    }
    setContextMenu(null); // Hide menu after deleting
  };
  
  const calculateArea = (polygon) => {
    if (window.google && window.google.maps.geometry) {
      const googlePolygon = new window.google.maps.Polygon({
        paths: polygon,
      });
      return window.google.maps.geometry.spherical.computeArea(googlePolygon.getPath());
    }
    return 0;
  };
  
  const calculatePolylineLength = (polyline) => {
    if (window.google && window.google.maps.geometry) {
      const googlePolyline = new window.google.maps.Polyline({
        path: polyline,
      });
      return window.google.maps.geometry.spherical.computeLength(googlePolyline.getPath());
    }
    return 0;
  };
  
  
  const clearMap = () => {
    console.log("Clearing map..."); // Debugging log
  
    setPolygons([]);
    setPolylines([]);
    setHomes([]); // Clear fetched addresses
    setArea(0);
    setPolylineLength(0);
    //setCanDraw(true); // ✅ Allow new shape drawing
  
    // ✅ Ensure state update by forcing a new reference
    setPolygons([...[]]);
    setPolylines([...[]]);
  
    console.log("Map cleared!"); // Debugging log
    console.log("Polylines after clear:", polylines);
console.log("Polygons after clear:", polygons);
  };
  
  const fetchNearbyHomes = async (polygonPath) => {
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder || !window.google.maps.geometry) {
      console.error("Google Geocoding API or Geometry API is not loaded.");
      alert("Google Maps API is not available. Please try again.");
      return;
    }
  
    console.log("Fetching addresses using Reverse Geocoding...");
    setIsFetchingAddresses(true); // ✅ Show Loading Animation
  
    const geocoder = new window.google.maps.Geocoder();
    const foundHomes = [];
  
    const isPointInsidePolygon = (point, polygon) => {
      const googlePolygon = new window.google.maps.Polygon({ paths: polygon });
      return window.google.maps.geometry.poly.containsLocation(point, googlePolygon);
    };
  
    const generateGridPointsInsidePolygon = (polygon, gridSize) => {
      const bounds = new window.google.maps.LatLngBounds();
      polygon.forEach((point) => bounds.extend(new window.google.maps.LatLng(point.lat, point.lng)));
  
      const points = [];
      const latStep = (bounds.getNorthEast().lat() - bounds.getSouthWest().lat()) / gridSize;
      const lngStep = (bounds.getNorthEast().lng() - bounds.getSouthWest().lng()) / gridSize;
  
      for (let lat = bounds.getSouthWest().lat(); lat <= bounds.getNorthEast().lat(); lat += latStep) {
        for (let lng = bounds.getSouthWest().lng(); lng <= bounds.getNorthEast().lng(); lng += lngStep) {
          const gridPoint = new window.google.maps.LatLng(lat, lng);
          if (isPointInsidePolygon(gridPoint, polygon)) {
            points.push({ lat, lng });
          }
        }
      }

      return points;
    };
  
    const gridPoints = generateGridPointsInsidePolygon(polygonPath, 15);
    console.log(`Generated ${gridPoints.length} points inside the polygon for geocoding.`);
  
    for (let i = 0; i < gridPoints.length; i++) {
      const latLng = new window.google.maps.LatLng(gridPoints[i].lat, gridPoints[i].lng);
  
      try {
        const result = await new Promise((resolve, reject) => {
          geocoder.geocode({ location: latLng }, (results, status) => {
            if (status === "OK" && results[0]) {
              resolve(results[0]);
            } else {
              reject(`Geocoding failed for (${gridPoints[i].lat}, ${gridPoints[i].lng})`);
            }
          });
        });
  
        if (!foundHomes.some((home) => home.name === result.formatted_address)) {
          foundHomes.push({
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
            name: result.formatted_address,
          });
        }
      } catch (error) {
        console.warn(error);
      }
    }
  
    setHomes(foundHomes);
    setIsFetchingAddresses(false);
    //setCanDraw(false); // ✅ Hide Loading Animation
    console.log("Final Homes inside Polygon using Geocoding:", foundHomes);
    //console.log("CanDraw here:", canDraw);
  };
  
  
  const handleDeleteHome = (index) => {
    setHomes((prevHomes) => prevHomes.filter((_, i) => i !== index));
  };
  const handleSaveShape = () => {
    if (homes.length === 0) {
      alert("No addresses found to save.");
      return;
    }
  
    // ✅ Ensure we detect the correct shape type
    let shapeType = polygons.length > 0 ? "Polygon" : (polylines.length > 0 ? "Polyline" : null);
    if (!shapeType) {
      alert("No shape detected. Draw a shape before saving.");
      return;
    }
  
    let shapeCoordinates = [];
    let shapeArea = null;
    let shapeLength = null;
  
    if (shapeType === "Polygon") {
      shapeCoordinates = polygons[0]; // ✅ Get Polygon Coordinates
      shapeArea = Math.abs(calculateArea(shapeCoordinates)).toFixed(2) + " m²"; // 🔥 Use Math.abs() to avoid negatives
    } else if (shapeType === "Polyline") {
      shapeCoordinates = polylines[0]; // ✅ Get Polyline Coordinates
      shapeLength = calculatePolylineLength(shapeCoordinates).toFixed(2) + " m";
    }
  
    const newShape = {
      id: Date.now(),
      shapeType, // ✅ Store correct shape type
      area: shapeArea,
      length: shapeLength,
      coordinates: shapeCoordinates,
      addresses: homes,
      showDetails: false,
    };
  
    setSavedShapes((prevShapes) => [...prevShapes, newShape]);
    setHomes([]); // ✅ Reset addresses but keep shape on map
    clearMap();
    alert(`${shapeType} saved successfully!`);
  };
  
  
  
  
  
  
  
  
  const toggleShapeDetails = (index) => {
    setSavedShapes((prevShapes) =>
      prevShapes.map((shape, i) =>
        i === index ? { ...shape, showDetails: !shape.showDetails } : shape
      )
    );
  };
  
  
  const handleDeleteShape = (index) => {
    setSavedShapes((prevShapes) => prevShapes.filter((_, i) => i !== index));
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
    if (savedShapes.length === 0) {
      alert("Please save at least one shape before saving the project.");
      return;
    }
  
    const token = localStorage.getItem("token");
    if (!token) {
      alert("User not authenticated. Please log in.");
      navigate("/login");
      return;
    }
  
    const userEmail = JSON.parse(localStorage.getItem("user"))?.email || "unknown";
  
    // 🔹 Structure the data correctly for backend
    const projectData = {
      projectName,
      description,
      status,
      address: state?.address || "Unknown Address",
      admin: userEmail,
      shapes: savedShapes.map((shape) => ({
        coordinates: shape.coordinates,
        addresses: shape.addresses,
        shapeType: shape.shapeType || "unknown",
        areaOrLength: shape.area || shape.length,
      })),
      
    };
    
    console.log("Sending project data:", JSON.stringify(projectData, null, 2));
  
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
        console.log("Project saved response:", data.project);
  
        // 🛑 Clear saved shapes after saving
        setSavedShapes([]);
        setProjectName("");
        setDescription("");
        setShowProjectModal(false);
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
    <div className="map-page-container-unique">
       {/* 🔵 Save Project Modal */}
{showProjectModal && (
  <div className="modal-overlay">
    <div className="modal-container">
      <h2>Save Project</h2>
      <label>Project Name:</label>
      <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="Enter project name..."
      />

      <label>Description:</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Enter project description..."
      />

      <div className="modal-buttons">
        <button className="cancel-btn" onClick={() => setShowProjectModal(false)}>Cancel</button>
        <button className="save-btn" onClick={handleProjectSave}>Save</button>
      </div>
    </div>
  </div>
)}

      {/* Navigation Bar */}
      <div className="map-navbar-unique">
        <button onClick={() => navigate("/dashboard-user")}>Dashboard</button>
        <button className="map-save-project-btn" onClick={openProjectModal}>
  Save Project 💾
</button>

        <button onClick={clearMap}>Clear Map</button>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>
  
      {/* Main Content Wrapper */}
      <div className="map-content-wrapper-unique">
        
        {/* Left Side - Google Map (70%) */}
        <div className="map-container-unique">
          <GoogleMap
            zoom={15}
            center={center}
            onLoad={onLoadMap}
            mapContainerStyle={containerStyle}
            mapTypeId="satellite"
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
              onRightClick={(event) => handleRightClick(event, "polygon", index)} // 🛑 Right-Click Delete
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
              onRightClick={(event) => handleRightClick(event, "polyline", index)} // 🛑 Right-Click Delete
              options={polylineOptions}
              path={polyline}
              draggable
              editable
            />
            
            ))}
            {homes.map((home, index) => (
  <Marker
    key={index}
    position={{ lat: home.lat, lng: home.lng }}
    title={home.name}
    icon={{
      url: hoveredAddress === home.name 
        ? "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png" // Highlighted Icon
        : "http://maps.google.com/mapfiles/ms/icons/red-dot.png", // Normal Icon
      scaledSize: new window.google.maps.Size(40, 40), // Adjust size if needed
    }}
  />
))}

            
          </GoogleMap>
        </div>
  
        {/* Right Side - Address List (30%) */}
        <div className="map-homes-list-container-unique">
          <button className="map-toggle-homes-btn-unique" onClick={() => setShowHomesList(!showHomesList)}>
            {showHomesList ? "Hide Addresses ▲" : "Show Addresses ▼"}
          </button>
  
          {/* Debugging: Check if `homes` state has data */}
          {console.log("Rendering Address List - Homes:", homes)}
          {/* ✅ Show Loading Animation While Fetching Addresses */}
  {isFetchingAddresses ? (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Fetching addresses...</p>
    </div>
  ) : showHomesList && (
    <ul className="map-homes-list-unique">
      {homes.length > 0 ? (
        homes.map((home, index) => (
          <li
            key={index}
            className="map-home-item-unique"
            onMouseEnter={() => setHoveredAddress(home.name)}
            onMouseLeave={() => setHoveredAddress(null)}
          >
            {home.name}
            <button className="map-delete-home-btn-unique" onClick={() => handleDeleteHome(index)}>❌</button>
          </li>
        ))
      ) : (
        <p className="map-no-homes-msg-unique">No addresses found.</p>
      )}
    </ul>
  )}
  
         
           {/* Save Shape Button */}
<button className="map-save-shape-btn-unique" onClick={handleSaveShape}>
  Save Shape ✅
</button>
        </div>
  {/* 🔵 Shapes List Section */}
{/* 🔷 Shapes List Sidebar */}
<div className={`map-shapes-list-container-unique ${showShapesList ? "open" : ""}`}>
  
  {/* Shapes List Toggle Button */}
  <button className="map-toggle-shapes-btn-unique" onClick={() => setShowShapesList(!showShapesList)}>
    {showShapesList ? "⬅ Collapse Shapes" : "📂 Shapes List ▶"}
  </button>

  {/* Shapes List Content */}
  {showShapesList && (
    <div className="map-shapes-list-content-unique">
      {savedShapes.length > 0 ? (
        savedShapes.map((shape, index) => (
          <div key={shape.id} className="map-shape-item-unique">
            
            {/* Shape Info */}
            <div className="map-shape-header-unique">
              <span>{shape.type} - {shape.area || shape.length}</span>
              <button className="map-delete-shape-btn-unique" onClick={() => handleDeleteShape(index)}>❌</button>
            </div>

            {/* View Addresses Button */}
            <button className="map-view-shape-btn-unique" onClick={() => toggleShapeDetails(index)}>
              {shape.showDetails ? "▲ Hide Addresses" : "▼ View"}
            </button>
            <p><strong>Coordinates:</strong></p>
              <ul className="map-shape-coordinates-list-unique">
                {shape.coordinates.map((coord, coordIndex) => (
                  <li key={coordIndex}>Lat: {coord.lat}, Lng: {coord.lng}</li>
                ))}
              </ul>
            {/* Addresses List (Collapsible) */}
            {shape.showDetails && (
              <ul className="map-shape-address-list-unique">
                {shape.addresses.map((addr, addrIndex) => (
                  <li key={addrIndex}>{addr.name}</li>
                ))}
              </ul>
            )}

          </div>
        ))
      ) : (
        <p className="map-no-shapes-msg-unique">No saved shapes.</p>
      )}
    </div>
  )}
  {contextMenu && (
  <div
    className="context-menu"
    style={{
      position: "absolute",
      top: contextMenu.position.y,
      left: contextMenu.position.x,
      background: "white",
      padding: "8px",
      borderRadius: "5px",
      boxShadow: "0px 0px 5px rgba(0,0,0,0.2)",
      cursor: "pointer",
      zIndex: 1000,
    }}
    onClick={handleDeleteShap}
  >
    ❌ Delete Shape
  </div>
)}

</div>


      </div>
    </div>
  ) : null;
}  

export default MapComponent;
