import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus, CheckCircle2, Circle, Clock, Flame, StickyNote, Timer, Trash2,
  Pin, Edit2, ChevronLeft, ChevronRight, CalendarDays, Target, Zap, Star,
  AlertTriangle, ArrowUp, ArrowRight, ArrowDown, X, Play, Pause, RotateCcw,
} from "lucide-react";

const PRIORITY_CONFIG = {
  high: { label: "High", color: "text-red-500", icon: ArrowUp, bg: "bg-red-500/10 border-red-500/20" },
  medium: { label: "Medium", color: "text-yellow-500", icon: ArrowRight, bg: "bg-yellow-500/10 border-yellow-500/20" },
  low: { label: "Low", color: "text-blue-500", icon: ArrowDown, bg: "bg-blue-500/10 border-blue-500/20" },
};

const NOTE_COLORS: Record<string, string> = {
  yellow: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700",
  blue: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
  green: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
  pink: "bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700",
  purple: "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
};

const CATEGORIES = ["general", "work", "personal", "health", "learning", "urgent"];

export default function Today() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [activeTab, setActiveTab] = useState("tasks");
  const queryClient = useQueryClient();

  // ─── TASKS ───
  const [taskDialog, setTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium", category: "general", due_time: "" });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["daily-tasks", selectedDate],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("daily_tasks").select("*").eq("user_id", user.id).eq("due_date", selectedDate).order("created_at", { ascending: true });
      return data || [];
    },
  });

  const addTask = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const payload = { ...taskForm, user_id: user.id, due_date: selectedDate, due_time: taskForm.due_time || null };
      if (editingTask) {
        await supabase.from("daily_tasks").update(payload).eq("id", editingTask.id);
      } else {
        await supabase.from("daily_tasks").insert(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-tasks"] });
      setTaskDialog(false);
      setEditingTask(null);
      setTaskForm({ title: "", description: "", priority: "medium", category: "general", due_time: "" });
      toast.success(editingTask ? "Task updated" : "Task added");
    },
  });

  const toggleTask = useMutation({
    mutationFn: async (task: any) => {
      const newStatus = task.status === "completed" ? "pending" : "completed";
      await supabase.from("daily_tasks").update({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      }).eq("id", task.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["daily-tasks"] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => { await supabase.from("daily_tasks").delete().eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["daily-tasks"] }); toast.success("Task deleted"); },
  });

  // ─── NOTES ───
  const [noteDialog, setNoteDialog] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: "Untitled", content: "", color: "yellow" });

  const { data: notes = [] } = useQuery({
    queryKey: ["daily-notes", selectedDate],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("daily_notes").select("*").eq("user_id", user.id).eq("note_date", selectedDate).order("is_pinned", { ascending: false });
      return data || [];
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await supabase.from("daily_notes").insert({ ...noteForm, user_id: user.id, note_date: selectedDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-notes"] });
      setNoteDialog(false);
      setNoteForm({ title: "Untitled", content: "", color: "yellow" });
      toast.success("Note added");
    },
  });

  const togglePin = useMutation({
    mutationFn: async (note: any) => { await supabase.from("daily_notes").update({ is_pinned: !note.is_pinned }).eq("id", note.id); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["daily-notes"] }),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => { await supabase.from("daily_notes").delete().eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["daily-notes"] }); toast.success("Note deleted"); },
  });

  // ─── HABITS ───
  const [habitDialog, setHabitDialog] = useState(false);
  const [habitForm, setHabitForm] = useState({ name: "", icon: "⭐" });
  const HABIT_ICONS = ["⭐", "💪", "📚", "🧘", "🏃", "💧", "🎯", "🧠", "💤", "🍎", "✍️", "🎵"];

  const { data: habits = [] } = useQuery({
    queryKey: ["daily-habits"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("daily_habits").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at");
      return data || [];
    },
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["habit-completions", selectedDate],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("habit_completions").select("*").eq("user_id", user.id).eq("completed_date", selectedDate);
      return data || [];
    },
  });

  const addHabit = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await supabase.from("daily_habits").insert({ ...habitForm, user_id: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-habits"] });
      setHabitDialog(false);
      setHabitForm({ name: "", icon: "⭐" });
      toast.success("Habit created");
    },
  });

  const toggleHabit = useMutation({
    mutationFn: async (habitId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const existing = completions.find((c: any) => c.habit_id === habitId);
      if (existing) {
        await supabase.from("habit_completions").delete().eq("id", existing.id);
      } else {
        await supabase.from("habit_completions").insert({ habit_id: habitId, user_id: user.id, completed_date: selectedDate });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habit-completions"] }),
  });

  const deleteHabit = useMutation({
    mutationFn: async (id: string) => { await supabase.from("daily_habits").update({ is_active: false }).eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["daily-habits"] }); toast.success("Habit removed"); },
  });

  // ─── FOCUS TIMER ───
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusDuration, setFocusDuration] = useState(25);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ["focus-sessions", selectedDate],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("focus_sessions").select("*").eq("user_id", user.id).eq("session_date", selectedDate);
      return data || [];
    },
  });

  useEffect(() => {
    if (!focusRunning) return;
    const interval = setInterval(() => {
      setFocusSeconds(s => {
        if (s === 0) {
          setFocusMinutes(m => {
            if (m === 0) {
              clearInterval(interval);
              setFocusRunning(false);
              handleFocusComplete();
              return 0;
            }
            return m - 1;
          });
          return 59;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [focusRunning]);

  const handleFocusComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("focus_sessions").insert({
      user_id: user.id, task_id: focusTaskId, duration_minutes: focusDuration, session_date: selectedDate, completed: true,
    });
    queryClient.invalidateQueries({ queryKey: ["focus-sessions"] });
    toast.success(`🎉 ${focusDuration} min focus session complete!`);
    resetTimer();
  };

  const resetTimer = () => {
    setFocusRunning(false);
    setFocusMinutes(focusDuration);
    setFocusSeconds(0);
  };

  const startTimer = (mins: number) => {
    setFocusDuration(mins);
    setFocusMinutes(mins);
    setFocusSeconds(0);
    setFocusRunning(true);
  };

  // ─── DATE NAVIGATION ───
  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(format(d, "yyyy-MM-dd"));
  };

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  const completedTasks = tasks.filter((t: any) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const completedHabits = habits.filter((h: any) => completions.some((c: any) => c.habit_id === h.id)).length;
  const totalFocusMinutes = sessions.filter((s: any) => s.completed).reduce((sum: number, s: any) => sum + s.duration_minutes, 0);

  return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <CalendarDays className="h-7 w-7 text-primary" />
              Today
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isToday ? "আজকের" : format(new Date(selectedDate), "dd MMM yyyy")} প্ল্যান ও প্রগ্রেস
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant={isToday ? "default" : "outline"} size="sm" onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))} className="text-xs">
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Target className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-lg font-bold">{completedTasks}/{totalTasks}</p>
                <p className="text-[10px] text-muted-foreground">Tasks Done</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-500/20 bg-orange-500/5">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10"><Flame className="h-5 w-5 text-orange-500" /></div>
              <div>
                <p className="text-lg font-bold">{completedHabits}/{habits.length}</p>
                <p className="text-[10px] text-muted-foreground">Habits</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><Timer className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-lg font-bold">{totalFocusMinutes}m</p>
                <p className="text-[10px] text-muted-foreground">Focused</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10"><StickyNote className="h-5 w-5 text-purple-500" /></div>
              <div>
                <p className="text-lg font-bold">{notes.length}</p>
                <p className="text-[10px] text-muted-foreground">Notes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="tasks" className="text-xs gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Tasks</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs gap-1"><StickyNote className="h-3.5 w-3.5" /> Notes</TabsTrigger>
            <TabsTrigger value="habits" className="text-xs gap-1"><Flame className="h-3.5 w-3.5" /> Habits</TabsTrigger>
            <TabsTrigger value="focus" className="text-xs gap-1"><Timer className="h-3.5 w-3.5" /> Focus</TabsTrigger>
          </TabsList>

          {/* ── TASKS TAB ── */}
          <TabsContent value="tasks" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Daily Tasks</h3>
              <Dialog open={taskDialog} onOpenChange={(o) => { setTaskDialog(o); if (!o) { setEditingTask(null); setTaskForm({ title: "", description: "", priority: "medium", category: "general", due_time: "" }); } }}>
                <DialogTrigger asChild><Button size="sm" className="text-xs gap-1"><Plus className="h-3.5 w-3.5" /> Add Task</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Task title..." value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
                    <Textarea placeholder="Description (optional)" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                        <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">🔴 High</SelectItem>
                          <SelectItem value="medium">🟡 Medium</SelectItem>
                          <SelectItem value="low">🔵 Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={taskForm.category} onValueChange={v => setTaskForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input type="time" value={taskForm.due_time} onChange={e => setTaskForm(f => ({ ...f, due_time: e.target.value }))} />
                    <Button className="w-full" onClick={() => addTask.mutate()} disabled={!taskForm.title.trim()}>
                      {editingTask ? "Update" : "Add"} Task
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {tasks.length === 0 && !tasksLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No tasks for this day</p>
              </div>
            )}

            <div className="space-y-2">
              {tasks.map((task: any) => {
                const pri = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
                const PriIcon = pri.icon;
                return (
                  <Card key={task.id} className={`transition-all ${task.status === "completed" ? "opacity-60" : ""} ${pri.bg} border`}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <button onClick={() => toggleTask.mutate(task)} className="mt-0.5 flex-shrink-0">
                        {task.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.status === "completed" ? "line-through" : ""}`}>{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0"><PriIcon className={`h-2.5 w-2.5 mr-0.5 ${pri.color}`} />{pri.label}</Badge>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{task.category}</Badge>
                          {task.due_time && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{task.due_time.slice(0, 5)}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setEditingTask(task);
                          setTaskForm({ title: task.title, description: task.description || "", priority: task.priority, category: task.category || "general", due_time: task.due_time || "" });
                          setTaskDialog(true);
                        }}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTask.mutate(task.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── NOTES TAB ── */}
          <TabsContent value="notes" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Quick Notes</h3>
              <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
                <DialogTrigger asChild><Button size="sm" className="text-xs gap-1"><Plus className="h-3.5 w-3.5" /> Add Note</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Note</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Title" value={noteForm.title} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))} />
                    <Textarea placeholder="Write your note..." value={noteForm.content} onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))} rows={4} />
                    <div className="flex gap-2">
                      {Object.keys(NOTE_COLORS).map(c => (
                        <button key={c} onClick={() => setNoteForm(f => ({ ...f, color: c }))} className={`w-8 h-8 rounded-full border-2 ${NOTE_COLORS[c]} ${noteForm.color === c ? "ring-2 ring-primary ring-offset-2" : ""}`} />
                      ))}
                    </div>
                    <Button className="w-full" onClick={() => addNote.mutate()} disabled={!noteForm.content.trim()}>Save Note</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {notes.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No notes yet</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {notes.map((note: any) => (
                <Card key={note.id} className={`${NOTE_COLORS[note.color] || NOTE_COLORS.yellow} border relative group`}>
                  <CardContent className="p-4">
                    {note.is_pinned && <Pin className="h-3.5 w-3.5 text-primary absolute top-2 right-2" />}
                    <h4 className="font-semibold text-sm mb-1">{note.title}</h4>
                    <p className="text-xs whitespace-pre-wrap line-clamp-6">{note.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => togglePin.mutate(note)}><Pin className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteNote.mutate(note.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── HABITS TAB ── */}
          <TabsContent value="habits" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Daily Habits</h3>
              <Dialog open={habitDialog} onOpenChange={setHabitDialog}>
                <DialogTrigger asChild><Button size="sm" className="text-xs gap-1"><Plus className="h-3.5 w-3.5" /> Add Habit</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Habit</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Habit name..." value={habitForm.name} onChange={e => setHabitForm(f => ({ ...f, name: e.target.value }))} />
                    <div>
                      <p className="text-xs font-medium mb-2">Choose Icon</p>
                      <div className="flex flex-wrap gap-2">
                        {HABIT_ICONS.map(icon => (
                          <button key={icon} onClick={() => setHabitForm(f => ({ ...f, icon }))} className={`text-xl p-2 rounded-lg border transition-all ${habitForm.icon === icon ? "border-primary bg-primary/10 scale-110" : "border-border hover:bg-accent"}`}>
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => addHabit.mutate()} disabled={!habitForm.name.trim()}>Create Habit</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {habits.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Flame className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No habits yet. Start tracking!</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {habits.map((habit: any) => {
                const isCompleted = completions.some((c: any) => c.habit_id === habit.id);
                return (
                  <Card key={habit.id} className={`border transition-all cursor-pointer ${isCompleted ? "bg-green-500/10 border-green-500/30" : "hover:border-primary/30"}`} onClick={() => toggleHabit.mutate(habit.id)}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <span className="text-2xl">{habit.icon}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isCompleted ? "line-through text-green-600" : ""}`}>{habit.name}</p>
                        <p className="text-[10px] text-muted-foreground">Streak: {habit.streak} days</p>
                      </div>
                      {isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground/30" />}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); deleteHabit.mutate(habit.id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── FOCUS TAB ── */}
          <TabsContent value="focus" className="space-y-4 mt-4">
            <Card className="border-primary/20">
              <CardContent className="p-6 text-center space-y-4">
                <h3 className="text-sm font-semibold flex items-center justify-center gap-2"><Zap className="h-4 w-4 text-primary" /> Focus Timer</h3>
                <div className="text-6xl font-mono font-bold tracking-widest text-primary">
                  {String(focusMinutes).padStart(2, "0")}:{String(focusSeconds).padStart(2, "0")}
                </div>

                {!focusRunning && focusMinutes === focusDuration && focusSeconds === 0 && (
                  <div className="flex items-center justify-center gap-2">
                    {[15, 25, 45, 60].map(m => (
                      <Button key={m} variant={focusDuration === m ? "default" : "outline"} size="sm" className="text-xs" onClick={() => { setFocusDuration(m); setFocusMinutes(m); }}>
                        {m}m
                      </Button>
                    ))}
                  </div>
                )}

                {/* Task selector */}
                {!focusRunning && (
                  <Select value={focusTaskId || ""} onValueChange={v => setFocusTaskId(v || null)}>
                    <SelectTrigger className="max-w-xs mx-auto"><SelectValue placeholder="Link to a task (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No task</SelectItem>
                      {tasks.filter((t: any) => t.status !== "completed").map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="flex items-center justify-center gap-3">
                  <Button size="lg" onClick={() => focusRunning ? setFocusRunning(false) : startTimer(focusDuration)} className="gap-2">
                    {focusRunning ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Start</>}
                  </Button>
                  <Button size="lg" variant="outline" onClick={resetTimer}><RotateCcw className="h-4 w-4" /></Button>
                </div>

                {/* Today's sessions */}
                {sessions.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Today's Sessions</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {sessions.filter((s: any) => s.completed).map((s: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs gap-1"><Timer className="h-3 w-3" />{s.duration_minutes}m</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
);
}
