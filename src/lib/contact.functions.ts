import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SPREADSHEET_ID = "1_DMokKE6dcjs39ihkTJt3YM7s9Wp8aNXW8eio-F-0zM";
const SHEET_RANGE = "Sheet1!A:E";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().regex(/^\d{10}$/, "Phone must be 10 digits"),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    if (!GOOGLE_SHEETS_API_KEY) {
      throw new Error("GOOGLE_SHEETS_API_KEY is not configured");
    }

    const timestamp = new Date().toISOString();
    const url = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RANGE}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [[data.name, data.email, data.phone, data.message, timestamp]],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Google Sheets append failed [${response.status}]: ${body}`);
      throw new Error(`Failed to save submission (${response.status})`);
    }

    return { success: true };
  });