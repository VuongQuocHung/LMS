"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";

export interface Attachment {
  id: number;
  originalName: string;
  contentType: string;
  sizeBytes: number;
}
interface Props {
  kind: "lessons" | "assignments" | "drafts" | "submissions";
  targetId: number;
  editable?: boolean;
  disabled?: boolean;
  title?: string;
  onBusyChange?: (busy: boolean) => void;
}

export default function AttachmentPanel({ kind, targetId, editable = false, disabled = false,
  title = "File đính kèm", onBusyChange }: Props) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [limits, setLimits] = useState({ maxBytes: 20 * 1024 * 1024, maxCount: 5 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inputId = useId();
  const inFlight = useRef(false);
  const path = `/${kind}/${targetId}/files`;
  useEffect(() => {
    let active = true;
    Promise.all([api<Attachment[]>(path), api<typeof limits>("/files/limits")])
      .then(([data, config]) => { if (active) { setFiles(data); setLimits(config); } })
      .catch(err => { if (active) setError(errorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path]);

  function setWorking(value: boolean) {
    inFlight.current = value;
    setBusy(value);
    onBusyChange?.(value);
  }
  async function upload(selected: File[]) {
    if (!selected.length || inFlight.current || disabled) return;
    setError(""); setMessage("");
    if (files.length + selected.length > limits.maxCount) {
      setError(`Tối đa ${limits.maxCount} file. Hãy xóa bớt hoặc chọn ít file hơn.`); return;
    }
    if (selected.some(f => f.size === 0 || f.size > limits.maxBytes || !/\.(pdf|docx|pptx|xlsx|txt|zip)$/i.test(f.name))) {
      setError(`Chọn file đúng định dạng, không rỗng, tối đa ${Math.round(limits.maxBytes / 1024 / 1024)} MB/file.`); return;
    }
    setWorking(true);
    try {
      for (const file of selected) {
        setMessage(`Đang tải lên: ${file.name}`);
        const body = new FormData(); body.append("file", file);
        const saved = await api<Attachment>(path, { method: "POST", body });
        setFiles(prev => [...prev, saved]);
      }
      setMessage("Đã tải file lên.");
    } catch (err) {
      setError(errorMessage(err)); setMessage("");
      // Upload trước đó có thể đã thành công; đồng bộ lại trước lần thử tiếp theo.
      try { setFiles(await api<Attachment[]>(path)); } catch { /* giữ danh sách đã biết */ }
    } finally { setWorking(false); }
  }
  async function remove(file: Attachment) {
    if (inFlight.current || disabled || !window.confirm(`Xóa file “${file.originalName}”?`)) return;
    setWorking(true); setError(""); setMessage("");
    try {
      await api(`/files/${file.id}`, { method: "DELETE" });
      setFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (err) { setError(errorMessage(err)); }
    finally { setWorking(false); }
  }
  return <section className="panel" style={{ margin: "16px 0", minWidth: 0 }} aria-busy={busy || loading}>
    <h3 style={{ marginTop: 0 }}>{title}</h3>
    {error && <p role="alert" className="error">{error}</p>}
    {message && <p role="status">{message}</p>}
    {loading ? <p>Đang tải danh sách file…</p> : files.length === 0 ? <p className="muted">Chưa có file đính kèm.</p> :
      <ul style={{ paddingLeft: 20 }}>
        {files.map(file => <li key={file.id} style={{ margin: "10px 0", overflowWrap: "anywhere" }}>
          <a href={`/api/v1/files/${file.id}/download`} target="_blank" rel="noopener noreferrer">{file.originalName}</a>
          <span className="muted"> ({(file.sizeBytes / 1024).toFixed(1)} KB) </span>
          {editable && <button type="button" className="secondary" disabled={busy || disabled} onClick={() => remove(file)}>Xóa</button>}
        </li>)}
      </ul>}
    {editable && <div>
      <label htmlFor={inputId}>Thêm file đính kèm</label>
      <input id={inputId} type="file" multiple accept=".pdf,.docx,.pptx,.xlsx,.txt,.zip"
        disabled={busy || disabled || loading || files.length >= limits.maxCount}
        onChange={e => { const selected = Array.from(e.target.files ?? []); e.target.value = ""; void upload(selected); }} />
      <p className="muted">PDF, DOCX, PPTX, XLSX, TXT, ZIP · tối đa {limits.maxCount} file · {Math.round(limits.maxBytes / 1024 / 1024)} MB/file.</p>
    </div>}
  </section>;
}
