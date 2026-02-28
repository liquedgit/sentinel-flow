import { Label } from "@radix-ui/react-label";
import { Loader2, Rocket, TriangleAlert } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { data, useFetcher, useNavigate } from "react-router";
import { registerRoot } from "~/.server/controller/auth.controller";
import type { BaseResponseDtoWithErrors } from "~/.server/types/dto/base.dto";
import { useEffect } from "react";
import { toast } from "sonner";
import type { Route } from "./+types/register.root.page";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const orgName = String(formData.get("org_name"));
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const confirmPassword = String(formData.get("confirm_password"));

  if (!orgName || !email || !password || !confirmPassword) {
    return data(
      {
        errors: ["All fields are required"],
        status: 400,
        success: false,
      } as BaseResponseDtoWithErrors,
      { status: 400 },
    );
  }
  const res = await registerRoot(
    orgName as string,
    email as string,
    password as string,
    confirmPassword as string,
  );

  return res;
}

export default function RegisterRoot() {
  const fetcher = useFetcher();
  const navigate = useNavigate();

  useEffect(() => {
    if (fetcher.data?.success) {
      toast.success(
        "Administrator account created successfully, Please login to continue",
      );
      navigate("/auth/login");
    }
  }, [fetcher.data]);

  return (
    <Card className="border-slate-800  bg-secondary backdrop-blur-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-white">
          <p>Sentinel Flow</p>
          <p className="text-lg">Create Administrator Account</p>
        </CardTitle>
        <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">
          Please configure the initial administrative environment.
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-back">
        <fetcher.Form method="post" className="space-y-4">
          <div className="space-y-4">
            <Label htmlFor="org_name" className="text-slate-300">
              Organization Name
            </Label>
            <Input
              id="org_name"
              type="text"
              name="org_name"
              placeholder="Sentinel Flow Inc."
              className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
            />
          </div>
          <div className="space-y-4">
            <Label htmlFor="email" className="text-slate-300">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="admin@sentinelflow.com"
              className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
            />
          </div>
          <div className="flex space-x-4 justify-between">
            <div>
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                name="password"
                className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
              />
            </div>
            <div>
              <Label htmlFor="confirm_password" className="text-slate-300">
                Confirm Password
              </Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="Confirm password"
                name="confirm_password"
                className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
              />
            </div>
          </div>

          <div className="border-orange-500/50 bg-orange-950/30 text-orange-400 [&>svg]:text-orange-400 rounded-md p-4">
            <div className="flex space-x-4">
              <div className="flex justify-center">
                <TriangleAlert className="size-8" />
              </div>
              <div>
                <h3 className="text-orange-400 font-medium">
                  Administrative Access Warning
                </h3>
                <p className="text-sm">
                  This account bypasses all authentication and has irrevocable
                  system access. Store credentials securely.
                </p>
              </div>
            </div>
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {fetcher.state != "idle" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Rocket />
                Initialize System
              </>
            )}
          </Button>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}
