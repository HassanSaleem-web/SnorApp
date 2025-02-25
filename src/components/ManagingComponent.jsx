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

const ManagingComponent = () => {
  const mapRef = useRef();
  const polygonRefs = useRef([]);
  const polylineRefs = useRef([]);
  const [selectedShapeAddresses, setSelectedShapeAddresses] = useState([]);

  const [polygons, setPolygons] = useState([]);
  const [polylines, setPolylines] = useState([]);
  const [homes, setHomes] = useState([]); // ✅ Store homes found inside shapes
  const location = useLocation();
  const state = location.state || {}; // ✅ Ensure state is never undefined
  const [selectedShapeIndex, setSelectedShapeIndex] = useState(null);

  const [savedShapes, setSavedShapes] = useState([]); // Stores saved shapes
  useEffect(() => {
    if (state && state.project && state.project.shapes) {
      setSavedShapes(state.project.shapes);
    }
  }, [state]);
  useEffect(() => {
    if (selectedShapeIndex === null) return; // 🚫 No shape selected, exit early
  
    const shapeType = savedShapes[selectedShapeIndex].type;
    const shapeRef =
      shapeType === "Polygon"
        ? polygonRefs.current[selectedShapeIndex]
        : polylineRefs.current[selectedShapeIndex];
  
    if (!shapeRef) return; // 🚫 Shape ref is missing, exit early
  
    console.log(`✅ Attaching listeners to Shape ${selectedShapeIndex}`);
  
    // Function to update shape coordinates in state
    const updateCoordinates = () => {
      console.log(`🔥 Shape ${selectedShapeIndex} updated! Updating state...`);
  
      const updatedCoordinates = shapeRef.getPath().getArray().map((latLng) => ({
        lat: latLng.lat(),
        lng: latLng.lng(),
      }));
  
      setSavedShapes((prevShapes) => {
        const newShapes = [...prevShapes];
        newShapes[selectedShapeIndex] = {
          ...newShapes[selectedShapeIndex],
          coordinates: updatedCoordinates,
          
          shapeType: newShapes[selectedShapeIndex].shapeType
        };
        console.log("shaptypeee", newShapes[0].shapeType);
        return newShapes; // ✅ Ensure React detects the change
      });
    };
  
    // ✅ Clear previous listeners to avoid duplication
    window.google.maps.event.clearListeners(shapeRef.getPath(), "set_at");
    window.google.maps.event.clearListeners(shapeRef.getPath(), "insert_at");
    window.google.maps.event.clearListeners(shapeRef.getPath(), "remove_at");
  
    // ✅ Attach new listeners for continuous updates
    shapeRef.getPath().addListener("set_at", updateCoordinates);
    shapeRef.getPath().addListener("insert_at", updateCoordinates);
    shapeRef.getPath().addListener("remove_at", updateCoordinates);
  
    console.log(`✅ Listeners attached for Shape ${selectedShapeIndex}`);
  
    // Cleanup function to remove listeners when the component unmounts or the shape is deselected
    return () => {
      window.google.maps.event.clearListeners(shapeRef.getPath(), "set_at");
      window.google.maps.event.clearListeners(shapeRef.getPath(), "insert_at");
      window.google.maps.event.clearListeners(shapeRef.getPath(), "remove_at");
      console.log(`❌ Listeners removed for Shape ${selectedShapeIndex}`);
    };
  }, [selectedShapeIndex, savedShapes]); // ✅ Re-run when shape selection changes
  
  
  
  const [showShapesList, setShowShapesList] = useState(true);
  const [hoveredAddress, setHoveredAddress] = useState(null);
  const [canDraw, setCanDraw] = useState(true); // 🔥 Controls shape drawing
  const [contextMenu, setContextMenu] = useState(null);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  
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

 
 // Get the address passed from UserDashboard
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
  const handleShapeClick = (index) => {
    console.log(`🔹 Shape ${index} selected`);
    setSelectedShapeIndex(index);
    setSelectedShapeAddresses(savedShapes[index].addresses);
  };
  
  
  
  
  const handleAddAddress = async () => {
    if (!manualAddress.trim()) {
      alert("Please enter an address.");
      return;
    }
  
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: manualAddress }, (results, status) => {
          if (status === "OK" && results[0]) {
            resolve(results[0]);
          } else {
            reject("Geocoding failed");
          }
        });
      });
  
      const newHome = {
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
        name: result.formatted_address,
      };
  
      if (selectedShapeIndex === null) {
        alert("Please select a shape before adding an address.");
        return;
      }
  
      // ✅ Update only the selected shape
      const updatedShapes = savedShapes.map((shape, index) => {
        if (index === selectedShapeIndex) {
          return { ...shape, addresses: [...shape.addresses, newHome] };
        }
        return shape;
      });
  
      setSavedShapes(updatedShapes);
      setSelectedShapeAddresses((prev) => [...prev, newHome]); // ✅ Update UI
      setManualAddress(""); 
      setShowAddAddressModal(false);
  
      // 🔥 Save to database
     
  
    } catch (error) {
      alert("Error fetching location. Try again.");
      console.error(error);
    }
  };
  
  const updateProjectInDB = async (updatedShapes) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("User not authenticated. Please log in.");
        navigate("/login");
        return;
      }
  
      const projectData = {
        _id: state.project._id,  // ✅ Ensure project ID is included
        projectName,
        description,
        status,
        address: state?.address || "Unknown Address",
        admin: JSON.parse(localStorage.getItem("user"))?.email || "unknown",
        shapes: updatedShapes,  // ✅ Send the updated shapes
      };
  
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/project/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        console.log("✅ Project updated successfully:", data.project);
      } else {
        console.error("Backend error response:", data);
        alert(data.message || "Failed to update project.");
      }
    } catch (error) {
      console.error("Error updating project:", error);
      alert("An error occurred while updating the project.");
    }
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
    if (isLoaded && state?.project?.address) {
      geocodeAddress(state.project.address)
        .then((location) => {
          const position = { lat: location.lat(), lng: location.lng() };
          setCenter(position); // ✅ Set map center
          setMarkerPosition(position); // ✅ Place marker at project location
        })
        .catch((error) => {
          console.error("Error geocoding project address:", error);
          alert("Unable to find the project address.");
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
    // 🚫 Prevent drawing if a shape already exists
    if (!canDraw) {
      alert("Please clear the map before drawing a new shape.");
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
      setCanDraw(false); // 🚫 Disable further drawing
      fetchNearbyHomes(newPolygon);
    }
  
    if (type === window.google.maps.drawing.OverlayType.POLYLINE) {
      const newPolyline = overlay
        .getPath()
        .getArray()
        .map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }));
  
      overlay.setMap(null);
      setPolylines([newPolyline]);
      setCanDraw(false); // 🚫 Disable further drawing
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
    setCanDraw(true); // ✅ Allow new shape drawing
  
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
    setIsFetchingAddresses(false); // ✅ Hide Loading Animation
    console.log("Final Homes inside Polygon using Geocoding:", foundHomes);
  };
  
  
  const handleDeleteHome = (index) => {
    setSelectedShapeAddresses((prevAddresses) => prevAddresses.filter((_, i) => i !== index));
  };
  
  const handleSaveShape = () => {
    if (selectedShapeIndex !== null) {
      // ✅ If a shape is selected, only update its addresses
      const updatedShapes = savedShapes.map((shape, index) => {
        if (index === selectedShapeIndex) {
          return { ...shape, addresses: [...selectedShapeAddresses] };
        }
        return shape;
      });
  
      setSavedShapes(updatedShapes);
      alert("Shape updated successfully!");
      return;
    }
  
    // 🚫 Prevent new shape creation if a shape is already selected
    if (polygons.length === 0 && polylines.length === 0) {
      alert("Please draw a shape before saving.");
      return;
    }
  
    // ✅ If no shape is selected, create a new one (normal behavior)
    let shapeType = polygons.length > 0 ? "Polygon" : "Polyline";
    let shapeCoordinates = polygons.length > 0 ? polygons[0] : polylines[0];
    let shapeArea = polygons.length > 0 ? calculateArea(shapeCoordinates).toFixed(2) + " m²" : null;
    let shapeLength = polylines.length > 0 ? calculatePolylineLength(shapeCoordinates).toFixed(2) + " m" : null;
  
    const newShape = {
      id: Date.now(),
      type: shapeType,
      area: shapeArea,
      length: shapeLength,
      coordinates: shapeCoordinates,
      addresses: [...homes], // ✅ Include detected addresses
      showDetails: false,
    };
  
    setSavedShapes((prevShapes) => [...prevShapes, newShape]);
    setHomes([]);  
    setSelectedShapeAddresses([]);
    alert("New shape saved successfully!");
  };
  
  
  
  
  
  
  
  
  
  const toggleShapeDetails = (index) => {
    setSavedShapes((prevShapes) =>
      prevShapes.map((shape, i) =>
        i === index ? { ...shape, showDetails: !shape.showDetails } : shape
      )
    );
  };
  
  
  const handleDeleteShape = (index) => {
    setSavedShapes((prevShapes) => {
      const updatedShapes = prevShapes.filter((_, i) => i !== index);
  
      // ✅ If the deleted shape was selected, reset selection
      if (selectedShapeIndex === index) {
        setSelectedShapeIndex(null);
        setSelectedShapeAddresses([]);
      }
  
      return updatedShapes;
    });
  
    // ✅ Remove from map
    if (polygonRefs.current[index]) {
      polygonRefs.current[index].setMap(null); // 🔥 Remove Polygon from Map
      polygonRefs.current[index] = null; // Clear reference
    }
    
    if (polylineRefs.current[index]) {
      polylineRefs.current[index].setMap(null); // 🔥 Remove Polyline from Map
      polylineRefs.current[index] = null; // Clear reference
    }
  };
  
  
  const handleShapeUpdate = (index, shapeType) => {
    const shapeRef = shapeType === "Polygon" ? polygonRefs.current[index] : polylineRefs.current[index];
    
    if (!shapeRef) return;
    
    const updateCoordinates = () => {
      console.log("🔥 Shape updated! Updating state...");
  
      const updatedCoordinates = shapeRef.getPath().getArray().map(latLng => ({
        lat: latLng.lat(),
        lng: latLng.lng(),
      }));
  
      setSavedShapes((prevShapes) => {
        const newShapes = [...prevShapes];
        newShapes[index] = { ...newShapes[index], coordinates: updatedCoordinates };
        return [...newShapes]; // ✅ Ensure React detects the change
      });
    };
  
    // ✅ **Make sure to clear old listeners first**
    window.google.maps.event.clearListeners(shapeRef.getPath(), "set_at");
    window.google.maps.event.clearListeners(shapeRef.getPath(), "insert_at");
    window.google.maps.event.clearListeners(shapeRef.getPath(), "remove_at");
  
    // 🔥 **Attach new listeners EVERY TIME the shape updates**
    shapeRef.getPath().addListener("set_at", updateCoordinates);
    shapeRef.getPath().addListener("insert_at", updateCoordinates);
    shapeRef.getPath().addListener("remove_at", updateCoordinates);
  
    console.log("✅ Event listeners attached to shape index:", index);
  };
  
  
  
  
  const updateShapeCoordinates = (index, shapeType) => {
    setSavedShapes((prevShapes) => {
      // 🔥 Create a deep copy to trigger re-render
      const updatedShapes = JSON.parse(JSON.stringify(prevShapes));
  
      // 🚀 Get updated coordinates from Google Maps API
      const updatedCoordinates = shapeType === "Polygon"
        ? polygonRefs.current[index].getPath().getArray().map(latLng => ({
            lat: latLng.lat(),
            lng: latLng.lng(),
          }))
        : polylineRefs.current[index].getPath().getArray().map(latLng => ({
            lat: latLng.lat(),
            lng: latLng.lng(),
          }));
  
      updatedShapes[index].coordinates = updatedCoordinates;
      return updatedShapes;  // 🔥 This forces React to detect the change
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
  
    const projectData = {
      _id: state.project?._id,  // 🔥 Make sure to send `_id` if updating
      projectName,
      description,
      status,
      address: state?.address || "Unknown Address",
      admin: userEmail,
      shapes: savedShapes.map((shape) => ({
        coordinates: shape.coordinates,
        addresses: shape.addresses,
        shapeType: shape.shapeType || shape.type,
        area: shape.area || null,
        length: shape.length || null,
      })),
    };
  
    console.log("📤 Sending project data:", JSON.stringify(projectData, null, 2));
  
    try {
      const response = await fetch(
        state.project?._id
          ? `${process.env.REACT_APP_BACKEND_URL}/api/project/update`  // 🔥 Use PUT if updating
          : `${process.env.REACT_APP_BACKEND_URL}/api/project`,  // 🔥 Use POST if creating
        {
          method: state.project?._id ? "PUT" : "POST", // 🛠 Dynamically decide
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(projectData),
        }
      );
  
      const data = await response.json();
  
      if (response.ok) {
        alert(`Project ${state.project?._id ? "updated" : "saved"} successfully!`);
        console.log("✅ Server response:", data.project);
  
        // 🛑 Clear saved shapes after saving
        setSavedShapes([]);
        setProjectName("");
        setDescription("");
        setShowProjectModal(false);
      } else {
        console.error("❌ Backend error response:", data);
        alert(data.message || "Failed to save project.");
      }
    } catch (error) {
      console.error("❌ Error saving project:", error);
      alert("An error occurred while saving the project. Please try again.");
    }
  };
  
  
  
 
  
  return isLoaded ? (
    <div className="map-page-container-unique">
       {/* 🔵 Save Project Modal */}
       {showAddAddressModal && (
  <div className="modal-overlay">
    <div className="modal-container">
      <h2>Add Address</h2>
      <input 
        type="text" 
        placeholder="Enter address..." 
        value={manualAddress}
        onChange={(e) => setManualAddress(e.target.value)}
      />
      <div className="modal-buttons">
        <button onClick={() => setShowAddAddressModal(false)}>Cancel</button>
        <button onClick={handleAddAddress}>Add</button>
      </div>
    </div>
  </div>
)}

{showProjectModal && (
  <div className="modal-overlay">
    <div className="modal-container">
      <h2>Save Project</h2>
      <label>Update name or keep your old one:</label>
      <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="Enter project name..."
      />

      <label>Update description:</label>
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
  Update Project 💾
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
           {/* Render saved shapes from the database */}
           {savedShapes.map((shape, index) =>
   (
    shape.type === "Polygon" ? (
      <Polygon
        key={`polygon-${index}`}
        paths={shape.coordinates}
        options={{
          fillOpacity: 0.3,
          fillColor: selectedShapeIndex === index ? "#00FF00" : "#ff0000",
          strokeColor: selectedShapeIndex === index ? "#00FF00" : "#ff0000",
          strokeWeight: 2,
          editable: selectedShapeIndex === index, // ✅ Allow edit ONLY if selected
        draggable: selectedShapeIndex === index, // 🔥 Allow moving shape
        }}
        onLoad={(polygon) => {
          polygonRefs.current[index] = polygon;
          
        }}
        onClick={() => handleShapeClick(index)}
      />
    ) : (
      <Polyline
        key={`polyline-${index}`}
        path={shape.coordinates}
        options={{
          strokeColor: selectedShapeIndex === index ? "#00FF00" : "#0000ff",
          strokeWeight: 3,
          editable: selectedShapeIndex === index, // ✅ Allow edit ONLY if selected
        draggable: selectedShapeIndex === index,// 🔥 Allow moving shape
        }}
        onLoad={(polyline) => {
          polylineRefs.current[index] = polyline;
         
        }}
        onClick={() => handleShapeClick(index)}
      />
    )
  )
)}


{selectedShapeAddresses.map((home, index) => (
  <Marker
    key={`home-${index}`}
    position={{ lat: home.lat, lng: home.lng }}
    title={home.name}
    icon={{
      url: hoveredAddress === home.name
        ? "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png" // Highlighted icon
        : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png", // Normal icon
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
    <ul className="map-homes-list-unique">
    {selectedShapeAddresses.length > 0 ? (
      selectedShapeAddresses.map((home, index) => (
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
<button 
  className="map-add-address-btn-unique" 
  onClick={() => setShowAddAddressModal(true)}
>
  ➕ Add Address
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
 {/* Shapes List Content */}
 {showShapesList && (
  <div className="map-shapes-list-content-unique">
    {savedShapes.length > 0 ? (
      savedShapes.map((shape, index) => {
        const isPolygon = shape.shapeType === "Polygon";
        
        let measurement = "Calculating...";
        if (window.google && window.google.maps.geometry) {
          if (isPolygon) {
            const googlePolygon = new window.google.maps.Polygon({ paths: shape.coordinates });
            measurement = `${window.google.maps.geometry.spherical.computeArea(googlePolygon.getPath()).toFixed(2)} m²`;
          } else {
            const googlePolyline = new window.google.maps.Polyline({ path: shape.coordinates });
            measurement = `${window.google.maps.geometry.spherical.computeLength(googlePolyline.getPath()).toFixed(2)} m`;
          }
        }

        return (
          <div 
            key={shape.id} 
            className="map-shape-item-unique"
            onClick={() => {
              setSelectedShapeIndex(index);
              setSelectedShapeAddresses(shape.addresses);
              setShowHomesList(true);
            }}
          >
            {/* Shape Header with Delete Button */}
            <div className="map-shape-header-unique">
              <h4>{measurement}</h4>
              <div className="shape-actions">
                <button 
                  className="map-delete-shape-btn-unique"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent shape selection when clicking delete
                    handleDeleteShape(index);
                  }}
                >
                  🗑️
                </button>
                <button className="map-view-shape-btn-unique" onClick={() => toggleShapeDetails(index)}>
                  {shape.showDetails ? "▲ Hide Details" : "▼ View Details"}
                </button>
              </div>
            </div>

            {/* Coordinates Section */}
            <div className="map-shape-coordinates-box">
              <p><strong>Coordinates:</strong></p>
              <ul className="map-shape-coordinates-list-unique">
                {shape.coordinates.map((coord, coordIndex) => (
                  <li key={coordIndex}>Lat: {coord.lat}, Lng: {coord.lng}</li>
                ))}
              </ul>
            </div>

            {/* Addresses List */}
            {shape.showDetails && (
              <div className="map-shape-addresses-box">
                <h5>Addresses Inside:</h5>
                <ul className="map-shape-address-list-unique">
                  {shape.addresses.length > 0 ? (
                    shape.addresses.map((addr, addrIndex) => (
                      <li key={addrIndex}>{addr.name}</li>
                    ))
                  ) : (
                    <p>No addresses found.</p>
                  )}
                </ul>
              </div>
            )}
          </div>
        );
      })
    ) : (
      <p className="map-no-shapes-msg-unique">No saved shapes.</p>
    )}
  </div>
)}

</div>



      </div>
    </div>
  ) : null;
}  

export default ManagingComponent;

