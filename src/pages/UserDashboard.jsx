import React, { useState, useEffect } from "react";
import "../styles/UserDashboard.css";
import { useNavigate } from "react-router-dom";

const UserDashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("User");
  const [showAdminProjects, setShowAdminProjects] = useState(true);
  const [showLinkedProjects, setShowLinkedProjects] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredAdminProjects, setFilteredAdminProjects] = useState([]);
  const [filteredLinkedProjects, setFilteredLinkedProjects] = useState([]);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");

  const adminProjects = [
    { id: 1, name: "Project 1", address: "123 Main St", status: "Active", linked: true },
    { id: 2, name: "Project 2", address: "456 Elm St", status: "Completed", linked: false },
  ];

  const linkedProjects = [
    { id: 1, name: "Project A", admin: "John Doe", address: "789 Maple Rd", status: "Active", linked: true },
    { id: 2, name: "Project B", admin: "Sarah Smith", address: "101 Pine Ln", status: "Pending", linked: false },
  ];

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:3000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setUserName(data.name);
        } else {
          console.error(data.message || "Failed to fetch user name.");
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
      }
    };

    fetchUserName();
  }, []);

  const handleSearch = (event) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);

    setFilteredAdminProjects(
      adminProjects.filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          project.address.toLowerCase().includes(query)
      )
    );

    setFilteredLinkedProjects(
      linkedProjects.filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          project.address.toLowerCase().includes(query)
      )
    );
  };

  const resetSearch = () => {
    setSearchQuery("");
    setFilteredAdminProjects([]);
    setFilteredLinkedProjects([]);
  };

  const openAddressModal = () => {
    setAddressModalOpen(true);
  };

  const closeAddressModal = () => {
    setAddressModalOpen(false);
  };

  const handleAddressConfirm = () => {
    if (selectedAddress.trim()) {
      navigate("/create-project", { state: { address: selectedAddress } });
    } else {
      alert("Please enter a valid address.");
    }
    closeAddressModal();
  };

  const displayedAdminProjects = searchQuery ? filteredAdminProjects : adminProjects;
  const displayedLinkedProjects = searchQuery ? filteredLinkedProjects : linkedProjects;

  return (
    <div className="dashboard-container">
      <header className="navbar">
        <h1>Snør</h1>
        <button onClick={openAddressModal}>Create Project</button>
        <button onClick={() => console.log("Notifications Clicked")}>Notifications</button>
        <button onClick={() => console.log("Logout Clicked")}>Logout</button>
      </header>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search projects by name or address..."
          value={searchQuery}
          onChange={handleSearch}
        />
        {searchQuery && (
          <button onClick={resetSearch} className="clear-search">
            Clear
          </button>
        )}
      </div>

      <section className="welcome-section">
        <h2>Welcome, {userName}!</h2>
      </section>

      {/* Projects I Administer */}
      <section className="projects-section">
        <div className="section-header">
          <h3>Projects I Administer</h3>
          <button
            className="toggle-button"
            onClick={() => setShowAdminProjects(!showAdminProjects)}
          >
            {showAdminProjects ? "Hide" : "Show"}
          </button>
        </div>
        {showAdminProjects && (
          <table className="projects-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Address</th>
                <th>Status</th>
                <th>Linked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedAdminProjects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.address}</td>
                  <td>{project.status}</td>
                  <td>
                    {project.linked ? (
                      <span className="linked-indicator">Linked</span>
                    ) : (
                      <span className="unlinked-indicator">Unlinked</span>
                    )}
                  </td>
                  <td>
                    <button onClick={() => navigate(`/manage-project/${project.id}`)}>Manage</button>
                    <button>Add Users</button>
                    <button className="manage-requests">
                      <span role="img" aria-label="Link">🔗</span> Manage Requests
                    </button>
                    <button className="delete">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Linked Projects */}
      <section className="projects-section">
        <div className="section-header">
          <h3>My Linked/Unlinked Projects</h3>
          <button
            className="toggle-button"
            onClick={() => setShowLinkedProjects(!showLinkedProjects)}
          >
            {showLinkedProjects ? "Hide" : "Show"}
          </button>
        </div>
        {showLinkedProjects && (
          <table className="projects-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Admin</th>
                <th>Address</th>
                <th>Status</th>
                <th>Linked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedLinkedProjects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.admin}</td>
                  <td>{project.address}</td>
                  <td>{project.status}</td>
                  <td>
                    {project.linked ? (
                      <span className="linked-indicator">Linked</span>
                    ) : (
                      <span className="unlinked-indicator">Unlinked</span>
                    )}
                  </td>
                  <td>
                    <button onClick={() => navigate(`/view-project/${project.id}`)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Address Modal */}
      {addressModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Enter Project Address</h3>
            <input
              type="text"
              placeholder="Enter address..."
              value={selectedAddress}
              onChange={(e) => setSelectedAddress(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={handleAddressConfirm}>Confirm</button>
              <button onClick={closeAddressModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
