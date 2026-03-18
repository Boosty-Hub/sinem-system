import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Paperclip, Mic, Square, Play, Pause, File, FileImage, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/AuthContext";
import { createNotification } from "@/lib/notifications";
import UserAvatar from "@/components/UserAvatar";
import { useLocalStorage } from "@/hooks/useLocalStorage";

/* ── Types ── */
interface ActivityAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface ActivityVoiceNote {
  id: string;
  dataUrl: string;
  durationSec: number;
}

interface ActivityEntry {
  id: string;
  prospectId: string;
  authorId: string;
  text: string;
  mentions: string[];
  attachments: ActivityAttachment[];
  voiceNote?: ActivityVoiceNote;
  createdAt: string;
}

interface AppUserInfo { id: string; name: string; }

interface Props {
  prospectId: string;
  prospectName: string;
  open: boolean;
  onClose: () => void;
}

/* ── Helpers ── */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-DO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const formatSize = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/* ── Voice Player ── */
const VoicePlayer = ({ dataUrl, durationSec }: { dataUrl: string; durationSec: number }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = new Audio(dataUrl);
    audioRef.current = audio;
    audio.addEventListener("timeupdate", () => setProgress((audio.currentTime / audio.duration) * 100 || 0));
    audio.addEventListener("ended", () => { setPlaying(false); setProgress(0); });
    return () => { audio.pause(); audio.remove(); };
  }, [dataUrl]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-2 bg-primary/5 rounded-lg px-3 py-2 mt-1.5">
      <button onClick={toggle} className="text-primary hover:text-primary/80 transition-colors">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground font-mono">{formatDuration(durationSec)}</span>
    </div>
  );
};

