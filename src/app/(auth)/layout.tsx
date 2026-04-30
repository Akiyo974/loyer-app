import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
