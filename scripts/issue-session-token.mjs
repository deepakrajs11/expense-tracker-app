import jwt from "jsonwebtoken";
import "dotenv/config";

const SESSION_DURATION_DAYS = 30;
const SESSION_DURATION_SECONDS = SESSION_DURATION_DAYS * 24 * 60 * 60;

const getJwtSecret = () => {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "dev-only-secret-change-in-production";
  throw new Error("Missing JWT_SECRET in production.");
};

const run = () => {
  const secret = getJwtSecret();
  const user = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "legacy@expense-tracker.local",
    name: "Legacy Owner",
  };

  const token = jwt.sign({ sub: user.id, email: user.email, name: user.name }, secret, {
    algorithm: "HS256",
    expiresIn: SESSION_DURATION_SECONDS,
    issuer: "expense-tracker-app",
  });

  const cookie = `expense_session=${encodeURIComponent(token)}`;
  console.log(cookie);
};

run();
