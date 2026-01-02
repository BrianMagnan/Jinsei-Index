// Vercel serverless function for health check
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.json({ status: "OK", message: "Server is running" });
}
