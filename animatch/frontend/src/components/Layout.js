import React, { useEffect, useState } from "react";
import sakuraImg from "../assets/single-cherry-blossom-petal-11563245140k25ryyugul.png";
import "../App.css"; // REQUIRED

function Layout({ children }) {
  const [petals, setPetals] = useState([]);

  useEffect(() => {
    const numPetals = 40;
    const newPetals = [];

    for (let i = 0; i < numPetals; i++) {
      newPetals.push({
        id: i,
        left: Math.random() * 100,
        size: 15 + Math.random() * 15,
        opacity: 0.5 + Math.random() * 0.5,
        fallDuration: 6 + Math.random() * 6,
        driftDuration: 4 + Math.random() * 4,
        rotateDuration: 4 + Math.random() * 4,
        delay: Math.random() * 10,
      });
    }

    setPetals(newPetals);
  }, []);

  return (
    <>
      <div className="anime-bg" />
      <div className="bg-overlay" />

      {petals.map((petal) => (
        <div
          key={petal.id}
          className="sakura"
          style={{
            left: `${petal.left}vw`,
            width: `${petal.size}px`,
            height: `${petal.size}px`,
            opacity: petal.opacity,
            backgroundImage: `url(${sakuraImg})`,
            animation: `
              fall ${petal.fallDuration}s linear infinite ${petal.delay}s,
              drift ${petal.driftDuration}s ease-in-out infinite ${petal.delay}s,
              rotate ${petal.rotateDuration}s linear infinite ${petal.delay}s
            `,
          }}
        />
      ))}

      <div className="content-container">
        {children}
      </div>
    </>
  );
}

export default Layout;
