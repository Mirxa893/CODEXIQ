import { convertToCoreMessages, Message } from 'ai';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { deleteChatById, getChatById, saveChat } from '@/db/queries';

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages);

  // Prepare the prompt for HuggingFace (Combining system prompt and user messages)
  const prompt = coreMessages.map(msg => msg.content).join("\n");

  const apiUrl = "https://mirxakamran893-logiqcurvecode.hf.space/chat";  // HuggingFace space endpoint

  // Make the request to HuggingFace space
  const payload = {
    inputs: {
      prompt: prompt,
      enable_search: true, // Adjust based on HuggingFace's requirements
    },
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API request failed with status: ${response.status}`);
    }

    const responseData = await response.json();

    // Ensure response contains a valid message
    const assistantMessage = responseData?.message || 'No response from HuggingFace';

    // Save the response to the database
    if (session.user && session.user.id) {
      try {
        await saveChat({
          id,
          messages: [...coreMessages, { role: 'assistant', content: assistantMessage }],
          userId: session.user.id,
        });
      } catch (error) {
        console.error('Failed to save chat');
      }
    }

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in HuggingFace API call:", error);
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
