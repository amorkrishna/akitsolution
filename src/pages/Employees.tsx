import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Search, Users, MapPin, Briefcase, Crown, ShieldCheck, User, Clock, CheckCircle, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
  designation: string | null;
  client_id: string | null;
  project_id: string | null;
  work_location: string | null;
  status: string;
  created_at: string;
  clients?: { name: string } | null;
  projects?: { title: string } | null;
  // Linked user account info
  userRole?: string | null;
  isApproved?: boolean | null;
  hasAccount?: boolean;
}

const defaultForm = {
  name: "",
  phone: "",
  email: "",
  role: "Technician",
  designation: "",
  client_id: "",
  project_id: "",
  work_location: "",
  status: "active",
};

const ROLE_ICON: Record<string, React.ReactNode> = {
  ceo: <Crown className="h-3 w-3 text-amber-600" />,
  admin: <ShieldCheck className="h-3 w-3 text-destructive" />,
  manager: <Briefcase className="h-3 w-3 text-blue-600" />,
  employee: <User className="h-3 w-3 text-primary" />,
};

export default function Employees() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Fetch employees + linked user role data
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*, clients(name), projects(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get all profiles to match emails to user_ids
      const emails = (data || []).map((e: any) => e.email).filter(Boolean);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("email", emails);

      const emailToUserId = new Map((profiles || []).map((p: any) => [p.email, p.id]));

      // Get user_roles for matched users
      const userIds = Array.from(emailToUserId.values());
      const { data: roles } = userIds.length > 0
        ? await supabase.from("user_roles").select("user_id, role, is_approved").in("user_id", userIds)
        : { data: [] };

      const userIdToRole = new Map((roles || []).map((r: any) => [r.user_id, r]));

      return (data || []).map((emp: any) => {
        const userId = emailToUserId.get(emp.email);
        const roleData = userId ? userIdToRole.get(userId) : null;
        return {
          ...emp,
          userRole: roleData?.role || null,
          isApproved: roleData?.is_approved ?? null,
          hasAccount: !!roleData,
        };
      }) as Employee[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, title").order("title");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        role: values.role,
        designation: values.designation || null,
        client_id: values.client_id || null,
        project_id: values.project_id || null,
        work_location: values.work_location || null,
        status: values.status,
      };
      if (editingId) {
        const { error } = await supabase.from("employees").update(payload).eq("id", editingId);
        if (error) throw error;

        // Sync designation to user_roles if this employee has a linked account
        if (values.email && values.designation) {
          const { data: profile } = await supabase.from("profiles").select("id").eq("email", values.email).single();
          if (profile) {
            await supabase.from("user_roles").update({ designation: values.designation } as any).eq("user_id", profile.id);
          }
        }
      } else {
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles-management"] });
      toast({ title: editingId ? "Employee updated" : "Employee added" });
      closeDialog();
    },
    onError: () => toast({ title: "Error saving employee", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Employee deleted" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      phone: emp.phone || "",
      email: emp.email || "",
      role: emp.role,
      designation: emp.designation || "",
      client_id: emp.client_id || "",
      project_id: emp.project_id || "",
      work_location: emp.work_location || "",
      status: emp.status,
    });
    setDialogOpen(true);
  };

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      (e.work_location || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.userRole || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = employees.filter((e) => e.status === "active").length;
  const linkedCount = employees.filter((e) => e.hasAccount).length;

  const statusColor: Record<string, string> = {
    active: "bg-success/10 text-success",
    inactive: "bg-muted text-muted-foreground",
    on_leave: "bg-warning/10 text-warning",
  };

  return (
      <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
            <p className="text-muted-foreground text-sm">Manage your workforce and assignments — automatically linked with User Management</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href="/users"><Users className="h-4 w-4 mr-1" /> User Management</a>
            </Button>
            <Button size="sm" onClick={() => { setForm(defaultForm); setEditingId(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Employee
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div><p className="text-2xl font-bold">{employees.length}</p><p className="text-xs text-muted-foreground">Total</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-success" />
            <div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Active</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Link2 className="h-8 w-8 text-primary" />
            <div><p className="text-2xl font-bold">{linkedCount}</p><p className="text-xs text-muted-foreground">Linked Accounts</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-info" />
            <div><p className="text-2xl font-bold">{new Set(employees.map((e) => e.work_location).filter(Boolean)).size}</p><p className="text-xs text-muted-foreground">Locations</p></div>
          </CardContent></Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employees..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Table / Cards */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No employees found</div>
        ) : isMobile ? (
          <div className="space-y-3">
            {filtered.map((emp) => (
              <Card key={emp.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold">{emp.name}</p>
                        {emp.hasAccount && (
                          <span title="Has linked user account">
                            {ROLE_ICON[emp.userRole || "employee"]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {emp.role}{emp.designation ? ` · ${emp.designation}` : ""}
                        {emp.hasAccount && (
                          <span className="ml-1">
                            · {emp.userRole?.toUpperCase()}
                            {emp.isApproved === false && " (Pending)"}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge className={cn("text-xs", statusColor[emp.status] || statusColor.inactive)}>{emp.status}</Badge>
                  </div>
                  {emp.phone && <p className="text-xs text-muted-foreground">📞 {emp.phone}</p>}
                  {emp.work_location && <p className="text-xs text-muted-foreground">📍 {emp.work_location}</p>}
                  {emp.clients?.name && <p className="text-xs text-muted-foreground">Client: {emp.clients.name}</p>}
                  {emp.projects?.title && <p className="text-xs text-muted-foreground">Project: {emp.projects.title}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(emp)}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(emp.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role / Designation</TableHead>
                  <TableHead>System Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{emp.name}</div>
                        {emp.hasAccount && (
                          <Link2 className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span>{emp.role}</span>
                      {emp.designation && <span className="text-muted-foreground text-xs ml-1">({emp.designation})</span>}
                    </TableCell>
                    <TableCell>
                      {emp.hasAccount ? (
                        <div className="flex items-center gap-1.5">
                          {ROLE_ICON[emp.userRole || "employee"]}
                          <span className="text-sm capitalize">{emp.userRole}</span>
                          {emp.isApproved === false ? (
                            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-yellow-50 text-yellow-700 border-yellow-200">
                              <Clock className="h-2.5 w-2.5 mr-0.5" />Pending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-2.5 w-2.5 mr-0.5" />Active
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No account</span>
                      )}
                    </TableCell>
                    <TableCell>{emp.phone || "—"}</TableCell>
                    <TableCell>{emp.work_location || "—"}</TableCell>
                    <TableCell>{emp.clients?.name || "—"}</TableCell>
                    <TableCell>{emp.projects?.title || "—"}</TableCell>
                    <TableCell><Badge className={cn("text-xs", statusColor[emp.status] || statusColor.inactive)}>{emp.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(emp.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technician">Technician</SelectItem>
                    <SelectItem value="Engineer">Engineer</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                    <SelectItem value="Team Lead">Team Lead</SelectItem>
                    <SelectItem value="Support Staff">Support Staff</SelectItem>
                    <SelectItem value="Helper">Helper</SelectItem>
                    <SelectItem value="Driver">Driver</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Designation</Label>
                <Select value={form.designation || "_none"} onValueChange={(v) => setForm({ ...form, designation: v === "_none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    <SelectItem value="Technician">Technician</SelectItem>
                    <SelectItem value="Engineer">Engineer</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                    <SelectItem value="Team Lead">Team Lead</SelectItem>
                    <SelectItem value="Support Staff">Support Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Work Location</Label><Input placeholder="Site address or area" value={form.work_location} onChange={(e) => setForm({ ...form, work_location: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assign to Client</Label>
                <Select value={form.client_id || "_none"} onValueChange={(v) => setForm({ ...form, client_id: v === "_none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign to Project</Label>
                <Select value={form.project_id || "_none"} onValueChange={(v) => setForm({ ...form, project_id: v === "_none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button disabled={!form.name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate(form)}>
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
);
}