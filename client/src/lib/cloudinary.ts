// ============================================================
// CLOUDINARY CONFIGURATION
// Replace these values with your own Cloudinary credentials.
// ============================================================

// Your Cloudinary cloud name (found in Dashboard → Settings → Account)
export const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "YOUR_CLOUD_NAME";

// Your unsigned upload preset name (Settings → Upload → Upload presets → Add unsigned preset)
export const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "YOUR_UPLOAD_PRESET";

// Cloudinary API base URL
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

// ============================================================
// Types
// ============================================================
export interface CloudinaryPhoto {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  created_at: string;
  format: string;
}

// ============================================================
// Upload a photo for a student
// ============================================================
export async function uploadPhoto(
  file: File,
  studentName: string,
  onProgress?: (pct: number) => void
): Promise<CloudinaryPhoto> {
  const folder = `student-showcase/${slugify(studentName)}`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${CLOUDINARY_URL}/image/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as CloudinaryPhoto);
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

// ============================================================
// Fetch photos for a student (via Cloudinary Search API)
// Requires an API Key + Search preset OR uses folder listing.
// We use the Search API with a signed request — but for a
// purely unsigned/public approach we use the list endpoint
// with a "resource_type=image" tag-based folder search.
//
// NOTE: To enable this, set your folder to be publicly
// listable in Cloudinary: Settings → Security → uncheck
// "Restrict image list" for the student-showcase folder,
// OR use a signed API call with your API key/secret on a
// backend. For simplicity this uses the unsigned list API.
// ============================================================
export async function fetchStudentPhotos(studentName: string): Promise<CloudinaryPhoto[]> {
  const folder = `student-showcase/${slugify(studentName)}`;

  // Use Cloudinary's resource list endpoint
  // This requires "Resource list" to be enabled (unsigned) in your Cloudinary settings
  const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/list/${encodeURIComponent(folder)}.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return []; // No photos yet
      throw new Error(`Failed to fetch photos: ${res.status}`);
    }
    const data = await res.json();
    const resources: CloudinaryPhoto[] = (data.resources || []).map((r: Record<string, unknown>) => ({
      public_id: r.public_id as string,
      secure_url: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${r.public_id}`,
      width: r.width as number,
      height: r.height as number,
      created_at: r.created_at as string,
      format: r.format as string,
    }));
    // Sort by created_at ascending (oldest first)
    resources.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return resources;
  } catch (err) {
    console.error("fetchStudentPhotos error:", err);
    return [];
  }
}

// ============================================================
// Delete a photo (requires Cloudinary Admin API — needs backend)
// For teacher mode we use a signed deletion via a destroy call.
// Since this is a static site, we call Cloudinary's destroy
// endpoint with a signed timestamp. The teacher must provide
// their API Key + Secret in the teacher mode dialog.
// ============================================================
export async function deletePhoto(
  publicId: string,
  apiKey: string,
  apiSecret: string
): Promise<boolean> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await generateSignature({ public_id: publicId, timestamp }, apiSecret);

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("timestamp", timestamp.toString());
  formData.append("api_key", apiKey);
  formData.append("signature", signature);

  try {
    const res = await fetch(`${CLOUDINARY_URL}/image/destroy`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.result === "ok";
  } catch {
    return false;
  }
}

// ============================================================
// Generate a SHA-1 signature for signed API calls
// ============================================================
async function generateSignature(
  params: Record<string, string | number>,
  apiSecret: string
): Promise<string> {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const message = `${sortedParams}${apiSecret}`;
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================================
// Build a thumbnail URL from a public_id
// ============================================================
export function thumbnailUrl(publicId: string, width = 400, height = 400): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${width},h_${height},q_auto,f_auto/${publicId}`;
}

export function fullUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto,f_auto/${publicId}`;
}

// ============================================================
// Helpers
// ============================================================
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
