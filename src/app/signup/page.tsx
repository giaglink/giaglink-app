import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <main className="z-10">
        <SignupForm />
      </main>
    </div>
  );
}
