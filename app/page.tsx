"use client"

import * as React from "react"
import { WebrtcProvider } from "y-webrtc"
import * as Y from "yjs"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const USER_STORAGE_KEY = "schlopping:user"
const DEFAULT_ROOM = "camping-weekend"

const USER_COLORS = [
  {
    id: "berry",
    label: "Berry",
    chip: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-200",
    dot: "bg-fuchsia-500",
    ring: "ring-fuchsia-400",
  },
  {
    id: "mint",
    label: "Mint",
    chip: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    ring: "ring-emerald-400",
  },
  {
    id: "sunrise",
    label: "Sunrise",
    chip: "bg-amber-500/15 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    ring: "ring-amber-400",
  },
  {
    id: "ocean",
    label: "Ocean",
    chip: "bg-sky-500/15 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
    ring: "ring-sky-400",
  },
  {
    id: "orchid",
    label: "Orchid",
    chip: "bg-violet-500/15 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    ring: "ring-violet-400",
  },
  {
    id: "charcoal",
    label: "Charcoal",
    chip: "bg-slate-500/15 text-slate-700 border-slate-200",
    dot: "bg-slate-600",
    ring: "ring-slate-400",
  },
]

const SIGNALING_SERVERS = [
  "wss://signaling.yjs.dev",
  "wss://y-webrtc-signaling-eu.herokuapp.com",
  "wss://y-webrtc-signaling-us.herokuapp.com",
]

type UserProfile = {
  id: string
  name: string
  colorId: string
}

type UserPresence = UserProfile

type ListItem = {
  id: string
  name: string
  qty: number
  unit: string
  note: string
  done: boolean
  updatedBy: string
  assignedTo: string
}

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

const getColor = (colorId: string) =>
  USER_COLORS.find((color) => color.id === colorId) ?? USER_COLORS[0]

const readStoredUser = (): UserProfile => {
  if (typeof window === "undefined") {
    return {
      id: createId(),
      name: "Guest",
      colorId: USER_COLORS[0].id,
    }
  }

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile
      if (parsed?.id && parsed?.name && parsed?.colorId) {
        return parsed
      }
    }
  } catch {
    // Ignore malformed storage.
  }

  return {
    id: createId(),
    name: "Guest",
    colorId: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)].id,
  }
}

const getInitialRoom = () => {
  if (typeof window === "undefined") {
    return DEFAULT_ROOM
  }
  const url = new URL(window.location.href)
  return url.searchParams.get("room") || DEFAULT_ROOM
}

const mapToItem = (map: Y.Map<unknown>): ListItem => ({
  id: (map.get("id") as string) ?? createId(),
  name: (map.get("name") as string) ?? "",
  qty: Number(map.get("qty") ?? 1),
  unit: (map.get("unit") as string) ?? "pcs",
  note: (map.get("note") as string) ?? "",
  done: Boolean(map.get("done")),
  updatedBy: (map.get("updatedBy") as string) ?? "",
  assignedTo: (map.get("assignedTo") as string) ?? "",
})

