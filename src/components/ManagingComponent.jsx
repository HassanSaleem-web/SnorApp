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

const ManagingComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef(null);

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

const polylineRefs = useRef([]);

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
  
  

 const saveProject = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("User not authenticated. Please log in.");
      navigate("/login");
      return;
    }
  console.log("Polylines Before Saving:", polylines); // Debugging log

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
      addedBy: projectData.admin,
    })),
    
    polylines: polylines.map((polyline) => ({
      coordinates: polyline.coordinates.map((coord) => ({
        lat: coord.lat,
        lng: coord.lng,
      })),
      addedBy: projectData.admin,
    })),
    
    totalArea: projectData.totalArea, 
    totalLength: projectData.totalLength,
  };

  console.log("Polylines Sent to Backend:", updatedProject.polylines); // Debugging log

  try {
    const response = await fetch(
      `${process.env.REACT_APP_BACKEND_URL}/api/project`,
      {
        method: "POST",
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
      console.log("Updated Project Response:", data.project);
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
        <button onClick={saveProject}>Save</button>
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
          {polygons.map((polygon, index) => (
            <Polygon
              key={`polygon-${index}`}
              paths={polygon.coordinates}
              options={polygonOptions}
            />
          ))}

          {/* Render Polylines */}
          {polylines.map((polyline, index) => (
            <Polyline
              key={`polyline-${index}`}
              path={polyline.coordinates}
              options={polylineOptions}
            />
          ))}
        </GoogleMap>
      </div>

      {/* Shape Management */}
      <section className="shape-management">
        <h3>Manage Shapes</h3>

        {/* List Polygons with Delete Button */}
        <h4>Polygons:</h4>
        {polygons.map((polygon, index) => (
          <div key={index}>
            <p>Polygon {index + 1}</p>
            <button onClick={() => deletePolygon(index)}>Delete</button>
          </div>
        ))}

        {/* List Polylines with Delete Button */}
        <h4>Polylines:</h4>
        {polylines.map((polyline, index) => (
          <div key={index}>
            <p>Polyline {index + 1}</p>
            <button onClick={() => deletePolyline(index)}>Delete</button>
          </div>
        ))}
      </section>
    </div>
  ) : (
    <p>Loading...</p>
  );
};

export default ManagingComponent;
