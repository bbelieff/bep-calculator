console.log("✅ supabase.ts loaded")
import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
  "https://ogbuydbrxyyjddnuastn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYnV5ZGJyeHl5amRkbnVhc3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5Njc4ODYsImV4cCI6MjA2NDU0Mzg4Nn0.VhHQfA3p2RFrLG-Q78ST8yq-0C9bRgcZpY8iYaQGvbg"
)
