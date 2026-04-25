import React, { useEffect, useState } from "react";
import sakuraImg from "../assets/single-cherry-blossom-petal-11563245140k25ryyugul.png";
import "../App.css"; // REQUIRED

function Layout({ children }) {
  const [petals, setPetals] = useState([]);

  // Generates all 40 petals once on mount with randomized properties so they
  // don't all fall at the same speed, size, or position.
  useEffect(() => {
    const numPetals = 40;
    const newPetals = [];

    for (let i = 0; i < numPetals; i++) {
      newPetals.push({
        id: i,
        left: Math.random() * 100,          // random horizontal start position (0–100vw)
        size: 15 + Math.random() * 15,      // petal size between 15px and 30px
        opacity: 0.5 + Math.random() * 0.5, // opacity between 0.5 and 1
        fallDuration: 6 + Math.random() * 6,    // how long it takes to fall off screen
        driftDuration: 4 + Math.random() * 4,   // side-to-side sway speed
        rotateDuration: 4 + Math.random() * 4,  // spin speed
        delay: Math.random() * 10,              // staggered start so they don't all appear at once
      });
    }

    setPetals(newPetals);
  }, []);

  return (
    <>
      {/* Layered background: the anime-themed image sits behind a semi-transparent overlay */}
      <div className="anime-bg" />
      <div className="bg-overlay" />

      {/* Each petal is an absolutely positioned div driven entirely by CSS animations
          defined in App.css. The inline styles just pass in the randomized values. */}
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

      {/* All page content renders inside here, on top of the background and petals */}
      <div className="content-container">
        {children}
      </div>
    </>
  );
}

export default Layout;