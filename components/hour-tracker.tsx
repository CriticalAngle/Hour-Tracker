"use client"

import * as React from "react"
import { CopyIcon, ExternalLinkIcon, MoreHorizontal, Plus } from "lucide-react"
import TimePicker from "react-time-picker"
import "react-time-picker/dist/TimePicker.css"
import "react-clock/dist/Clock.css"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Entry = {
  id: string
  name: string
  startTime: string
  endTime: string
  hours: number
  date: string
}

function formatDate(value: string) {
  if (!value) return ""
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function hoursBetween(start: string, end: string) {
  if (!start || !end) return 0

  const [startHour, startMinute] = start.split(":").map(Number)
  const [endHour, endMinute] = end.split(":").map(Number)

  let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  if (minutes < 0) minutes += 24 * 60 // crosses midnight

  return Math.round((minutes / 60) * 100) / 100
}

function formatTime(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  const period = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`
}

function formatDuration(hours: number) {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (!h) return `${m}m`
  if (!m) return `${h}h`
  return `${h}h ${m}m`
}

export function HourTracker({ uid }: { uid: string }) {
  const [entries, setEntries] = React.useState<Entry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addEntryOpen, setAddEntryOpen] = React.useState(false)
  const [exportInformationOpen, setExportInformationOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [date, setDate] = React.useState("")
  const [startTime, setStartTime] = React.useState<string | null>(null)
  const [endTime, setEndTime] = React.useState<string | null>(null)

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0)
  const duration = hoursBetween(startTime ?? "", endTime ?? "")

  React.useEffect(() => {
    const entriesQuery = query(
      collection(db, "users", uid, "entries"),
      orderBy("date", "asc")
    )
    const unsubscribe = onSnapshot(entriesQuery, (snapshot) => {
      setEntries(
        snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data()
          return {
            id: docSnapshot.id,
            name: data.name,
            startTime: data.startTime,
            endTime: data.endTime,
            hours: data.hours,
            date: data.date,
          }
        })
      )
      setLoading(false)
    })

    return unsubscribe
  }, [uid])

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    if (!name || !date || !startTime || !endTime || !duration) return

    await addDoc(collection(db, "users", uid, "entries"), {
      name,
      startTime,
      endTime,
      hours: duration,
      date,
    })
    setName("")
    setDate("")
    setStartTime(null)
    setEndTime(null)
    setAddEntryOpen(false)
  }

  async function handleDelete(id: string) {
    await deleteDoc(doc(db, "users", uid, "entries", id))
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading entries...
                </TableCell>
              </TableRow>
            ) : entries.length ? (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell>{formatTime(entry.startTime)}</TableCell>
                  <TableCell>{formatTime(entry.endTime)}</TableCell>
                  <TableCell>{entry.hours}</TableCell>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(entry.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No entries yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-row gap-2">
        <Dialog open={addEntryOpen} onOpenChange={setAddEntryOpen}>
          <DialogTrigger render={<Button />}>
            <Plus />
            Add entry
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAdd}>
              <DialogHeader>
                <DialogTitle>Add hour entry</DialogTitle>
                <DialogDescription>
                  Log a new entry with a name, a time range, and date.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="entry-name">Name</Label>
                  <Input
                    id="entry-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Gray Belt Class"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="entry-start">Start time</Label>
                    <TimePicker
                      id="entry-start"
                      className="time-picker"
                      value={startTime}
                      onChange={(value) => setStartTime(value as string | null)}
                      disableClock
                      clearIcon={null}
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="entry-end">End time</Label>
                    <TimePicker
                      id="entry-end"
                      className="time-picker"
                      value={endTime}
                      onChange={(value) => setEndTime(value as string | null)}
                      disableClock
                      clearIcon={null}
                      required
                    />
                  </div>
                </div>
                {startTime && endTime && (
                  <p className="text-sm text-muted-foreground">
                    {duration > 0
                      ? `Duration: ${formatDuration(duration)}`
                      : "End time must be different from the start time."}
                  </p>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor="entry-date">Date</Label>
                  <Input
                    id="entry-date"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={!name || !date || !duration}>
                  Add entry
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={exportInformationOpen} onOpenChange={setExportInformationOpen}>
          <DialogTrigger render={<Button variant={'outline'} />}>
            <ExternalLinkIcon />
            Export Information
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Information</DialogTitle>
              <DialogDescription>
                Send this information over to Hardik every other Sunday!
              </DialogDescription>
            </DialogHeader>
            <code className="whitespace-pre-line">
              {`${entries.map(entry => {
                return `Name: ${entry.name}\nDate: ${entry.date}\nTime: ${entry.startTime} - ${entry.endTime}\nHours: ${entry.hours}`
              }).join('\n\n')}\n\nTotal Hours: ${totalHours}`}
            </code>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Close
              </DialogClose>
              <Button>
                <CopyIcon />
                Copy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">
          Total hours
        </span>
        <span className="text-2xl font-semibold tabular-nums">
          {totalHours}
        </span>
      </div>
    </div>
  )
}
