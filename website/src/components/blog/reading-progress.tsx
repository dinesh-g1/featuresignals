"use client";

import { useEffect } from "react";

export function ReadingProgress() {
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      const bar = document.getElementById("reading-progress");
      if (bar) bar.style.width = progress + "%";
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-stone-100">
      <div
        id="reading-progress"
        className="h-full bg-accent transition-[width] duration-75 ease-linear"
        style={{ width: "0%" }}
      />
    </div>
  );
}
