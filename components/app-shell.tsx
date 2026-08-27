"use client"

import { useAuth } from "@/components/auth-provider"
import { HourTracker } from "@/components/hour-tracker"
import { LoginScreen } from "@/components/login-screen"
import { UserMenu } from "@/components/user-menu"

export function AppShell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <main className="flex w-full flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <main className="flex w-full flex-1 justify-start items-center p-6 md:p-10 flex-col gap-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Hour Tracker
            </h1>
            <p className="text-sm text-muted-foreground">
              Log hours worked with simplified labeling.
            </p>
          </div>
          <UserMenu />
        </div>
        <HourTracker uid={user.uid} />
      </div>
    </main>
  )
}
