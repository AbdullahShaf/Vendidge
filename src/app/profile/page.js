'use client';

import React, { useEffect, useState } from "react";
import PasswordInput from "@/components/input/PasswordInput";

export default function ProfileScreen({ darkMode }) {
    const [provinces, setProvinces] = useState([]);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [showPasswordForm, setshowPasswordForm] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const [form, setForm] = useState({
        business_name: "",
        cnic_ntn: "",
        email: "",
        contact: "",
        province: "",
        province_id: 0,
        address: "",
        invoice_type: "sandbox",
        bearer_token: "",
        business_logo: null,
    });

    const [passwordForm, setPasswordForm] = useState({
        current_password: "",
        new_password: "",
        confirmed_new_password: "",
    });
    const getHeaders = () => {
        const token = sessionStorage.getItem("sellerToken");
        return token
            ? { Authorization: `Bearer ${token}`, Accept: "application/json" }
            : { Accept: "application/json" };
    };

    const handleChange = (e) => {
        //const { name, value } = e.target;
        //setForm((prev) => ({ ...prev, [name]: value }));
        const { name, value, options, selectedIndex } = e.target;
        if (name === "province") {
            const selectedProvince = provinces.find(
                (p) => String(p.stateProvinceDesc) === String(value)
            );
            console.log("id", selectedProvince);
            setForm((prev) => ({
                ...prev,
                province: selectedProvince.stateProvinceDesc,
                province_id: selectedProvince.stateProvinceCode,
            }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    useEffect(() => {
        const fetchProvinces = async () => {
            setLoadingProvinces(true);
            try {
                const res = await fetch("/api/fbr/provinces", {
                    headers: getHeaders(),
                });
                const json = await res.json();
                setProvinces(json?.data || []);
            } catch (err) {
                console.warn("Failed to load provinces", err);
            } finally {
                setLoadingProvinces(false);
            }
        };

        fetchProvinces();
    }, []);

    useEffect(() => {
        const userId = sessionStorage.getItem("userId");
        if (!userId) return;

        const fetchUserProfile = async () => {
            setLoadingProfile(true);
            try {
                const res = await fetch(`/api/user?userId=${userId}`, {

                });
                const json = await res.json();
                console.log("user profile data", json, json[0].provinceId);
                if (json) {
                    setForm({
                        business_name: json[0].business_name || "",
                        cnic_ntn: json[0].cnic_ntn || "",
                        email: json[0].email || "",
                        contact: json[0].contact || "",
                        province: json[0].province || "",
                        province_id: json[0].provinceId || 0,
                        address: json[0].address || "",
                        invoice_type: Number(json?.[0]?.isProd) === 1 ? "production" : "sandbox",
                        bearer_token: json[0].token || "",
                        business_logo: json[0].business_logo,
                    });
                }
            } catch (err) {
                console.warn("Failed to load profile", err);
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchUserProfile();
    }, []);

    const handleSave = async () => {
        if (!form.business_name.trim()) {
            alert("Business Name is required");
            return;
        }
        if (!form.province) {
            alert("Business Province is required");
            return;
        }
        if (!form.invoice_type) {
            alert("Invoice Type is required");
            return;
        }
        if (!form.bearer_token.trim()) {
            alert("Bearer Token is required");
            return;
        }
        if (!form.address.trim()) {
            alert("Business Address is required");
            return;
        }
        if (!form.contact.trim()) {
            alert("Contact Info is required");
            return;
        }
        if (!form.email.trim()) {
            alert("Email is required");
            return;
        }
        setIsSavingProfile(true);
        try {
            const payload = {
                id: sessionStorage.getItem("userId"),
                ...form
            }
            console.log("payload", payload);
            if (form.business_logo instanceof File) {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    payload.business_logo = reader.result.split(",")[1];
                    const res = await fetch("/api/user/", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
                    if (!res.ok) throw new Error("Update failed");
                };
                reader.readAsDataURL(form.business_logo);
            } else {

                console.log("img url already in db");
                const res = await fetch("/api/user/", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) throw new Error("Update failed");
            }
            // const res = await fetch("/api/user/", {
            //     method: "PUT",
            //     headers: {
            //         "Content-Type": "application/json",
            //     },
            //     body: JSON.stringify(payload),
            // });


            sessionStorage.setItem("sellerProvince", form.province);
            sessionStorage.setItem("sellerProvinceId", form.province_id);
            console.log("Seller Province:", sessionStorage.getItem("sellerProvince"));
            sessionStorage.setItem("sellerBusinessName", form.business_name);
            sessionStorage.setItem("sellerNTNCNIC", form.cnic_ntn);
            sessionStorage.setItem("sellerAddress", form.address);
            sessionStorage.setItem("sellerToken", form.bearer_token);
            const isProd = form.invoice_type === "production" ? '1' : '0';
            document.cookie = `isProd=${isProd}; path=/; SameSite=Lax`;
            setIsEditing(false);

        } catch (err) {
            console.warn("Failed to save profile", err);
        } finally {
            setIsSavingProfile(false);
        }
    };

    if (loadingProfile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-sm text-gray-500">Loading profile...</p>
            </div>
        );
    }
    function handleShowPasswrodForm() {
        setPasswordForm({
            current_password: "",
            new_password: "",
            confirmed_new_password: "",
        })
        setshowPasswordForm(!showPasswordForm);
    }
    function handlePasswordChange(e) {
        const { name, value } = e.target;
        setPasswordForm((prev) => ({
            ...prev,
            [name]: value
        }));
    }
    async function passwordSave(e) {
        if (e && e.preventDefault) e.preventDefault();

        if (passwordForm.new_password !== passwordForm.confirm_password) {
            alert("New password and confirm password do not match!");
            return;
        }
        console.log("current password", passwordForm.current_password);
        console.log("confirm password", passwordForm.new_password);
        setIsSavingPassword(true);
        try {
            const response = await fetch('/api/userPassword', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: sessionStorage.getItem("userId"),
                    current_password: passwordForm.current_password,
                    new_password: passwordForm.new_password
                }),
            });

            const result = await response.json();

            if (response.ok) {
                alert("Password updated successfully!");
                // Optional: Reset form or close modal
                setPasswordForm({
                    current_password: "",
                    new_password: "",
                    confirm_password: ""
                });
                if (typeof setshowPasswordForm === 'function') setshowPasswordForm();
            } else {
                // Display error from API (e.g., "Incorrect current password")
                alert(result.message || "Failed to update password.");
            }
        } catch (error) {
            console.error("Error updating password:", error);
            alert("An error occurred. Please try again later.");
        } finally {
            setIsSavingPassword(false);
        }
    }
    return (
        <div className={`min-h-screen px-4 py-8 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold">Profile</h1>
                        <p className="text-sm opacity-70">View and manage your profile information</p>
                    </div>
                    <div className="mt-4 md:mt-0">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
                            >
                                Edit Profile
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                {/* <button
                                    type="submit"
                                    onClick={handleSave}
                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
                                >
                                    Save
                                </button> */}
                                <button
                                    type="submit"
                                    onClick={handleSave}
                                    disabled={isSavingProfile}
                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md flex items-center gap-2 disabled:opacity-70"
                                >
                                    {isSavingProfile && (
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    )}
                                    {isSavingProfile ? "Saving..." : "Save"}
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-md"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSave();
                    }} className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-xl shadow p-6 grid grid-cols-1 md:grid-cols-2 gap-6`}>
                    <div className="md:col-span-2 flex items-center gap-6">
                        {/* <div className="relative w-28 h-28 rounded-full border overflow-hidden flex items-center justify-center bg-gray-100">
                             {form.business_logo ? (
                                <img
                                    src={
                                        typeof form.business_logo === "string"
                                            ? form.business_logo.startsWith("data:image")
                                                ? form.business_logo
                                                : `data:image/png;base64,${form.business_logo}`
                                            : URL.createObjectURL(form.business_logo)
                                    }
                                    alt="Business Logo"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-xs text-gray-500 text-center px-2">No Logo</span>
                            )}
                        </div> */}

                        {/* {isEditing && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Business Logo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            business_logo: e.target.files[0],
                                        }))
                                    }
                                    className="block w-full text-sm"
                                />
                            </div>
                        )} */}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Business Name*</label>
                        <input
                            type="text"
                            name="business_name"
                            value={form.business_name}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full border rounded-md p-2 disabled:bg-gray-100 disabled:text-gray-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">CNIC/NTN*</label>
                        <input
                            type="text"
                            name="cnic_ntn"
                            value={form.cnic_ntn}
                            readOnly
                            className="w-full border rounded-md p-2 bg-gray-100 text-gray-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Invoice Type*</label>
                        <select
                            name="invoice_type"
                            value={form.invoice_type}
                            onChange={handleChange}
                            disabled={!isEditing}
                            required
                            className="w-full border rounded-md p-2 disabled:bg-gray-100 disabled:text-gray-500"
                        >
                            <option value="sandbox">Sandbox</option>
                            <option value="production">Production</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Business Province*</label>
                        <select
                            name="province"
                            value={form.province}
                            onChange={handleChange}
                            disabled={!isEditing}
                            required
                            className="w-full border rounded-md p-2 disabled:bg-gray-100 disabled:text-gray-500"
                        >
                            <option value="">Select Province</option>
                            {loadingProvinces && <option disabled>Loading provinces...</option>}
                            {provinces.map((prov) => (
                                <option key={prov.stateProvinceCode} value={prov.stateProvinceDesc}>
                                    {prov.stateProvinceDesc}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div >
                        <label className="block text-sm font-medium mb-1">Email Address*</label>
                        <input
                            type="text"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            disabled={!isEditing}
                            required
                            className="w-full border rounded-md p-2 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    </div>
                    <div >
                        <label className="block text-sm font-medium mb-1">Contact Info*</label>
                        <input
                            type="text"
                            name="contact"
                            value={form.contact}
                            onChange={handleChange}
                            disabled={!isEditing}
                            required
                            className="w-full border rounded-md p-2 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Bearer Token*</label>
                        <input
                            type="text"
                            name="bearer_token"
                            value={form.bearer_token}
                            onChange={handleChange}
                            disabled={!isEditing}
                            required
                            className="w-full border rounded-md p-2 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Business Address*</label>
                        <textarea
                            name="address"
                            rows="3"
                            value={form.address}
                            onChange={handleChange}
                            disabled={!isEditing}
                            required
                            className="w-full border rounded-md p-2 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    </div>

                </form>
                <br />
                {isEditing && (
                    <button
                        type="submit"
                        onClick={handleShowPasswrodForm}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
                    >
                        Change Password
                    </button>
                )}
            </div>
            {showPasswordForm && (
                <div className="fixed inset-0 backdrop-blur-xs bg-black/30 z-50 flex items-center justify-center px-3">
                    <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-xl shadow-lg p-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scroll`}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">
                                Change Password
                            </h2>
                            <button
                                onClick={() => setshowPasswordForm()}
                                className="text-gray-500 font-normal hover:text-gray-700 text-xl"
                            >
                                ✖
                            </button>
                        </div>

                        <form onSubmit={passwordSave} className="space-y-4">
                            {/* Current Password - Full Width */}
                            <div className="w-full">
                                <label className="block text-sm font-medium mb-2">Enter Your Current Password*</label>
                                <PasswordInput
                                    name="current_password"
                                    value={passwordForm.current_password || ""}
                                    onChange={handlePasswordChange}
                                    placeholder="Enter your current password"
                                />
                            </div>

                            {/* New and Confirm - Same Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Enter Your New Password*</label>
                                    <PasswordInput
                                        name="new_password"
                                        value={passwordForm.new_password || ""}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter new password"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Confirm Your New Password*</label>
                                    <PasswordInput
                                        name="confirm_password"
                                        value={passwordForm.confirm_password || ""}
                                        onChange={handlePasswordChange}
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-3 mt-6">
                                {/* <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 transition-all duration-300 text-white font-semibold px-8 py-3 rounded-md"
                                >
                                    Save Password
                                </button> */}
                                <button
                                    type="submit"
                                    disabled={isSavingPassword}
                                    className="bg-blue-600 hover:bg-blue-700 transition-all duration-300 text-white font-semibold px-8 py-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {isSavingPassword && (
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    )}
                                    {isSavingPassword ? "Updating..." : "Save Password"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setshowPasswordForm()}
                                    className="bg-gray-400 hover:bg-gray-600 text-white font-semibold px-8 py-3 rounded-lg"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
}

