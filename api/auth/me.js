import { getCurrentProfile } from "../../backend/src/controllers/authController.js";
import { authenticate } from "../../backend/src/middleware/auth.js";
import { connectDB } from "../../backend/src/config/database.js";

let dbConnected = false;

const connectDBOnce = async () => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectDBOnce();

  // Apply authentication middleware
  return new Promise((resolve) => {
    authenticate(req, res, (err) => {
      if (err) {
        // Error already sent by middleware
        resolve();
      } else {
        // Call the controller
        getCurrentProfile(req, res)
          .then(() => resolve())
          .catch(() => resolve());
      }
    });
  });
}
