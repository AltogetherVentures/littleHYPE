import { SignIn, SignUp } from "@clerk/clerk-react";

export function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  return (
    <main className="page-narrow auth">
      {mode === "sign-in" ? (
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
      ) : (
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
      )}
    </main>
  );
}
