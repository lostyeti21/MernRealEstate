# Setting up Supabase for Real Estate Messaging

This guide will help you set up Supabase for the real estate messaging system.

## Prerequisites

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new project in Supabase
3. Note down your project URL and anon key (public)

## Setup Steps

1. Go to the SQL editor in your Supabase dashboard
2. Copy the contents of `schema.sql` and run it in the SQL editor
3. Add the following environment variables to your client's `.env` file:
   ```
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

## Schema Overview

### Conversations Table
- Stores conversation metadata between users and agents
- Each conversation is linked to a specific listing
- Includes participant information and unread message counts

### Messages Table
- Stores individual messages within conversations
- Tracks sender, receiver, and read status
- Automatically deleted when parent conversation is deleted (cascade)

## Security

The schema includes Row Level Security (RLS) policies that ensure:
1. Users can only access conversations they're part of
2. Users can only send messages in conversations they're part of
3. Users can only update their own messages
4. Messages are automatically deleted when their parent conversation is deleted

## Indexes

Performance optimizations include indexes on:
- Conversation participants (GIN index for array searching)
- Message conversation IDs
- Message sender and receiver IDs
- Conversation listing IDs

## Testing

After setup, you can test the implementation by:
1. Creating a new conversation via the "Contact Agent" button
2. Sending messages in the conversation
3. Verifying real-time updates work
4. Checking that unread counts update correctly
