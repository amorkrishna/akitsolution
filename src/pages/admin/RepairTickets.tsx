import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Check, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function RepairTickets() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    customer_name: "",
    phone: "",
    device_info: "",
    issue_description: "",
    estimated_cost: "0",
  });

  const { data: tickets, refetch, isLoading } = useQuery({
    queryKey: ['admin-repair-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const handleCreateTicket = async () => {
    if (!newTicket.customer_name || !newTicket.phone || !newTicket.device_info || !newTicket.issue_description) {
      toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from('repair_tickets').insert([{
        customer_name: newTicket.customer_name,
        phone: newTicket.phone,
        device_info: newTicket.device_info,
        issue_description: newTicket.issue_description,
        estimated_cost: parseFloat(newTicket.estimated_cost || "0"),
        status: "Received"
      }]);

      if (error) throw error;
      
      toast({ title: "Success", description: "Repair ticket created successfully" });
      setIsAddOpen(false);
      setNewTicket({ customer_name: "", phone: "", device_info: "", issue_description: "", estimated_cost: "0" });
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('repair_tickets')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Updated", description: "Status updated successfully" });
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredTickets = tickets?.filter(t => 
    t.ticket_number?.toLowerCase().includes(search.toLowerCase()) || 
    t.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.phone?.includes(search)
  ) || [];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Received': return 'bg-gray-500';
      case 'Diagnosing': return 'bg-yellow-500';
      case 'Waiting for Parts': return 'bg-orange-500';
      case 'Repaired': return 'bg-emerald-500';
      case 'Delivered': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Repair Tickets</h2>
          <p className="text-muted-foreground">Manage customer device repairs and status.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Ticket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Repair Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer Name</label>
                  <Input value={newTicket.customer_name} onChange={e => setNewTicket({...newTicket, customer_name: e.target.value})} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={newTicket.phone} onChange={e => setNewTicket({...newTicket, phone: e.target.value})} placeholder="01XXX..." />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Device Info (Brand & Model)</label>
                <Input value={newTicket.device_info} onChange={e => setNewTicket({...newTicket, device_info: e.target.value})} placeholder="Hikvision 4CH DVR" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Issue Description</label>
                <Input value={newTicket.issue_description} onChange={e => setNewTicket({...newTicket, issue_description: e.target.value})} placeholder="Not powering on" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estimated Cost (৳)</label>
                <Input type="number" value={newTicket.estimated_cost} onChange={e => setNewTicket({...newTicket, estimated_cost: e.target.value})} />
              </div>
              <Button className="w-full mt-4" onClick={handleCreateTicket}>Create Ticket</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>All Tickets</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets or phone..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Update Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filteredTickets.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tickets found.</TableCell></TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono font-medium">{ticket.ticket_number}</TableCell>
                      <TableCell>
                        <p className="font-medium">{ticket.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{ticket.phone}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{ticket.device_info}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{ticket.issue_description}</p>
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(ticket.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(ticket.status)} text-white hover:${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={ticket.status}
                          onValueChange={(value) => handleUpdateStatus(ticket.id, value)}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue placeholder="Update Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Received">Received</SelectItem>
                            <SelectItem value="Diagnosing">Diagnosing</SelectItem>
                            <SelectItem value="Waiting for Parts">Waiting for Parts</SelectItem>
                            <SelectItem value="Repaired">Repaired</SelectItem>
                            <SelectItem value="Delivered">Delivered</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
