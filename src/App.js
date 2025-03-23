import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./components/Auth";
import UserMainComponent from "./components/User/UserMainComponent";
import AdminMainComponent from "./components/Admin/AdminMainComponent";
import { useUser } from "./components/contexts/UserContext";
import Loader from "./components/Loader";
import Swal from "sweetalert2";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setDisplayName } = useUser();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userRoleData, error } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', session.user.id)
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

    Swal.fire({
      title: 'Logged Out!',
      text: 'You have been logged out successfully.',
      icon: 'success',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
      backdrop: false
    });
  };


  if (loading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return userRole === 1 ? <AdminMainComponent onLogout={handleLogout} /> : <UserMainComponent onLogout={handleLogout} />;

}

export default App;