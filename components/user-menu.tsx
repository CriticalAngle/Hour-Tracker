"use client"

import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-provider"

export function UserMenu() {
  const { user, signOutUser } = useAuth()

  if (!user) return null

  const initials = (user.displayName ?? user.email ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="gap-2 px-2" />}
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt=""
            className="size-6 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {initials}
          </span>
        )}
        <span className="max-w-40 truncate text-sm">
          {user.displayName ?? user.email}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => signOutUser()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
