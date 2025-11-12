import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) throw userError

    const user = userData.users.find(u => u.email === email)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Insert admin role
    const { data, error } = await supabase
      .from('user_roles')
      .insert({ user_id: user.id, role: 'admin' })
      .select()

    if (error) {
      // Check if role already exists
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ message: 'User already has admin role', user_id: user.id }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      throw error
    }

    return new Response(
      JSON.stringify({ message: 'Admin role granted successfully', data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
