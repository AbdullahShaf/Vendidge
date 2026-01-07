"use client";
import { useState } from "react";
import EyeIcon from "@heroicons/react/24/outline/EyeIcon";
import EyeSlashIcon from "@heroicons/react/24/outline/EyeSlashIcon"; 


export default function PasswordInput({ value, onChange, placeholder }) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative w-full">
            <input
                type={showPassword ? "text" : "password"}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full border border-[#B0B0B0] rounded-md p-2 pr-10 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                required
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
            >
                {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                ) : (
                    <EyeIcon className="w-5 h-5" />
                )}
            </button>
        </div>
    );
}
