import React, { useState } from "react";
import "../styles/ContractorDashboard.css";

const ContractorDashboard = () => {
  // State to toggle sections
  const [showAvailableProjects, setShowAvailableProjects] = useState(true);
  const [showAssignedProjects, setShowAssignedProjects] = useState(true);

  // Mock data for projects
  const availableProjects = [
    { id: 1, name: "Snow Removal A", location: "Chicago, IL", status: "Open" },
    { id: 2, name: "Snow Removal B", location: "Minneapolis, MN", status: "Open" },
    { id: 3, name: "Snow Removal C", location: "Denver, CO", status: "Closed" },
  ];

  const assignedProjects = [
    { id: 1, name: "Snow Job X", location: "Buffalo, NY", status: "Active" },
    { id: 2, name: "Snow Job Y", location: "Boston, MA", status: "Pending" },
    { id: 3, name: "Snow Job Z", location: "Anchorage, AK", status: "Completed" },
  ];

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
          <button
            className="toggle-button"
            onClick={() => setShowAvailableProjects(!showAvailableProjects)}
          >
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {availableProjects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.location}</td>
                  <td>{project.status}</td>
                  <td>
                    {project.status === "Open" ? (
                      <button onClick={() => console.log(`Proposed for ${project.name}`)}>
                        Propose
                      </button>
                    ) : (
                      <button disabled>Disabled</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Assigned Projects Section */}
      <section className="projects-section">
        <div className="section-header">
          <h3>Assigned Projects</h3>
          <button
            className="toggle-button"
            onClick={() => setShowAssignedProjects(!showAssignedProjects)}
          >
            {showAssignedProjects ? "Hide" : "Show"}
          </button>
        </div>
        {showAssignedProjects && (
          <table className="projects-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Location</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {assignedProjects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.location}</td>
                  <td>{project.status}</td>
                  <td>
                    {project.status === "Active" || project.status === "Pending" ? (
                      <button onClick={() => console.log(`Started ${project.name}`)}>
                        Start
                      </button>
                    ) : (
                      <button onClick={() => console.log(`Viewing report for ${project.name}`)}>
                        Report
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default ContractorDashboard;
