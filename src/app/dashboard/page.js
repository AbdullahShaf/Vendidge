"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const mockDailySales = [
  { date: "2025-01-01", sales: 45000 },
  { date: "2025-01-02", sales: 62000 },
  { date: "2025-01-03", sales: 38000 },
  { date: "2025-01-04", sales: 89000 },
  { date: "2025-01-05", sales: 73000 },
  { date: "2025-01-06", sales: 51000 },
  { date: "2025-01-07", sales: 67000 },
];

const mockSaleTypes = [
  { name: "Cash", value: 185000 },
  { name: "Card", value: 142000 },
  { name: "Mobile", value: 98000 },
  { name: "Bank Transfer", value: 45000 },
];

const mockInvoiceStatus = [
  { name: "Registered", value: 312 },
  { name: "Unregistered", value: 87 },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    start: "2025-01-01",
    end: "2025-01-07",
  });

  return (
    <div className="min-h-screen bg-gray-50/40 pb-12">
      {/* Header + Date Picker */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">
              {dateRange.start} → {dateRange.end}
            </p>
          </div>

          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">From:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">To:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              Refresh
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-10">
          <StatCard title="Total Sales" value="PKR 489,000" trend="+12.4%" />
          <StatCard title="Invoices" value="399" trend="+8.1%" />
          <StatCard title="Units Sold" value="2,847" trend="+5.9%" />
          <StatCard title="Total Invoices" value="421" trend="+9.3%" />
          <StatCard title="Total Customers" value="184" trend="+14.2%" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
          <ChartCard title="Sales Over Time">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={mockDailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `PKR ${value.toLocaleString()}`} />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Sale Types Breakdown">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={mockSaleTypes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value) => `PKR ${value.toLocaleString()}`} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Invoice Registration Status">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={mockInvoiceStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label
                  labelLine={false}
                >
                  {mockInvoiceStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Customers by Sale Value">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={[
                  { name: "Ahmad Traders", value: 148000 },
                  { name: "Khan Enterprises", value: 92000 },
                  { name: "Siddiqui Store", value: 67000 },
                  { name: "Ali Mart", value: 51000 },
                  { name: "Others", value: 121000 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => `PKR ${v.toLocaleString()}`} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, trend }) {
  const isPositive = trend.startsWith("+");

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className={`text-sm mt-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
        {trend} this period
      </p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      {children}
    </div>
  );
}