/*
 * DESIGN: Dreamy Watercolor / Soft Studio
 * - Background color matches student's bubble pastel
 * - 3x3 photo grid with soft rounded thumbnails
 * - Lightbox with left/right navigation and X close
 * - Large "Add Photo" button spanning all 3 columns
 * - Teacher mode: server-side password verification, delete overlay on each photo
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Camera,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { STUDENT_NAMES, PASTEL_PALETTE } from "@/lib/students";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const EMPTY_ILLUSTRATION =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663392424189/H5iSaioCjgbnNDeZvbC7R5/empty-gallery-illustration-QP3rDJhDh7aExMu6h87kMw.webp";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function unslugify(slug: string): string | undefined {
  return STUDENT_NAMES.find((n) => slugify(n) === slug);
}

function getPaletteForStudent(name: string) {
  const idx = STUDENT_NAMES.indexOf(name);
  return PASTEL_PALETTE[idx >= 0 ? idx % PASTEL_PALETTE.length : 0];
}

// Convert a File to base64 data URL
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Gallery() {
  const params = useParams<{ studentSlug: string }>();
  const [, navigate] = useLocation();
  const studentSlug = params.studentSlug ?? "";
  const studentName = unslugify(studentSlug);

  useEffect(() => {
    if (!studentName) navigate("/");
  }, [studentName, navigate]);

  const palette = studentName ? getPaletteForStudent(studentName) : PASTEL_PALETTE[0];

  // ── tRPC queries ───────────────────────────────────────────
  const utils = trpc.useUtils();

  const { data: photos = [], isLoading } = trpc.photos.list.useQuery(
    { studentSlug },
    { enabled: !!studentSlug, refetchOnWindowFocus: true }
  );

  const uploadMutation = trpc.photos.upload.useMutation({
    onSuccess: () => {
      toast.success("Photo uploaded!");
      utils.photos.list.invalidate({ studentSlug });
      setUploading(false);
    },
    onError: (err) => {
      toast.error(err.message || "Upload failed");
      setUploading(false);
    },
  });

  const deleteMutation = trpc.photos.delete.useMutation({
    onSuccess: () => {
      toast.success("Photo deleted");
      utils.photos.list.invalidate({ studentSlug });
      setDeletingId(null);
    },
    onError: (err) => {
      toast.error(err.message || "Delete failed");
      setDeletingId(null);
    },
  });

  const verifyTeacherMutation = trpc.photos.verifyTeacher.useMutation({
    onSuccess: () => {
      setTeacherMode(true);
      setVerifiedPassword(passwordInput); // store for use in delete calls
      setShowPasswordDialog(false);
      toast.success("Teacher mode enabled");
    },
    onError: () => {
      setPasswordError(true);
    },
  });

  // ── Upload state ──────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !studentName) return;

    if (photos.length >= 9) {
      toast.error("Gallery is full! Ask a teacher to delete a photo first.");
      return;
    }

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      uploadMutation.mutate({
        studentSlug,
        studentName,
        base64,
        mimeType: file.type || "image/jpeg",
        originalName: file.name,
        fileSize: file.size,
      });
    } catch {
      toast.error("Could not read file");
      setUploading(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Lightbox ──────────────────────────────────────────────
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  function openLightbox(idx: number) { setLightboxIdx(idx); }
  function closeLightbox() { setLightboxIdx(null); }
  function prevPhoto() {
    setLightboxIdx((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }
  function nextPhoto() {
    setLightboxIdx((i) => (i === null ? null : (i + 1) % photos.length));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lightboxIdx === null) return;
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "ArrowRight") nextPhoto();
      if (e.key === "Escape") closeLightbox();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, photos.length]);

  // ── Teacher mode ──────────────────────────────────────────
  const [teacherMode, setTeacherMode] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [verifiedPassword, setVerifiedPassword] = useState(""); // stored after successful verify
  const [passwordError, setPasswordError] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  function handleTeacherToggle() {
    if (teacherMode) {
      setTeacherMode(false);
    } else {
      setShowPasswordDialog(true);
      setPasswordInput("");
      setPasswordError(false);
    }
  }

  function submitPassword() {
    verifyTeacherMutation.mutate({ password: passwordInput });
  }

  function handleDeleteClick(photoId: number) {
    setConfirmDeleteId(photoId);
  }

  function confirmDelete() {
    if (confirmDeleteId === null) return;
    setDeletingId(confirmDeleteId);
    setConfirmDeleteId(null);
    deleteMutation.mutate({
      photoId: confirmDeleteId,
      password: verifiedPassword,
    });
  }

  if (!studentName) return null;

  const isFull = photos.length >= 9;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(160deg, ${palette.light} 0%, ${palette.deep}55 100%)`,
      }}
    >
      {/* Header */}
      <header
        className="relative px-4 pt-6 pb-8"
        style={{
          background: `linear-gradient(135deg, ${palette.light} 0%, ${palette.deep}44 100%)`,
          borderBottom: `1.5px solid ${palette.deep}55`,
        }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 mb-4"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            fontSize: "0.9rem",
            color: palette.text,
            border: "none",
            padding: "0.4rem 0.75rem",
            borderRadius: "999px",
            background: `${palette.deep}33`,
          }}
        >
          <ArrowLeft size={16} />
          All Students
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.6rem, 5vw, 2.4rem)",
                color: palette.text,
                lineHeight: 1.1,
              }}
            >
              {studentName}
            </h1>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.9rem",
                color: palette.text + "99",
                marginTop: "0.3rem",
              }}
            >
              {photos.length} / 9 photos
            </p>
          </div>

          {/* Teacher mode toggle */}
          <button
            onClick={handleTeacherToggle}
            title={teacherMode ? "Exit teacher mode" : "Teacher mode"}
            style={{
              background: teacherMode ? palette.deep : `${palette.deep}33`,
              border: `1.5px solid ${palette.deep}66`,
              borderRadius: "999px",
              padding: "0.45rem 0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              fontSize: "0.82rem",
              color: teacherMode ? palette.text : palette.text + "bb",
              flexShrink: 0,
            }}
          >
            {teacherMode ? <Unlock size={14} /> : <Lock size={14} />}
            {teacherMode ? "Exit" : "Teacher"}
          </button>
        </div>
      </header>

      {/* Photo grid */}
      <main className="flex-1 px-4 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2
              size={36}
              className="animate-spin"
              style={{ color: palette.text + "88" }}
            />
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: palette.text + "88" }}>
              Loading photos…
            </p>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <img
              src={EMPTY_ILLUSTRATION}
              alt="No photos yet"
              style={{ width: "180px", opacity: 0.85 }}
            />
            <p
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontWeight: 600,
                fontSize: "1.1rem",
                color: palette.text + "bb",
                textAlign: "center",
              }}
            >
              No photos yet!
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.9rem",
                color: palette.text + "88",
                textAlign: "center",
              }}
            >
              Tap "Add Photo" below to get started.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "0.75rem",
              maxWidth: "700px",
              margin: "0 auto",
            }}
          >
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="photo-slide-up"
                style={{
                  animationDelay: `${idx * 60}ms`,
                  position: "relative",
                  aspectRatio: "1 / 1",
                  borderRadius: "1rem",
                  overflow: "hidden",
                  boxShadow: `0 4px 16px ${palette.deep}44`,
                  cursor: "pointer",
                  border: `2px solid ${palette.deep}55`,
                }}
                onClick={() => !teacherMode && openLightbox(idx)}
              >
                <img
                  src={photo.url}
                  alt={`${studentName} photo ${idx + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    transition: "transform 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!teacherMode)
                      (e.currentTarget as HTMLImageElement).style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLImageElement).style.transform = "scale(1)";
                  }}
                />

                {/* Teacher delete overlay */}
                {teacherMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(photo.id);
                    }}
                    disabled={deletingId === photo.id}
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.45)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {deletingId === photo.id ? (
                      <Loader2 size={28} color="white" className="animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={28} color="white" />
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 600,
                            fontSize: "0.78rem",
                            color: "white",
                          }}
                        >
                          Delete
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Photo button */}
      <div className="px-4 pb-8 pt-2">
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.6rem",
              width: "100%",
              padding: "1.1rem",
              borderRadius: "1rem",
              background: isFull ? `${palette.deep}33` : palette.deep,
              border: `2px dashed ${palette.deep}99`,
              cursor: isFull || uploading ? "not-allowed" : "pointer",
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: "1.05rem",
              color: isFull ? palette.text + "66" : palette.text,
              transition: "background 0.2s, transform 0.15s",
              opacity: isFull ? 0.6 : 1,
              boxShadow: isFull ? "none" : `0 4px 16px ${palette.deep}55`,
            }}
            onMouseEnter={(e) => {
              if (!isFull && !uploading)
                (e.currentTarget as HTMLLabelElement).style.transform = "scale(1.01)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLLabelElement).style.transform = "scale(1)";
            }}
          >
            {uploading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Uploading…
              </>
            ) : isFull ? (
              <>
                <Camera size={20} />
                Gallery Full (9/9)
              </>
            ) : (
              <>
                <Plus size={20} />
                Add Photo
              </>
            )}
          </label>
          {isFull && (
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.8rem",
                color: palette.text + "77",
                textAlign: "center",
                marginTop: "0.5rem",
              }}
            >
              Ask your teacher to delete a photo to add more.
            </p>
          )}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <div
          className="gallery-fade-in"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.88)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: "50%",
              width: "2.5rem",
              height: "2.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 101,
            }}
          >
            <X size={20} color="white" />
          </button>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
              style={{
                position: "absolute",
                left: "0.75rem",
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "50%",
                width: "2.8rem",
                height: "2.8rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 101,
              }}
            >
              <ChevronLeft size={24} color="white" />
            </button>
          )}

          {/* Image */}
          <img
            key={lightboxIdx}
            src={photos[lightboxIdx].url}
            alt={`${studentName} photo ${lightboxIdx + 1}`}
            className="gallery-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              objectFit: "contain",
              borderRadius: "0.75rem",
              boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
            }}
          />

          {/* Next */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
              style={{
                position: "absolute",
                right: "0.75rem",
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "50%",
                width: "2.8rem",
                height: "2.8rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 101,
              }}
            >
              <ChevronRight size={24} color="white" />
            </button>
          )}

          {/* Counter */}
          <div
            style={{
              position: "absolute",
              bottom: "1.25rem",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(255,255,255,0.15)",
              borderRadius: "999px",
              padding: "0.3rem 0.9rem",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              fontSize: "0.85rem",
              color: "white",
            }}
          >
            {lightboxIdx + 1} / {photos.length}
          </div>
        </div>
      )}

      {/* ── Password dialog ── */}
      {showPasswordDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setShowPasswordDialog(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "1.25rem",
              padding: "2rem",
              width: "100%",
              maxWidth: "360px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
            }}
          >
            <h2
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontWeight: 700,
                fontSize: "1.3rem",
                color: "#3d3558",
                marginBottom: "0.5rem",
              }}
            >
              Teacher Mode
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.88rem",
                color: "#6b6585",
                marginBottom: "1.25rem",
              }}
            >
              Enter the teacher password to enable photo deletion.
            </p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && submitPassword()}
              placeholder="Password"
              autoFocus
              style={{
                width: "100%",
                padding: "0.7rem 1rem",
                borderRadius: "0.75rem",
                border: `1.5px solid ${passwordError ? "#ef4444" : "#e2e0ec"}`,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "1rem",
                outline: "none",
                marginBottom: "0.5rem",
                background: "#fafafa",
              }}
            />
            {passwordError && (
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.82rem",
                  color: "#ef4444",
                  marginBottom: "0.75rem",
                }}
              >
                Incorrect password. Try again.
              </p>
            )}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
              <button
                onClick={() => setShowPasswordDialog(false)}
                style={{
                  flex: 1,
                  padding: "0.7rem",
                  borderRadius: "0.75rem",
                  border: "1.5px solid #e2e0ec",
                  background: "white",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "0.9rem",
                  color: "#6b6585",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitPassword}
                disabled={verifyTeacherMutation.isPending}
                style={{
                  flex: 1,
                  padding: "0.7rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: palette.deep,
                  fontFamily: "'Quicksand', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: palette.text,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                }}
              >
                {verifyTeacherMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Unlock"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete dialog ── */}
      {confirmDeleteId !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "1.25rem",
              padding: "2rem",
              width: "100%",
              maxWidth: "340px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
            }}
          >
            <h2
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontWeight: 700,
                fontSize: "1.2rem",
                color: "#3d3558",
                marginBottom: "0.5rem",
              }}
            >
              Delete Photo?
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.88rem",
                color: "#6b6585",
                marginBottom: "1.5rem",
              }}
            >
              This will permanently remove the photo. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  flex: 1,
                  padding: "0.7rem",
                  borderRadius: "0.75rem",
                  border: "1.5px solid #e2e0ec",
                  background: "white",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "0.9rem",
                  color: "#6b6585",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  padding: "0.7rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: "#ef4444",
                  fontFamily: "'Quicksand', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
