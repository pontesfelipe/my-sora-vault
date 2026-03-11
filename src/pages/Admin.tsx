import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegisteredUsersTable } from "@/components/admin/RegisteredUsersTable";
import { TermsAcceptancesTable } from "@/components/admin/TermsAcceptancesTable";
import { ManageCollectionsDialog } from "@/components/admin/ManageCollectionsDialog";
import { MethodologyTab } from "@/components/admin/MethodologyTab";
import { DocumentationTab } from "@/components/admin/DocumentationTab";
import { AccessLogsTab } from "@/components/admin/AccessLogsTab";
import { UsageMetricsTab } from "@/components/admin/UsageMetricsTab";
import { CollectionsTab } from "@/components/admin/CollectionsTab";
import { FeedbackTab } from "@/components/admin/FeedbackTab";
import { ChangeControlLogTab } from "@/components/admin/ChangeControlLogTab";

import { ExportWearLogsDialog } from "@/components/admin/ExportWearLogsDialog";
import { ExportWatchInventoryDialog } from "@/components/admin/ExportWatchInventoryDialog";
import { ExportAllDataDialog } from "@/components/admin/ExportAllDataDialog";
import { Shield, Users, UserCog, FileCheck, Calendar, BookOpen, FileText, Activity, BarChart3, FolderOpen, MessageSquarePlus, ClipboardList } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  
  const navigate = useNavigate();
  const goToWearLogs = () => navigate("/admin/wear-logs");


  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Admin Panel</h1>
            </div>
            <p className="text-muted-foreground">
              Manage user access and view registered users
            </p>
          </div>
          <div className="flex gap-2">
            <ExportAllDataDialog />
            <ExportWearLogsDialog />
            <ExportWatchInventoryDialog />
            <Button onClick={goToWearLogs} variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Wear Logs
            </Button>
            <ManageCollectionsDialog />
          </div>
        </div>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full max-w-7xl grid-cols-11">
            <TabsTrigger value="requests" className="flex items-center gap-1 text-xs">
              <UserCog className="h-3 w-3" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="allowed" className="flex items-center gap-1 text-xs">
              <UserCog className="h-3 w-3" />
              Allowed
            </TabsTrigger>
            <TabsTrigger value="registered" className="flex items-center gap-1 text-xs">
              <Users className="h-3 w-3" />
              Users
            </TabsTrigger>
            <TabsTrigger value="collections" className="flex items-center gap-1 text-xs">
              <FolderOpen className="h-3 w-3" />
              Collections
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-1 text-xs">
              <MessageSquarePlus className="h-3 w-3" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="acceptances" className="flex items-center gap-1 text-xs">
              <FileCheck className="h-3 w-3" />
              Terms
            </TabsTrigger>
            <TabsTrigger value="methodology" className="flex items-center gap-1 text-xs">
              <BookOpen className="h-3 w-3" />
              Methodology
            </TabsTrigger>
            <TabsTrigger value="documentation" className="flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3" />
              Docs
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1 text-xs">
              <Activity className="h-3 w-3" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-1 text-xs">
              <BarChart3 className="h-3 w-3" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="changelog" className="flex items-center gap-1 text-xs">
              <ClipboardList className="h-3 w-3" />
              Changes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Registration Requests</CardTitle>
                <CardDescription>
                  Review and approve user registration requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RegistrationRequestsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allowed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manage Allowed Users</CardTitle>
                <CardDescription>
                  Add or remove email addresses that can register for the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AllowedUsersTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registered" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>
                  View all users who have registered on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RegisteredUsersTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collections" className="space-y-4">
            <CollectionsTab />
          </TabsContent>


          <TabsContent value="feedback" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Feedback</CardTitle>
                <CardDescription>
                  View and manage feature suggestions and bug reports from users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FeedbackTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acceptances" className="space-y-4">
            <TermsAcceptancesTable />
          </TabsContent>

          <TabsContent value="methodology" className="space-y-4">
            <MethodologyTab />
          </TabsContent>

          <TabsContent value="documentation" className="space-y-4">
            <DocumentationTab />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <AccessLogsTab />
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <UsageMetricsTab />
          </TabsContent>

          <TabsContent value="changelog" className="space-y-4">
            <ChangeControlLogTab />
          </TabsContent>
        </Tabs>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Administrator account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Email:</span>
                <span className="text-muted-foreground">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Role:</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-sm">
                  <Shield className="h-3 w-3" />
                  Administrator
                </span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}
