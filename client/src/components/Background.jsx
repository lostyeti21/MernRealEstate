import React from 'react';
import './Background.css'; // Import the CSS file

const Background = () => {
  const spans = [];

  // Define the styles for each span
  const spanStyles = [
    {
      color: '#d2d1e6',
      top: '42%',
      left: '58%',
      animationDuration: '105.3s',  // 78s * 1.35
      animationDelay: '-55.35s',    // -41s * 1.35
      transformOrigin: '-23vw -15vh',
      boxShadow: '-96vmin 0 12.270492488307847vmin rgba(210, 209, 230, 0.55)',
      opacity: 0.55,
    },
    {
      color: '#c9f2ac',
      top: '7%',
      left: '78%',
      animationDuration: '56.7s',   // 42s * 1.35
      animationDelay: '-9.45s',     // -7s * 1.35
      transformOrigin: '0vw -13vh',
      boxShadow: '96vmin 0 12.503273815413316vmin rgba(201, 242, 172, 0.55)',
      opacity: 0.55,
    },
    {
      color: '#c9f2ac',
      top: '71%',
      left: '92%',
      animationDuration: '108s',    // 80s * 1.35
      animationDelay: '-112.05s',   // -83s * 1.35
      transformOrigin: '20vw -13vh',
      boxShadow: '-96vmin 0 12.082035280704094vmin rgba(201, 242, 172, 0.55)',
      opacity: 0.55,
    },
    {
      color: '#c9f2ac',
      top: '13%',
      left: '9%',
      animationDuration: '72.9s',   // 54s * 1.35
      animationDelay: '-162s',      // -120s * 1.35
      transformOrigin: '2vw 0vh',
      boxShadow: '-96vmin 0 12.900151386688481vmin rgba(201, 242, 172, 0.55)',
      opacity: 0.55,
    },
    {
      color: '#d2d1e6',
      top: '44%',
      left: '48%',
      animationDuration: '117.45s', // 87s * 1.35
      animationDelay: '-189s',      // -140s * 1.35
      transformOrigin: '-18vw 4vh',
      boxShadow: '96vmin 0 12.79707783433859vmin rgba(210, 209, 230, 0.55)',
      opacity: 0.55,
    },
    {
      color: '#d2d1e6',
      top: '4%',
      left: '15%',
      animationDuration: '97.2s',   // 72s * 1.35
      animationDelay: '-17.55s',    // -13s * 1.35
      transformOrigin: '-5vw -12vh',
      boxShadow: '96vmin 0 12.933003044283751vmin rgba(210, 209, 230, 0.55)',
      opacity: 0.55,
    },
    {
      color: '#c9f2ac',
      top: '90%',
      left: '22%',
      animationDuration: '60.75s',  // 45s * 1.35
      animationDelay: '-24.3s',     // -18s * 1.35
      transformOrigin: '20vw 15vh',
      boxShadow: '96vmin 0 12.98183737349849vmin rgba(201, 242, 172, 0.55)',
      opacity: 0.55,
    },
    {
      color: '#c9f2ac',
      top: '25%',
      left: '51%',
      animationDuration: '109.35s', // 81s * 1.35
      animationDelay: '-1.35s',     // -1s * 1.35
      transformOrigin: '-11vw 22vh',
      boxShadow: '96vmin 0 12.301872112889768vmin rgba(201, 242, 172, 0.55)',
      opacity: 0.55,
    },
  ];

  // Generate the spans dynamically
  spanStyles.forEach((style, index) => {
    spans.push(
      <span
        key={index}
        style={{
          width: '48vmin',
          height: '48vmin',
          borderRadius: '48vmin',
          backfaceVisibility: 'hidden',
          position: 'absolute',
          animation: 'move',
          animationDuration: style.animationDuration,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          color: style.color,
          opacity: style.opacity,
          top: style.top,
          left: style.left,
          animationDelay: style.animationDelay,
          transformOrigin: style.transformOrigin,
          boxShadow: style.boxShadow,
        }}
      ></span>
    );
  });

  return (
    <div className="background">
      {spans}
    </div>
  );
};

export default Background;