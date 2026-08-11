'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col items-center justify-center selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden">
      
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-center z-0">
        <div className="w-[800px] h-[500px] bg-gradient-to-b from-indigo-100/60 via-violet-50/30 to-transparent rounded-full blur-3xl opacity-70 -top-40 absolute"></div>
        <div 
          className="absolute inset-0" 
          style={{ 
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
            backgroundSize: '32px 32px', 
            opacity: 0.4 
          }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Branding */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-indigo-200">
            C
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              Astro<span className="text-indigo-600 font-medium">PDF Engine</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              PDF Editor & Customizer Tool
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl rounded-2xl p-8">
          <form action={formAction} className="flex flex-col gap-5">
            
            <div>
              <label htmlFor="id" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Workspace ID
              </label>
              <input
                type="text"
                id="id"
                name="id"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Enter ID"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {state?.error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium text-center">
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-lg shadow-md shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPending ? 'Authenticating...' : 'Access Workspace'}
            </button>
            
          </form>
        </div>
      </div>
    </div>
  )
}