"use client";

import { useActionState } from "react";
import {
  Button,
  Card,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { loginAction, type LoginState } from "@/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <Card className="w-full max-w-md bg-slate-900/80 border border-slate-700 p-0">
      <Card.Header className="flex flex-col items-start gap-1 px-6 pt-6">
        <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold">
          ACDM
        </p>
        <Card.Title className="text-2xl font-bold text-white">
          Amrik Chhauni Deployment Manager
        </Card.Title>
        <Card.Description className="text-sm text-slate-400">
          Sign in to continue
        </Card.Description>
      </Card.Header>
      <Card.Content className="px-6 pb-6">
        <form action={formAction} className="flex flex-col gap-4">
          <TextField name="username" isRequired>
            <Label>Username</Label>
            <Input placeholder="Enter username" autoComplete="username" />
          </TextField>
          <TextField name="password" type="password" isRequired>
            <Label>Password</Label>
            <Input
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </TextField>
          {state.error && (
            <p className="text-sm text-red-400 bg-red-950/50 px-3 py-2 rounded-lg">
              {state.error}
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            isDisabled={pending}
            className="w-full mt-2"
          >
            {pending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </Card.Content>
    </Card>
  );
}
