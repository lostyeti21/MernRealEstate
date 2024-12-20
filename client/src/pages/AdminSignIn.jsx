import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AdminSignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      const response = await axios.post("/api/admin/signin", { email, password });
      if (response.status === 200 && response.data.isAdmin) {
        setError("");
        navigate("/admin");
      } else {
        setError("You do not have admin privileges.");
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError("Failed to sign in. Please try again later.");
      }
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();

    if (!adminUsername || !adminEmail || !adminPassword) {
      setError("Please fill in all fields to create an admin.");
      return;
    }

    try {
      const response = await axios.post("/api/admin/create", {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      });

      alert(`Admin user created successfully: ${response.data.email}`);
      setAdminUsername("");
      setAdminEmail("");
      setAdminPassword("");
      setError("");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError(err.response.data.message || "Admin already exists.");
      } else {
        setError("Failed to create admin user. Please try again later.");
      }
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Admin Sign-In</h2>
      <form onSubmit={handleSignIn} style={styles.form}>
        {error && <p style={styles.error}>{error}</p>}

        <label htmlFor="email" style={styles.label}>Email:</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <label htmlFor="password" style={styles.label}>Password:</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button type="submit" style={styles.button}>Sign In</button>
      </form>

      <hr style={styles.divider} />

      <button onClick={() => setIsCreatingAdmin(!isCreatingAdmin)} style={styles.toggleButton}>
        {isCreatingAdmin ? "Back to Sign-In" : "Create Admin User"}
      </button>

      {isCreatingAdmin && (
        <form onSubmit={handleCreateAdmin} style={styles.form}>
          <h3 style={styles.subTitle}>Create Admin User</h3>

          <label htmlFor="adminUsername" style={styles.label}>Admin Username:</label>
          <input
            type="text"
            id="adminUsername"
            value={adminUsername}
            onChange={(e) => setAdminUsername(e.target.value)}
            style={styles.input}
          />

          <label htmlFor="adminEmail" style={styles.label}>Admin Email:</label>
          <input
            type="email"
            id="adminEmail"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            style={styles.input}
          />

          <label htmlFor="adminPassword" style={styles.label}>Admin Password:</label>
          <input
            type="password"
            id="adminPassword"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            style={styles.input}
          />

          <button type="submit" style={styles.button}>Create Admin</button>
        </form>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "400px",
    margin: "50px auto",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    marginBottom: "20px",
    color: "#333",
  },
  subTitle: {
    marginBottom: "10px",
    color: "#555",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    marginBottom: "8px",
    fontWeight: "bold",
    color: "#555",
  },
  input: {
    marginBottom: "15px",
    padding: "10px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#007BFF",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  toggleButton: {
    margin: "20px 0",
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  error: {
    marginBottom: "15px",
    color: "red",
  },
  divider: {
    margin: "20px 0",
    borderTop: "1px solid #ccc",
  },
};

export default AdminSignIn;
