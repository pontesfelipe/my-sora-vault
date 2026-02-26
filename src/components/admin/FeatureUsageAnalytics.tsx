import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFeatureUsageStats } from "@/hooks/useFeatureUsageStats";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { Watch, Loader2, BarChart3, Users, Activity, TrendingUp, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { CollectionType, COLLECTION_CONFIGS } from "@/types/collection";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from "recharts";

const collectionIcons: Record<string, React.ReactNode> = {
  watches: <Watch className="h-4 w-4" />,
};

const collectionColors: Record<string, string> = {
  watches: "hsl(var(--primary))",
};

export const FeatureUsageAnalytics = () => {
  const [daysBack, setDaysBack] = useState(30);
  const { stats, dailyUsage, loading, totalEvents, refetch, getTopFeatures, getStatsByCollectionType, getUniqueUsersCount } = useFeatureUsageStats(daysBack);
  const { toggles } = useFeatureToggles();

  // Get feature name from toggles
  const getFeatureName = (featureKey: string): string => {
    const toggle = toggles.find(t => t.feature_key === featureKey);
    return toggle?.feature_name || featureKey;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const topFeatures = getTopFeatures(10);
  const collectionTypes: CollectionType[] = ['watches'];

  // Prepare data for collection type comparison chart
  const collectionData = collectionTypes.map(type => {
    const typeStats = getStatsByCollectionType(type);
    return {
      name: COLLECTION_CONFIGS[type].label,
      type,
      totalUses: typeStats.reduce((sum, s) => sum + s.total_uses, 0),
      uniqueUsers: Math.max(...typeStats.map(s => s.unique_users), 0),
      featureCount: typeStats.length,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={daysBack.toString()} onValueChange={(v) => setDaysBack(parseInt(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last {daysBack} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getUniqueUsersCount()}</div>
            <p className="text-xs text-muted-foreground">
              Unique users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Features Tracked</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(stats.map(s => s.feature_key)).size}</div>
            <p className="text-xs text-muted-foreground">
              Unique features used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dailyUsage.length > 0 
                ? Math.round(dailyUsage.reduce((sum, d) => sum + d.count, 0) / dailyUsage.length)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Events per day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Over Time</CardTitle>
          <CardDescription>Daily feature usage events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {dailyUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'MMMM d, yyyy')}
                    formatter={(value: number) => [value, 'Events']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No usage data available for this period
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage by Collection Type */}
      <Card>
        <CardHeader>
          <CardTitle>Usage by Collection Type</CardTitle>
          <CardDescription>Compare feature usage across collection types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {collectionData.some(d => d.totalUses > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={collectionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalUses" name="Total Uses" fill="hsl(var(--primary))" />
                  <Bar dataKey="uniqueUsers" name="Unique Users" fill="hsl(var(--muted-foreground))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No usage data available for this period
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Features Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Features</CardTitle>
          <CardDescription>Most used features in the last {daysBack} days</CardDescription>
        </CardHeader>
        <CardContent>
          {topFeatures.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Collection Type</TableHead>
                  <TableHead className="text-right">Total Uses</TableHead>
                  <TableHead className="text-right">Unique Users</TableHead>
                  <TableHead>Last Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topFeatures.map((stat, index) => (
                  <TableRow key={`${stat.feature_key}-${stat.collection_type}`}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFeatureName(stat.feature_key)}
                        <Badge variant="outline" className="text-xs">
                          {stat.feature_key}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {collectionIcons[stat.collection_type]}
                        <span>{COLLECTION_CONFIGS[stat.collection_type].label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {stat.total_uses.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.unique_users}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {stat.last_used 
                        ? formatDistanceToNow(new Date(stat.last_used), { addSuffix: true })
                        : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Usage Data Yet</h3>
              <p className="text-muted-foreground max-w-sm">
                Feature usage will be tracked as users interact with different features across collection types.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
