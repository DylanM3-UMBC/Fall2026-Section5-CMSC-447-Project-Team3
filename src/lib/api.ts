import { API_URL, supabase } from "@/lib/supabase";

/**
 * Fetch a backend path (for example, /projects) using the current session.
 * Callers handle response.ok, including 401, and parse the response body.
 */
export async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = new URL(path, API_URL);

  // Never attach the user's token to a caller-supplied external URL.
  if (!path.startsWith("/") || url.origin !== new URL(API_URL).origin) {
    throw new Error("Expected a path on the configured backend.");
  }

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session) throw new Error("Please sign in before making this request.");

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  // Leave Content-Type to the caller: requests may contain JSON or FormData.
  return fetch(url.toString(), { ...options, headers });
}

// Example: load projects inside an async screen handler.
// import { authenticatedFetch } from "@/lib/api";
//
// try {
//   const response = await authenticatedFetch("/projects");
//   if (!response.ok) throw new Error("Could not load projects.");
//   const data = await response.json();
//   console.log(data.projects); // Or update your screen's state.
// } catch (error) {
//   console.error(error); // Or display an error message on the screen.
// }
// The helper sends the token; the backend still needs to verify it.

// Example: create a project inside an async screen handler.
// selectedFile is the browser File returned by the PDF picker.
//
// try {
//   const form = new FormData();
//   form.append("project_name", selectedFile.name);
//   form.append("project_desc", "");
//   form.append("pdf", selectedFile);
//   const response = await authenticatedFetch("/projects", {
//     method: "POST",
//     body: form, // Let fetch set the multipart Content-Type.
//   });
//   if (!response.ok) throw new Error("Could not create project.");
//   const data = await response.json();
//   console.log(data);
// } catch (error) {
//   console.error(error);
// }
