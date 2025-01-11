-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Conversations table
create table conversations (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  participants text[] not null,
  listing_id text not null,
  listing_name text not null,
  agent_info jsonb not null,
  user_info jsonb not null,
  last_message text,
  last_message_time timestamp with time zone,
  unread_count jsonb default '{}'::jsonb
);

-- Messages table
create table messages (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id text not null,
  receiver_id text not null,
  content text not null,
  read boolean default false
);

-- Enable Row Level Security
alter table conversations enable row level security;
alter table messages enable row level security;

-- Policies for conversations
create policy "Users can view their own conversations"
  on conversations for select
  using (auth.uid() = any(participants));

create policy "Users can insert their own conversations"
  on conversations for insert
  with check (auth.uid() = any(participants));

create policy "Users can update their own conversations"
  on conversations for update
  using (auth.uid() = any(participants));

-- Policies for messages
create policy "Users can view messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations
      where id = messages.conversation_id
      and auth.uid() = any(participants)
    )
  );

create policy "Users can insert messages in their conversations"
  on messages for insert
  with check (
    exists (
      select 1 from conversations
      where id = messages.conversation_id
      and auth.uid() = any(participants)
    )
  );

create policy "Users can update their own messages"
  on messages for update
  using (sender_id = auth.uid());

-- Indexes for better performance
create index idx_conversations_participants on conversations using gin (participants);
create index idx_messages_conversation_id on messages(conversation_id);
create index idx_messages_sender_id on messages(sender_id);
create index idx_messages_receiver_id on messages(receiver_id);
create index idx_conversations_listing_id on conversations(listing_id);
