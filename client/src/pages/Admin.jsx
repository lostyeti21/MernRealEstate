import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("/api/user"); // Adjust endpoint as necessary
        setUsers(response.data);
        setIsLoading(false);
      } catch (err) {
        setError("Failed to fetch users. Please try again later.");
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const handleSignOut = () => {
    // Clear admin session (if applicable) and navigate to sign-in page
    axios.post("/api/auth/signout")
      .then(() => {
        navigate("/admin-signin");
      })
      .catch((err) => {
        console.error("Error signing out:", err);
      });
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome, Admin</h1>
      <button onClick={handleSignOut} style={styles.signOutButton}>Sign Out</button>

      <div style={styles.userListSection}>
        <button onClick={toggleExpanded} style={styles.toggleButton}>
          {expanded ? "Hide Users" : "Show Users"}
        </button>

        {isLoading ? (
          <p style={styles.loadingText}>Loading users...</p>
        ) : error ? (
          <p style={styles.errorText}>{error}</p>
        ) : (
          expanded && (
            <ul style={styles.userList}>
              {users.map((user) => (
                <li key={user._id} style={styles.userItem}>
                  <p style={styles.userInfo}><strong>Name:</strong> {user.username}</p>
                  <p style={styles.userInfo}><strong>Email:</strong> {user.email}</p>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "600px",
    margin: "50px auto",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    fontFamily: "Arial, sans-serif",
    textAlign: "center",
  },
  title: {
    marginBottom: "20px",
    color: "#333",
  },
  signOutButton: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginBottom: "20px",
  },
  userListSection: {
    marginTop: "20px",
  },
  toggleButton: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#007BFF",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  loadingText: {
    marginTop: "20px",
    color: "#555",
  },
  errorText: {
    marginTop: "20px",
    color: "red",
  },
  userList: {
    marginTop: "20px",
    padding: "0",
    listStyleType: "none",
    textAlign: "left",
  },
  userItem: {
    padding: "10px",
    marginBottom: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    backgroundColor: "#f9f9f9",
  },
  userInfo: {
    margin: "5px 0",
  },
};

export default Admin;
