"use client";
import React, { useState } from "react";
import Icon from "../../components/Icon";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../services/firebase";
import {
  getUserData,
  createUserDocument,
} from "../../services/firestoreService";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [error, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider) return;
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const data = await getUserData(user.uid);
      if (!data) {
        await createUserDocument({
          uid: user.uid,
          email: user.email!,
          dayTasks: [],
          generalTasks: [],
          endOfDay: "23:00",
        });
      }
      setAuthError(null);
      router.push("/dashboard");
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      setAuthError("Error al iniciar sesión con Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200 p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <Icon
            name="calendar-check"
            className="h-12 w-12 text-emerald-400 mx-auto"
          />
          <h1 className="text-3xl font-bold text-white mt-4">
            Bienvenido a TokiTask
          </h1>
          <p className="text-slate-400 mt-2 flex items-center justify-center flex-col">
            Tu planificador diario inteligente potenciado con <br />
            <Image
              src="/gemini-icon-logo.svg"
              alt="Gemini Logo"
              className="h-28 w-28"
              width={80}
              height={80}
            />
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-xl p-6 sm:p-8 space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center mb-6">
              <Icon
                name="loader"
                className="h-8 w-8 animate-spin text-emerald-400 mb-2"
              />
              <span className="text-lg text-white font-semibold">
                Iniciando sesión...
              </span>
            </div>
          )}

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center space-x-2 bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-slate-600 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#FFC107"
                  d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                ></path>
                <path
                  fill="#FF3D00"
                  d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"
                ></path>
                <path
                  fill="#4CAF50"
                  d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                ></path>
                <path
                  fill="#1976D2"
                  d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.021 35.596 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z"
                ></path>
              </svg>
              <span>Continuar con Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
