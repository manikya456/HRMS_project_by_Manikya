import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
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
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-hero-gradient text-white relative overflow-hidden">
        <div className="max-w-xl animate-fadeUp">
          <p className="text-xs uppercase tracking-[0.35em] text-sky-300">AI-HRMS</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">Enterprise HR operations, recruitment, and AI screening in one platform.</h1>
          <p className="mt-6 text-slate-300 text-lg">
            Built for modern HR teams that want premium dashboards, intelligent automation, and a presentation-ready product story.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {["Employee lifecycle", "Recruitment AI", "Voice interview"].map((item) => (
            <Card key={item} className="bg-white/10 border-white/10 text-white">
              {item}
            </Card>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Welcome back</p>
            <h2 className="mt-2 text-3xl font-semibold">Sign in to AI-HRMS</h2>
            <p className="mt-2 text-sm text-slate-500">Access role-aware dashboards, analytics, and AI workflows.</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Input placeholder="Email" {...register("email")} />
              {errors.email ? <p className="mt-1 text-xs text-red-500">{errors.email.message}</p> : null}
            </div>
            <div>
              <Input type="password" placeholder="Password" {...register("password")} />
              {errors.password ? <p className="mt-1 text-xs text-red-500">{errors.password.message}</p> : null}
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Login"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-slate-500">
            New here? <Link className="text-sky-500 hover:underline" to="/register">Create an account</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
