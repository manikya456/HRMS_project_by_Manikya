import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values.email, values.password);
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials or backend unavailable.");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.13),_transparent_26%),radial-gradient(circle_at_80%_20%,_rgba(45,212,191,0.14),_transparent_22%),linear-gradient(180deg,_#f7fffe_0%,_#effbf9_100%)]">
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400" />
      <div className="absolute left-10 top-20 h-28 w-28 rounded-full bg-teal-300/25 blur-3xl" />
      <div className="absolute right-10 bottom-24 h-36 w-36 rounded-full bg-cyan-300/25 blur-3xl" />

      <div className="relative grid min-h-screen place-items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white px-4 py-2 text-sm font-medium text-teal-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              AI-HRMS
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Welcome back
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-600">
              Sign in to access your HR dashboard, approvals, payroll, recruitment, and AI-powered workflows.
            </p>
          </div>

          <Card className="border-teal-100/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(13,148,136,0.12)] sm:p-8">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-glow">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-teal-600">Secure access</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Login</h2>
                </div>
              </div>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">JWT</span>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <Input
                  placeholder="Email"
                  className={cn(
                    "h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 focus:border-teal-500 focus:ring-teal-500/20",
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
                    "h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 focus:border-teal-500 focus:ring-teal-500/20",
                    errors.password && "border-red-300 focus:border-red-400",
                  )}
                  {...register("password")}
                />
                {errors.password ? <p className="mt-1 text-xs text-red-500">{errors.password.message}</p> : null}
              </div>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <Button
                type="submit"
                className="h-12 w-full rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-glow hover:from-teal-600 hover:to-cyan-600"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
                {!isSubmitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </form>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {["Admin", "HR", "Employee"].map((role) => (
                <div key={role} className="rounded-2xl border border-teal-100 bg-teal-50/70 px-3 py-3 text-xs font-semibold text-teal-800">
                  {role}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-sm text-teal-900">
              <p className="font-semibold">Demo access</p>
              <p className="mt-1 text-teal-800/80">
                Use the seeded credentials in your local database to explore the platform.
              </p>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              New here?{" "}
              <Link className="font-medium text-teal-600 hover:text-teal-700 hover:underline" to="/register">
                Create an account
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
