import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eyjkshcujvjknwbbenxf.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5amtzaGN1anZqa253YmJlbnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyOTkyNjIsImV4cCI6MjEwMjg3NTI2Mn0.NXNdA2OqTZM39s5Djmpue8ZD2DVT_Q4cEAxvw_9w840'

export const supabase = createClient(supabaseUrl, supabaseKey)
