"use client"

import * as React from "react"
import {
  CopyIcon,
  ExternalLinkIcon,
  MoreHorizontal,
  Plus,
  Trash2Icon,
} from "lucide-react"
import TimePicker from "react-time-picker"
import "react-time-picker/dist/TimePicker.css"
import "react-clock/dist/Clock.css"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
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

function todayString() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
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

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export function HourTracker({ uid }: { uid: string }) {
  const [entries, setEntries] = React.useState<Entry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addEntryOpen, setAddEntryOpen] = React.useState(false)
  const [exportInformationOpen, setExportInformationOpen] = React.useState(false)
  const [clearAllOpen, setClearAllOpen] = React.useState(false)
  const [clearing, setClearing] = React.useState(false)
  const [name, setName] = React.useState("")
  const [date, setDate] = React.useState("")
  const [startTime, setStartTime] = React.useState<string | null>(null)
  const [endTime, setEndTime] = React.useState<string | null>(null)

  const [editEntryOpen, setEditEntryOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editStartTime, setEditStartTime] = React.useState<string | null>(null)
  const [editEndTime, setEditEndTime] = React.useState<string | null>(null)

  const [hourlyRate, setHourlyRate] = React.useState("")
  const [taxRate, setTaxRate] = React.useState("")
  const [settingsLoaded, setSettingsLoaded] = React.useState(false)

  const today = todayString()
  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0)
  const grossPay = totalHours * (Number(hourlyRate) || 0)
  const taxAmount = grossPay * ((Number(taxRate) || 0) / 100)
  const netPay = grossPay - taxAmount
  const duration = hoursBetween(startTime ?? "", endTime ?? "")
  const editDuration = hoursBetween(editStartTime ?? "", editEndTime ?? "")
  const exportText = `${entries
    .map(
      (entry) =>
        `Name: ${entry.name}\nDate: ${entry.date}\nTime: ${entry.startTime} - ${entry.endTime}\nHours: ${entry.hours}`
    )
    .join("\n\n")}\n\nTotal Hours: ${totalHours}`

  React.useEffect(() => {
    const entriesQuery = query(
      collection(db, "users", uid, "entries"),
      orderBy("date", "asc")
    )
    const unsubscribe = onSnapshot(entriesQuery, (snapshot) => {
      const nextEntries = snapshot.docs.map((docSnapshot) => {
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
      // Firestore only orders by date here; break ties within the same
      // day by start time so the table reads earliest to latest.
      nextEntries.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1
        return a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0
      })
      setEntries(nextEntries)
      setLoading(false)
    })

    return unsubscribe
  }, [uid])

  React.useEffect(() => {
    getDoc(doc(db, "users", uid)).then((snapshot) => {
      const data = snapshot.data()
      if (data?.hourlyRate != null) setHourlyRate(String(data.hourlyRate))
      if (data?.taxRate != null) setTaxRate(String(data.taxRate))
      setSettingsLoaded(true)
    })
  }, [uid])

  // Save rates to Firestore shortly after the user stops typing.
  React.useEffect(() => {
    if (!settingsLoaded) return
    const timeout = setTimeout(() => {
      setDoc(
        doc(db, "users", uid),
        {
          hourlyRate: Number(hourlyRate) || 0,
          taxRate: Number(taxRate) || 0,
        },
        { merge: true }
      )
    }, 500)
    return () => clearTimeout(timeout)
  }, [uid, hourlyRate, taxRate, settingsLoaded])

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

  function openEdit(entry: Entry) {
    setEditingId(entry.id)
    setEditName(entry.name)
    setEditStartTime(entry.startTime)
    setEditEndTime(entry.endTime)
    setEditEntryOpen(true)
  }

  async function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!editingId || !editName || !editStartTime || !editEndTime || !editDuration)
      return

    await updateDoc(doc(db, "users", uid, "entries", editingId), {
      name: editName,
      startTime: editStartTime,
      endTime: editEndTime,
      hours: editDuration,
    })
    setEditEntryOpen(false)
    setEditingId(null)
  }

  async function handleClearAll() {
    setClearing(true)
    try {
      // Firestore batches cap at 500 writes, so chunk in case of a large log.
      for (let i = 0; i < entries.length; i += 450) {
        const batch = writeBatch(db)
        for (const entry of entries.slice(i, i + 450)) {
          batch.delete(doc(db, "users", uid, "entries", entry.id))
        }
        await batch.commit()
      }
      setClearAllOpen(false)
    } finally {
      setClearing(false)
    }
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
                <TableRow
                  key={entry.id}
                  className={
                    entry.date === today
                      ? "bg-primary/50 hover:bg-primary/55"
                      : undefined
                  }
                >
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
                        <DropdownMenuItem onClick={() => openEdit(entry)}>
                          Edit
                        </DropdownMenuItem>
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
          <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Export Information</DialogTitle>
              <DialogDescription>
                Easy copy and paste
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-3">
              <code className="whitespace-pre-line text-sm">
                {exportText}
              </code>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Close
              </DialogClose>
              <Button onClick={() => navigator.clipboard.writeText(exportText)}>
                <CopyIcon />
                Copy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
          <DialogTrigger render={<Button variant="destructive" disabled={!entries.length} />}>
            <Trash2Icon />
            Clear all
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear all entries?</DialogTitle>
              <DialogDescription>
                This will permanently delete all {entries.length}{" "}
                logged {entries.length === 1 ? "entry" : "entries"}. This
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleClearAll}
                disabled={clearing}
              >
                {clearing ? "Clearing..." : "Clear all"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editEntryOpen} onOpenChange={setEditEntryOpen}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit hour entry</DialogTitle>
              <DialogDescription>
                Update the name and time range for this entry.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-entry-name">Name</Label>
                <Input
                  id="edit-entry-name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="e.g. Gray Belt Class"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-entry-start">Start time</Label>
                  <TimePicker
                    id="edit-entry-start"
                    className="time-picker"
                    value={editStartTime}
                    onChange={(value) => setEditStartTime(value as string | null)}
                    disableClock
                    clearIcon={null}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-entry-end">End time</Label>
                  <TimePicker
                    id="edit-entry-end"
                    className="time-picker"
                    value={editEndTime}
                    onChange={(value) => setEditEndTime(value as string | null)}
                    disableClock
                    clearIcon={null}
                    required
                  />
                </div>
              </div>
              {editStartTime && editEndTime && (
                <p className="text-sm text-muted-foreground">
                  {editDuration > 0
                    ? `Duration: ${formatDuration(editDuration)}`
                    : "End time must be different from the start time."}
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={!editName || !editDuration}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">
          Total hours
        </span>
        <span className="text-2xl font-semibold tabular-nums">
          {totalHours}
        </span>
      </div>

      <div className="space-y-4 rounded-xl border px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="hourly-rate">Hourly rate ($)</Label>
            <Input
              id="hourly-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={hourlyRate}
              onChange={(event) => setHourlyRate(event.target.value)}
              placeholder="e.g. 25"
              disabled={!settingsLoaded}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tax-rate">Tax rate (%)</Label>
            <Input
              id="tax-rate"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.1"
              value={taxRate}
              onChange={(event) => setTaxRate(event.target.value)}
              placeholder="e.g. 20"
              disabled={!settingsLoaded}
            />
          </div>
        </div>
        <div className="grid gap-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Gross pay</span>
            <span className="tabular-nums">{currency.format(grossPay)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Taxes</span>
            <span className="tabular-nums">-{currency.format(taxAmount)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm font-medium text-muted-foreground">
            Take-home pay
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            {currency.format(netPay)}
          </span>
        </div>
      </div>
    </div>
  )
}
