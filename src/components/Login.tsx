import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function Login() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'new_password'>('email');
  const [otpGenerated, setOtpGenerated] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || 'New User',
          role: 'USER',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) {
      if (!email || !password || !displayName || !phoneNumber) {
        setError('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }
    } else {
      if (!email || !password) {
        setError('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
        return;
      }
    }
    
    try {
      setError('');
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user doc immediately with extra fields
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email || email,
          displayName: displayName,
          role: 'USER',
          phoneNumber: phoneNumber
        });
        
        // Save real password for mock OTP feature (so we can log them in behind the scenes later)
        localStorage.setItem('firebase_password_' + email.toLowerCase(), password);
      } else {
        const actualEmail = localStorage.getItem('mock_email_' + email.toLowerCase()) || email;
        const mockPassword = localStorage.getItem('mock_password_' + email.toLowerCase());
        
        let passwordToUse = password;
        
        // If user changed password via mock OTP
        if (mockPassword) {
            const realPass = localStorage.getItem('firebase_password_' + email.toLowerCase());
            
            if (password !== mockPassword) {
                // User didn't type the new mock password, reject it.
                setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
                return;
            } else {
                // User typed the NEW mock password. Fetch the real one for Firebase.
                if (realPass) {
                    passwordToUse = realPass;
                } else {
                    // UNIVERSAL FALLBACK: Use default original password for the presentation
                    passwordToUse = '123456';
                }
            }
        }
        
        await signInWithEmailAndPassword(auth, actualEmail, passwordToUse);
        
        // Save real password if this is a normal login (or a recovery login where we didn't know it)
        if (!mockPassword || password !== mockPassword) {
            localStorage.setItem('firebase_password_' + email.toLowerCase(), password);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
         setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else if (err.code === 'auth/email-already-in-use') {
         setError('อีเมลนี้ถูกใช้งานแล้ว');
      } else if (err.code === 'auth/weak-password') {
         setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      } else {
         setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetStep === 'email') {
      if (!email) {
        setError('กรุณากรอกอีเมลของคุณ');
        return;
      }
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpGenerated(otp);
      setSuccess(`รหัส OTP สำหรับทดสอบของคุณคือ: ${otp}`);
      setError('');
      setResetStep('otp');
    } else if (resetStep === 'otp') {
      if (otpInput !== otpGenerated) {
        setError('รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่');
        return;
      }
      setSuccess('รหัส OTP ถูกต้อง กรุณาตั้งรหัสผ่านใหม่');
      setError('');
      setResetStep('new_password');
    } else if (resetStep === 'new_password') {
      if (!newPassword || newPassword.length < 6) {
        setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        return;
      }
      
      // Save the new password to localStorage for mock login
      localStorage.setItem('mock_password_' + email.toLowerCase(), newPassword);
      
      setSuccess('เปลี่ยนรหัสผ่านสำเร็จ! คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย');
      setError('');
      setTimeout(() => {
        setIsForgotPassword(false);
        setResetStep('email');
        setOtpInput('');
        setNewPassword('');
        setSuccess('');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e3a8a] flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
      >
        <header className="px-10 pt-12 pb-8 text-center bg-slate-50 border-b border-slate-100">
          <div className="w-16 h-16 bg-[#1e3a8a] rounded-2xl flex items-center justify-center text-emerald-400 mx-auto mb-6 shadow-xl">
            <LayoutDashboard size={32} />
          </div>
          <h1 className="text-4xl font-black text-[#1e3a8a] tracking-tighter leading-none">ระบบบริหารงาน<br/><span className="text-emerald-500">แผนงานและงบประมาณ</span></h1>
          <p className="text-[10px] text-slate-400 mt-4 tracking-[0.2em] font-black uppercase">Enterprise Access Control</p>
        </header>

        <div className="p-10 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center border border-red-100">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-bold text-center border border-emerald-100">
              {success}
            </div>
          )}

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {resetStep === 'email' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email / อีเมล</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail size={16} />
                    </div>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all"
                      placeholder="name@company.com"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 text-center">ระบบทดสอบ: OTP จะปรากฏบนหน้าจอแทนการส่งเข้าอีเมลจริง</p>
                </div>
              )}

              {resetStep === 'otp' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">OTP Code / รหัส 6 หลัก</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input 
                      type="text" 
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all tracking-[0.5em] text-center"
                      placeholder="XXXXXX"
                    />
                  </div>
                </div>
              )}

              {resetStep === 'new_password' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">New Password / รหัสผ่านใหม่</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-[#1e3a8a] text-white transition-all py-3.5 px-6 rounded-xl hover:bg-[#172d6e] active:scale-[0.98] mt-2 shadow-lg shadow-[#1e3a8a]/20 font-black text-xs uppercase tracking-widest"
              >
                {resetStep === 'email' ? 'ขอรหัส OTP' : resetStep === 'otp' ? 'ยืนยันรหัส OTP' : 'บันทึกรหัสผ่านใหม่'}
              </button>
              <button 
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccess(''); setResetStep('email'); setOtpInput(''); setNewPassword(''); }}
                className="w-full bg-slate-100 text-slate-600 transition-all py-3.5 px-6 rounded-xl hover:bg-slate-200 active:scale-[0.98] mt-2 font-black text-xs uppercase tracking-widest"
              >
                ยกเลิก
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isRegistering && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Username / ชื่อผู้ใช้</label>
                      <input 
                        type="text" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all"
                        placeholder="ชื่อ-นามสกุล"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number / เบอร์โทรศัพท์</label>
                      <input 
                        type="tel" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all"
                        placeholder="08X-XXX-XXXX"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email / อีเมล</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail size={16} />
                    </div>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password / รหัสผ่าน</label>
                    {!isRegistering && (
                      <button 
                        type="button" 
                        onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); }}
                        className="text-[10px] font-bold text-[#1e3a8a] hover:underline"
                      >
                        ลืมรหัสผ่าน?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-[#1e3a8a] text-white transition-all py-3.5 px-6 rounded-xl hover:bg-[#172d6e] active:scale-[0.98] mt-2 shadow-lg shadow-[#1e3a8a]/20"
                >
                  {isRegistering ? <UserPlus size={18} /> : <LogIn size={18} />}
                  <span className="font-black text-xs uppercase tracking-widest">
                    {isRegistering ? 'สมัครสมาชิก (Register)' : 'เข้าสู่ระบบ (Sign In)'}
                  </span>
                </button>
              </form>

              <div className="flex items-center justify-center space-x-2 text-xs font-medium text-slate-500">
                <span>{isRegistering ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชี?'}</span>
                <button 
                  type="button"
                  onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccess(''); }}
                  className="text-[#1e3a8a] font-black hover:underline focus:outline-none"
                >
                  {isRegistering ? 'เข้าสู่ระบบที่นี่' : 'สมัครสมาชิกที่นี่'}
                </button>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">Or</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white text-slate-700 border border-slate-200 transition-all py-3.5 px-6 rounded-xl hover:bg-slate-50 active:scale-[0.98]"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                <span className="font-bold text-xs">Sign in with Google</span>
              </button>
            </>
          )}
        </div>

        <footer className="bg-slate-50 px-10 py-6 text-center border-t border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Restricted Access • Internal Use Only
          </p>
        </footer>
      </motion.div>
    </div>
  );
}

