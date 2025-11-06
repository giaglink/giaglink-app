import { LoginForm } from "@/components/auth/login-form";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <main className="z-10">
        <LoginForm />
      </main>
    </div>
  );
}
