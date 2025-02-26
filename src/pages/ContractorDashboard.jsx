import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ContractorDashboard.css";

const ContractorDashboard = () => {
  const navigate = useNavigate();

  // State to toggle sections
  const [showAvailableProjects, setShowAvailableProjects] = useState(true);
  const [showAssignedProjects, setShowAssignedProjects] = useState(true);

  // State for projects
  const [availableProjects, setAvailableProjects] = useState([]);
  const [assignedProjects, setAssignedProjects] = useState([]);

  // ✅ Pop-up Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [proposedPrice, setProposedPrice] = useState("");
  const [loading, setLoading] = useState(false); // Loading state for button

  // ✅ Fetch Current User Email
  const currentUserEmail = JSON.parse(localStorage.getItem("user"))?.email || "unknown";
// Store pricing for individual polygons and polylines
const [polygonPrices, setPolygonPrices] = useState({});
const [polylinePrices, setPolylinePrices] = useState({});
const [addressPrices, setAddressPrices] = useState({});

// ✅ Function to handle price input change for addresses

  // ✅ Fetch Projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          alert("User not authenticated. Please log in.");
          navigate("/login");
          return;
        }

        // 🔹 Fetch Available Projects (Other Users' Projects)
        const availableRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/project/all-other-projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const availableData = await availableRes.json();
        if (availableRes.ok) {
          setAvailableProjects(
            (availableData.projects || []).map((project) => ({
              ...project,
              totalAddresses: project.shapes?.reduce(
                (total, shape) => total + (shape.addresses ? shape.addresses.length : 0),
                0
              ) // ✅ Count all addresses in shapes
            }))
          );
        }
        

        // 🔹 Fetch Assigned Projects (Future logic)
        setAssignedProjects([]); // Placeholder

      } catch (error) {
        console.error("Error fetching projects:", error);
        alert("Failed to fetch projects.");
      }
    };

    fetchProjects();
  }, [navigate]);

  // ✅ Open Pop-up for Proposal
  const openProposalModal = (project) => {
    setSelectedProject(project);
  
    // ✅ Initialize prices for all addresses
    const initialPrices = {};
    project.shapes?.flatMap((shape) => shape.addresses).forEach((_, index) => {
      initialPrices[index] = ""; // Start with an empty price input
    });
  
    setAddressPrices(initialPrices); // ✅ Set initial prices
    setShowModal(true);
  };
  
  const handleAddressPriceChange = (index, value) => {
    setAddressPrices((prev) => ({
      ...prev,
      [index]: value, // ✅ Store price per address index
    }));
  };
  const calculateTotalPrice = () => {
    return Object.values(addressPrices).reduce(
      (sum, price) => sum + (parseFloat(price) || 0),
      0
    );
  };
    

  // ✅ Close Pop-up
  const closeProposalModal = () => {
    setShowModal(false);
    setSelectedProject(null);
    setProposedPrice("");
  };
  const handlePolygonPriceChange = (index, value) => {
    setPolygonPrices((prev) => ({ ...prev, [index]: value }));
  };
  
  const handlePolylinePriceChange = (index, value) => {
    setPolylinePrices((prev) => ({ ...prev, [index]: value }));
  };
  
  // Calculate total price dynamically
  
  
  // ✅ Submit Proposal
 const submitProposal = async () => {
  const totalPrice = calculateTotalPrice(); // ✅ Get total from shape prices

if (!totalPrice || isNaN(totalPrice) || totalPrice <= 0) {
  alert("Please enter a valid total price.");
  return;
}


  try {
    setLoading(true);
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user")); // ✅ Get user details
    console.log("🔍 Debugging Proposal Data:", {
      senderEmail: user?.email,
      projectId: selectedProject?._id,
      projectAdmin: selectedProject?.admin,
      priceQuoted: totalPrice,
    });
    
    // ✅ Ensure all fields exist
    if (!user?.email || !selectedProject?._id || !selectedProject?.admin) {
      alert("All fields are required.");
      console.error("❌ Missing Data:", { user, selectedProject });
      setLoading(false);
      return;
    }

    console.log("🔍 Proposal Data:", {
      proposalSender: user?.email, // ✅ Contractor Email
      projectId: selectedProject?._id, // ✅ Project ID
      projectAdmin: selectedProject?.admin, // ✅ Project Admin Email
      priceQuoted: calculateTotalPrice(), // ✅ Price Offered
    });

    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/proposal/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        senderEmail: user?.email, // ✅ Contractor Email
        projectId: selectedProject?._id, // ✅ Project ID
        adminEmail: selectedProject?.admin, // ✅ Project Admin Email
        priceQuoted:calculateTotalPrice() , // ✅ Price Offered
      }),
    });

    const data = await response.json();
    console.log("🔍 Proposal Submission Response:", data); // ✅ Debugging log

    if (response.ok) {
      alert("Proposal submitted successfully!");
      closeProposalModal(); // ✅ Close modal on success
    } else {
      alert(data.message || "Failed to submit proposal.");
    }
  } catch (error) {
    console.error("❌ Error submitting proposal:", error);
    alert("Error submitting proposal. Try again.");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <header className="navbar">
        <button onClick={() => setShowAvailableProjects(true)}>Available Projects</button>
        <button onClick={() => setShowAssignedProjects(true)}>Assigned Projects</button>
        <button
  onClick={() => {
    localStorage.removeItem("token"); // ✅ Remove token
    navigate("/"); // ✅ Redirect to homepage or login
  }}
>
  Logout
</button>
      </header>

      {/* Available Projects Section */}
      <section className="projects-section">
        <div className="section-header">
          <h3>Available Projects</h3>
          <button className="toggle-button" onClick={() => setShowAvailableProjects(!showAvailableProjects)}>
            {showAvailableProjects ? "Hide" : "Show"}
          </button>
        </div>

        {showAvailableProjects && (
          <table className="projects-table">
            <thead>
  <tr>
    <th>Project Name</th>
    <th>Location</th>
    <th>Status</th>
    <th>Addresses</th> {/* New Column */}
    <th>Actions</th>
  </tr>
</thead>

<tbody>
  {availableProjects.map((project) => (
    <tr key={project._id}>
      <td>{project.projectName}</td>
      <td>{project.address}</td>
      <td>{project.status}</td>
      <td>{project.totalAddresses ?? 0}</td> {/* ✅ Use `totalAddresses` */}
      <td>
        <button className="view-btn" onClick={() => navigate(`/view-project/${project._id}`, { state: { project } })}>
          View
        </button>
        <button className="propose-btn" onClick={() => openProposalModal(project)}>
          Propose
        </button>
      </td>
    </tr>
  ))}
</tbody>

          </table>
        )}
      </section>

      {/* Assigned Projects Section (Placeholder) */}
      <section className="projects-section">
        <div className="section-header">
          <h3>Assigned Projects</h3>
          <button className="toggle-button" onClick={() => setShowAssignedProjects(!showAssignedProjects)}>
            {showAssignedProjects ? "Hide" : "Show"}
          </button>
        </div>

        {showAssignedProjects && assignedProjects.length > 0 ? (
          <table className="projects-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignedProjects.map((project) => (
                <tr key={project._id}>
                  <td>{project.projectName}</td>
                  <td>{project.address}</td>
                  <td>{project.status}</td>
                  <td>
                    <button onClick={() => console.log(`Started ${project.projectName}`)}>Start</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          showAssignedProjects && <p>No assigned projects.</p>
        )}
      </section>

      
      {showModal && selectedProject && (
  <div className="modal-overlay">
    <div className="modal-content">
      {/* ✅ Project Details */}
      <div className="modal-details">
        <h2>Propose for {selectedProject.projectName}</h2>
        <p><strong>Description:</strong> {selectedProject.description}</p>
      </div>

      {/* ✅ Addresses Pricing Section */}
     {/* ✅ Addresses Pricing Section */}
{selectedProject.shapes?.flatMap((shape) => shape.addresses).length > 0 && (
  <div className="shape-section">
    <h4>Address-Based Pricing:</h4>
    {selectedProject.shapes?.flatMap((shape) => shape.addresses).map((address, index) => (
      <div key={index} className="shape-price-input">
        <label>{address.name} ($):</label>
        <input
          type="number"
          value={addressPrices[index] || ""}
          onChange={(e) => handleAddressPriceChange(index, e.target.value)}
          placeholder="Enter price"
        />
      </div>
    ))}
  </div>
)}


      {/* ✅ Total Price Section */}
      <div className="total-price">
        <p><strong>Total Proposed Price:</strong> ${calculateTotalPrice()}</p>
      </div>

      {/* ✅ Buttons Section */}
      <div className="modal-actions">
        <button className="submit-btn" onClick={submitProposal} disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </button>
        <button className="cancel-btn" onClick={closeProposalModal} disabled={loading}>
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default ContractorDashboard;
