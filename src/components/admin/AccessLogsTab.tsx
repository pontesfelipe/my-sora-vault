import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { RefreshCw, Search, Download } from "lucide-react";
import ExcelJS from 'exceljs';
import { toast } from "sonner";

export function AccessLogsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [limit, setLimit] = useState(100);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['access-logs', limit],
    queryFn: async () => {
      // Fetch access_logs
      const { data: accessData, error: accessError } = await supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (accessError) throw accessError;

      // Also fetch login_history for historical auth events
      const { data: loginData, error: loginError } = await supabase
        .from('login_history')
        .select('*')
        .order('login_at', { ascending: false })
        .limit(limit);

      // Merge login_history entries that aren't already in access_logs
      const accessTimestamps = new Set(accessData?.map(a => a.created_at) || []);
      const mergedLoginEntries = (loginData || [])
        .filter(lh => !accessTimestamps.has(lh.login_at))
        .map(lh => ({
          id: lh.id,
          user_id: lh.user_id,
          user_email: null as string | null,
          action: lh.success ? 'login' : 'login_failed',
          page: '/auth',
          details: { source: 'login_history', browser: lh.browser, os: lh.os, device: lh.device_type, country: lh.country, failure_reason: lh.failure_reason },
          ip_address: lh.ip_address,
          user_agent: lh.user_agent,
          created_at: lh.login_at,
        }));

      // If we have login entries without emails, try to resolve them
      if (mergedLoginEntries.length > 0) {
        const userIds = [...new Set(mergedLoginEntries.map(e => e.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);
        const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
        mergedLoginEntries.forEach(e => {
          e.user_email = emailMap.get(e.user_id) || null;
        });
      }

      const combined = [...(accessData || []), ...mergedLoginEntries];
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return combined.slice(0, limit);
    },
  });

  const { data: actions } = useQuery({
    queryKey: ['access-log-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_logs')
        .select('action')
        .limit(1000);

      if (error) throw error;
      const uniqueActions = [...new Set(data.map(d => d.action))];
      return uniqueActions.sort();
    },
  });

  const filteredLogs = logs?.filter(log => {
    const matchesSearch = !searchTerm || 
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.page?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const handleExport = async () => {
    if (!filteredLogs?.length) {
      toast.error("No logs to export");
      return;
    }

    const exportData = filteredLogs.map(log => ({
      'Timestamp': format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'User Email': log.user_email || 'N/A',
      'Action': log.action,
      'Page': log.page || 'N/A',
      'Details': log.details ? JSON.stringify(log.details) : '',
      'IP Address': log.ip_address || 'N/A',
      'User Agent': log.user_agent || 'N/A',
    }));

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Access Logs');
    
    const headers = Object.keys(exportData[0]);
    ws.addRow(headers);
    exportData.forEach(row => ws.addRow(Object.values(row)));
    
    // Style header row
    ws.getRow(1).font = { bold: true };
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access_logs_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Access logs exported");
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('login') || action.includes('signup')) return 'default';
    if (action.includes('view')) return 'secondary';
    if (action.includes('create') || action.includes('add')) return 'outline';
    if (action.includes('delete')) return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Access Logs</CardTitle>
              <CardDescription>
                User activity and access history
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, action, or page..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions?.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
                <SelectItem value="250">250 rows</SelectItem>
                <SelectItem value="500">500 rows</SelectItem>
                <SelectItem value="1000">1000 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No access logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {log.user_email || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.page || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {log.details ? JSON.stringify(log.details) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Showing {filteredLogs?.length || 0} of {logs?.length || 0} logs
          </div>
        </CardContent>
      </Card>
    </div>
  );
}