import React from "react";
import { Routes, Route } from "react-router-dom";
import SignUp from "../pages/SignUpPage"; // Sign-Up page
import UserDashboard from "../pages/UserDashboard"; // User/Admin Dashboard placeholder
import ContractorDashboard from "../pages/ContractorDashboard"; // Contractor Dashboard
import MapComponent from "../components/MapComponent"; // Map Component
import ManagingComponent from "../components/ManagingComponent";
import ViewingComponent from "../components/ViewingComponent";



const AppRoutes = () => {
  return (
    <Routes>
      {/* Sign-Up Page */}
      <Route path="/" element={<SignUp />} />

      {/* User/Admin Dashboard */}
      <Route path="/dashboard-user" element={<UserDashboard />} />

      {/* Contractor Dashboard */}
      <Route path="/dashboard-contractor" element={<ContractorDashboard />} />

      {/* Create Project */}
      <Route path="/create-project" element={<MapComponent />} />
      <Route path="/manage-project/:id" element={<ManagingComponent />} />
      <Route path="/view-project/:id" element={<ViewingComponent />} />

    </Routes>
  );
};

export default AppRoutes;
