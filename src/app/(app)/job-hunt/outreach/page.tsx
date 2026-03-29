"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Mail,
  Linkedin,
  Copy,
  CheckSquare,
  Square,
  Send,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Check,
} from "lucide-react";
import { useColdEmails, useLinkedInOutreaches } from "@/lib/hooks/use-job-hunt";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function OutreachHubPage() {
  const { emails, isLoading: emailsLoading, updateEmail, deleteEmail } = useColdEmails();
  const { outreaches, isLoading: outreachesLoading, updateOutreach, deleteOutreach } = useLinkedInOutreaches();

  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [selectedOutreaches, setSelectedOutreaches] = useState<Set<string>>(new Set());

  // ─── Email Actions ─────────────────────────────────────────────────────────

  const toggleEmail = (id: string) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllEmails = () => {
    if (!emails) return;
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map(e => e.id)));
    }
  };

  const handleCopyBCC = useCallback(() => {
    if (!emails) return;
    const selected = emails.filter(e => selectedEmails.has(e.id));
    const bccList = selected
      .map(e => e.recipientEmail)
      .filter(e => e && e.includes("@"))
      .join(", ");

    if (!bccList) {
      toast.error("No valid emails to copy");
      return;
    }
    navigator.clipboard.writeText(bccList);
    toast.success(`Copied ${selected.length} email addresses to clipboard!`);
  }, [emails, selectedEmails]);

  const handleCopyEmailBodies = useCallback(() => {
    if (!emails) return;
    const selected = emails.filter(e => selectedEmails.has(e.id));
    const bodies = selected.map(e => `To: ${e.recipientEmail}\nSubject: ${e.subject}\n\n${e.body}\n\n---`).join("\n\n");
    navigator.clipboard.writeText(bodies);
    toast.success(`Copied ${selected.length} email drafts!`);
  }, [emails, selectedEmails]);

  const handleMarkEmailsSent = useCallback(async () => {
    if (!emails) return;
    const selected = emails.filter(e => selectedEmails.has(e.id));
    for (const email of selected) {
      await updateEmail(email.id, { status: "sent", sentAt: new Date().toISOString() });
    }
    setSelectedEmails(new Set());
    toast.success(`Marked ${selected.length} emails as sent`);
  }, [emails, selectedEmails, updateEmail]);

  const handleDeleteSelectedEmails = useCallback(async () => {
    for (const id of selectedEmails) {
      await deleteEmail(id);
    }
    setSelectedEmails(new Set());
    toast.success("Deleted selected emails");
  }, [selectedEmails, deleteEmail]);

  // ─── LinkedIn Actions ──────────────────────────────────────────────────────

  const toggleOutreach = (id: string) => {
    setSelectedOutreaches(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOutreaches = () => {
    if (!outreaches) return;
    if (selectedOutreaches.size === outreaches.length) {
      setSelectedOutreaches(new Set());
    } else {
      setSelectedOutreaches(new Set(outreaches.map(o => o.id)));
    }
  };

  const handleCopyMessages = useCallback(() => {
    if (!outreaches) return;
    const selected = outreaches.filter(o => selectedOutreaches.has(o.id));
    const messages = selected.map(o => `[${o.personName} at ${o.company}]\n${o.message}\n`).join("\n---\n\n");
    navigator.clipboard.writeText(messages);
    toast.success(`Copied ${selected.length} LinkedIn messages!`);
  }, [outreaches, selectedOutreaches]);

  const handleOpenProfiles = useCallback(() => {
    if (!outreaches) return;
    const selected = outreaches.filter(o => selectedOutreaches.has(o.id) && o.personUrl);
    if (selected.length === 0) {
      toast.error("No LinkedIn URLs available for selected outreaches");
      return;
    }
    selected.forEach(o => {
      if (o.personUrl) window.open(o.personUrl, "_blank");
    });
    toast.success(`Opened ${selected.length} LinkedIn profiles`);
  }, [outreaches, selectedOutreaches]);

  const handleMarkOutreachesSent = useCallback(async () => {
    if (!outreaches) return;
    const selected = outreaches.filter(o => selectedOutreaches.has(o.id));
    for (const outreach of selected) {
      await updateOutreach(outreach.id, { status: "sent", sentAt: new Date().toISOString() });
    }
    setSelectedOutreaches(new Set());
    toast.success(`Marked ${selected.length} outreaches as sent`);
  }, [outreaches, selectedOutreaches, updateOutreach]);

  const handleDeleteSelectedOutreaches = useCallback(async () => {
    for (const id of selectedOutreaches) {
      await deleteOutreach(id);
    }
    setSelectedOutreaches(new Set());
    toast.success("Deleted selected outreaches");
  }, [selectedOutreaches, deleteOutreach]);

  const emailCount = emails?.length ?? 0;
  const outreachCount = outreaches?.length ?? 0;
  const draftedEmails = emails?.filter(e => e.status === "drafted").length ?? 0;
  const sentEmails = emails?.filter(e => e.status === "sent").length ?? 0;
  const draftedOutreaches = outreaches?.filter(o => o.status === "drafted").length ?? 0;
  const sentOutreaches = outreaches?.filter(o => o.status === "sent").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outreach Hub"
        description="Manage cold emails and LinkedIn outreach in bulk"
        actions={
          <Link href="/job-hunt">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Job Hunt
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-green-500" />
              <p className="text-2xl font-bold">{emailCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Emails Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" />
              <p className="text-2xl font-bold">{sentEmails}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total LinkedIn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Linkedin className="h-4 w-4 text-purple-500" />
              <p className="text-2xl font-bold">{outreachCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">LinkedIn Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <p className="text-2xl font-bold">{sentOutreaches}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="emails">
        <TabsList>
          <TabsTrigger value="emails" className="gap-2">
            <Mail className="h-3.5 w-3.5" />
            Emails ({emailCount})
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="gap-2">
            <Linkedin className="h-3.5 w-3.5" />
            LinkedIn ({outreachCount})
          </TabsTrigger>
        </TabsList>

        {/* ─── Emails Tab ───────────────────────────────────────────────── */}
        <TabsContent value="emails" className="mt-4 space-y-4">
          {/* Bulk Actions */}
          {emailCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={toggleAllEmails}>
                {selectedEmails.size === emailCount ? <CheckSquare className="mr-1.5 h-3.5 w-3.5" /> : <Square className="mr-1.5 h-3.5 w-3.5" />}
                {selectedEmails.size === emailCount ? "Deselect All" : "Select All"}
              </Button>
              {selectedEmails.size > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">{selectedEmails.size} selected</span>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" onClick={handleCopyBCC}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy to BCC
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCopyEmailBodies}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy Drafts
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleMarkEmailsSent}>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Mark Sent
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDeleteSelectedEmails}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          )}

          {emailsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : !emails || emails.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No cold emails yet. Search for jobs and generate emails from the Job Hunt page.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className={`flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50 ${
                    selectedEmails.has(email.id) ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <button onClick={() => toggleEmail(email.id)} className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground">
                    {selectedEmails.has(email.id) ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{email.company}</p>
                      <Badge variant={email.status === "sent" ? "default" : email.status === "replied" ? "secondary" : "outline"} className="text-[10px]">
                        {email.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      To: {email.recipientName} &lt;{email.recipientEmail}&gt;
                    </p>
                    <p className="text-xs font-medium mt-1">Subject: {email.subject}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.body}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        navigator.clipboard.writeText(email.body);
                        toast.success("Email body copied!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        const mailto = `mailto:${email.recipientEmail}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
                        window.open(mailto);
                      }}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── LinkedIn Tab ─────────────────────────────────────────────── */}
        <TabsContent value="linkedin" className="mt-4 space-y-4">
          {/* Bulk Actions */}
          {outreachCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={toggleAllOutreaches}>
                {selectedOutreaches.size === outreachCount ? <CheckSquare className="mr-1.5 h-3.5 w-3.5" /> : <Square className="mr-1.5 h-3.5 w-3.5" />}
                {selectedOutreaches.size === outreachCount ? "Deselect All" : "Select All"}
              </Button>
              {selectedOutreaches.size > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">{selectedOutreaches.size} selected</span>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" onClick={handleCopyMessages}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy Messages
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleOpenProfiles}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Open Profiles
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleMarkOutreachesSent}>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Mark Sent
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDeleteSelectedOutreaches}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          )}

          {outreachesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : !outreaches || outreaches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Linkedin className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No LinkedIn outreach yet. Search for jobs and generate messages from the Job Hunt page.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {outreaches.map((outreach) => (
                <div
                  key={outreach.id}
                  className={`flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50 ${
                    selectedOutreaches.has(outreach.id) ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <button onClick={() => toggleOutreach(outreach.id)} className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground">
                    {selectedOutreaches.has(outreach.id) ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{outreach.personName}</p>
                      {outreach.personTitle && (
                        <span className="text-xs text-muted-foreground">{outreach.personTitle}</span>
                      )}
                      <Badge variant={outreach.status === "sent" ? "default" : outreach.status === "connected" ? "secondary" : "outline"} className="text-[10px]">
                        {outreach.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{outreach.company}</p>
                    <p className="text-xs mt-1">{outreach.message}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        navigator.clipboard.writeText(outreach.message);
                        toast.success("Message copied!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {outreach.personUrl && (
                      <a href={outreach.personUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
