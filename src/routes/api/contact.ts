import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SPREADSHEET_ID = "1tcJhsPa8vMzu2xNsF0_28CFys962RmVbmU5PQDVWV7s";
const SHEET_RANGE = "Sheet1!A:E";

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional().default(""),
  message: z.string().trim().min(1).max(5000),
});

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
        if (!LOVABLE_API_KEY) {
          return Response.json({ error: "LOVABLE_API_KEY is not configured" }, { status: 500 });
        }
        if (!GOOGLE_SHEETS_API_KEY) {
          return Response.json({ error: "GOOGLE_SHEETS_API_KEY is not configured" }, { status: 500 });
        }

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = ContactSchema.safeParse(payload);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", details: parsed.error.flatten() },
            { status: 400 },
          );
        }

        const { name, email, phone, message } = parsed.data;
        const submittedAt = new Date().toISOString();

        const url = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RANGE}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

        const sheetsRes = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: [[submittedAt, name, email, phone, message]],
          }),
        });

        if (!sheetsRes.ok) {
          const errText = await sheetsRes.text();
          console.error(`Google Sheets append failed [${sheetsRes.status}]: ${errText}`);
          return Response.json(
            { error: "Failed to save submission" },
            { status: 502 },
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});