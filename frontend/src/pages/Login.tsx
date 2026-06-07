import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ShieldCheck, ArrowRight, Building2, LockKeyhole, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setResetNotice("");
      await login(values.email, values.password);
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials or backend unavailable.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[1.05fr_560px]">
        <section className="hidden border-r border-slate-200 bg-slate-950 text-white lg:flex">
          <div className="flex w-full flex-col justify-between p-10 xl:p-14">
            <div>
              <div className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-wide text-white">AI-HRMS</p>
                  <p className="text-xs text-slate-400">Human Resource Management System</p>
                </div>
              </div>

              <div className="mt-16 max-w-xl">
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-teal-300">Workforce Operations</p>
                <h1 className="mt-5 text-5xl font-semibold tracking-tight text-white">
                  Secure access for HR operations and employee workflows.
                </h1>
                <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
                  Manage recruitment, approvals, attendance, payroll, and performance from a single internal workspace.
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <ShieldCheck className="h-5 w-5 text-teal-300" />
                <p className="mt-4 text-sm font-semibold text-white">Protected access</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Authenticated entry for internal HR, managers, and employees.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <UserCircle2 className="h-5 w-5 text-teal-300" />
                <p className="mt-4 text-sm font-semibold text-white">Role-based workspace</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Views and actions adapt to the signed-in user’s responsibilities.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <LockKeyhole className="h-5 w-5 text-teal-300" />
                <p className="mt-4 text-sm font-semibold text-white">Operational continuity</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Built for daily HR activity, hiring cycles, and ongoing employee operations.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">AI-HRMS</p>
                  <p className="text-xs text-slate-500">Human Resource Management System</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Account Access</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                Sign in
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
                Use your assigned work account credentials to continue to the HRMS workspace.
              </p>
            </div>

            <Card className="border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-8">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Secure Sign-In</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Login</h2>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <Input
                    placeholder="Email"
                    className={cn(
                      "h-12 rounded-xl border-slate-300 bg-white px-4 focus:border-slate-950 focus:ring-slate-950/10",
                      errors.email && "border-red-300 focus:border-red-400",
                    )}
                    {...register("email")}
                  />
                  {errors.email ? <p className="mt-1 text-xs text-red-500">{errors.email.message}</p> : null}
                </div>

                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    className={cn(
                      "h-12 rounded-xl border-slate-300 bg-white px-4 focus:border-slate-950 focus:ring-slate-950/10",
                      errors.password && "border-red-300 focus:border-red-400",
                    )}
                    {...register("password")}
                  />
                  {errors.password ? <p className="mt-1 text-xs text-red-500">{errors.password.message}</p> : null}
                </div>

                {error ? <p className="text-sm text-red-500">{error}</p> : null}
                {resetNotice ? <p className="text-sm text-slate-600">{resetNotice}</p> : null}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                  disabled={isSubmitting}
                >
                  <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
                  {!isSubmitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                </Button>
              </form>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Access is governed by your assigned role and available modules after sign-in.
              </div>

              <p className="mt-6 text-center text-sm text-slate-500">
                <button
                  type="button"
                  className="font-medium text-slate-950 hover:underline"
                  onClick={() => {
                    setError("");
                    setResetNotice("Forgot password? Ask your HRMS administrator to reset your account password.");
                  }}
                >
                  Forgot password?
                </button>
              </p>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
