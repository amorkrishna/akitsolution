import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Clock, UserCheck, UserX, Users, Plus, DollarSign, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  present: "bg-success/10 text-success",
  absent: "bg-destructive/10 text-destructive",
  late: "bg-warning/10 text-warning",
  half_day: "bg-info/10 text-info",
};

export default function Attendance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceDialog, setAttendanceDialog] = useState(false);
  const [salaryDialog, setSalaryDialog] = useState(false);
  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1);
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());
  const [salaryForm, setSalaryForm] = useState({ employee_id: "", base_salary: 0, bonus: 0, deduction: 0, notes: "" });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name, designation, status").eq("status", "active").order("name");
      return data || [];
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", selectedDate],
    queryFn: async () => {
      const { data } = await (supabase.from("employee_attendance" as any) as any).select("*, employees(name, designation)").eq("attendance_date", selectedDate).order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: salaries = [] } = useQuery({
    queryKey: ["salaries", salaryMonth, salaryYear],
    queryFn: async () => {
      const { data } = await (supabase.from("employee_salaries" as any) as any).select("*, employees(name, designation)").eq("salary_month", salaryMonth).eq("salary_year", salaryYear).order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const markAttendance = useMutation({
    mutationFn: async ({ employeeId, status, checkIn }: { employeeId: string; status: string; checkIn?: string }) => {
      const payload: any = {
        employee_id: employeeId,
        attendance_date: selectedDate,
        status,
        check_in: checkIn || new Date().toTimeString().slice(0, 5),
      };
      const { error } = await (supabase.from("employee_attendance" as any) as any).upsert(payload, { onConflict: "employee_id,attendance_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast({ title: "হাজিরা আপডেট হয়েছে" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markCheckOut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("employee_attendance" as any) as any).update({ check_out: new Date().toTimeString().slice(0, 5) }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast({ title: "চেক-আউট রেকর্ড হয়েছে" });
    },
  });

  const saveSalary = useMutation({
    mutationFn: async () => {
      const net = salaryForm.base_salary + salaryForm.bonus - salaryForm.deduction;
      const payload: any = {
        employee_id: salaryForm.employee_id,
        base_salary: salaryForm.base_salary,
        bonus: salaryForm.bonus,
        deduction: salaryForm.deduction,
        net_salary: net,
        salary_month: salaryMonth,
        salary_year: salaryYear,
        notes: salaryForm.notes || null,
      };
      const { error } = await (supabase.from("employee_salaries" as any) as any).upsert(payload, { onConflict: "employee_id,salary_month,salary_year" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      toast({ title: "স্যালারি সেভ হয়েছে" });
      setSalaryDialog(false);
      setSalaryForm({ employee_id: "", base_salary: 0, bonus: 0, deduction: 0, notes: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markSalaryPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("employee_salaries" as any) as any).update({ payment_status: "paid", paid_date: new Date().toISOString().split("T")[0] }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      toast({ title: "পেমেন্ট কমপ্লিট ✅" });
    },
  });

  const attendedIds = new Set(attendance.map((a: any) => a.employee_id));
  const unmarked = employees.filter(e => !attendedIds.has(e.id));
  const presentCount = attendance.filter((a: any) => a.status === "present" || a.status === "late").length;
  const absentCount = attendance.filter((a: any) => a.status === "absent").length;
  const totalSalary = salaries.reduce((s: number, sal: any) => s + Number(sal.net_salary || 0), 0);
  const paidSalary = salaries.filter((s: any) => s.payment_status === "paid").reduce((s: number, sal: any) => s + Number(sal.net_salary || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">হাজিরা ও স্যালারি</h1>
          <p className="text-muted-foreground text-sm">কর্মচারীদের দৈনিক হাজিরা এবং মাসিক বেতন ম্যানেজ</p>
        </div>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance" className="gap-1.5"><CalendarDays className="h-4 w-4" />হাজিরা</TabsTrigger>
          <TabsTrigger value="salary" className="gap-1.5"><DollarSign className="h-4 w-4" />স্যালারি</TabsTrigger>
        </TabsList>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-[180px]" />
            <div className="flex gap-2 ml-auto">
              <Badge variant="outline" className="gap-1"><UserCheck className="h-3 w-3" />উপস্থিত: {presentCount}</Badge>
              <Badge variant="outline" className="gap-1"><UserX className="h-3 w-3" />অনুপস্থিত: {absentCount}</Badge>
              <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />মার্ক করা বাকি: {unmarked.length}</Badge>
            </div>
          </div>

          {/* Quick mark for unattended */}
          {unmarked.length > 0 && (
            <Card className="glass-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">হাজিরা মার্ক করুন — {format(new Date(selectedDate), "dd MMM yyyy")}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {unmarked.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-card">
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.designation || "—"}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-success/10 text-success hover:bg-success/20" onClick={() => markAttendance.mutate({ employeeId: emp.id, status: "present" })}>উপস্থিত</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-destructive/10 text-destructive hover:bg-destructive/20" onClick={() => markAttendance.mutate({ employeeId: emp.id, status: "absent" })}>অনুপস্থিত</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-warning/10 text-warning hover:bg-warning/20" onClick={() => markAttendance.mutate({ employeeId: emp.id, status: "late" })}>লেট</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's records */}
          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>নাম</TableHead><TableHead>পদবী</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead>চেক-ইন</TableHead><TableHead>চেক-আউট</TableHead><TableHead>অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">এই তারিখে কোনো হাজিরা নেই</TableCell></TableRow>
                  ) : attendance.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-sm">{a.employees?.name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.employees?.designation || "—"}</TableCell>
                      <TableCell><Badge className={`text-xs ${STATUS_COLORS[a.status] || ""}`}>{a.status}</Badge></TableCell>
                      <TableCell className="text-sm">{a.check_in || "—"}</TableCell>
                      <TableCell className="text-sm">{a.check_out || "—"}</TableCell>
                      <TableCell>
                        {!a.check_out && a.status !== "absent" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markCheckOut.mutate(a.id)}>
                            <Clock className="h-3 w-3 mr-1" />চেক-আউট
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SALARY TAB */}
        <TabsContent value="salary" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={String(salaryMonth)} onValueChange={v => setSalaryMonth(Number(v))}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"].map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" value={salaryYear} onChange={e => setSalaryYear(Number(e.target.value))} className="w-[90px]" />
            <div className="flex gap-2 ml-auto">
              <Badge variant="outline">মোট: ৳{totalSalary.toLocaleString()}</Badge>
              <Badge variant="outline" className="text-success">পরিশোধিত: ৳{paidSalary.toLocaleString()}</Badge>
            </div>
            <Button size="sm" onClick={() => setSalaryDialog(true)}><Plus className="h-4 w-4 mr-1" />স্যালারি যোগ</Button>
          </div>

          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>নাম</TableHead><TableHead>বেসিক</TableHead><TableHead>বোনাস</TableHead><TableHead>কর্তন</TableHead><TableHead>নেট</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead>অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaries.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">এই মাসে কোনো স্যালারি রেকর্ড নেই</TableCell></TableRow>
                  ) : salaries.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-sm">{s.employees?.name || "—"}</TableCell>
                      <TableCell className="text-sm">৳{Number(s.base_salary).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-success">+৳{Number(s.bonus).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-destructive">-৳{Number(s.deduction).toLocaleString()}</TableCell>
                      <TableCell className="text-sm font-bold">৳{Number(s.net_salary).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={s.payment_status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                          {s.payment_status === "paid" ? "পরিশোধিত" : "পেন্ডিং"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.payment_status !== "paid" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markSalaryPaid.mutate(s.id)}>পরিশোধ করুন</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Salary Dialog */}
      <Dialog open={salaryDialog} onOpenChange={setSalaryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>স্যালারি যোগ করুন</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>কর্মচারী</Label>
              <Select value={salaryForm.employee_id} onValueChange={v => setSalaryForm({ ...salaryForm, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="সিলেক্ট করুন" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>বেসিক (৳)</Label><Input type="number" value={salaryForm.base_salary} onChange={e => setSalaryForm({ ...salaryForm, base_salary: +e.target.value })} /></div>
              <div><Label>বোনাস (৳)</Label><Input type="number" value={salaryForm.bonus} onChange={e => setSalaryForm({ ...salaryForm, bonus: +e.target.value })} /></div>
              <div><Label>কর্তন (৳)</Label><Input type="number" value={salaryForm.deduction} onChange={e => setSalaryForm({ ...salaryForm, deduction: +e.target.value })} /></div>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-xs text-muted-foreground">নেট স্যালারি</p>
              <p className="text-lg font-bold">৳{(salaryForm.base_salary + salaryForm.bonus - salaryForm.deduction).toLocaleString()}</p>
            </div>
            <div><Label>নোট</Label><Input value={salaryForm.notes} onChange={e => setSalaryForm({ ...salaryForm, notes: e.target.value })} /></div>
            <Button className="w-full" onClick={() => saveSalary.mutate()} disabled={!salaryForm.employee_id || saveSalary.isPending}>
              {saveSalary.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
