"use client";

import { useState } from "react";
import { useUserStore } from "../store/useUserStore";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PasswordInput from "../components/input/PasswordInput";

export default function Home() {
  const [showRegister, setShowRegister] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [popup, setPopup] = useState({ show: false, message: "", type: "" });
  const setUser = useUserStore((state) => state.setUser);

  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    contact_no: "",
    email: "",
    password: "",
    cnic: "",
    ntn: "",
    strn: "",
    business_type: "",
    address: "",
    ref_code: "",
  });

  const showPopup = (message, type = "success") => {
    setPopup({ show: true, message, type });

    setTimeout(() => {
      setPopup({ show: false, message: "", type: "" });
      // }, 20000);
    }, 5000);
  };

  const handleRegisterChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const router = useRouter();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();

    if (res.ok) {
      setUser(data.user);
      sessionStorage.setItem("userId", data.user.id);
      sessionStorage.setItem("sellerProvince", data.user.province);
      sessionStorage.setItem("sellerProvinceId", data.user.provinceId);
      console.log("Seller Province:", sessionStorage.getItem("sellerProvince"));
      sessionStorage.setItem("sellerBusinessName", data.user.business_name);
      sessionStorage.setItem("sellerNTNCNIC", data.user.cnic_ntn);
      sessionStorage.setItem("sellerAddress", data.user.address);
      sessionStorage.setItem("sellerToken", data.user.token);
      document.cookie = `isProd=${data.user.isProd}; path=/; SameSite=Lax`;
      

      console.log("Seller Token:", sessionStorage.getItem("sellerToken"));

      console.log("Login successful, userId stored, province , isProd:", data.user.id , data.user.provinceId, data.user.isProd );
      showPopup("Login Successful!", "success");
      router.push("/dashboard");
    } else {
      showPopup(data.message, "error");
    }
  };


  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(form.email)) {
      showPopup("Please enter a valid email address", "error");
      return;
    }

    if (!/^[0-9]{10,15}$/.test(form.contact_no)) {
      showPopup("Enter a valid contact number", "error");
      return;
    }

    if (!/^\d{5}-\d{7}-\d{1}$/.test(form.cnic)) {
      showPopup("Enter a valid CNIC in xxxxx-xxxxxxx-x format", "error");
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (res.ok) {
      showPopup("Account created successfully!", "success");
      setShowRegister(false);
    } else {
      showPopup(data.message, "error");
    }
  };

  return (
    <>  {
      popup.show && (
        <div
          className={`
            fixed top-5 right-5 px-5 py-3 rounded-lg shadow-lg text-white flex items-center gap-3 z-300 animate-slideIn
            ${popup.type === "success" ? "bg-green-600" : "bg-red-600"}
        `}
        >
          <span>{popup.message}</span>
          <button
            onClick={() => setPopup({ show: false, message: "", type: "" })}
            className="text-white font-bold text-lg"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex flex-col-reverse md:flex-row h-screen w-full bg-[#ffff]">
        <div className="absolute top-4 right-3 z-50">
          <Link
            href="/"
          >
            <Image
              src="/images/login/logos.png"
              alt="Logo"
              width={1104}
              height={944}
              className="w-30 h-15 md:w-[140px] md:h-auto object-contain"
            />
          </Link>
        </div>
        <div className="w-full md:w-1/2 flex items-center justify-center p-6">
          {!showRegister && (
            <form
              onSubmit={handleLoginSubmit}
              className="bg-white text-black p-6 w-full max-w-md flex flex-col items-center"
            >
              <h1 className="text-2xl font-semibold mb-2 text-[#1B1B1B]">Welcome Back</h1>
              <p className="text-[#8C8C8C] text-center text-[14px] mb-8">Enter your email and password to access your account</p>

              <div className="mb-6 w-full">
                <label className="block mb-1 text-[#1B1B1B] text-[14px]">CNIC/NTN</label>
                <input
                  type="text"
                  placeholder="Enter your CNIC or NTN"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                />
              </div>

              <div className="mb-8 w-full">
                <label className="block mb-1 text-[#1B1B1B] text-[14px]">Password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-[#5AB3E8] transition-all duration-300">
                Login
              </button>

              <p className="mt-4 text-center text-sm text-[#8C8C8C]">
  Don’t have an account?{" "}
  <a
    href="https://wa.me/923249464726?text=Assalam%20O%20Alaikum,%20I%20want%20to%20Subscribe%20Vendidge"
    target="_blank"
    rel="noopener noreferrer"
    className="text-[#5AB3E8] cursor-pointer font-semibold"
  >
    Register
  </a>
</p>

            </form>
          )}
          {showRegister && (
            <form
              onSubmit={handleRegisterSubmit}
              className="bg-white text-black p-6 w-full max-w-[650px]"
            >
              <h1 className="text-2xl font-semibold mb-2 text-[#1B1B1B] text-center">Create an Account</h1>
              <p className="text-[#8C8C8C] text-center text-[14px] mb-8">Join now to streamline your experience from day one</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                {Object.keys(form).map((key, index) => (
                  <div
                    key={key}
                    className={`mb-3 ${index === Object.keys(form).length - 1 ? "md:col-span-2" : ""
                      }`}
                  >
                    <label className="block mb-1 capitalize text-[#1B1B1B] text-[14px]">
                      {key.replace("_", " ")}
                    </label>
                    <input
                      type={key === "password" ? "password" : "text"}
                      name={key}
                      value={form[key]}
                      placeholder={`Enter your ${key.replace("_", " ")}`}
                      onChange={handleRegisterChange}
                      className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                      required
                    />
                  </div>
                ))}
              </div>

              <button className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-[#5AB3E8] mt-2 transition-all duration-300">
                Register
              </button>

              <p className="mt-4 text-center text-sm text-[#8C8C8C]">
                Already have an account?{" "}
                <button
                  className="text-[#5AB3E8] cursor-pointer font-semibold transition-all duration-300"
                  onClick={() => setShowRegister(false)}
                >
                  Login
                </button>
              </p>
            </form>
          )}
        </div>
        <div
          className="w-full md:w-[50%] h-full md:rounded-tl-[44px] rounded-br-[44px] md:rounded-br-none rounded-bl-[44px] relative"
          style={{
            backgroundImage: "url('/images/login/sidecover.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-black/40 md:rounded-tl-[44px] rounded-br-[44px] md:rounded-br-none rounded-bl-[44px]"></div>
          <div className="my-10 md:my-0 absolute inset-0 md:inset-auto md:bottom-15 md:left-15 text-left flex flex-col justify-end items-start p-5 md:p-0">
            <h1 className="text-white text-[26px] md:text-4xl font-semibold mb-2">Welcome to Our Platform</h1>
            <p className="text-white text-lg">
              Streamline your experience and access everything you need in one place.
            </p>
          </div>
        </div>

      </div >
    </>
  );
}
