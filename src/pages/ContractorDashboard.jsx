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
            (availableData.projects || []).sort((a, b) =>
              a.projectName.localeCompare(b.projectName) // 🔥 Sort Alphabetically
            )
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
    setShowModal(true);
  };

  // ✅ Close Pop-up
  const closeProposalModal = () => {
    setShowModal(false);
    setSelectedProject(null);
    setProposedPrice("");
  };

  // ✅ Submit Proposal
 const submitProposal = async () => {
  if (!proposedPrice || isNaN(proposedPrice) || proposedPrice <= 0) {
    alert("Please enter a valid price.");
    return;
  }

  try {
    setLoading(true);
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user")); // ✅ Get user details

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
      priceQuoted: proposedPrice, // ✅ Price Offered
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
        priceQuoted: proposedPrice, // ✅ Price Offered
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
        <button onClick={() => console.log("Logout Clicked")}>Logout</button>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {availableProjects.map((project) => (
                <tr key={project._id}>
                  <td>{project.projectName}</td>
                  <td>{project.address}</td>
                  <td>{project.status}</td>
                  <td>
                    {/* 🔹 View Button */}
                    <button className="view-btn" onClick={() => navigate(`/view-project/${project._id}`, { state: { project } })}>
                      View
                    </button>

                    {/* 🔹 Propose Button */}
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

      {/* 🔹 Proposal Pop-up Modal */}
      {showModal && selectedProject && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Propose for {selectedProject.projectName}</h2>
            <p><strong>Description:</strong> {selectedProject.description}</p>
            <p><strong>Total Area:</strong> {selectedProject.totalArea?.toFixed(2)} m²</p>
            <p><strong>Total Length:</strong> {selectedProject.totalLength?.toFixed(2)} m</p>
            
            {/* Proposal Input */}
            <label>Enter Your Proposed Price ($):</label>
            <input
              type="number"
              value={proposedPrice}
              onChange={(e) => setProposedPrice(e.target.value)}
              placeholder="Enter price"
            />

            <div className="modal-actions">
              <button className="submit-btn" onClick={submitProposal} disabled={loading}>
                {loading ? "Submitting..." : "Submit"}
              </button>
              <button className="cancel-btn" onClick={closeProposalModal} disabled={loading}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractorDashboard;
