import React from "react";

export default function LoadingAnimation() {
  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.8)", // Slight white overlay
    backdropFilter: "blur(5px)", // Apply blur to the background
    zIndex: 9999, // Ensure it appears above all other content
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const animationStyle = `
    .container {
      --uib-size: 70px;
      --uib-color: black;
      --uib-speed: 0.6s;
      --uib-stroke: 3.5px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      height: var(--uib-size);
      width: var(--uib-size);
    }

    .line {
      position: absolute;
      top: calc(50% - var(--uib-stroke) / 2);
      left: 0;
      height: var(--uib-stroke);
      width: 100%;
      border-radius: calc(var(--uib-stroke) / 2);
      background-color: var(--uib-color);
      animation: rotate var(--uib-speed) ease-in-out infinite alternate;
      transition: background-color 0.3s ease;
    }

    .line:nth-child(1) {
      animation-delay: calc(var(--uib-speed) * -0.375);
    }

    .line:nth-child(2) {
      animation-delay: calc(var(--uib-speed) * -0.375);
      opacity: 0.8;
    }

    .line:nth-child(3) {
      animation-delay: calc(var(--uib-speed) * -0.3);
      opacity: 0.6;
    }

    .line:nth-child(4) {
      animation-delay: calc(var(--uib-speed) * -0.225);
      opacity: 0.4;
    }

    .line:nth-child(5) {
      animation-delay: calc(var(--uib-speed) * -0.15);
      opacity: 0.2;
    }

    .line:nth-child(6) {
      animation-delay: calc(var(--uib-speed) * -0.075);
      opacity: 0.1;
    }

    @keyframes rotate {
      0% {
        transform: rotate(0deg);
      }

      100% {
        transform: rotate(180deg);
      }
    }
  `;

  return (
    <div style={overlayStyle}>
      <style>{animationStyle}</style>
      <div className="container">
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
      </div>
    </div>
  );
}
