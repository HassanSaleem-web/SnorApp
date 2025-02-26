import React, { useState, useEffect } from "react";
import "../styles/UserDashboard.css";
import { useNavigate } from "react-router-dom";

const UserDashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("User");
  const [adminProjects, setAdminProjects] = useState([]); // Dynamically fetched admin projects
  const [linkedProjects, setLinkedProjects] = useState([]); // Placeholder if needed in the future
  const [searchQuery, setSearchQuery] = useState("");
  const [allProjects, setAllProjects] = useState([]); // Stores all projects except admin ones
  const [filteredProjects, setFilteredProjects] = useState([]); // Stores search results
  const [showDropdown, setShowDropdown] = useState(false); // Controls dropdown visibility
  const [filteredAdminProjects, setFilteredAdminProjects] = useState([]);
  const [showAdminProjects, setShowAdminProjects] = useState(true);
  const [showLinkedProjects, setShowLinkedProjects] = useState(true);
 
  const [requests, setRequests] = useState([]); // Store fetched requests
  const [activeDropdown, setActiveDropdown] = useState(null); // Track the active dropdown
  const [proposals, setProposals] = useState([]); // ✅ Store proposals
  const [showProposalsDropdown, setShowProposalsDropdown] = useState(false); // ✅ Toggle proposals dropdown
  const [hoveredProjectId, setHoveredProjectId] = useState(null);


  // Fetch user name and projects
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
  
        // Fetch user info
        const userResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = await userResponse.json();
        if (userResponse.ok) {
          setUserName(userData.name);
          localStorage.setItem("userAddress", userData.address); // ✅ Store address in localStorage
          console.log("The address", userData.address)
        }
        else {
          console.error(userData.message || "Failed to fetch user name.");
        }
  
        // Fetch admin projects
        const projectResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/project/my-projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const projectData = await projectResponse.json();
        if (projectResponse.ok) {
          setAdminProjects(projectData.projects);
        } else {
          console.error("Failed to fetch projects.");
        }
  
        // Fetch all other projects
        // const allProjectsResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/project/all-other-projects`, {
        //   headers: { Authorization: `Bearer ${token}` },
        // });
        // const allProjectsData = await allProjectsResponse.json();
        // if (allProjectsResponse.ok) {
        //   setAllProjects(allProjectsData.projects);
        // } else {
        //   console.error("Failed to fetch all projects.");
        // }
  
        // // Fetch linked projects ✅
        // fetchLinkedProjects();
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };
    const fetchProposals = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/proposal/admin-proposals`, {
          headers: { Authorization: `Bearer ${token}` },
        });
    
        const data = await response.json();
        if (response.ok) {
          setProposals(data.proposals);
          console.log(data.proposals);
        } else {
          console.error("Failed to fetch proposals:", data.message);
        }
      } catch (error) {
        console.error("Error fetching proposals:", error);
      }
    };
    
  
    fetchDashboardData();
    fetchProposals(); // ✅ Fetch proposals on load
  }, []);
  
  const fetchAccessRequests = async (projectId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/project/${projectId}/requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const data = await response.json();
  
      if (response.ok) {
        setRequests(data.requests); // Store requests in state
        setActiveDropdown(projectId); // Set the active project for the dropdown
      } else {
        console.error(data.message || "Failed to fetch access requests.");
      }
    } catch (error) {
      console.error("Error fetching access requests:", error);
    }
  };
  const fetchLinkedProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/project/linked-projects`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
  
      if (response.ok) {
        setLinkedProjects(data.projects); // ✅ Store linked projects in state
      } else {
        console.error(data.message || "Failed to fetch linked projects.");
      }
    } catch (error) {
      console.error("Error fetching linked projects:", error);
    }
  };
  const toggleProposalsDropdown = () => {
    setShowProposalsDropdown(!showProposalsDropdown);
  };
  
  const handleManageRequests = async (projectId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/project/${projectId}/requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
  
      if (response.ok) {
        // Group requests by email
        const groupedRequests = data.requests.reduce((acc, request) => {
          const { email, status } = request;
          if (!acc[email]) {
            acc[email] = { email, status, count: 1 };
          } else {
            acc[email].count += 1;
          }
          return acc;
        }, {});
  
        const groupedRequestsArray = Object.values(groupedRequests);
        setRequests({ [projectId]: groupedRequestsArray }); // Update state with grouped requests
      } else {
        console.error("Error fetching requests:", data.message);
      }
    } catch (error) {
      console.error("Error fetching access requests:", error);
    }
  };
  
  const handleAcceptRequest = async (projectId, requesterEmail) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/project/handle-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId,
            userEmail: requesterEmail,
            action: "approve",
          }),
        }
      );
      const data = await response.json();
  
      if (response.ok) {
        alert(`Request from ${requesterEmail} has been accepted.`);
        handleManageRequests(projectId); // Refresh requests after action
      } else {
        console.error("Error accepting request:", data.message);
      }
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };
  
  const handleDeleteRequest = async (projectId, requesterEmail) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/project/handle-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId,
            userEmail: requesterEmail,
            action: "deny",
          }),
        }
      );
      const data = await response.json();
  
      if (response.ok) {
        alert(`Request from ${requesterEmail} has been deleted.`);
        handleManageRequests(projectId); // Refresh requests after action
      } else {
        console.error("Error deleting request:", data.message);
      }
    } catch (error) {
      console.error("Error deleting request:", error);
    }
  };
  const handleRequestAction = async (projectId, requesterEmail, action) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/project/handle-access-request`, // ✅ Correct API route
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ projectId, userEmail: requesterEmail, action }),
        }
      );
  
      const data = await response.json();
      if (response.ok) {
        alert(`Request ${action}ed successfully.`);
        fetchAccessRequests(projectId); // ✅ Refresh requests after action
      } else {
        console.error(data.message || "Failed to handle request.");
        alert(data.message || "Failed to handle request.");
      }
    } catch (error) {
      console.error("Error handling request:", error);
      alert("An error occurred. Please try again.");
    }
  };
  
  
  // Filter projects based on search query
  const handleSearch = (event) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);
  
    if (query.trim() === "") {
      setShowDropdown(false);
      setFilteredProjects([]);
      return;
    }
  
    const filtered = allProjects.filter(
      (project) =>
        project.projectName.toLowerCase().includes(query) ||
        project.address.toLowerCase().includes(query)
    );
  
    setFilteredProjects(filtered);
    setShowDropdown(true);
  };
  

  const resetSearch = () => {
    setSearchQuery("");
    setFilteredAdminProjects([]);
  };
  
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }
  
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("User not authenticated. Please log in.");
        return;
      }
  
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/project/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      const data = await response.json();
  
      if (response.ok) {
        alert("Project deleted successfully!");
  
        // ✅ Remove project from state
        setAdminProjects((prevProjects) => prevProjects.filter((project) => project._id !== projectId));
      } else {
        alert(data.message || "Failed to delete project.");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("An error occurred while deleting the project.");
    }
  };
  
 

 
  const displayedAdminProjects = searchQuery ? filteredAdminProjects : adminProjects;

  return (
    <div className="dashboard-container">
      <header className="dashboard-navbar">
        <h1>Snør</h1>
        <button
  onClick={() => {
    const userAddress = localStorage.getItem("userAddress"); // ✅ Get stored address
    if (userAddress) {
      navigate("/create-project", { state: { address: userAddress } });
    } else {
      alert("No address found. Please update your profile.");
    }
  }}
>
  Create Project
</button>

        <div className="proposal-dropdown-container">
  <button onClick={toggleProposalsDropdown} className="dashboard-proposal-btn">
    Proposals
  </button>

  {showProposalsDropdown && (

    <div className="proposal-dropdown">
      {proposals.length > 0 ? (
        proposals.map((proposal) => (
          <div 
  key={proposal._id} 
  className="proposal-item"
  onMouseEnter={() => setHoveredProjectId(proposal.projectId.toString())} 
  onMouseLeave={() => setHoveredProjectId(null)}
>
  <p><strong>Project:</strong> {proposal.projectId}</p>
  <p><strong>Sender:</strong> {proposal.proposalSender}</p>
  <p><strong>Price Quoted:</strong> ${proposal.priceQuoted}</p>
</div>

        ))
      ) : (
        <p className="no-proposals">No proposals found.</p>
      )}
    </div>
  )}
</div>

<button
  onClick={() => {
    localStorage.removeItem("token"); // ✅ Remove token
    navigate("/"); // ✅ Redirect to homepage or login
  }}
>
  Logout
</button>
      </header>

     

      <section className="dashboard-welcome-section">
        <h2>Welcome, {userName}!</h2>
      </section>

      {/* Projects I Administer */}
      <section className="dashboard-projects-section">
        <div className="dashboard-section-header">
          <h3>My Projects</h3>
          <button
  className="dashboard-hide-btn"
  onClick={() => setShowAdminProjects(!showAdminProjects)}
>
  {showAdminProjects ? "Hide" : "Show"}
</button>

        </div>
        {showAdminProjects && (
  <table className="dashboard-projects-table">
    <thead>
      <tr>
        <th>Project Name</th>
        <th>Address</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {displayedAdminProjects.map((project) => (
        <tr
          key={project._id}
          className={hoveredProjectId === project._id.toString() ? "highlighted-row" : ""}
        >
          <td>{project.projectName}</td>
          <td>{project.address}</td>
          <td>{project.status}</td>
          <td>
            <button
              onClick={() =>
                navigate(`/manage-project/${project._id}`, { state: { project } })
              }
              className="dashboard-manage-btn"
            >
              Manage
            </button>
            <button className="dashboard-delete-btn"
            onClick={() => handleDeleteProject(project._id)}>Delete</button>
            <button
              className="dashboard-manage-requests-btn"
              onClick={() =>
                activeDropdown === project._id
                  ? setActiveDropdown(null)
                  : fetchAccessRequests(project._id)
              }
            >
              Manage Requests
            </button>

            {/* 🔥 Dropdown for Access Requests */}
            {activeDropdown === project._id && (
              <div className="dashboard-requests-dropdown">
                {requests.length > 0 ? (
                  Object.entries(
                    requests.reduce((acc, request) => {
                      acc[request.requesterEmail] = acc[request.requesterEmail] || [];
                      acc[request.requesterEmail].push(request);
                      return acc;
                    }, {})
                  ).map(([email, userRequests]) => (
                    <div key={email} className="dashboard-request-item">
                      <p>
                        <strong>Requester:</strong> {email}
                      </p>
                      <p>
                        <strong>Requests:</strong> {userRequests.length} request(s)
                      </p>
                      <p>
                        <strong>Status:</strong> {userRequests[0].status}
                      </p>
                      <div className="dashboard-request-actions">
                        <button
                          className="dashboard-accept-btn"
                          onClick={() => handleRequestAction(project._id, email, "approve")}
                        >
                          Accept
                        </button>
                        <button
                          className="dashboard-delete-btn"
                          onClick={() => handleRequestAction(project._id, email, "deny")}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No requests found.</p>
                )}
              </div>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
)}

      </section>

      {/* Linked Projects */}
     {/* My Linked Projects Section */}



      {/* Address Modal */}
     
    </div>
  );
};

export default UserDashboard;
