import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import updateMyProfile from "./tools/update-my-profile";
import getStylistAdvice from "./tools/get-stylist-advice";
import searchFashionKnowledge from "./tools/search-fashion-knowledge";

// Supabase issuer must be the direct host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "stylesync-ai-mcp",
  title: "StyleSync AI",
  version: "0.1.0",
  instructions:
    "Tools for StyleSync AI — your personal AI stylist. Read/update the signed-in user's profile, ask the AI stylist for outfit advice, and search the StyleSync fashion knowledge base.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, updateMyProfile, getStylistAdvice, searchFashionKnowledge],
});