import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

const schema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER", "EMPLOYEE", "CANDIDATE"]),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "EMPLOYEE" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await registerUser(values);
      navigate("/dashboard");
    } catch {
      setError("Registration failed. Check backend availability.");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex items-end p-10 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.22),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a_70%)] text-white">
        <div className="max-w-xl animate-fadeUp">
          <h1 className="text-5xl font-semibold">Create a role-based workspace for your team.</h1>
          <p className="mt-6 text-slate-300 text-lg">
            Signup supports Admin, Senior Manager, HR Recruiter, Employee, and Candidate roles for a polished demo environment.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Create account</p>
            <h2 className="mt-2 text-3xl font-semibold">Register</h2>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input placeholder="Username" {...register("username")} />
            <Input placeholder="Email" {...register("email")} />
            <Input type="password" placeholder="Password" {...register("password")} />
            <Select {...register("role")}>
              <option value="EMPLOYEE">Employee</option>
              <option value="HR_RECRUITER">HR Recruiter</option>
              <option value="SENIOR_MANAGER">Senior Manager</option>
              <option value="ADMIN">Admin</option>
              <option value="CANDIDATE">Candidate</option>
            </Select>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-slate-500">
            Already have an account? <Link className="text-sky-500 hover:underline" to="/login">Sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
