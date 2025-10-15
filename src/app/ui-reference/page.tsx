"use client";

import { useState, useEffect } from "react";
import { Edit2, Trash2, Key, Building } from "lucide-react";

export default function UIReference() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [years, setYears] = useState<Array<{ id: string; name: string; abbreviation?: string }>>([]);

  useEffect(() => {
    let mounted = true;
    async function fetchYears() {
      try {
        const res = await fetch('/api/years');
        if (!res.ok) throw new Error('Failed to fetch years');
        const data = await res.json();
        if (mounted && Array.isArray(data)) setYears(data);
      } catch (e) {
        // fallback: keep years empty and UI will show hardcoded options
        if (mounted) setYears([]);
      }
    }
    fetchYears();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold" style={{ fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto' }}>
            SPIOT — UI Component Reference
          </h1>
          <p className="mt-1 text-sm text-gray-600">Light theme · Inter · Brand color: <span className="font-medium" style={{ color: '#005A9C' }}>#005A9C</span></p>
        </header>

        {/* Buttons */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-medium mb-4">Buttons</h2>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Primary */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Primary Button</div>
              <button
                className="px-4 py-2 rounded-md text-white font-medium bg-[#005A9C] hover:bg-[#004774] transition"
              >
                Primary Action
              </button>
            </div>

            {/* Secondary */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Secondary Button</div>
              <button
                className="px-4 py-2 rounded-md font-medium bg-white border border-[#005A9C] text-[#005A9C] hover:bg-[#e6f2fb] transition"
              >
                Secondary Action
              </button>
            </div>

            {/* Icon buttons */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Icon Buttons</div>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Edit"
                  className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>

                <button
                  aria-label="Delete"
                  className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-red-600"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>

                <button
                  aria-label="Reset Password"
                  className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-[#005A9C]"
                  title="Reset Password"
                >
                  <Key size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Form Elements */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-medium mb-4">Form Elements</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005A9C] focus:border-[#005A9C]"
                placeholder="e.g. Alice Johnson"
                aria-label="Full Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Year</label>
              <select className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#005A9C] focus:border-[#005A9C]">
                {years.length > 0 ? years.map((y) => (
                  <option key={y.id} value={y.id}>{y.abbreviation ?? y.name}</option>
                )) : (
                  <>
                    <option>FYCO</option>
                    <option>SYCO</option>
                    <option>TYCO</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </section>

        {/* Data Display */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-medium mb-4">Data Display</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Table (spans two columns on large screens) */}
            <div className="lg:col-span-2">
              <div className="overflow-x-auto border border-gray-100 rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-left text-gray-700">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3">Dr. Rohit Sharma</td>
                      <td className="px-4 py-3">Computer Science</td>
                      <td className="px-4 py-3">rohit@spiot.edu</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="text-[#005A9C] hover:underline">View</button>
                          <button className="text-red-600">Remove</button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Ms. Priya Patel</td>
                      <td className="px-4 py-3">Mathematics</td>
                      <td className="px-4 py-3">priya@spiot.edu</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="text-[#005A9C] hover:underline">View</button>
                          <button className="text-red-600">Remove</button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Arjun Mehta</td>
                      <td className="px-4 py-3">Electrical</td>
                      <td className="px-4 py-3">arjun@spiot.edu</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="text-[#005A9C] hover:underline">View</button>
                          <button className="text-red-600">Remove</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right column: Data Card and Tags */}
            <div className="space-y-4">
              <div className="bg-white rounded-md shadow p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Total Departments</div>
                  <div className="text-2xl font-semibold">6</div>
                </div>
                <div className="text-[#005A9C]">
                  <Building size={28} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#005A9C] text-white text-sm">{years && years[0] ? (years[0].abbreviation ?? years[0].name) : 'SYCO'}</div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-500 text-white text-sm">Completed</div>
              </div>
            </div>
          </div>
        </section>

        {/* Overlays / Modal demo */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-12">
          <h2 className="text-xl font-medium mb-4">Overlays</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-md text-white bg-[#005A9C] hover:bg-[#004774] transition"
            >
              Open &quot;Add New Subject&quot; Modal
            </button>
            <div className="text-sm text-gray-600">Modal appears over a semi-transparent dark overlay</div>
          </div>
        </section>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />

            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
              <h3 className="text-lg font-semibold">Add New Subject</h3>
              <p className="text-sm text-gray-500 mt-1">Create a new subject record for the selected department.</p>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <label className="text-sm font-medium text-gray-700">Subject Name</label>
                <input className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#005A9C] focus:border-[#005A9C]" />

                <label className="text-sm font-medium text-gray-700">Subject Code</label>
                <input className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#005A9C] focus:border-[#005A9C]" />

                <label className="text-sm font-medium text-gray-700">Target Year</label>
                <select className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#005A9C] focus:border-[#005A9C]">
                  {years.length > 0 ? years.map((y) => (
                    <option key={y.id} value={y.id}>{y.abbreviation ?? y.name}</option>
                  )) : (
                    <>
                      <option>FYCO</option>
                      <option>SYCO</option>
                      <option>TYCO</option>
                    </>
                  )}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md font-medium bg-[#005A9C] text-white hover:bg-[#004774]"
                >
                  Add Subject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
