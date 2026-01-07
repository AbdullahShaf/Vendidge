'use client';

import { useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useRouter } from "next/navigation";
import { Menu, Moon, Sun } from 'lucide-react';

export default function Header({ darkMode, setDarkMode, setSidebarOpen }) {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  const [openMenu, setOpenMenu] = useState(false);
  return (
    <header className={`sticky top-0 z-30 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex-1 max-w-2xl mx-auto px-4">
          <input
            type="text"
            placeholder="Search..."
            className={`w-full px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 placeholder-gray-400' : 'bg-gray-100'
              } focus:outline-none focus:ring-2 focus:ring-blue-600 transition`}
          />
        </div>

        <div className="flex items-center gap-4">
         

          <div className="relative cursor-pointer">
            <div
              onClick={() => setOpenMenu(!openMenu)}
              className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {user?.owner_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{user?.business_name || "User"}</p>
                <p className="text-xs text-gray-500">{user?.cnic_ntn || "email@example.com"}</p>
              </div>
            </div>
            {openMenu && (
              <div className={`absolute right-[-8] mt-2 w-32 rounded-lg shadow-lg p-2 
                ${darkMode ? "bg-gray-700 text-white" : "bg-white text-black"}`}>
                <div className="hidden md:block text-left">
                  <h3 className="font-semibold">Name:</h3>
                  <p className="text-sm text-gray-500 mb-2">{user?.business_name}</p>
                  <h3 className="font-semibold">NTN/CNIC:</h3>
                  <p className="text-sm text-gray-500 mb-2">{ user?.cnic_ntn}</p>
                </div>
                <button
                  onClick={() => {
                    logout();   
                    router.push("/"); 
                  }}
                  className={`w-full px-3 py-2 bg-blue-600 rounded-md hover:bg-red-500 hover:text-white transition text-center ${darkMode ? "text-white" : "text-white"}`}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}