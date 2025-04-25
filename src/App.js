import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./components/Auth";
import UserMainComponent from "./components/User/UserMainComponent";
import AdminMainComponent from "./components/Admin/AdminMainComponent";
import ResetPassword from "./components/ResetPassword";
import { useUser } from "./components/contexts/UserContext";
import Loader from "./components/Loader";
import Swal from "sweetalert2";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setDisplayName } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      // Skip session check for reset-password route
      if (window.location.pathname === "/reset-password") {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userRoleData, error } = await supabase
          .from("user_roles")
          .select("role_id")
          .eq("user_id", session.user.id)
          .single();

        if (!error) {
          setIsAuthenticated(true);
          setUserRole(userRoleData.role_id);
          setDisplayName(session.user.user_metadata.display_name);
        }
      }
      setLoading(false);
    };

    checkSession();
  }, [setDisplayName]);

  const handleLoginSuccess = (role, displayName) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setDisplayName(displayName);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserRole(null);
    setDisplayName(null);

    Swal.fire({
      title: "Logged Out!",
      text: "You have been logged out successfully.",
      icon: "success",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
      backdrop: false,
    });

    navigate("/auth");
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/auth"
        element={<Auth onLoginSuccess={handleLoginSuccess} />}
      />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            userRole === 1 ? (
              <AdminMainComponent onLogout={handleLogout} />
            ) : (
              <UserMainComponent onLogout={handleLogout} />
            )
          ) : (
            <Auth onLoginSuccess={handleLoginSuccess} />
          )
        }
      />
    </Routes>
  );
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;