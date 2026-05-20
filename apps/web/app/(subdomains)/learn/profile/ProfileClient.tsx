"use client";

import { useState } from "react";
import { updateProfile, applyForLecturer } from "./actions";

export default function ProfilePage({ user }: { user: any }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const handleUpdate = async (formData: FormData) => {
    setIsUpdating(true);
    setMessage(null);
    const result = await updateProfile(formData);
    
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Profile updated successfully!" });
    }
    setIsUpdating(false);
  };

  const handleApply = async () => {
    setMessage(null);
    const result = await applyForLecturer();
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: result.message || "Applied successfully." });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 w-full">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Your Profile</h1>

      {message && (
        <div className={`mb-6 p-4 rounded-lg text-sm border ${
          message.type === "success" 
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" 
            : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Profile Header */}
        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user.name || "Anonymous User"}</h2>
              <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {user.roles?.map((role: string) => (
              <span key={role} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full">
                {role}
              </span>
            ))}
          </div>
        </div>

        {/* Update Form */}
        <div className="p-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account Details</h3>
          <form action={handleUpdate} className="space-y-6 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Display Name
              </label>
              <input
                type="text"
                name="name"
                defaultValue={user.name || ""}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                defaultValue={user.email || ""}
                disabled
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">Email cannot be changed.</p>
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Lecturer Application */}
        {user.roles?.includes("STUDENT") && !user.roles?.includes("LECTURER") && !user.roles?.includes("ADMIN") && (
          <div className="p-8 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Become an Instructor</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm max-w-xl">
              Want to share your knowledge? Apply to become a Lecturer on TamphSystem to start creating courses, uploading videos, and managing your own students.
            </p>
            <button
              onClick={handleApply}
              className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-medium px-6 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              Apply for Lecturer Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
