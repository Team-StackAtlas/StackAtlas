import { Link } from 'react-router-dom';
import { Mail, Lock, Layers } from 'lucide-react';

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-slate-900 relative overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200"></div>
          <div className="p-8 sm:p-10 md:pt-12 md:pb-10 md:px-10">
            <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-40 transition-opacity duration-300"></div>
                <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-emerald-500 dark:to-emerald-700 text-white shadow-lg overflow-hidden border border-slate-700 dark:border-emerald-400/30 group-hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[radial-gradient(circle_at_center,white_2px,transparent_2px)] bg-[size:8px_8px]"></div>
                  <Layers size={40} className="relative z-10 text-emerald-400 dark:text-white drop-shadow-md sm:w-12 sm:h-12" strokeWidth={2.5} />
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 uppercase">
                  Stack<span className="text-emerald-600">Atlas</span>
                </h1>
                <p className="text-slate-500 text-sm sm:text-base font-medium">Sign in to continue</p>
              </div>

              <div className="w-full">
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-center gap-3 bg-white text-slate-700 px-5 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all duration-200 font-medium text-[16px] group">
                    <div className="transition-transform duration-200 -ml-4">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                      </svg>
                    </div>
                    <span>Continue with Google</span>
                  </button>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="shrink-0 h-[1px] w-full bg-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">or</span>
                  </div>
                </div>

                <form className="space-y-4 sm:space-y-5">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-sm font-medium text-slate-700" htmlFor="email">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                          type="email" 
                          className="flex w-full border px-3 py-2 text-base md:text-sm pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400 outline-none transition-all" 
                          id="email" 
                          placeholder="you@example.com" 
                          required 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 text-left">
                      <label className="text-sm font-medium text-slate-700" htmlFor="password">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                          type="password" 
                          className="flex w-full border px-3 py-2 text-base md:text-sm pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl placeholder:text-slate-400 outline-none transition-all" 
                          id="password" 
                          placeholder="••••••••" 
                          required 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button 
                      className="inline-flex items-center justify-center gap-1 whitespace-nowrap text-sm px-3 py-2 w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-xl transition-all duration-200" 
                      type="submit"
                    >
                      Sign in
                    </button>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                      <button type="button" className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors">
                        Forgot password?
                      </button>
                      <button type="button" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                        Need an account? <span className="font-medium text-slate-700">Sign up</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-slate-400 sm:hidden">
          <p>&nbsp;</p>
        </div>
      </div>
    </div>
  );
}
