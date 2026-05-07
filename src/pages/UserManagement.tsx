import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Users, Trash2, ShieldCheck, User, CheckCircle, XCircle, Clock, Crown, Ban,
  AlertTriangle, Briefcase, Phone, MapPin, Building, FolderKanban, Pencil, Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DESIGNATIONS = [
  "CEO", "CTO", "COO", "Director",
  "IT Manager", "Project Manager", "Operations Manager",
  "Team Lead", "Senior Engineer", "Engineer",
  "Network Administrator", "System Administrator", "Database Administrator",
  "Software Developer", "Web Developer", "Mobile Developer",
  "IT Support Specialist", "Help Desk Technician", "Technical Support",
  "CCTV Technician", "Security Systems Engineer",
  "Supervisor", "Support Staff", "Intern",
] as const;

interface UserWithRole {
  id: string;
  user_id: string;
  role: "admin" | "employee" | "ceo" | "manager";
  designation: string | null;
  is_approved: boolean;
  created_at: string;
  email?: string;
  employee?: {
    id: string;
    name: string;
    phone: string | null;
    work_location: string | null;
    client_id: string | null;
    project_id: string | null;
    status: string;
    photo_url: string | null;
  } | null;
}

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [editEmployee, setEditEmployee] = useState<{
    phone: string; work_location: string; client_id: string; project_id: string;
  }>({ phone: "", work_location: "", client_id: "", project_id: "" });

  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ["user-roles-management"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = (roles || []).map((r: any) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.email]));

      // Fetch employee records by email
      const emails = (profiles || []).map((p: any) => p.email).filter(Boolean);
      const { data: employees } = await supabase
        .from("employees").select("id, name, email, phone, work_location, client_id, project_id, status, photo_url")
        .in("email", emails);
      const employeeMap = new Map((employees || []).map((e: any) => [e.email, e]));

      return (roles || []).map((r: any) => {
        const email = profileMap.get(r.user_id) || "Unknown";
        return {
          ...r,
          email,
          employee: employeeMap.get(email) || null,
        };
      }) as UserWithRole[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data || [],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => (await supabase.from("projects").select("id, title").order("title")).data || [],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "admin" | "employee" | "ceo" | "manager" }) => {
      const { error } = await supabase.from("user_roles").update({ role } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles-management"] });
      toast({ title: "Role updated successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateDesignationMutation = useMutation({
    mutationFn: async ({ id, designation, userId }: { id: string; designation: string; userId: string }) => {
      const { error } = await supabase.from("user_roles").update({ designation } as any).eq("id", id);
      if (error) throw error;
      const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();
      if (profile?.email) {
        await supabase.from("employees").update({ designation }).eq("email", profile.email);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles-management"] });
      toast({ title: "Designation updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, userId, approve }: { id: string; userId: string; approve: boolean }) => {
      const { error } = await supabase.from("user_roles").update({ is_approved: approve }).eq("id", id);
      if (error) throw error;
      const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();
      if (profile?.email) {
        await supabase.from("employees").update({ status: approve ? "active" : "inactive" }).eq("email", profile.email);
      }
    },
    onSuccess: (_, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ["user-roles-management"] });
      toast({ title: approve ? "User approved & reactivated!" : "User approval revoked" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error: roleError } = await supabase.from("user_roles").update({ is_approved: false }).eq("user_id", userId);
      if (roleError) throw roleError;
      const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();
      if (profile?.email) {
        await supabase.from("employees").update({ status: "inactive" }).eq("email", profile.email);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles-management"] });
      toast({ title: "User deactivated", description: "User moved to pending list." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-user", { body: { user_id: userId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles-management"] });
      toast({ title: "User permanently deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ employeeId, data }: { employeeId: string; data: any }) => {
      const { error } = await supabase.from("employees").update(data).eq("id", employeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles-management"] });
      setSelectedUser(null);
      toast({ title: "Employee details updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const ceoCount = userRoles.filter(u => u.role === "ceo").length;
  const adminCount = userRoles.filter(u => u.role === "admin").length;
  const managerCount = userRoles.filter(u => u.role === "manager").length;
  const employeeCount = userRoles.filter(u => u.role === "employee").length;
  const pendingCount = userRoles.filter(u => !u.is_approved && u.role !== "ceo").length;
  const activeCount = userRoles.filter(u => u.is_approved || u.role === "ceo").length;

  const openEmployeeEdit = (ur: UserWithRole) => {
    setSelectedUser(ur);
    setEditEmployee({
      phone: ur.employee?.phone || "",
      work_location: ur.employee?.work_location || "",
      client_id: ur.employee?.client_id || "",
      project_id: ur.employee?.project_id || "",
    });
  };

  const renderUserRow = (ur: UserWithRole) => (
    <TableRow key={ur.id} className={!ur.is_approved ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""}>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {(ur.email || "?")[0].toUpperCase()}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${ur.is_approved ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
          </div>
          <div>
            <span className="text-sm font-medium">{ur.email}</span>
            <div className="flex items-center gap-2 mt-0.5">
              {ur.employee?.phone && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Phone className="h-2.5 w-2.5" />{ur.employee.phone}
                </span>
              )}
              {ur.employee?.work_location && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" />{ur.employee.work_location}
                </span>
              )}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Select value={ur.role} onValueChange={(v) => updateRoleMutation.mutate({ id: ur.id, role: v as any })}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ceo"><div className="flex items-center gap-2"><Crown className="h-3.5 w-3.5 text-amber-600" />CEO</div></SelectItem>
            <SelectItem value="admin"><div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-destructive" />Admin</div></SelectItem>
            <SelectItem value="manager"><div className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-blue-600" />Manager</div></SelectItem>
            <SelectItem value="employee"><div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-primary" />Employee</div></SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={ur.designation || "Employee"} onValueChange={(v) => updateDesignationMutation.mutate({ id: ur.id, designation: v, userId: ur.user_id })}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DESIGNATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {ur.role === "ceo" ? (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Crown className="h-3 w-3 mr-1" />Full Access</Badge>
        ) : ur.is_approved ? (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
        ) : (
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {/* Employee edit */}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEmployeeEdit(ur)} title="Edit employee details">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!ur.is_approved ? (
            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 h-7 text-xs px-2"
              onClick={() => approveMutation.mutate({ id: ur.id, userId: ur.user_id, approve: true })}>
              <CheckCircle className="h-3 w-3 mr-1" />Approve
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 h-7 text-xs px-2"
              onClick={() => approveMutation.mutate({ id: ur.id, userId: ur.user_id, approve: false })}>
              <XCircle className="h-3 w-3 mr-1" />Revoke
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-yellow-600 hover:bg-yellow-50 h-7 text-xs px-2"
            onClick={() => { if (confirm("Deactivate this user?")) deactivateUserMutation.mutate(ur.user_id); }}>
            <Ban className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 text-xs px-2">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />Permanently Delete User?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove <strong>{ur.email}</strong>'s account, role, and employee record. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => permanentDeleteMutation.mutate(ur.user_id)}>Delete Permanently</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User & Employee Management</h1>
          <p className="text-muted-foreground text-sm">Manage roles, approvals, assignments, and employee details — all in one place</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: "Total", count: userRoles.length, icon: Users, color: "bg-primary/10 text-primary" },
            { label: "CEO", count: ceoCount, icon: Crown, color: "bg-amber-500/10 text-amber-600" },
            { label: "Admins", count: adminCount, icon: ShieldCheck, color: "bg-destructive/10 text-destructive" },
            { label: "Managers", count: managerCount, icon: Briefcase, color: "bg-blue-500/10 text-blue-600" },
            { label: "Employees", count: employeeCount, icon: User, color: "bg-accent text-accent-foreground" },
            { label: "Pending", count: pendingCount, icon: Clock, color: "bg-yellow-500/10 text-yellow-600" },
          ].map(s => (
            <Card key={s.label} className="glass-card">
              <CardContent className="pt-4 pb-3 px-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${s.color}`}><s.icon className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xl font-bold">{s.count}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs: All / Active / Pending */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Users ({userRoles.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          </TabsList>

          {["all", "active", "pending"].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Card className="glass-card">
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User / Employee</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userRoles
                            .filter(ur =>
                              tab === "all" ? true :
                              tab === "active" ? (ur.is_approved || ur.role === "ceo") :
                              (!ur.is_approved && ur.role !== "ceo")
                            )
                            .map(renderUserRow)}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Employee Edit Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Employee Details — {selectedUser?.email}
              </DialogTitle>
            </DialogHeader>
            {selectedUser?.employee ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Phone</Label>
                  <Input value={editEmployee.phone} onChange={e => setEditEmployee({ ...editEmployee, phone: e.target.value })} placeholder="Phone number" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Work Location</Label>
                  <Input value={editEmployee.work_location} onChange={e => setEditEmployee({ ...editEmployee, work_location: e.target.value })} placeholder="Office, field, remote..." />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Building className="h-3.5 w-3.5" />Assigned Client</Label>
                  <Select value={editEmployee.client_id} onValueChange={v => setEditEmployee({ ...editEmployee, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="No client assigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><FolderKanban className="h-3.5 w-3.5" />Assigned Project</Label>
                  <Select value={editEmployee.project_id} onValueChange={v => setEditEmployee({ ...editEmployee, project_id: v })}>
                    <SelectTrigger><SelectValue placeholder="No project assigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
                  <Button onClick={() => {
                    if (!selectedUser?.employee) return;
                    updateEmployeeMutation.mutate({
                      employeeId: selectedUser.employee.id,
                      data: {
                        phone: editEmployee.phone || null,
                        work_location: editEmployee.work_location || null,
                        client_id: editEmployee.client_id && editEmployee.client_id !== "none" ? editEmployee.client_id : null,
                        project_id: editEmployee.project_id && editEmployee.project_id !== "none" ? editEmployee.project_id : null,
                      },
                    });
                  }} disabled={updateEmployeeMutation.isPending}>
                    {updateEmployeeMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No employee record linked to this user yet. The record is created automatically when they register.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
);
}
