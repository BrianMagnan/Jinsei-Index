import { login } from "../../backend/src/controllers/authController.js";
import { connectDB } from "../../backend/src/config/database.js";

let dbConnected = false;

const connectDBOnce = async () => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectDBOnce();
  return login(req, res);
}

