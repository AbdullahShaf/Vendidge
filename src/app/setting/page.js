"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [orientation, setOrientation] = useState("landscape");

  const loadSettings = async () => {
    const userId = sessionStorage.getItem("userId");
    if (!userId) return;

    setLoading(true);
    try {
      const savedOrientation = localStorage.getItem("userPrintOrientation") || "landscape";
      setOrientation(savedOrientation);
      const res = await fetch(`/api/userChoosableFields?userId=${userId}`);
      const data = await res.json();
      setFields(data);
      setHasChanges(false);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const getSelected = (f) => {
    if (f.hide === 1) return "hide";
    if (f.show === 0 && f.show_if_value === 1) return "conditional";
    return "show";
  };

  const changeField = (fieldId, option) => {
    setFields(prev =>
      prev.map(f => {
        if (f.id !== fieldId) return f;
        let payload;
        if (option === "show") payload = { show: 1, show_if_value: 0, hide: 0 };
        else if (option === "conditional") payload = { show: 0, show_if_value: 1, hide: 0 };
        else payload = { show: 0, show_if_value: 0, hide: 1 };
        return { ...f, ...payload };
      })
    );
    setHasChanges(true);
  };

  const handleOrientationChange = (value) => {
    setOrientation(value);
    localStorage.setItem("userPrintOrientation", value);
  };

  const saveChanges = async () => {
    const userId = sessionStorage.getItem("userId");
    setSaving(true);

    try {
      await Promise.all(
        fields.map(f =>
          fetch("/api/userChoosableFields", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: f.id,
              userId,
              show: f.show,
              show_if_value: f.show_if_value,
              hide: f.hide,
            }),
          })
        )
      );
      setHasChanges(false);
      alert("Settings updated successfully!");
    } catch (err) {
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Loading your settings...</p>
      </div>
    );
  }

  const rowFields = fields.slice(0, 10);
  const headerFields = fields.slice(10, 13);

  const FieldItem = ({ f , isHeader}) => {
    const options = isHeader
      ? ["show", "hide"]
      : ["show", "conditional", "hide"];
    return (
      <div className="flex justify-between items-center p-4 border-b last:border-0 hover:bg-gray-50 transition">
        <span className="text-gray-700 font-medium">{f.name}</span>
        <div className="flex gap-4">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-1 cursor-pointer text-sm">
              <input
                type="radio"
                name={`field-${f.id}`}
                className="accent-blue-600 w-4 h-4"
                checked={getSelected(f) === opt}
                onChange={() => changeField(f.id, opt)}
                disabled={saving}
              />
              <span className={opt === 'hide' ? 'text-red-600' : 'text-gray-600'}>
                {opt === 'conditional' ? 'If Value' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-4xl mx-auto py-8 px-4">

      <div className="flex justify-between items-center mb-6 bg-white p-4 sticky top-0 z-10 border-b shadow-sm rounded-t-lg">
        <h2 className="text-xl font-bold text-gray-800">Field Visibility</h2>

        {hasChanges && (
          <div className="flex gap-2">
            <button
              onClick={loadSettings}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 shadow-md transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">
              Default Print Orientation
            </h3>
          </div>
          <div className="p-6 flex gap-10">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="orientation"
                value="portrait"
                checked={orientation === "portrait"}
                onChange={(e) => handleOrientationChange(e.target.value)}
                className="w-5 h-5 accent-blue-600"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-gray-800">Portrait</span>
                <span className="text-xs text-gray-500 italic">Standard Vertical</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="orientation"
                value="landscape"
                checked={orientation === "landscape"}
                onChange={(e) => handleOrientationChange(e.target.value)}
                className="w-5 h-5 accent-blue-600"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-gray-800">Landscape</span>
                <span className="text-xs text-gray-500 italic">Wide View (Recommended)</span>
              </div>
            </label>
          </div>
        </section>
        <section className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">
              Invoice Print Row Fields
            </h3>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
              {rowFields.length} Fields
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
            {rowFields.map(f => (
             <FieldItem key={f.id} f={f} isHeader={false} />
            ))}
          </div>
        </section>
        <section className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">
              Invoice Print Header
            </h3>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
              {headerFields.length} Fields
            </span>
          </div>

          <div className="bg-white">
            {headerFields.map(f => (
              <FieldItem key={f.id} f={f} isHeader={true} />
            ))}
          </div>
        </section>

      </div>
      {saving && (
        <div className="fixed inset-0 bg-white/20 z-50 cursor-wait"></div>
      )}
    </div>
  );
}