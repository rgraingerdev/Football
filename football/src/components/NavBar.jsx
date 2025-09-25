import React from "react";
import "./NavBar.css";

export default function NavBar() {
  return (
    <nav className="navbar">
      <div className="nav-left">
        <img
          src="/image.png"  
          alt="Logo"
          className="nav-logo"
        />
        <span className="nav-title">Formation Builder</span>
      </div>
      <div className="nav-links">
        <a href="#" className="nav-link">Home</a>
        <a href="#" className="nav-link">About</a>
        <a href="#" className="nav-link">Contact</a>
      </div>
    </nav>
  );
}
