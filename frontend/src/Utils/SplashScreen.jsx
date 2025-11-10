import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const SplashScreen = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          navigate("/login");
        }
        return prev + 5;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (localStorage.getItem("userChat")) {
      navigate("/chat");
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b bg-[url('https://i.pinimg.com/originals/e8/d9/4e/e8d94e1e8b6b530ad315e9385290141b.jpg')] bg-cover text-white">
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <div>
          <img
            src="https://cdn-icons-png.flaticon.com/128/16566/16566143.png"
            alt="whatsapp icon"
            className="w-full"
          />
        </div>
        <h1 className="text-[1.6rem] font-semibold tracking-wide">ChitChat</h1>
        <p className="text-sm opacity-80">Connecting you instantly...</p>
      </div>

      <div className="w-56 h-2 bg-white/10 rounded-full mt-10 overflow-hidden">
        <div
          className={`h-full bg-white transition-all duration-200`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default SplashScreen;