/* ── Mention Input ── */
const MentionInput = ({
  value,
  onChange,
  onSubmit,
  users,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  users: AppUserInfo[];
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    const pos = e.target.selectionStart;
    const before = val.slice(0, pos);
    const atIdx = before.lastIndexOf("@");
    if (atIdx >= 0 && (atIdx === 0 || before[atIdx - 1] === " " || before[atIdx - 1] === "\n")) {
      const partial = before.slice(atIdx + 1);
      if (!partial.includes(" ")) {
        setMentionStart(atIdx);
        setMentionFilter(partial.toLowerCase());
        setShowDropdown(true);
        return;
      }
    }
    setShowDropdown(false);
  };

  const insertMention = (userName: string) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(textareaRef.current?.selectionStart ?? value.length);
    onChange(`${before}@${userName} ${after}`);
    setShowDropdown(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !showDropdown) { e.preventDefault(); onSubmit(); }
    if (e.key === "Escape") setShowDropdown(false);
  };

  const filtered = users.filter((u) => u.name.toLowerCase().includes(mentionFilter));

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Escribe una actualización... usa @ para mencionar"
        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[60px] max-h-[120px]"
        rows={2}
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-56 bg-popover border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
          {filtered.map((u) => (
            <button
              key={u.id}
              type="button"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              onMouseDown={(e) => { e.preventDefault(); insertMention(u.name); }}
            >
              <UserAvatar userId={u.id} size="xs" />
              <span>{u.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Render text with highlighted mentions ── */
const RichText = ({ text }: { text: string }) => {
  const parts = text.split(/(@\S+)/g);
  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="text-primary font-medium bg-primary/10 px-0.5 rounded">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
};

/* ── Main Component ── */
const ActivitySidebar = ({ prospectId, prospectName, open, onClose }: Props) => {
  const { user } = useAuth();
  const [entries, setEntries] = useLocalStorage<ActivityEntry[]>("sinem:crm:activities", []);
  const [currentAppUserId, setCurrentAppUserId] = useState<string | null>(null);
  const [appUsers, setAppUsers] = useState<AppUserInfo[]>([]);
  const [text, setText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<ActivityAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pendingVoice, setPendingVoice] = useState<ActivityVoiceNote | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch users from Supabase
  useEffect(() => {
    if (!open) return;
    supabase.from("app_users").select("id, name").eq("status", "activo").order("name")
      .then(({ data }) => { if (data) setAppUsers(data); });
  }, [open]);

  const prospectEntries = entries.filter((e) => e.prospectId === prospectId);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [prospectEntries.length, open]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setPendingVoice({ id: crypto.randomUUID(), dataUrl: reader.result as string, durationSec: recordingTime });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch { /* microphone permission denied */ }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: ActivityAttachment[] = Array.from(e.target.files).map((f) => ({
      id: crypto.randomUUID(), name: f.name, size: f.size, type: f.type || "application/octet-stream",
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const handleSend = useCallback(() => {
    if (!text.trim() && pendingFiles.length === 0 && !pendingVoice) return;
    const mentions = (text.match(/@(\S+)/g) ?? []).map((m) => m.slice(1));
    const entry: ActivityEntry = {
      id: crypto.randomUUID(),
      prospectId,
      authorId: appUsers[0]?.id ?? "u1",
      text: text.trim(),
      mentions,
      attachments: pendingFiles,
      voiceNote: pendingVoice ?? undefined,
      createdAt: new Date().toISOString(),
    };
    setEntries((prev) => [...prev, entry]);
    setText("");
    setPendingFiles([]);
    setPendingVoice(null);
  }, [text, pendingFiles, pendingVoice, prospectId, setEntries, appUsers]);

  if (!open) return null;

  const getUserName = (userId: string) => appUsers.find((u) => u.id === userId)?.name ?? "Usuario";

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-background border-l border-border shadow-2xl z-50 flex flex-col animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">Actividad</h3>
          <p className="text-xs text-muted-foreground truncate">{prospectName}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {prospectEntries.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">Sin actualizaciones todavía. Publica la primera.</p>
        )}
        {prospectEntries.map((entry) => (
          <div key={entry.id} className="flex gap-3">
            <UserAvatar userId={entry.authorId} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{getUserName(entry.authorId)}</span>
                <span className="text-[10px] text-muted-foreground">{formatDate(entry.createdAt)}</span>
              </div>
              {entry.text && <RichText text={entry.text} />}
              {entry.voiceNote && <VoicePlayer dataUrl={entry.voiceNote.dataUrl} durationSec={entry.voiceNote.durationSec} />}
              {entry.attachments.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {entry.attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                      {att.type.startsWith("image/") ? <FileImage className="h-3.5 w-3.5 text-primary" /> : <File className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="truncate flex-1">{att.name}</span>
                      <span className="text-muted-foreground shrink-0">{formatSize(att.size)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-3 space-y-2">
        {pendingVoice && (
          <div className="flex items-center gap-2 bg-primary/5 rounded-lg px-3 py-2">
            <Play className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs flex-1">Nota de voz — {formatDuration(pendingVoice.durationSec)}</span>
            <button onClick={() => setPendingVoice(null)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {pendingFiles.length > 0 && (
          <div className="space-y-1">
            {pendingFiles.map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                <File className="h-3 w-3 text-muted-foreground" />
                <span className="truncate flex-1">{f.name}</span>
                <button onClick={() => setPendingFiles((prev) => prev.filter((p) => p.id !== f.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}
        {recording && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-600 dark:text-red-400 flex-1">Grabando... {formatDuration(recordingTime)}</span>
            <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={stopRecording}>
              <Square className="h-3 w-3 mr-1" /> Detener
            </Button>
          </div>
        )}
        <MentionInput value={text} onChange={setText} onSubmit={handleSend} users={appUsers} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-4 w-4 text-muted-foreground" />
            </Button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
            {!recording && !pendingVoice && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={startRecording}>
                <Mic className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
          <Button size="sm" className="h-7 px-3 text-xs" onClick={handleSend} disabled={!text.trim() && pendingFiles.length === 0 && !pendingVoice}>
            <Send className="h-3.5 w-3.5 mr-1" /> Publicar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActivitySidebar;