export default function Page() {
  const [user, setUser] = React.useState<UserProfile>({
    id: "",
    name: "Guest",
    colorId: USER_COLORS[0].id,
  })
  const [room, setRoom] = React.useState<string>(DEFAULT_ROOM)
  const [connection, setConnection] = React.useState("connecting")
  const [peers, setPeers] = React.useState<UserPresence[]>([])
  const [items, setItems] = React.useState<ListItem[]>([])
  const [draftName, setDraftName] = React.useState("")
  const [draftQty, setDraftQty] = React.useState("1")
  const [draftUnit, setDraftUnit] = React.useState("pcs")
  const [draftNote, setDraftNote] = React.useState("")
  const [draftAssignedTo, setDraftAssignedTo] = React.useState("")

  const itemsRef = React.useRef<Y.Array<Y.Map<unknown>> | null>(null)
  const awarenessRef = React.useRef<WebrtcProvider["awareness"] | null>(null)
  const userRef = React.useRef(user)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    setUser(readStoredUser())
    setRoom(getInitialRoom())
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!user.id) return
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  }, [user])

  React.useEffect(() => {
    if (!draftAssignedTo) {
      setDraftAssignedTo(user.id)
    }
  }, [draftAssignedTo, user.id])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    url.searchParams.set("room", room)
    window.history.replaceState(null, "", url.toString())
  }, [room])

  React.useEffect(() => {
    userRef.current = user
    awarenessRef.current?.setLocalStateField("user", user)
  }, [user])

  React.useEffect(() => {
    const doc = new Y.Doc()
    const provider = new WebrtcProvider(room, doc, {
      signaling: SIGNALING_SERVERS,
    })
    const awareness = provider.awareness
    const yItems = doc.getArray<Y.Map<unknown>>("items")

    itemsRef.current = yItems
    awarenessRef.current = awareness

    const updateItems = () => {
      setItems(yItems.toArray().map(mapToItem))
    }

    const updatePresence = () => {
      const nextPeers: UserPresence[] = []
      awareness.getStates().forEach((state) => {
        const presence = state?.user as UserPresence | undefined
        if (presence?.id) {
          nextPeers.push(presence)
        }
      })
      setPeers(nextPeers)
    }

    yItems.observeDeep(updateItems)
    updateItems()

    awareness.setLocalStateField("user", userRef.current)
    awareness.on("change", updatePresence)
    updatePresence()

    provider.on("status", ({ connected }: { connected: boolean }) => {
      setConnection(connected ? "connected" : "disconnected")
    })

    return () => {
      awareness.off("change", updatePresence)
      yItems.unobserveDeep(updateItems)
      provider.destroy()
      doc.destroy()
      itemsRef.current = null
      awarenessRef.current = null
    }
  }, [room])

  const allUsers = React.useMemo(() => {
    const map = new Map<string, UserPresence>()
    peers.forEach((peer) => map.set(peer.id, peer))
    map.set(user.id, user)
    return Array.from(map.values())
  }, [peers, user])

  const updateItem = React.useCallback(
    (id: string, changes: Partial<ListItem>) => {
      const yItems = itemsRef.current
      if (!yItems) return
      const index = yItems.toArray().findIndex((map) => map.get("id") === id)
      if (index === -1) return
      const map = yItems.get(index)
      Object.entries(changes).forEach(([key, value]) => {
        map.set(key, value)
      })
      map.set("updatedBy", user.id)
    },
    [user.id]
  )

  const removeItem = React.useCallback((id: string) => {
    const yItems = itemsRef.current
    if (!yItems) return
    const index = yItems.toArray().findIndex((map) => map.get("id") === id)
    if (index === -1) return
    yItems.delete(index, 1)
  }, [])

  const addItem = React.useCallback(() => {
    const yItems = itemsRef.current
    if (!yItems) return
    if (!draftName.trim()) return

    const map = new Y.Map<unknown>()
    map.set("id", createId())
    map.set("name", draftName.trim())
    map.set("qty", Number(draftQty) || 1)
    map.set("unit", draftUnit.trim() || "pcs")
    map.set("note", draftNote.trim())
    map.set("done", false)
    map.set("updatedBy", user.id)
    map.set("createdBy", user.id)
    map.set("assignedTo", draftAssignedTo || user.id)

    yItems.push([map])

    setDraftName("")
    setDraftQty("1")
    setDraftUnit("pcs")
    setDraftNote("")
    setDraftAssignedTo("")
  }, [draftName, draftNote, draftQty, draftUnit, user.id])

  const clearCompleted = React.useCallback(() => {
    const yItems = itemsRef.current
    if (!yItems) return
    const toDelete: number[] = []
    yItems.toArray().forEach((map, index) => {
      if (map.get("done")) {
        toDelete.push(index)
      }
    })
    toDelete
      .sort((a, b) => b - a)
      .forEach((index) => yItems.delete(index, 1))
  }, [])

  const completedCount = items.filter((item) => item.done).length
  const connectionLabel =
    connection === "connected"
      ? "Live"
      : connection === "connecting"
      ? "Connecting"
      : "Offline"

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-12 md:px-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/70 shadow-sm">
              Schlopping Collective
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              A live, shared shopping list for every gathering.
            </h1>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              Plan menus, split supplies, and keep everyone in sync — instantly,
              peer-to-peer, no database required.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="secondary"
              className="gap-2 border border-foreground/10 bg-white/70 px-3 py-1 text-xs"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  connection === "connected"
                    ? "bg-emerald-500"
                    : connection === "connecting"
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
              />
              {connectionLabel}
            </Badge>
            <Badge variant="secondary" className="bg-white/70">
              {items.length} items · {completedCount} done
            </Badge>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
          <div className="flex flex-col gap-6">
            <Card className="border-foreground/10 bg-white/80 shadow-xl shadow-fuchsia-500/10">
              <CardHeader>
                <CardTitle>Room</CardTitle>
                <CardDescription>
                  Share this room name with friends. Everyone joining the same
                  room syncs instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-foreground/70">
                    Room name
                  </label>
                  <Input
                    value={room}
                    onChange={(event) => setRoom(event.target.value)}
                    placeholder="camping-weekend"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    if (typeof window === "undefined") return
                    const url = new URL(window.location.href)
                    url.searchParams.set("room", room)
                    navigator.clipboard.writeText(url.toString())
                  }}
                >
                  Copy invite link
                </Button>
              </CardContent>
              <CardFooter className="flex flex-wrap items-center gap-2">
                {allUsers.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    Waiting for peers...
                  </span>
                ) : (
                  allUsers.map((peer) => {
                    const color = getColor(peer.colorId)
                    return (
                      <span
                        key={peer.id}
                        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${color.chip}`}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${color.dot}`}
                        />
                        {peer.name}
                      </span>
                    )
                  })
                )}
              </CardFooter>
            </Card>

            <Card className="border-foreground/10 bg-white/80">
              <CardHeader>
                <CardTitle>Your identity</CardTitle>
                <CardDescription>
                  Every change is stamped with your color.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-foreground/70">
                    Display name
                  </label>
                  <Input
                    value={user.name}
                    onChange={(event) =>
                      setUser((prev) => ({
                        ...prev,
                        name: event.target.value || "Guest",
                      }))
                    }
                    placeholder="Lena"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-foreground/70">
                    Color tag
                  </label>
                  <Select
                    value={user.colorId}
                    onValueChange={(value) =>
                      setUser((prev) => ({ ...prev, colorId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a color" />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_COLORS.map((color) => (
                        <SelectItem key={color.id} value={color.id}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-foreground/10 bg-white/80">
              <CardHeader>
                <CardTitle>Add item</CardTitle>
                <CardDescription>
                  Add supplies, assign quantities, and keep notes together.
                </CardDescription>
              </CardHeader>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  addItem()
                }}
              >
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-foreground/70">
                      Item
                    </label>
                    <Input
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      placeholder="Charcoal, oat milk, trail mix"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase text-foreground/70">
                        Quantity
                      </label>
                      <Input
                        value={draftQty}
                        onChange={(event) => setDraftQty(event.target.value)}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase text-foreground/70">
                        Unit
                      </label>
                      <Input
                        value={draftUnit}
                        onChange={(event) => setDraftUnit(event.target.value)}
                        placeholder="packs"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-foreground/70">
                      Notes
                    </label>
                    <Textarea
                      value={draftNote}
                      onChange={(event) => setDraftNote(event.target.value)}
                      placeholder="Grab vegan + gluten free if possible"
                      className="min-h-[96px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-foreground/70">
                      Responsible
                    </label>
                    <Select
                      value={draftAssignedTo}
                      onValueChange={setDraftAssignedTo}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Assign someone" />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers.map((peer) => (
                          <SelectItem key={peer.id} value={peer.id}>
                            {peer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 md:flex-row">
                  <Button className="w-full" type="submit">
                    Add to list
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    type="button"
                    onClick={() => {
                      setDraftName("")
                      setDraftQty("1")
                      setDraftUnit("pcs")
                      setDraftNote("")
                      setDraftAssignedTo("")
                    }}
                  >
                    Reset
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          <Card className="border-foreground/10 bg-white/80 shadow-xl shadow-fuchsia-500/10">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Shared list</CardTitle>
                <CardDescription>
                  Toggle items as they get packed. Everyone sees updates in
                  real time.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={clearCompleted}
                className="md:w-auto"
              >
                Clear checked
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-foreground/20 bg-white/50 p-8 text-center">
                  <p className="text-lg font-medium">Your list is empty.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add the first item and it will sync instantly.
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  const updatedBy =
                    allUsers.find((peer) => peer.id === item.updatedBy) ?? user
                  const color = getColor(updatedBy.colorId)
                  const assignedTo = allUsers.find(
                    (peer) => peer.id === item.assignedTo
                  )
                  const assignedLabel = assignedTo
                    ? assignedTo.name
                    : item.assignedTo
                    ? "Offline user"
                    : "Unassigned"

                  return (
                    <div
                      key={item.id}
                      className={`group rounded-2xl border border-foreground/10 bg-white/70 p-4 transition hover:border-foreground/20 hover:bg-white`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex flex-1 gap-4">
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.id, { done: !item.done })
                            }
                            className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border transition ${
                              item.done
                                ? "border-emerald-400 bg-emerald-400/20 text-emerald-600"
                                : "border-foreground/20 text-foreground/50"
                            }`}
                            aria-label={
                              item.done
                                ? "Mark as not packed"
                                : "Mark as packed"
                            }
                          >
                            {item.done ? "✓" : ""}
                          </button>
                          <div className="flex-1 space-y-3">
                            <Input
                              value={item.name}
                              onChange={(event) =>
                                updateItem(item.id, {
                                  name: event.target.value,
                                })
                              }
                              className={`text-base font-semibold ${
                                item.done
                                  ? "line-through text-muted-foreground"
                                  : ""
                              }`}
                            />
                            <div className="grid gap-3 md:grid-cols-[140px_1fr]">
                              <Input
                                value={String(item.qty)}
                                onChange={(event) =>
                                  updateItem(item.id, {
                                    qty: Number(event.target.value) || 0,
                                  })
                                }
                                inputMode="numeric"
                                className="h-9"
                              />
                              <Input
                                value={item.unit}
                                onChange={(event) =>
                                  updateItem(item.id, {
                                    unit: event.target.value,
                                  })
                                }
                                className="h-9"
                              />
                            </div>
                            <Textarea
                              value={item.note}
                              onChange={(event) =>
                                updateItem(item.id, {
                                  note: event.target.value,
                                })
                              }
                              placeholder="Notes or brand preference"
                              className="min-h-[72px]"
                            />
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase text-foreground/70">
                                Responsible
                              </label>
                              <Select
                                value={item.assignedTo || ""}
                                onValueChange={(value) =>
                                  updateItem(item.id, { assignedTo: value })
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Assign someone" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">Unassigned</SelectItem>
                                  {!assignedTo && item.assignedTo ? (
                                    <SelectItem value={item.assignedTo}>
                                      Offline user
                                    </SelectItem>
                                  ) : null}
                                  {allUsers.map((peer) => (
                                    <SelectItem key={peer.id} value={peer.id}>
                                      {peer.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 md:flex-col md:items-end">
                          <Badge
                            variant="outline"
                            className={`border px-2.5 py-1 text-xs ${color.chip}`}
                          >
                            {updatedBy.name}
                          </Badge>
                          <Badge variant="secondary" className="bg-white/80">
                            {assignedLabel}
                          </Badge>
                          <Button
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => removeItem(item.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
            <Separator className="my-1" />
            <CardFooter className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    connection === "connected"
                      ? "bg-emerald-500"
                      : connection === "connecting"
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                />
                Live sync powered by WebRTC · {allUsers.length} active
              </div>
              <div className="text-xs">
                Items update for anyone in “{room}” within a few seconds.
              </div>
            </CardFooter>
          </Card>
        </section>
      </div>
    </div>
  )
}
