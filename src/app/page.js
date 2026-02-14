"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "../store/useUserStore";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PasswordInput from "../components/input/PasswordInput";

export default function Home() {
  const [showRegister, setShowRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Global loading state

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

  const router = useRouter();

  useEffect(() => {
    const userId = sessionStorage.getItem("userId");
    if (userId) {
      router.push('/dashboard');
    }
  }, [router]);

  const showPopup = (message, type = "success") => {
    setPopup({ show: true, message, type });
    setTimeout(() => {
      setPopup({ show: false, message: "", type: "" });
    }, 5000);
  };

  const handleRegisterChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double click

    setIsLoading(true);
    try {
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
        sessionStorage.setItem("sellerBusinessName", data.user.business_name);
        sessionStorage.setItem("sellerNTNCNIC", data.user.cnic_ntn);
        sessionStorage.setItem("sellerInvoiceNTN", data.user.invoice_ntn);
        sessionStorage.setItem("sellerAddress", data.user.address);
        sessionStorage.setItem("sellerToken", data.user.token);
        document.cookie = `isProd=${data.user.isProd}; path=/; SameSite=Lax`;

        showPopup("Login Successful!", "success");
        router.push("/dashboard");
      } else {
        const displayMessage = data.reason
          ? `${data.message}: ${data.reason}`
          : (data.message || "Invalid credentials");
        showPopup(displayMessage || "Invalid credentials", "error");
      }
    } catch (err) {
      showPopup("Connection error. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    // Basic Validations
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(form.email)) return showPopup("Please enter a valid email address", "error");
    if (!/^[0-9]{10,15}$/.test(form.contact_no)) return showPopup("Enter a valid contact number", "error");
    if (!/^\d{5}-\d{7}-\d{1}$/.test(form.cnic)) return showPopup("Enter a valid CNIC (xxxxx-xxxxxxx-x)", "error");

    setIsLoading(true);
    try {
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
    } catch (err) {
      showPopup("Registration failed. Try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  //   return (
  //     <>
  //       {popup.show && (
  //         <div className={`fixed top-5 right-5 px-5 py-3 rounded-lg shadow-lg text-white flex items-center gap-3 z-[1000] animate-slideIn ${popup.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
  //           <span>{popup.message}</span>
  //           <button onClick={() => setPopup({ show: false, message: "", type: "" })} className="text-white font-bold text-lg">✕</button>
  //         </div>
  //       )}

  //       <div className="flex flex-col-reverse md:flex-row h-screen w-full bg-[#ffff]">
  //         {/* Top Logo */}
  //         <div className="absolute top-4 right-3 z-50">
  //           <Link href="/">
  //             <Image src="/images/login/logos.png" alt="Logo" width={140} height={60} className="w-30 h-15 md:w-[140px] md:h-auto object-contain" />
  //           </Link>
  //         </div>

  //         {/* Form Container */}
  //         <div className="w-full md:w-1/2 flex items-center justify-center p-6">
  //           {!showRegister ? (
  //             /* Login Form */
  //             <form onSubmit={handleLoginSubmit} className="bg-white text-black p-6 w-full max-w-md flex flex-col items-center">
  //               <h1 className="text-2xl font-semibold mb-2 text-[#1B1B1B]">Welcome Back</h1>
  //               <p className="text-[#8C8C8C] text-center text-[14px] mb-8">Enter your email and password to access your account</p>

  //               <div className="mb-6 w-full">
  //                 <label className="block mb-1 text-[#1B1B1B] text-[14px]">CNIC/NTN</label>
  //                 <input
  //                   type="text"
  //                   placeholder="Enter your CNIC or NTN"
  //                   value={identifier}
  //                   onChange={(e) => setIdentifier(e.target.value)}
  //                   disabled={isLoading}
  //                   required
  //                   className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none disabled:opacity-50"
  //                 />
  //               </div>

  //               <div className="mb-8 w-full">
  //                 <label className="block mb-1 text-[#1B1B1B] text-[14px]">Password</label>
  //                 <PasswordInput
  //                   value={password}
  //                   onChange={(e) => setPassword(e.target.value)}
  //                   placeholder="Enter your password"
  //                   disabled={isLoading}
  //                 />
  //               </div>

  //               <button
  //                 type="submit"
  //                 disabled={isLoading}
  //                 className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-[#5AB3E8] transition-all duration-300 flex items-center justify-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
  //               >
  //                 {isLoading && (
  //                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  //                 )}
  //                 {isLoading ? "Logging in..." : "Login"}
  //               </button>

  //               <p className="mt-4 text-center text-sm text-[#8C8C8C]">
  //                 Don’t have an account?{" "}
  //                 <a href="https://wa.me/923249464726?text=Assalam%20O%20Alaikum" target="_blank" rel="noopener noreferrer" className="text-[#5AB3E8] cursor-pointer font-semibold">
  //                   Register
  //                 </a>
  //               </p>
  //             </form>
  //           ) : (
  //             /* Register Form */
  //             <form onSubmit={handleRegisterSubmit} className="bg-white text-black p-6 w-full max-w-[650px]">
  //               <h1 className="text-2xl font-semibold mb-2 text-[#1B1B1B] text-center">Create an Account</h1>
  //               <p className="text-[#8C8C8C] text-center text-[14px] mb-8">Join now to streamline your experience</p>

  //               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  //                 {Object.keys(form).map((key, index) => (
  //                   <div key={key} className={`mb-3 ${index === Object.keys(form).length - 1 ? "md:col-span-2" : ""}`}>
  //                     <label className="block mb-1 capitalize text-[#1B1B1B] text-[14px]">{key.replace("_", " ")}</label>
  //                     <input
  //                       type={key === "password" ? "password" : "text"}
  //                       name={key}
  //                       value={form[key]}
  //                       disabled={isLoading}
  //                       placeholder={`Enter your ${key.replace("_", " ")}`}
  //                       onChange={handleRegisterChange}
  //                       className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none disabled:opacity-50"
  //                       required
  //                     />
  //                   </div>
  //                 ))}
  //               </div>

  //               <button
  //                 disabled={isLoading}
  //                 className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-[#5AB3E8] mt-2 transition-all duration-300 flex items-center justify-center gap-2 disabled:bg-blue-400"
  //               >
  //                 {isLoading && (
  //                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  //                 )}
  //                 {isLoading ? "Registering..." : "Register"}
  //               </button>

  //               <p className="mt-4 text-center text-sm text-[#8C8C8C]">
  //                 Already have an account?{" "}
  //                 <button type="button" className="text-[#5AB3E8] cursor-pointer font-semibold" onClick={() => setShowRegister(false)}>
  //                   Login
  //                 </button>
  //               </p>
  //             </form>
  //           )}
  //         </div>

  //         {/* Side Cover */}
  //         <div
  //           className="w-full md:w-[50%] h-full md:rounded-tl-[44px] rounded-br-[44px] md:rounded-br-none rounded-bl-[44px] relative"
  //           style={{ backgroundImage: "url('/images/login/sidecover.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
  //         >
  //           <div className="absolute inset-0 bg-black/40 md:rounded-tl-[44px] rounded-br-[44px] md:rounded-br-none rounded-bl-[44px]"></div>
  //           <div className="absolute inset-0 md:inset-auto md:bottom-15 md:left-15 text-left flex flex-col justify-end items-start p-10">
  //             <h1 className="text-white text-[26px] md:text-4xl font-semibold mb-2">Welcome to Our Platform</h1>
  //             <p className="text-white text-lg">Streamline your experience and access everything you need in one place.</p>
  //           </div>
  //         </div>
  //       </div>
  //     </>
  //   );
  // }
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
      <div className="bg-[#F7F8FA] flex justify-center items-center min-h-screen md:h-screen p-[20px] md:p-[40px] lg:p-[80px]">
        <div className="w-full bg-[#ffff] flex flex-col-reverse md:flex-row shadow-md h-full">
          <div className="w-full lg:w-1/2 flex items-center justify-center">
            {!showRegister && (
              <div>
                <div className="flex w-full justify-center mt-6">
                  <Link
                    href="/"
                  >
                    <Image
                      src="/images/login/logos.png"
                      alt="Logo"
                      width={64}
                      height={44}
                      className=" object-contain"
                    />
                  </Link>
                </div>
                <form
                  onSubmit={handleLoginSubmit}
                  className="bg-white text-black p-6 w-full max-w-md flex flex-col items-center"
                >
                  <h1 className="text-2xl font-semibold mb-2 text-[#1B1B1B] text-left w-full">Welcome Back</h1>
                  <p className="text-[#8C8C8C] text-left  w-full text-[14px] mb-8">Enter your email and password to access your account</p>

                  <div className="mb-6 w-full">
                    <label className="block mb-1 text-[#1B1B1B] text-[14px]">CNIC/NTN</label>
                    <input
                      type="text"
                      placeholder="Enter your CNIC or NTN"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      className="w-full border-b border-[#B0B0B0] p-2 bg-white text-[#4E4E4E] focus:border-b-[#5AB3E8] transition-all duration-300 outline-none"
                    />
                  </div>

                  <div className="mb-6 w-full">
                    <label className="block mb-1 text-[#1B1B1B] text-[14px]">Password</label>
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                  <div className="mb-8 w-full flex justify-end">
                    <Link
                      href="https://wa.me/923249464726?text=Assalam%20O%20Alaikum,%20I%20want%20to%20Subscribe%20Vendidge"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4E4E4E] text-[12px] hover:text-blue-600"
                    >
                      Forget Password?
                    </Link>
                  </div>

                  {/* <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-[#5AB3E8] transition-all duration-300">
                    Login
                  </button> */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-[#5AB3E8] transition-all duration-300 flex items-center justify-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {isLoading && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {isLoading ? "Logging in..." : "Login"}
                  </button>

                  <p className="mt-4 text-center text-sm text-[#8C8C8C]">
                    Don’t have an account?{" "}
                    <Link
                      href="https://wa.me/923249464726?text=Assalam%20O%20Alaikum,%20I%20want%20to%20Subscribe%20Vendidge"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5AB3E8] cursor-pointer font-semibold"
                    >
                      Register
                    </Link>
                  </p>

                </form>
              </div>
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
          <div className="bg-[#F7F8FA] w-full md:w-[80%] flex-col hidden md:flex">
            <div className="p-6">
              <h1 className="text-[#1B1B1B] text-[26px] md:text-4xl font-semibold mb-2">Welcome to Our Platform</h1>
              <p className="text-[#8C8C8C] text-md max-w-[400px]">
                Streamline your experience and access everything you need in one place.
              </p>
            </div>

            <div className="relative mt-6 flex-1 overflow-hidden">
              <img src="/images/login/dashboardv1.jpeg" alt="dashboard" className="  
              h-full
              w-[100%]
        translate-x-[9%] 
        rotate-[-16deg]
        "
              />
            </div>
          </div>
        </div>
      </div >
    </>
  );
}