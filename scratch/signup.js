import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://egjtzpbcevotksunohep.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnanR6cGJjZXZvdGtzdW5vaGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTAwMTksImV4cCI6MjA5NDI2NjAxOX0.0VqqTel7zhnn6hOLA3HZo3rYdlM3xPTEYQegJNQ_hPI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function signUp() {
  console.log('Signing up user amorkrishna77@gmail.com...')
  const { data, error } = await supabase.auth.signUp({
    email: 'amorkrishna77@gmail.com',
    password: 'Ak123456',
  })

  if (error) {
    console.error('Error signing up:', error.message)
    return
  }
  
  console.log('Successfully signed up user:', data.user?.email)
  console.log('User ID:', data.user?.id)
}

signUp()
