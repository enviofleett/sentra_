
-- Create consultant_sessions table
CREATE TABLE IF NOT EXISTS public.consultant_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create consultant_messages table
CREATE TABLE IF NOT EXISTS public.consultant_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.consultant_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    image_url TEXT, -- For multimodal support
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.consultant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_messages ENABLE ROW LEVEL SECURITY;

-- Policies for sessions
CREATE POLICY "Users can view their own sessions" 
ON public.consultant_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON public.consultant_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.consultant_sessions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
ON public.consultant_sessions FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for messages
CREATE POLICY "Users can view messages in their sessions" 
ON public.consultant_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.consultant_sessions s 
        WHERE s.id = session_id AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages in their sessions" 
ON public.consultant_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.consultant_sessions s 
        WHERE s.id = session_id AND s.user_id = auth.uid()
    )
);

-- Storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload chat attachments" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() = owner);

CREATE POLICY "Users can view chat attachments" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat-attachments'); -- Public read is fine for signed URLs, or restrict to owner if strict privacy needed. 
-- For simplicity in chat, we often allow public read if the URL is known, or we can use signed URLs. 
-- Let's stick to public for now as per bucket config.
