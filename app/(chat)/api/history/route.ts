import { auth } from '@/app/(auth)/auth';
import { getChatsByUserId } from '@/db/queries';

export async function GET() {
  // Check for the session and user
  const session = await auth();

  if (!session || !session.user) {
    return new Response(JSON.stringify({ message: 'Unauthorized!' }), { status: 401 });
  }

  try {
    // Fetch chats by user ID
    const chats = await getChatsByUserId({ id: session.user.id! });

    // Return the chats in JSON format
    return new Response(JSON.stringify(chats), { status: 200 });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return new Response(JSON.stringify({ message: 'An error occurred!' }), { status: 500 });
  }
}
