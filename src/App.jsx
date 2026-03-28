import { useState, useEffect, useMemo } from "react";
import { apiService } from "./services/api";
import {
  Database, LayoutDashboard, Briefcase, Play, AlertTriangle,
  HardDrive, Trash2, RefreshCcw, Download, CheckCircle2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ── Helpers ──
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "—";
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const isJobActive = (status) => status === 'PENDING' || status === 'IN_PROGRESS';

// ── Sidebar ──
const AppSidebar = () => (
  <aside className="w-56 min-h-screen border-r border-border bg-sidebar flex flex-col">
    <div className="p-5 border-b border-border flex items-center gap-2.5">
      <Database className="h-5 w-5 text-primary" />
      <span className="text-sm font-semibold tracking-wide text-foreground">ResilientDB</span>
    </div>
    <nav className="p-3 flex-1">
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium cursor-default">
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </div>
    </nav>
    <div className="p-4 border-t border-border">
      <p className="text-xs text-muted-foreground font-mono">NODE_ENV: production</p>
    </div>
  </aside>
);

// ── Stats Row ──
const StatsRow = ({ jobs }) => {
  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter(j => isJobActive(j.status)).length;
    const failed = jobs.filter(j => j.status === 'FAILED').length;
    const completed = jobs.filter(j => j.status === 'COMPLETED').length;
    const totalBytes = jobs.reduce((acc, j) => acc + (j.sizeBytes || 0), 0);

    return [
      { label: "Total Jobs", value: total, icon: Briefcase, color: "text-muted-foreground" },
      { label: "Active / Pending", value: active, icon: Play, color: "text-blue-400" },
      { label: "Completed", value: completed, icon: CheckCircle2, color: "text-green-400" },
      { label: "Failed", value: failed, icon: AlertTriangle, color: "text-destructive" },
      { label: "Storage Used", value: formatBytes(totalBytes), icon: HardDrive, color: "text-muted-foreground" },
    ];
  }, [jobs]);

  return (
    <div className="grid grid-cols-5 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
          <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
          <div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-semibold text-foreground">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Control Panel ──
const ControlPanel = ({ databases, onRefreshDBs, onTrigger }) => {
  const [dbForm, setDbForm] = useState({ type: "", host: "", port: "", name: "", user: "", pass: "" });
  const [triggerForm, setTriggerForm] = useState({ dbId: "", jobName: "" });
  const [dbLoading, setDbLoading] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerError, setTriggerError] = useState(null);

  const handleSaveDatabase = async () => {
    if (!dbForm.type || !dbForm.host || !dbForm.port || !dbForm.name || !dbForm.user || !dbForm.pass) {
      alert("Please fill in all database fields.");
      return;
    }
    try {
      setDbLoading(true);
      await apiService.registerDatabase({
        databaseType: dbForm.type,
        host: dbForm.host,
        port: parseInt(dbForm.port),
        dbName: dbForm.name,
        username: dbForm.user,
        password: dbForm.pass,
      });
      alert("Database registered successfully!");
      setDbForm({ type: "", host: "", port: "", name: "", user: "", pass: "" });
      onRefreshDBs();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || "Unknown error";
      alert(`Error saving database: ${msg}`);
    } finally {
      setDbLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    if (!triggerForm.dbId) {
      alert("Select a database first!");
      return;
    }
    try {
      setTriggerLoading(true);
      setTriggerError(null);
      await apiService.triggerBackup(Number(triggerForm.dbId), triggerForm.jobName || "Manual Backup");
      setTriggerForm({ dbId: "", jobName: "" });
      onTrigger();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || "Trigger failed.";
      setTriggerError(msg);
    } finally {
      setTriggerLoading(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Register Database */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" /> Register Database
        </h3>
        <div className="space-y-3">
          <Select value={dbForm.type} onValueChange={(v) => setDbForm({ ...dbForm, type: v })}>
            <SelectTrigger className="bg-muted border-border">
              <SelectValue placeholder="DB Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="POSTGRESQL">PostgreSQL</SelectItem>
              <SelectItem value="MYSQL">MySQL</SelectItem>
              <SelectItem value="MONGODB">MongoDB</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Host" value={dbForm.host} onChange={e => setDbForm({ ...dbForm, host: e.target.value })} className="bg-muted border-border" />
            <Input placeholder="Port" value={dbForm.port} onChange={e => setDbForm({ ...dbForm, port: e.target.value })} className="bg-muted border-border" />
          </div>
          <Input placeholder="DB Name" value={dbForm.name} onChange={e => setDbForm({ ...dbForm, name: e.target.value })} className="bg-muted border-border" />
          <Input placeholder="Username" value={dbForm.user} onChange={e => setDbForm({ ...dbForm, user: e.target.value })} className="bg-muted border-border" />
          <Input placeholder="Password" type="password" value={dbForm.pass} onChange={e => setDbForm({ ...dbForm, pass: e.target.value })} className="bg-muted border-border" />
          <Button onClick={handleSaveDatabase} disabled={dbLoading} className="w-full bg-primary">
            {dbLoading ? "Saving..." : "Save Database"}
          </Button>
        </div>
      </div>

      {/* Trigger Backup */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Play className="h-4 w-4 text-blue-400" /> Trigger Backup
        </h3>
        <div className="space-y-3">
          <Select value={triggerForm.dbId} onValueChange={(v) => { setTriggerForm({ ...triggerForm, dbId: v }); setTriggerError(null); }}>
            <SelectTrigger className="bg-muted border-border">
              <SelectValue placeholder="Select Database" />
            </SelectTrigger>
            <SelectContent>
              {databases.map(db => (
                <SelectItem key={db.id} value={db.id.toString()}>
                  {db.dbName} ({db.databaseType}) — {db.host}:{db.port}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Job Name (optional)"
            value={triggerForm.jobName}
            onChange={e => { setTriggerForm({ ...triggerForm, jobName: e.target.value }); setTriggerError(null); }}
            className="bg-muted border-border"
          />
          {/* FIX: Show actual error message instead of generic alert */}
          {triggerError && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {triggerError}
            </div>
          )}
          <Button
            onClick={handleTriggerBackup}
            disabled={triggerLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-semibold"
          >
            {triggerLoading ? "Queuing..." : "Run Engine Now"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Status Badge ──
const statusStyles = {
  PENDING:     "bg-yellow-500/15 text-yellow-500 border-yellow-500/20",
  IN_PROGRESS: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  COMPLETED:   "bg-green-500/15 text-green-500 border-green-500/20",
  FAILED:      "bg-red-500/15 text-red-500 border-red-500/20",
  CANCELLED:   "bg-gray-500/15 text-gray-500 border-gray-500/20",
};

// ── Backup History Table ──
const BackupHistoryTable = ({ jobs, onRefresh }) => {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // FIX: Only allow delete on terminal states — never on PENDING or IN_PROGRESS
  const canDelete = (job) => job.status === "COMPLETED" || job.status === "FAILED" || job.status === "CANCELLED";

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiService.deleteBackup(deleteTarget.id);
      setDeleteTarget(null);
      onRefresh();
    } catch (error) {
      alert(`Delete failed: ${error?.response?.data?.message || error?.message || "Unknown error"}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="text-sm font-semibold text-foreground">Backup Lifecycle History</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCcw className="h-3 w-3 animate-spin" style={{ animationDuration: "3s" }} />
            Live
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Target DB</th>
                <th className="text-left px-4 py-3">Job Name</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Size</th>
                <th className="text-left px-4 py-3">Retries</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="h-8 w-8 opacity-30" />
                      <span>No backup jobs yet. Trigger one to get started.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{job.id}</td>
                    <td className="px-4 py-3 text-foreground font-medium">{job.databaseType || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{job.jobName || "Unnamed"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold w-fit ${statusStyles[job.status]}`}>
                          {job.status}
                        </Badge>
                        {/* Show error message inline for FAILED jobs */}
                        {job.status === "FAILED" && job.errorMessage && (
                          <span className="text-[10px] text-destructive/70 max-w-[180px] truncate" title={job.errorMessage}>
                            {job.errorMessage}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatBytes(job.sizeBytes)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {job.retryCount}/{job.maxRetries}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Download: only on COMPLETED */}
                        {job.status === "COMPLETED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-400"
                            title="Download backup file"
                            onClick={() => apiService.downloadBackup(job.id)}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {/* FIX: Delete only on terminal states — NEVER on PENDING or IN_PROGRESS */}
                        {canDelete(job) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Delete job"
                            onClick={() => setDeleteTarget(job)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {/* Show spinner for active jobs so the UI doesn't look frozen */}
                        {isJobActive(job.status) && (
                          <RefreshCcw className="h-3.5 w-3.5 text-muted-foreground/50 animate-spin" style={{ animationDuration: "2s" }} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanent Deletion</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            This will permanently delete job <span className="font-mono font-semibold">#{deleteTarget?.id}</span> ({deleteTarget?.jobName}) and its backup file from the server. This cannot be undone.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button onClick={confirmDelete} disabled={deleting} className="bg-destructive">
              {deleting ? "Deleting..." : "Wipe Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ── Main App ──
const App = () => {
  const [jobs, setJobs] = useState([]);
  const [databases, setDatabases] = useState([]);

  const fetchData = async () => {
    try {
      const [jobsData, dbData] = await Promise.all([
        apiService.getBackups(),
        apiService.getDatabases(),
      ]);
      setJobs(jobsData.sort((a, b) => b.id - a.id));
      setDatabases(dbData);
    } catch (e) {
      console.error("Polling error", e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // FIX: Deduplicate by id, not dbName — same name on different hosts are different DBs
  const uniqueDatabases = useMemo(() => {
    const seen = new Set();
    return databases.filter(db => {
      if (seen.has(db.id)) return false;
      seen.add(db.id);
      return true;
    });
  }, [databases]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        <StatsRow jobs={jobs} />
        <div className="flex gap-6">
          <div className="w-1/3 min-w-[320px]">
            <ControlPanel
              databases={uniqueDatabases}
              onRefreshDBs={fetchData}
              onTrigger={fetchData}
            />
          </div>
          <div className="flex-1 min-w-0">
            <BackupHistoryTable jobs={jobs} onRefresh={fetchData} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;