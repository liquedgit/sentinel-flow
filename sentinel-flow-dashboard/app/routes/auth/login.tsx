import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Shield } from "lucide-react";
import { Link, data, redirect, useFetcher } from "react-router";
import type { Route } from "./+types/login";
import { login } from "~/.server/controller/auth.controller";
import { commitSession, getSession } from "~/.server/libs/sessions";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const session = await getSession(request.headers.get("Cookie"));

  const res = await login(email, password);
  if (res && "id" in res) {
    console.log(res);
    session.set("userId", res.id);
    return redirect("/", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
  return data(res, {
    status: 400,
    headers: { "Set-Cookie": await commitSession(session) },
  });
}

export default function SignInCard() {
  const fetcher = useFetcher();
  return (
    <Card className="border-slate-800 bg-background-dark backdrop-blur-xl">
      <CardHeader className="space-y-4 text-center pb-8">
        <div className="mx-auto w-12 h-12 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
          <Shield className="w-6 h-6 text-blue-500" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl font-bold text-white">
            Sentinel Flow
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">
            Authorization Relationship Discovery
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <fetcher.Form method="post" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="user@sentinelflow.com"
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              name="password"
              placeholder="Enter your password"
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-500 hover:text-blue-400"
            >
              Forgot password?
            </Link>
          </div>
          {fetcher.data?.errors && fetcher.data.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-4">
              <ul className="list-disc list-inside">
                {fetcher.data.errors.map((error: string) => (
                  <li className="text-red-500 text-sm">{error}</li>
                ))}
              </ul>
            </div>
          )}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            Sign In
          </Button>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}
