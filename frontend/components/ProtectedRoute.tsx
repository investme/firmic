import { ReactNode } from "react";
import { useRequireAuth } from "../hooks/useRequireAuth";

type Props = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const { checkingAuth } = useRequireAuth();

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-violet-600 border-t-transparent animate-spin mx-auto"></div>

          <p className="mt-6 text-slate-500 font-medium">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}