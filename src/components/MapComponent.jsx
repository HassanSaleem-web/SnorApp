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
  const [homes, setHomes] = useState([]); // Stores addresses for multiple shapes
// ✅ Store homes found inside shapes
  const [savedShapes, setSavedShapes] = useState([]); // Stores saved shapes
  const [showShapesList, setShowShapesList] = useState(false);
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  //const [canDraw, setCanDraw] = useState(true); // 🔥 Controls shape drawing
  const [contextMenu, setContextMenu] = useState(null);
  const [activeMarkers, setActiveMarkers] = useState([]); // ✅ Stores markers for selected shape
 const [hoveredAddress, setHoveredAddress] = useState(null); // ✅ Tracks which marker is highlighted

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
  useEffect(() => {
    console.log("Updated Polygons:", polygons);
    console.log("Updated Polylines:", polylines);
  }, [polygons, polylines]);
  
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
    const { type, overlay } = $overlayEvent;
    const shapeId = Date.now(); // Unique shape ID
  
    if (type === window.google.maps.drawing.OverlayType.POLYGON) {
      const newPolygon = {
        shapeId,
        coordinates: overlay.getPath().getArray().map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }))
      };
      overlay.setMap(null);
      setPolygons((prev) => [...prev, newPolygon]);
      fetchNearbyHomes(newPolygon.coordinates, shapeId);
    }
  
    if (type === window.google.maps.drawing.OverlayType.POLYLINE) {
      const newPolyline = {
        shapeId,
        coordinates: overlay.getPath().getArray().map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }))
      };
      overlay.setMap(null);
      setPolylines((prev) => [...prev, newPolyline]);
      fetchNearbyHomes(newPolyline.coordinates, shapeId);
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
    setActiveMarkers([]); // ✅ Clears all markers
   setHoveredAddress(null); 
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
  
  const fetchNearbyHomes = async (shapePath, shapeId) => {
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder || !window.google.maps.geometry) {
      console.error("Google Geocoding API or Geometry API is not loaded.");
      alert("Google Maps API is not available. Please try again.");
      return;
    }
  
    console.log(`Fetching addresses for shape ${shapeId}...`);
    setIsFetchingAddresses(true);
  
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
  
    const gridPoints = generateGridPointsInsidePolygon(shapePath, 15);
    console.log(`Generated ${gridPoints.length} points inside the shape.`);
  
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
  
    setHomes((prevAddresses) => [
      ...prevAddresses,
      { shapeId, addresses: foundHomes, showAddresses: false }, // ✅ Add showAddresses
    ]);
   
        
  
    setIsFetchingAddresses(false);
    console.log(`Final Homes inside Shape ${shapeId}:`, foundHomes);
  };
  
  const toggleShapeAddresses = (shapeId) => {
    setHomes((prevAddresses) =>
      prevAddresses.map((shape) => {
        if (shape.shapeId === shapeId) {
          const isExpanding = !shape.showAddresses;
          setSelectedShapeId(isExpanding ? shapeId : null); // ✅ Store shape ID only when opened
          setActiveMarkers(isExpanding ? shape.addresses : []);
          return { ...shape, showAddresses: isExpanding };
        }
        return shape;
      })
    );
  };
  
  
  
  
  const handleDeleteHome = (shapeId, homeIndex) => {
    setHomes((prevAddresses) =>
      prevAddresses.map((shape) =>
        shape.shapeId === shapeId
          ? { ...shape, addresses: shape.addresses.filter((_, i) => i !== homeIndex) }
          : shape
      )
    );
  
    // 🔥 Remove the deleted address from activeMarkers
    setActiveMarkers((prevMarkers) =>
      prevMarkers.filter((_, i) => i !== homeIndex) // ✅ Filters out the deleted marker
    );
  };
  
  
  const handleSaveShape = () => {
    if (!selectedShapeId) {
      alert("Please open a shape's collapsible before saving.");
      return;
    }
  
    // ✅ Find the shape details from `homes`
    const shapeAddresses = homes.find((shape) => shape.shapeId === selectedShapeId);
    if (!shapeAddresses) {
      alert("No valid shape found to save.");
      return;
    }
  
    // ✅ Find the shape in `polygons` or `polylines`
    const polygonMatch = polygons.find((p) => p.shapeId === selectedShapeId);
    const polylineMatch = polylines.find((p) => p.shapeId === selectedShapeId);
  
    let shapeType, shapeCoordinates;
    if (polygonMatch) {
      shapeType = "Polygon";
      shapeCoordinates = polygonMatch.coordinates;
    } else if (polylineMatch) {
      shapeType = "Polyline";
      shapeCoordinates = polylineMatch.coordinates;
    } else {
      alert("No valid shape found to save.");
      return;
    }
  
    // ✅ Correctly calculate area or length
    const shapeArea = shapeType === "Polygon" ? calculateArea(shapeCoordinates) + " m²" : null;
    const shapeLength = shapeType === "Polyline" ? calculatePolylineLength(shapeCoordinates) + " m" : null;
  
    // ✅ Construct shape object
    const newSavedShape = {
      id: selectedShapeId,
      shapeType,
      area: shapeArea,
      length: shapeLength,
      coordinates: shapeCoordinates,
      addresses: shapeAddresses.addresses,
      showDetails: false,
    };
  
    console.log("Saving Shape:", newSavedShape);
    setSavedShapes((prevShapes) => [...prevShapes, newSavedShape]);
    setSelectedShapeId(null); // ✅ Reset selection after saving
  
    alert(`Shape (${shapeType}) saved successfully!`);
  };
  
  
  
  
  
  
  
  
  
  
  
  const toggleShapeDetails = (shapeId) => {
    setSavedShapes((prevShapes) => {
      const updatedShapes = prevShapes.map((shape) =>
        shape.id === shapeId ? { ...shape, showDetails: !shape.showDetails } : shape
      );
      
      return [...updatedShapes]; // 🔥 Ensures a state update
    });
  };
  
  
  
  
  
  const handleDeleteShape = (index) => {
    setSavedShapes((prevShapes) => {
      const shapeToDelete = prevShapes[index];
  
      // Remove from polygons or polylines state
      if (shapeToDelete.shapeType === "Polygon") {
        setPolygons((prevPolygons) => prevPolygons.filter(p => p.shapeId !== shapeToDelete.id));
      } else if (shapeToDelete.shapeType === "Polyline") {
        setPolylines((prevPolylines) => prevPolylines.filter(p => p.shapeId !== shapeToDelete.id));
      }
  
      // Remove corresponding addresses from homes list
      setHomes((prevHomes) => prevHomes.filter(home => home.shapeId !== shapeToDelete.id));
  
      return prevShapes.filter((_, i) => i !== index);
    });
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
  
  
  
 
  
 return  isLoaded ? (
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
              key={`polygon-${polygon.shapeId}`}

              onLoad={(event) => onLoadPolygon(event, index)}
              onRightClick={(event) => handleRightClick(event, "polygon", index)} // 🛑 Right-Click Delete
              options={polygonOptions}
              paths={[...polygon.coordinates]} // ✅ Ensures an array is passed
              draggable
              editable
            />
            
            ))}
            {polylines.map((polyline, index) => (
              <Polyline
              key={`polyline-${polyline.shapeId}`}
              onLoad={(event) => onLoadPolyline(event, index)}
              onRightClick={(event) => handleRightClick(event, "polyline", index)} // 🛑 Right-Click Delete
              options={polylineOptions}
              path={[...polyline.coordinates]} // ✅ Ensures an array is passed
              draggable
              editable
            />
            
            ))}
           {activeMarkers.map((home, index) => (
  <Marker
    key={index}
    position={{ lat: home.lat, lng: home.lng }}
    title={home.name}
    icon={{
      url: hoveredAddress === home.name
        ? "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png" // ✅ Highlighted Icon
        : "http://maps.google.com/mapfiles/ms/icons/red-dot.png", // 🔴 Normal Icon
      scaledSize: new window.google.maps.Size(40, 40),
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
  <div className="map-homes-list-unique">
    {homes.length > 0 ? (
      homes.map((shape, shapeIndex) => (
        <div key={shape.shapeId} className="shape-address-group">
          <h4 
            className="shape-address-header"
            onClick={() => toggleShapeAddresses(shape.shapeId)} // ✅ Toggle on click
            style={{ cursor: "pointer" }}
          >
            {`Shape ${shapeIndex + 1} Addresses`} {shape.showAddresses ? "▲" : "▼"}
          </h4>

          {shape.showAddresses && (
  <div className="shape-address-list">
    {shape.addresses.map((home, homeIndex) => (
      <div key={homeIndex} className="shape-home-item"
      onMouseEnter={() => setHoveredAddress(home.name)} 
      onMouseLeave={() => setHoveredAddress(null)} >
       
        <p>{home.name}</p>
        <button className="shape-delete-home-btn" onClick={() => handleDeleteHome(shape.shapeId, homeIndex)}>❌</button>
      </div>
    ))}
  </div>
)}

        </div>
      ))
    ) : (
      <p className="map-no-homes-msg-unique">No addresses found.</p>
    )}
  </div>
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
            {shape.showDetails && shape.addresses && shape.addresses.length > 0 ? (
  <ul className="map-shape-address-list-unique">
    {shape.addresses.map((addr, addrIndex) => (
      <li key={addrIndex}>{addr.name}</li>
    ))}
  </ul>
) : (
  shape.showDetails && <p>No addresses found.</p>
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
