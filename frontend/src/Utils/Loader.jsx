import React from "react";

const Loader = () => {
  return (
    <div className="flex items-center justify-center h-screen opacity-50 bg-black gap-3">
      <div className="w-12 h-12 border-4 border-t-gray-200 border-b-gray-200  rounded-full animate-spin"></div>
    </div>
  );
};

export default Loader;
