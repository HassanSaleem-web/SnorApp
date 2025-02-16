import React, { useState, useEffect, useRef } from "react";



import { useNavigate, useLocation } from "react-router-dom";
import {
  GoogleMap,
  Polygon,
  Polyline,
  DrawingManager,
  useJsApiLoader,
} from "@react-google-maps/api";
import "../styles/ManagingComponent.css";


const libraries = ["places", "drawing", "geometry"];
// Generate a consistent color for each user




const assignedColors = {}; // Store user colors persistently

const generateColorFromHash = (email) => {
  const hash = md5(email); // Get a hash of the email
  const r = parseInt(hash.substring(0, 2), 16); // Convert first 2 hex characters to Red
  const g = parseInt(hash.substring(2, 4), 16); // Convert next 2 to Green
  const b = parseInt(hash.substring(4, 6), 16); // Convert next 2 to Blue

  return `rgb(${r}, ${g}, ${b})`; // Return as an RGB color
};

const getUserColor = (email) => {
  if (!email) return "#000000"; // Default to black if email is missing
  if (!assignedColors[email]) {
    assignedColors[email] = generateColorFromHash(email);
  }
  console.log("color", assignedColors[email],email);
  return assignedColors[email];
};


const ManagingComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef(null);
  const polygonRefs = useRef([]); // Store Polygon references
  const polylineRefs = useRef([]); // Store Polyline references
  const [projectData, setProjectData] = useState(location.state?.project || {});
  const [polygons, setPolygons] = useState(projectData.polygons || []);
  const [polylines, setPolylines] = useState(projectData.polylines || []);
  const [center, setCenter] = useState({
    lat: 28.7041, // Default center if not provided
    lng: 77.1025,
  });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });
  const currentUserEmail = JSON.parse(localStorage.getItem("user"))?.email || "unknown";

  useEffect(() => {
    if (projectData?.address && projectData?.polygons?.length > 0) {
      const firstPolygon = projectData.polygons[0];
      const firstPoint = firstPolygon.coordinates[0];
      setCenter({ lat: firstPoint.lat, lng: firstPoint.lng });
    }
  }, [projectData]);

  const containerStyle = {
    width: "100%",
    height: "500px",
  };

  const polygonOptions = {
    fillOpacity: 0.4,
    fillColor: "#ff0000",
    strokeColor: "#ff0000",
    strokeWeight: 2,
    editable: true,
    draggable: true,
  };

  const polylineOptions = {
    strokeColor: "#0000ff",
    strokeWeight: 3,
    editable: true,
    draggable: true,
  };

  const drawingManagerOptions = {
    drawingControl: true,
    drawingControlOptions: {
      position: window.google?.maps?.ControlPosition?.TOP_CENTER,
      drawingModes: ["polygon", "polyline"],
    },
  };

  const onOverlayComplete = (event) => {
    const { type, overlay } = event;

    if (type === "polygon") {
      const newPolygon = overlay
        .getPath()
        .getArray()
        .map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }));

      setPolygons([...polygons, { coordinates: newPolygon }]);
    }

    if (type === "polyline") {
      const newPolyline = overlay
        .getPath()
        .getArray()
        .map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }));

      setPolylines([...polylines, { coordinates: newPolyline }]);
    }

    overlay.setMap(null); // Remove the overlay from the map
  };

  // 🔥 DELETE FUNCTION FOR POLYGONS
  const deletePolygon = (index) => {
    const updatedPolygons = polygons.filter((_, i) => i !== index);
    setPolygons(updatedPolygons);
  };

  const highlightShape = (type, index) => {
    if (!mapRef.current) return;
  
    let shapeRef = type === "polygon" ? polygonRefs.current[index] : polylineRefs.current[index];
    if (!shapeRef) return;
  
    // Get bounds of shape to focus the map
    let bounds = new window.google.maps.LatLngBounds();
    shapeRef.getPath().forEach((latLng) => bounds.extend(latLng));
    const center = bounds.getCenter();
  
    // Move map to center on the shape
    mapRef.current.panTo(center);
    mapRef.current.setZoom(17); // Zoom in for better visibility
  
    // Temporarily change stroke color for highlighting
    const originalStrokeColor = shapeRef.get("strokeColor");
    shapeRef.setOptions({ strokeColor: "#ffcc00", strokeWeight: 4 });
  
    // Reset color after 1.5 seconds
    setTimeout(() => {
      shapeRef.setOptions({ strokeColor: originalStrokeColor, strokeWeight: 2 });
    }, 1500);
  };
  
  // 🔥 DELETE FUNCTION FOR POLYLINES
  const deletePolyline = (index) => {
    console.log("Before Deletion:", polylines);
  
    // Remove polyline from the map
    if (polylineRefs.current[index]) {
      polylineRefs.current[index].setMap(null); // Explicitly remove from map
      polylineRefs.current.splice(index, 1); // Remove reference
    }
  
    // Update state to reflect deletion
    const updatedPolylines = [...polylines];
    updatedPolylines.splice(index, 1);
    setPolylines(updatedPolylines);
  
    console.log("After Deletion:", updatedPolylines);
  };
  
  
  const removeHighlight = (type, index) => {
    if (type === "polygon" && polygonRefs.current[index]) {
      polygonRefs.current[index].setOptions({
        strokeWeight: 2,
        fillOpacity: 0.5, // Reset to normal
      });
    }
    if (type === "polyline" && polylineRefs.current[index]) {
      polylineRefs.current[index].setOptions({
        strokeWeight: 3, // Reset to normal
      });
    }
  };
  
  const updateProject = async () => {
    const token = localStorage.getItem("token");
    const userEmail = JSON.parse(localStorage.getItem("user"))?.email || "unknown"; // ✅ Ensure we get the user email

    if (!token) {
      alert("User not authenticated. Please log in.");
      navigate("/login");
      return;
    }

    if (!projectData._id) {
      console.error("Error: Project ID is missing!");
      alert("Error: Project ID is required.");
      return;
    }

    console.log("🔍 Before Updating - Polygons `addedBy`:", polygons.map(p => p.addedBy));
    console.log("🔍 Before Updating - Polylines `addedBy`:", polylines.map(p => p.addedBy));

    const updatedProject = {
      _id: projectData._id, 
      projectName: projectData.projectName,
      description: projectData.description,
      status: projectData.status,
      address: projectData.address,
      admin: projectData.admin,

      polygons: polygons.map((polygon) => ({
        coordinates: polygon.coordinates.map((coord) => ({
          lat: coord.lat,
          lng: coord.lng,
        })),
        addedBy: polygon.addedBy || userEmail, // ✅ Preserve existing addedBy or assign current user
      })),

      polylines: polylines.map((polyline) => ({
        coordinates: polyline.coordinates.map((coord) => ({
          lat: coord.lat,
          lng: coord.lng,
        })),
        addedBy: polyline.addedBy || userEmail, // ✅ Preserve existing addedBy or assign current user
      })),

      totalArea: projectData.totalArea,
      totalLength: projectData.totalLength,
    };

    console.log("🚀 After Updating - Polygons `addedBy`:", updatedProject.polygons.map(p => p.addedBy));
    console.log("🚀 After Updating - Polylines `addedBy`:", updatedProject.polylines.map(p => p.addedBy));

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/project/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedProject),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Project updated successfully!");
      } else {
        console.error("Backend Error:", data);
        alert(data.message || "Failed to update project.");
      }
    } catch (error) {
      console.error("Error updating project:", error);
      alert("An error occurred while updating the project. Please try again.");
    }
  };


  return isLoaded ? (
    <div className="managing-container">
      {/* Navbar */}
      <header className="navbar">
        <h1>{projectData.projectName || "Project"}</h1>
        <button onClick={updateProject}>Save</button>
        <button onClick={() => navigate(-1)}>Back</button>
      </header>

      {/* Project Details */}
      <section className="project-details">
        <p>
          <strong>Description:</strong> {projectData.description}
        </p>
        <p>
          <strong>Status:</strong> {projectData.status}
        </p>
      </section>

      {/* Google Map */}
      <div className="map-container">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={15}
          onLoad={(map) => (mapRef.current = map)}
        >
          {/* Drawing Manager */}
          <DrawingManager
            onOverlayComplete={onOverlayComplete}
            options={drawingManagerOptions}
          />

          {/* Render Polygons */}
          {/* Render Polygons */}
          {polygons.map((polygon, index) => {
  const userColor = getUserColor(polygon.addedBy || "unknown");
  return (
    <Polygon
      key={`polygon-${index}`}
      paths={polygon.coordinates}
      options={{
        fillOpacity: 0.5,
        fillColor: userColor,
        strokeColor: userColor,
        strokeWeight: 2,
        editable: true,
        draggable: true,
      }}
      onLoad={(polygon) => (polygonRefs.current[index] = polygon)} // Store polygon reference
    />
  );
})}

{polylines.map((polyline, index) => {
  const userColor = getUserColor(polyline.addedBy || "unknown");
  return (
    <Polyline
      key={`polyline-${index}`}
      path={polyline.coordinates}
      options={{
        strokeColor: userColor,
        strokeWeight: 3,
        editable: true,
        draggable: true,
      }}
      onLoad={(polyline) => (polylineRefs.current[index] = polyline)} // Store polyline reference
    />
  );
})}

        </GoogleMap>
      </div>

      <section className="shape-management">
  <h3>Manage Shapes</h3>

  {/* Table for Polygons */}
  <h4>Polygons:</h4>
  {polygons.length > 0 ? (
    <div className="table-container"> {/* ✅ Wrapper with scrollbar */}
      <table className="shape-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Added By</th>
            <th>Area (m²)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {polygons.map((polygon, index) => {  // ✅ Show only 5 per frame
            const userColor = getUserColor(polygon.addedBy || "unknown");
            const canDelete = currentUserEmail === projectData.admin || currentUserEmail === polygon.addedBy;

            return (
              <tr key={index} style={{ backgroundColor: userColor, color: "#fff" }}
                  onMouseEnter={() => highlightShape("polygon", index)}
                  onMouseLeave={() => removeHighlight("polygon", index)}
              >
                <td>{index + 1}</td>
                <td>{polygon.addedBy || "Unknown"}</td>
                <td>{polygon.area ? polygon.area.toFixed(2) : "Calculating..."}</td>
                <td>
                  {canDelete && (
                    <button onClick={(e) => { e.stopPropagation(); deletePolygon(index); }}>Delete</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <p>No polygons added yet.</p>
  )}

  {/* Table for Polylines */}
  <h4>Polylines:</h4>
  {polylines.length > 0 ? (
    <div className="table-container"> {/* ✅ Wrapper with scrollbar */}
      <table className="shape-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Added By</th>
            <th>Length (m)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {polylines.map((polyline, index) => {  // ✅ Show only 5 per frame
            const userColor = getUserColor(polyline.addedBy || "unknown");
            const canDelete = currentUserEmail === projectData.admin || currentUserEmail === polyline.addedBy;

            return (
              <tr key={index} style={{ backgroundColor: userColor, color: "#fff" }}
                  onMouseEnter={() => highlightShape("polyline", index)}
                  onMouseLeave={() => removeHighlight("polyline", index)}
              >
                <td>{index + 1}</td>
                <td>{polyline.addedBy || "Unknown"}</td>
                <td>{polyline.length ? polyline.length.toFixed(2) : "Calculating..."}</td>
                <td>
                  {canDelete && (
                    <button onClick={(e) => { e.stopPropagation(); deletePolyline(index); }}>Delete</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <p>No polylines added yet.</p>
  )}
</section>



    </div>
  ) : (
    <p>Loading...</p>
  );
};

export default ManagingComponent;
