'use client';

import { useEffect, useState } from 'react';
import { useUserStore } from '../../store/useUserStore';
// import { useCustomerStore } from '../../store/useCustomerStore';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { DocumentArrowDownIcon } from '@heroicons/react/24/solid';


function Spinner() {
    return (
        <div className="flex justify-center items-center h-96">
            <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
        </div>
    );
}

export default function CustomersPage({ darkMode }) {
    const user = useUserStore((state) => state.user);
    const [loadingUser, setLoadingUser] = useState(true);
    // const {
    //     customers,
    //     setCustomers,
    //     addCustomer,
    //     updateCustomer,
    // } = useCustomerStore();
    const [customers, setCustomers] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    const [form, setForm] = useState({
        // customer_type: 'Individual',
        cnic_inc: '',
        ntn: '',
        // strn: '',
        // contact: '',
        // email: '',
        business_name: '',
        province: 'Punjab',
        address: '',
        // registration_type: 'Unregistered',
    });

    const loadCustomers = async () => {
        if (!user?.id) return;

        try {
            const res = await fetch(`/api/customer?userId=${user.id}`);
            const data = await res.json();
            setCustomers(data);
        } catch (err) {
            console.warn(err);
        } finally {
            setLoading(false);
        }
    };
    // useEffect(() => {
    //     const fetchProvinces = async () => {
    //         try {
    //             setLoading(true);

    //             // Get token from environment variables
    //             const token = process.env.NEXT_PUBLIC_FBR_BEARER_TOKEN;  // works for both Vite & CRA

    //             if (!token) {
    //                 throw new Error("API Bearer token is missing in environment variables");
    //             }

    //             const response = await fetch('https://gw.fbr.gov.pk/pdi/v1/provinces', {
    //                 method: 'GET',
    //                 headers: {
    //                     'Authorization': `Bearer ${token}`,
    //                     'Accept': 'application/json',
    //                     // 'Content-Type': 'application/json' → not needed for GET
    //                 },
    //             });

    //             if (!response.ok) {
    //                 if (response.status === 401) {
    //                     throw new Error("Unauthorized – invalid or expired token");
    //                 }
    //                 if (response.status === 403) {
    //                     throw new Error("Forbidden – you don't have permission");
    //                 }
    //                 throw new Error(`API error: ${response.status} ${response.statusText}`);
    //             }

    //             const data = await response.json();
    //             console.log("Fetched provinces:", data);
    //             // Assuming response shape: [ { stateProvinceCode: number, stateProvinceDesc: string }, ... ]
    //             setProvinces(Array.isArray(data) ? data : []);

    //         } catch (err) {
    //             console.warn("Failed to fetch provinces:", err);
    //             // setError(err.message || "Could not load provinces");
    //         } finally {
    //             setLoading(false);
    //         }
    //     };

    //     fetchProvinces();
    // }, []);
    useEffect(() => {
        const getFbrHeaders = () => {
            const token = sessionStorage.getItem("sellerToken");
            return token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" };
        };

        const fetchProvinces = async () => {
            try {
                const res = await fetch("/api/fbr/provinces", { headers: getFbrHeaders() });
                const json = await res.json();
                setProvinces(json.data || []);
            } catch (err) {
                console.warn(err);
            }
        };

        fetchProvinces();
    }, []);

    // useEffect(() => {
    //     loadCustomers();
    // }, [user]);
    useEffect(() => {
        if (user) {
            setLoadingUser(false);
            loadCustomers();
        }
    }, [user]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleEditClick = (customer) => {
        setEditingCustomer(customer);
        setForm({
            // customer_type: customer.customer_type,
            cnic_inc: customer.cnic_inc || '',
            ntn: customer.ntn || '',
            // strn: customer.strn || '',
            // contact: customer.contact,
            // email: customer.email || '',
            business_name: customer.business_name,
            province: customer.province,
            address: customer.address,
            // registration_type: customer.registration_type || 'Unregistered',
        });
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user?.id) {
            alert('Please login first');
            return;
        }

        if (!form.business_name || (!form.cnic_inc && !form.ntn) || !form.province || !form.address) {
            alert('Please fill all required fields');
            return;
        }

        // if (form.customer_type === 'Individual' && !form.cnic_inc) {
        //     alert('CNIC is required for Individual');
        //     return;
        // }

        try {
            const url = '/api/customer';
            const method = editingCustomer ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    id: editingCustomer?.id,
                    ...form,
                }),
            });

            const result = await res.json();

            if (result.success) {
                // if (editingCustomer) {
                //     updateCustomer(result.customer);
                // } else {
                //     addCustomer(result.customer); 
                // }
                alert(`Customer ${editingCustomer ? 'updated' : 'added'} successfully!`);
                setShowForm(false);
                setEditingCustomer(null);
                loadCustomers();
                setForm({
                    // customer_type: 'Individual',
                    cnic_inc: '',
                    ntn: '',
                    // strn: '',
                    // contact: '',
                    // email: '',
                    business_name: '',
                    province: 'Punjab',
                    address: '',
                    // registration_type: 'Unregistered',
                });
            } else {
                alert(result.error || 'Failed to save customer');
            }
        } catch (err) {
            alert('Network error. Try again.');
        }
    };

    const exportToExcel = () => {
        if (customers.length === 0) {
            alert('No customers to export!');
            return;
        }

        const worksheetData = customers.map((cust) => ({
            'Customer ID': cust.customer_id,
            'Name': cust.business_name,
            // 'Type': cust.customer_type,
            // 'Contact': cust.contact,
            'NTN': cust.ntn || '',
            'Province': cust.province,
            'CNIC / INC': cust.cnic_inc,
            // 'STRN': cust.strn || '',
            // 'Email': cust.email || '',
            'Address': cust.address,
            // 'Registration Type': cust.registration_type,
        }));

        const ws = XLSX.utils.json_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Customers');

        // Auto-size columns (optional enhancement)
        const colWidths = [
            { wch: 12 }, // Customer ID
            { wch: 25 }, // Name
            // { wch: 12 }, // Type
            // { wch: 15 }, // Contact
            { wch: 12 }, // NTN
            { wch: 12 }, // Province
            { wch: 18 }, // CNIC/INC
            // { wch: 15 }, // STRN
            // { wch: 25 }, // Email
            { wch: 40 }, // Address
            // { wch: 18 }, // Registration Type
        ];
        ws['!cols'] = colWidths;

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
        saveAs(data, `My_Customers_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    if (loadingUser) {
        return <Spinner />;
    }


    if (!user) {
        return (
            <div className="p-10 text-center text-xl">
                Please log in to manage customers.
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl md:text-4xl font-bold">My Customers</h1>
                <div className="flex items-center gap-4">
                    <button
                        // onClick={() => setShowForm(!showForm)}
                        onClick={() => {
                            setEditingCustomer(null);
                            setForm({
                                // customer_type: 'Individual',
                                cnic_inc: '',
                                ntn: '',
                                // strn: '',
                                // contact: '',
                                // email: '',
                                business_name: '',
                                province: 'Punjab',
                                address: '',
                                // registration_type: 'Unregistered',
                            });
                            setShowForm(!showForm);
                        }}
                        className="bg-blue-600 hover:bg-indigo-700 text-2xl text-white font-semibold px-3 py-1 md:px-4 md:py-2 rounded-lg shadow transition"
                    >
                        +
                    </button>
                    <button
                        onClick={exportToExcel}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-3 rounded-lg shadow transition flex items-center gap-2"
                    >
                        <DocumentArrowDownIcon className="h-6 w-6 text-white shrink-0" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 backdrop-blur-xs bg-black/30 z-50 flex items-center justify-center px-3">
                    <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-xl shadow-lg p-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scroll`}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">
                                {/* Add New Customer */}
                                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                            </h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-gray-500 font-normal hover:text-gray-700 text-xl"
                            >
                                ✖
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* <div>
                                <label className="block text-sm font-medium mb-2">Customer Type *</label>
                                <select
                                    name="customer_type"
                                    value={form.customer_type}
                                    onChange={handleChange}
                                    className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                >
                                    <option value="Individual">Individual</option>
                                    <option value="Other">Company / Firm / AOP</option>
                                </select>
                            </div> */}

                            {/* <div>
                                <label className="block text-sm font-medium mb-2">
                                    {form.customer_type === 'Individual' ? 'CNIC *' : 'INC / AOP Number *'}
                                </label>
                                <input
                                    type="text"
                                    name="cnic_inc"
                                    placeholder={form.customer_type === 'Individual' ? '35202-1234567-8' : '1234567-8'}
                                    value={form.cnic_inc}
                                    onChange={handleChange}
                                    className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                    required={form.customer_type === 'Individual'}
                                />
                            </div> */}

                            <div>
                                <label className="block text-sm font-medium mb-2">Business / Person Name *</label>
                                <input
                                    type="text"
                                    name="business_name"
                                    value={form.business_name}
                                    onChange={handleChange}
                                    className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                    required
                                />
                            </div>
{/* 
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    CNIC *
                                </label>

                                <input
                                    type="text"
                                    name="cnic_inc"
                                    placeholder="3520212345678"
                                    value={form.cnic_inc}
                                    maxLength={13}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        handleChange({
                                            target: {
                                                name: 'cnic_inc',
                                                value: value
                                            }
                                        });
                                    }}
                                    className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                    // required
                                    inputMode="numeric"
                                    pattern="[0-9]{13}"
                                />
                            </div> */}

                            {/* <div>
                                <label className="block text-sm font-medium mb-2">NTN</label>
                                <input
                                    type="text"
                                    name="ntn"
                                    placeholder="1234567"
                                    value={form.ntn}
                                    onChange={handleChange}
                                    className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                />
                            </div> */}
                            {/* <div>
                                <label className="block text-sm font-medium mb-2">
                                    NTN
                                </label>

                                <input
                                    type="text"
                                    name="ntn"
                                    placeholder="1234567 or A123456-1"
                                    value={form.ntn}
                                    maxLength={9}
                                    onChange={(e) => {
                                        // allow only uppercase letters, numbers, dash
                                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                                        handleChange({
                                            target: { name: 'ntn', value }
                                        });
                                    }}
                                    className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                    // required
                                    pattern="(\d{7}|[A-Z0-9]{7}-\d)"
                                    inputMode="text"
                                />
                            </div> */}


                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    CNIC / NTN
                                </label>

                                <input
                                    type="text"
                                    name="cnic_inc"
                                    placeholder="CNIC: 3520212345678 | NTN: 1234567"
                                    value={form.cnic_inc}
                                    maxLength={13}
                                    onChange={(e) => {
                                        let value = e.target.value;

                                        value = value.replace(/\D/g, "");

                                        if (value.length > 13) {
                                            value = value.slice(0, 13);
                                        }

                                        handleChange({
                                            target: {
                                                name: "cnic_inc",
                                                value
                                            }
                                        });
                                    }}

                                    className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                    inputMode="text"
                                    required
                                    pattern="^(\d{7}|\d{13})$"

                                />
                            </div>


                            {/* <div>
                                <label className="block text-sm font-medium mb-2">Contact No *</label>
                                <input
                                    type="text"
                                    name="contact"
                                    placeholder="03xxxxxxxxx"
                                    value={form.contact}
                                    onChange={handleChange}
                                    className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                    required
                                />
                            </div> */}

                            {/* <div>
                                <label className="block text-sm font-medium mb-2">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                />
                            </div> */}



                            {/* <div>
                                <label className="block text-sm font-medium mb-2">Province *</label>
                                <select
                                    name="province"
                                    value={form.province}
                                    onChange={handleChange}
                                    className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                    required
                                >
                                    <option value="Punjab">Punjab</option>
                                    <option value="Sindh">Sindh</option>
                                    <option value="KPK">KPK</option>
                                    <option value="Balochistan">Balochistan</option>
                                    <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                                    <option value="AJK">AJK</option>
                                </select>
                            </div> */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Province *</label>

                                <select
                                    name="province"
                                    value={form.province}
                                    onChange={handleChange}
                                    className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                    required
                                //disabled={loading}
                                >
                                    <option value="">Select Province</option>

                                    {loading && <option value="" disabled>Loading provinces...</option>}

                                    {/* {!loading && */}

                                    {provinces.map((prov) => (
                                        <option
                                            key={prov.stateProvinceCode}
                                            value={prov.stateProvinceDesc}           // or prov.stateProvinceCode if backend wants the number
                                        >
                                            {prov.stateProvinceDesc}
                                        </option>
                                    ))
                                        /* } */}
                                </select>


                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2">Address *</label>
                                <textarea
                                    name="address"
                                    value={form.address}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                    required
                                ></textarea>
                            </div>

                            {/* <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2">Registration Type</label>
                                <select
                                    name="registration_type"
                                    value={form.registration_type}
                                    onChange={handleChange}
                                    className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                >
                                    <option value="Unregistered">Unregistered</option>
                                    <option value="Registered">Registered</option>
                                </select>
                            </div> */}

                            <div className="md:col-span-2 flex flex-col md:flex-row gap-3 mt-3">
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 transition-all duration-300 text-white font-semibold px-8 py-3 rounded-md"
                                >
                                    Save Customer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="bg-gray-400 hover:bg-gray-600 text-white font-semibold px-8 py-3 rounded-lg"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto custom-scroll">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold">Customer ID</th>
                                <th className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold">Name</th>
                                {/* <th className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold">Type</th> */}
                                {/* <th className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold">Contact</th> */}
                                {/* <th className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold">NTN</th> */}
                                <th className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold">Province</th>
                                <th className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold">CNIC / NTN</th>
                                {/* <th className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold">STRN</th> */}
                                {/* <th className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold">Email</th> */}
                                <th className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold">Address</th>
                                {/* <th className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold">Registration</th> */}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-12 text-gray-500">Loading customers...</td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-12 text-gray-500">
                                        No customers found. Click + Add Customer to add one!
                                    </td>
                                </tr>
                            ) : (
                                customers.map((cust) => (
                                    <tr key={cust.id}
                                        onClick={() => handleEditClick(cust)}
                                        className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-medium text-indigo-600">{cust.customer_id}</td>
                                        <td className="px-6 py-4">{cust.business_name}</td>
                                        {/* <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${cust.customer_type === 'Individual'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                {cust.customer_type}
                                            </span>
                                        </td> */}
                                        {/* <td className="px-6 py-4 whitespace-nowrap text-center">{cust.contact}</td> */}
                                        {/* <td className="px-6 py-4 whitespace-nowrap text-center">{cust.ntn || '—'}</td> */}
                                        <td className="px-6 py-4 whitespace-nowrap text-center">{cust.province}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">{cust.cnic_inc || '-'}</td>


                                        {/* <td className="px-6 py-4 whitespace-nowrap text-center">{cust.strn || '—'}</td> */}
                                        {/* <td className="px-6 py-4 whitespace-nowrap text-center">{cust.email || '—'}</td> */}
                                        <td className="px-6 py-4 whitespace-nowrap text-center">{cust.address}</td>
                                        {/* <td className="px-6 py-4 whitespace-nowrap text-center">{cust.registration_type}</td> */}

                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}