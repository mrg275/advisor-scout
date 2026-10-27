import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<p className="text-stone-700">Loading sign-in…</p>}>
        <SignIn />
      </Suspense>
    </div>
  );
}
