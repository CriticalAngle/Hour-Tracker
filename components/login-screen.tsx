"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"

export function LoginScreen() {
  const { signInWithGoogle } = useAuth()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSignIn() {
    setPending(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch {
      setError("Sign-in failed. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex w-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded-xl border p-6 text-center">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Hour Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to track and sync your hours.
          </p>
        </div>
        <Button onClick={handleSignIn} disabled={pending} className="w-full">
          {pending ? "Signing in..." : "Sign in with Google"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
