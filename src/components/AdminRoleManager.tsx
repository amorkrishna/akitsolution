import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "employee";
  created_at: string;
}

export function AdminRoleManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ["user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UserRole[];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "admin" | "employee" }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast({ title: "Role updated successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast({ title: "User removed" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />User Role Management
        </CardTitle>
        <CardDescription>Change roles or remove user accounts</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-6 text-muted-foreground">Loading users...</div>
        ) : userRoles.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">No users found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userRoles.map((ur) => (
                <TableRow key={ur.id}>
                  <TableCell className="font-mono text-xs max-w-[200px] truncate">{ur.user_id}</TableCell>
                  <TableCell>
                    <Select
                      value={ur.role}
                      onValueChange={(v) => updateRoleMutation.mutate({ id: ur.id, role: v as "admin" | "employee" })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <Badge className="bg-primary/10 text-primary">Admin</Badge>
                        </SelectItem>
                        <SelectItem value="employee">
                          <Badge className="bg-muted text-muted-foreground">Employee</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(ur.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteRoleMutation.mutate(ur.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
