import React, { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../Utils/Loader";
import { handleSuccess } from "../Utils/Toaster";

const SignUp = () => {
  const [signUpData, setSignUpData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [errMess, setErrMess] = useState({});
  const [loader, setLoader] = useState(false);
  const navigate = useNavigate();

  const handleLogInData = (e) => {
    const { name, value } = e.target;
    setSignUpData((prev) => ({ ...prev, [name]: value }));

    if (errMess[name]) {
      return setErrMess((prev) => ({ ...prev, [name]: "" }));
    }
  };

  useEffect(() => {
    if (localStorage.getItem("userChat")) {
      navigate("/chat");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const URL = "http://localhost:5000/auth/signup";
      const responce = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signUpData),
      });
      const { success, field, message } = await responce.json();
      if (!success) {
        setErrMess({ [field]: message });
      }
      if (success) {
        setLoader(true);
        setTimeout(() => {
          handleSuccess(message);
          setSignUpData({ username: "", email: "", password: "" });
          setLoader(false);
          navigate("/login");
        }, 2000);
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#eae6df]">
      {loader ? (
        <div className="fixed w-full">
          <Loader />
        </div>
      ) : (
        ""
      )}

      <div className="flex justify-center h-screen items-center bg-[url('https://i.pinimg.com/originals/e8/d9/4e/e8d94e1e8b6b530ad315e9385290141b.jpg')] bg-cover w-full p-6">
        <div className="bg-white w-full max-w-md px-5 py-5 sm:p-8 rounded-2xl shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#25D366] text-center mb-2">
            Create Account
          </h2>
          <p className="text-center text-sm sm:text-[1rem] font-semibold text-gray-500 mb-6">
            Join WhatsApp to connect instantly
          </p>

          <form className="space-y-3">
            <div>
              <label
                className={`text-sm sm:text-[1rem] ${
                  errMess.username ? "text-red-500" : ""
                } font-semibold text-gray-500 mb-1`}
              >
                Username
              </label>
              <input
                name="username"
                type="username"
                value={signUpData.username}
                placeholder="Enter your username"
                className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#25D366] transition ${
                  errMess.username ? "border-red-500" : ""
                }`}
                onChange={handleLogInData}
              />
              {errMess.username && (
                <div className="text-red-500 text-sm pl-2">
                  {errMess.username}
                </div>
              )}
            </div>

            <div>
              <label
                className={`text-sm sm:text-[1rem] ${
                  errMess.email ? "text-red-500" : ""
                } font-semibold text-gray-500 mb-1`}
              >
                Email
              </label>
              <input
                name="email"
                type="email"
                value={signUpData.email}
                placeholder="Enter your email"
                className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#25D366] transition ${
                  errMess.email ? "border-red-500" : ""
                }`}
                onChange={handleLogInData}
              />
              {errMess.email && (
                <div className="text-red-500 text-sm pl-2">{errMess.email}</div>
              )}
            </div>

            <div>
              <label
                className={`text-sm sm:text-[1rem] ${
                  errMess.password ? "text-red-500" : ""
                } font-semibold text-gray-500 mb-1`}
              >
                Password
              </label>

              <input
                type="password"
                name="password"
                value={signUpData.password}
                placeholder="Enter your password"
                className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#25D366] transition ${
                  errMess.password ? "border-red-500" : ""
                }`}
                onChange={handleLogInData}
              />
              {errMess.password && (
                <div className="text-red-500 text-sm pl-2">
                  {errMess.password}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#25D366] hover:cursor-pointer text-white py-2 rounded-lg font-medium hover:bg-[#1da955] transition-all shadow-md"
              onClick={handleSubmit}
            >
              Sign Up
            </button>
          </form>

          <p
            className="text-center text-gray-500 text-sm mt-6"
            onClick={() => navigate("/login")}
          >
            Already have an account?{" "}
            <span className="text-[#25D366] cursor-pointer hover:underline">
              Log in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
