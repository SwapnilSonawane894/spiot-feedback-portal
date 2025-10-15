"use client";

import React, { useEffect, useState } from "react";
import { Edit2, Trash2 } from "lucide-react";

type Department = { id: string; name: string; abbreviation: string };
type Hod = {
	id: string;
	name?: string | null;
	email?: string | null;
	staffProfile?: { employeeId: string; designation: string; department?: Department | null } | null;
};

export default function ManageHodsPage(): React.ReactElement {
	const [hods, setHods] = useState<Hod[]>([]);
	const [departments, setDepartments] = useState<Department[]>([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingHOD, setEditingHOD] = useState<Hod | null>(null);

	// form state
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [departmentId, setDepartmentId] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		fetchHods();
		fetchDepartments();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function handleDelete(id: string) {
		if (!confirm("Delete this HOD account?")) return;
		try {
			const res = await fetch(`/api/hods/${id}`, { method: "DELETE" });
			if (!res.ok) throw new Error("Delete failed");
			setHods((prev) => prev.filter((h) => h.id !== id));
		} catch (err) {
			console.error(err);
			alert((err as Error).message || "Delete failed");
		}
	}

	async function fetchHods() {
		try {
			const res = await fetch("/api/hods");
			if (!res.ok) throw new Error("Failed to fetch hods");
			const data = await res.json();
			setHods(data);
		} catch (err) {
			console.error(err);
		}
	}

	async function fetchDepartments() {
		try {
			const res = await fetch("/api/departments");
			if (!res.ok) throw new Error("Failed to fetch departments");
			const data = await res.json();
			setDepartments(data);
			if (data.length > 0) setDepartmentId(data[0].id);
		} catch (err) {
			console.error(err);
		}
	}


	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name || !email || !departmentId) return;
		setIsSubmitting(true);
		try {
			if (editingHOD) {
				// PATCH existing HOD (user id is editingHOD.id)
				const res = await fetch(`/api/hods/${editingHOD.id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name, email, departmentId }),
				});
				if (!res.ok) {
					const err = await res.json();
					throw new Error(err?.error || "Failed to update HOD");
				}
				const updated = await res.json();
				setHods((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
				setEditingHOD(null);
			} else {
				if (!password) return;
				const res = await fetch("/api/hods", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name, email, password, departmentId }),
				});
				if (!res.ok) {
					const err = await res.json();
					throw new Error(err?.error || "Failed to create HOD");
				}
				const created = await res.json();
				setHods((prev) => [created, ...prev]);
			}

			setIsModalOpen(false);
			setName("");
			setEmail("");
			setPassword("");
			if (departments.length > 0) setDepartmentId(departments[0].id);
		} catch (err) {
			console.error(err);
			alert((err as Error).message);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="min-h-screen">
			<main className="max-w-7xl mx-auto">
				<div className="flex items-start flex-col gap-3 justify-between mb-6">
					<h1 className="text-2xl font-semibold">Manage HOD Accounts</h1>
					<button
						onClick={() => {
							setEditingHOD(null);
							setName("");
							setEmail("");
							setPassword("");
							setIsModalOpen(true);
						}}
						className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						+ Create HOD Account
					</button>
				</div>

				<div className="bg-white rounded-lg shadow overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200 text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-gray-700">Name</th>
								<th className="px-6 py-3 text-left text-gray-700">Assigned Department</th>
								<th className="px-6 py-3 text-left text-gray-700">Email</th>
								<th className="px-6 py-3 text-left text-gray-700">Actions</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-100">
							{hods.map((h) => (
								<tr key={h.id} className="hover:bg-gray-50">
									<td className="px-6 py-3">{h.name}</td>
									<td className="px-6 py-3">{h.staffProfile?.department?.name ?? "Unassigned"}</td>
									<td className="px-6 py-3">{h.email}</td>
									<td className="px-6 py-3">
										<div className="flex items-center gap-2">
											<button
												className="p-2 rounded hover:bg-gray-100 text-gray-600"
												aria-label="Edit"
												onClick={() => {
													setEditingHOD(h);
													setName(h.name ?? "");
													setEmail(h.email ?? "");
													setDepartmentId(h.staffProfile?.department?.id ?? (departments.length > 0 ? departments[0].id : ""));
													setIsModalOpen(true);
												}}
											>
												<Edit2 size={16} />
											</button>
											<button onClick={() => handleDelete(h.id)} type="button" className="p-2 rounded hover:bg-gray-100 text-red-600" aria-label="Delete">
												<Trash2 size={16} />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</main>

			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} aria-hidden />
					<div role="dialog" aria-modal className="relative bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 p-6">
						<div className="flex items-start justify-between">
			                <div>
			                	<h3 className="text-lg font-semibold">{editingHOD ? "Edit HOD Account" : "Create HOD Account"}</h3>
			                	<p className="text-sm text-gray-500 mt-1">{editingHOD ? "Update HOD details and department." : "Fill the details to create a new HOD and assign them to a department."}</p>
			                </div>
							<button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 ml-4">✕</button>
						</div>

						<form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3">
							<label className="text-sm font-medium text-gray-700">Name</label>
							<input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-300" />

							<label className="text-sm font-medium text-gray-700">Email</label>
							<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full px-3 py-2 rounded-md border border-gray-300" />

							<label className="text-sm font-medium text-gray-700">Password</label>
							<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full px-3 py-2 rounded-md border border-gray-300" />



							<label className="text-sm font-medium text-gray-700">Department</label>
							<select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-300">
								{departments.map((d) => (
									<option key={d.id} value={d.id}>
										{d.name} ({d.abbreviation})
									</option>
								))}
							</select>

							<div className="mt-6 flex justify-end gap-3">
								<button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md text-gray-700 border">
									Cancel
								</button>
								<button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
									{isSubmitting ? (editingHOD ? "Saving..." : "Creating...") : (editingHOD ? "Save" : "Create HOD")}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
