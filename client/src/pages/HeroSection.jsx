import React, { useEffect, useState } from "react";
import { FaArrowRight, FaStar } from "react-icons/fa";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function HeroSection() {
  const [gradientStyle, setGradientStyle] = useState({});

  useEffect(() => {
    // Handle gradient update based on cursor movement
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const xOffset = ((clientX - centerX) / centerX).toFixed(3);
      const yOffset = ((clientY - centerY) / centerY).toFixed(3);

      setGradientStyle({
        backgroundImage: `radial-gradient(circle at ${50 + xOffset * 50}% ${50 + yOffset * 50}%, #ffffff, #ff6f61)`
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    // Parallax and fade-in animations
    gsap.fromTo(
      ".heroContent",
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        scrollTrigger: {
          trigger: ".heroContent",
          start: "top center",
        },
      }
    );

    gsap.fromTo(
      ".featureCard",
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.3,
        scrollTrigger: {
          trigger: ".features",
          start: "top center",
        },
      }
    );

    gsap.fromTo(
      ".ratingCard",
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.3,
        scrollTrigger: {
          trigger: ".ratings",
          start: "top center",
        },
      }
    );

    // Additional animations
    gsap.to(".ctaButton", {
      scale: 1.1,
      duration: 0.5,
      repeat: -1,
      yoyo: true,
    });

    gsap.fromTo(
      ".footerNav a",
      { opacity: 0, x: -20 },
      {
        opacity: 1,
        x: 0,
        stagger: 0.2,
        duration: 0.5,
        scrollTrigger: {
          trigger: ".footerNav",
          start: "top 90%",
        },
      }
    );

    gsap.fromTo(
      ".featuresTitle",
      { scale: 0.8, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 1,
        scrollTrigger: {
          trigger: ".features",
          start: "top 75%",
        },
      }
    );
  }, []);

  return (
    <div style={styles.pageWrapper}>
      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div className="heroContent" style={styles.heroContent}>
          <h1 style={styles.heroTitle}>Revolutionizing Stories</h1>
          <p style={styles.heroText}>Discover, connect, and create with Biograph's dynamic storytelling platform.</p>
          <button className="ctaButton" style={styles.ctaButton}>
            Get Started <FaArrowRight style={styles.ctaIcon} />
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" style={{ ...styles.featuresSection, ...gradientStyle }}>
        <h2 className="featuresTitle" style={styles.featuresTitle}>Our Features</h2>
        <div style={styles.featuresGrid}>
          <div className="featureCard" style={styles.featureCard}>
            <h3 style={styles.featureCardTitle}>Dynamic Storytelling</h3>
            <p>Experience storytelling like never before with interactive tools and dynamic layouts.</p>
          </div>
          <div className="featureCard" style={styles.featureCard}>
            <h3 style={styles.featureCardTitle}>Global Collaboration</h3>
            <p>Connect with storytellers across the globe and bring your ideas to life.</p>
          </div>
          <div className="featureCard" style={styles.featureCard}>
            <h3 style={styles.featureCardTitle}>Secure Platform</h3>
            <p>Your stories are protected with the latest security technologies.</p>
          </div>
        </div>
      </section>

      {/* Ratings Section */}
      <section className="ratings" style={{ ...styles.ratingsSection, ...gradientStyle }}>
        <h2 style={styles.ratingsTitle}>Landlord & Tenant Ratings</h2>
        <div style={styles.ratingsGrid}>
          <div className="ratingCard" style={styles.ratingCard}>
            <h3 style={styles.ratingCardTitle}>John Doe</h3>
            <p>Tenant</p>
            <div style={styles.stars}>
              {[...Array(5)].map((_, i) => (
                <FaStar key={i} color={i < 4 ? "#ffc107" : "#e4e5e9"} />
              ))}
            </div>
            <p>"Great landlord, super responsive and helpful!"</p>
          </div>
          <div className="ratingCard" style={styles.ratingCard}>
            <h3 style={styles.ratingCardTitle}>Jane Smith</h3>
            <p>Landlord</p>
            <div style={styles.stars}>
              {[...Array(5)].map((_, i) => (
                <FaStar key={i} color={i < 5 ? "#ffc107" : "#e4e5e9"} />
              ))}
            </div>
            <p>"Tenant kept the property in excellent condition."</p>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer style={styles.footerSection}>
        <p style={styles.footerText}>© 2024 Biograph. All rights reserved.</p>
        <nav className="footerNav" style={styles.footerNav}>
          <a href="#features" style={styles.footerLink}>Features</a>
          <a href="#ratings" style={styles.footerLink}>Ratings</a>
          <a href="#" style={styles.footerLink}>Privacy Policy</a>
          <a href="#" style={styles.footerLink}>Contact Us</a>
        </nav>
      </footer>
    </div>
  );
}

const styles = {
  pageWrapper: {
    fontFamily: "'Poppins', sans-serif",
    color: "#333",
    margin: 0,
    padding: 0,
  },
  heroSection: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    height: "100vh",
    backgroundImage: "url('https://c4.wallpaperflare.com/wallpaper/846/173/87/5c1cbaf96bcec-wallpaper-preview.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    color: "#fff",
  },
  heroContent: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: "20px",
    borderRadius: "10px",
  },
  heroTitle: {
    fontSize: "3rem",
    marginBottom: "20px",
  },
  heroText: {
    fontSize: "1.2rem",
    marginBottom: "30px",
  },
  ctaButton: {
    backgroundColor: "#ff6f61",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "5px",
    fontSize: "1rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  ctaIcon: {
    marginLeft: "10px",
  },
  featuresSection: {
    padding: "50px 20px",
    backgroundColor: "#f9f9f9",
    textAlign: "center",
    transition: "background-image 0.3s ease",
  },
  featuresTitle: {
    fontSize: "2rem",
    marginBottom: "30px",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  featureCard: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
    transition: "transform 0.3s",
  },
  featureCardTitle: {
    fontSize: "1.5rem",
    marginBottom: "15px",
  },
  ratingsSection: {
    padding: "50px 20px",
    backgroundColor: "#fff",
    textAlign: "center",
    transition: "background-image 0.3s ease",
  },
  ratingsTitle: {
    fontSize: "2rem",
    marginBottom: "30px",
  },
  ratingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  ratingCard: {
    backgroundColor: "#f9f9f9",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
  },
  ratingCardTitle: {
    fontSize: "1.5rem",
    marginBottom: "10px",
  },
  stars: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "10px",
  },
  footerSection: {
    backgroundColor: "#333",
    color: "#fff",
    padding: "20px 0",
    textAlign: "center",
  },
  footerText: {
    marginBottom: "10px",
  },
  footerNav: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
  },
  footerLink: {
    color: "#fff",
    textDecoration: "none",
    fontSize: "0.9rem",
  },
};

export default HeroSection;
