import prisma from '../db/client';
import { HTTPException } from '../middleware/error';

export interface ChatCreate {
  title?: string;
}

export interface ChatUpdate {
  title: string;
}

export interface MessageCreate {
  role: string;
  content: string;
  fileIds?: string[];
}

export interface Chat {
  id: number;
  title: string;
  create_time: Date;
  messages?: Message[];
}

export interface Message {
  id: number;
  chat_id: number;
  role: string;
  content: string;
  timestamp: Date;
  files?: FileMetadata[];
}

export interface FileMetadata {
  id: string;
  original_filename: string;
  content_type: string;
  size: number;
  processing_method: string;
  gemini_api_file_id?: string | null;
}

// Chat CRUD operations - exact mirrors of Python backend
export async function createChat(chat: ChatCreate = {}): Promise<Chat> {
  try {
    // Mirror Python logic: check for existing chats first
    const existingChats = await getChats(0, 1);
    
    // If no specific title requested and there's already a chat, return the most recent one
    if (!chat.title && existingChats.length > 0) {
      console.log(`Returning existing chat instead of creating new one: ${existingChats[0].id}`);
      return existingChats[0];
    }

    const title = chat.title || 'New Chat';
    
    console.log(`Attempting to create new chat with title: ${title}`);
    
    const dbChat = await prisma.chat.create({
      data: {
        title,
      },
    });

    if (!dbChat || !dbChat.id) {
      console.error('Chat created, but no valid ID was assigned');
      throw new Error('Failed to generate valid chat ID');
    }

    console.log(`Created new chat with ID: ${dbChat.id}`);
    return {
      id: dbChat.id,
      title: dbChat.title,
      create_time: dbChat.create_time,
    };
  } catch (error) {
    console.error('Error creating chat:', error);
    throw new HTTPException(500, `Error creating chat: ${error}`);
  }
}

export async function getChats(skip: number = 0, limit: number = 100): Promise<Chat[]> {
  const chats = await prisma.chat.findMany({
    skip,
    take: limit,
    orderBy: { create_time: 'desc' },
  });

  return chats.map(chat => ({
    id: chat.id,
    title: chat.title,
    create_time: chat.create_time,
  }));
}

export async function getChat(chatId: number): Promise<Chat | null> {
  const dbChat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      messages: {
        include: {
          files: {
            include: {
              file_metadata: true,
            },
          },
        },
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  if (!dbChat) {
    return null;
  }

  const messages = dbChat.messages.map(message => ({
    id: message.id,
    chat_id: message.chat_id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    files: message.files.map(fileLink => ({
      id: fileLink.file_metadata.id,
      original_filename: fileLink.file_metadata.original_filename,
      content_type: fileLink.file_metadata.content_type,
      size: fileLink.file_metadata.size,
      processing_method: fileLink.file_metadata.processing_method,
      gemini_api_file_id: fileLink.file_metadata.gemini_api_file_id,
    })),
  }));

  return {
    id: dbChat.id,
    title: dbChat.title,
    create_time: dbChat.create_time,
    messages,
  };
}

export async function updateChat(chatId: number, chatUpdate: ChatUpdate): Promise<Chat | null> {
  try {
    const dbChat = await prisma.chat.update({
      where: { id: chatId },
      data: { title: chatUpdate.title },
    });

    return {
      id: dbChat.id,
      title: dbChat.title,
      create_time: dbChat.create_time,
    };
  } catch (error: any) {
    if (error.code === 'P2025') {
      return null; // Chat not found
    }
    throw error;
  }
}

export async function deleteChat(chatId: number): Promise<boolean> {
  try {
    await prisma.chat.delete({
      where: { id: chatId },
    });
    return true;
  } catch (error: any) {
    if (error.code === 'P2025') {
      return false; // Chat not found
    }
    throw error;
  }
}

// Message operations
export async function createMessage(
  chatId: number, 
  message: MessageCreate
): Promise<Message> {
  const result = await prisma.$transaction(async (tx) => {
    // Create the message
    const dbMessage = await tx.message.create({
      data: {
        chat_id: chatId,
        role: message.role,
        content: message.content,
      },
    });

    // Link files if provided
    if (message.fileIds && message.fileIds.length > 0) {
      const fileLinks = message.fileIds.map(fileId => ({
        message_id: dbMessage.id,
        file_metadata_id: fileId,
      }));

      await tx.messageFileLink.createMany({
        data: fileLinks,
        skipDuplicates: true,
      });
    }

    return dbMessage;
  });

  // Fetch the message with files
  const messageWithFiles = await prisma.message.findUnique({
    where: { id: result.id },
    include: {
      files: {
        include: {
          file_metadata: true,
        },
      },
    },
  });

  return {
    id: messageWithFiles!.id,
    chat_id: messageWithFiles!.chat_id,
    role: messageWithFiles!.role,
    content: messageWithFiles!.content,
    timestamp: messageWithFiles!.timestamp,
    files: messageWithFiles!.files.map(fileLink => ({
      id: fileLink.file_metadata.id,
      original_filename: fileLink.file_metadata.original_filename,
      content_type: fileLink.file_metadata.content_type,
      size: fileLink.file_metadata.size,
      processing_method: fileLink.file_metadata.processing_method,
      gemini_api_file_id: fileLink.file_metadata.gemini_api_file_id,
    })),
  };
}

export async function getChatMessages(chatId: number): Promise<Message[]> {
  const messages = await prisma.message.findMany({
    where: { chat_id: chatId },
    include: {
      files: {
        include: {
          file_metadata: true,
        },
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  return messages.map(message => ({
    id: message.id,
    chat_id: message.chat_id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    files: message.files.map(fileLink => ({
      id: fileLink.file_metadata.id,
      original_filename: fileLink.file_metadata.original_filename,
      content_type: fileLink.file_metadata.content_type,
      size: fileLink.file_metadata.size,
      processing_method: fileLink.file_metadata.processing_method,
      gemini_api_file_id: fileLink.file_metadata.gemini_api_file_id,
    })),
  }));
}

// File metadata operations
export async function createFileMetadata(data: {
  id: string;
  original_filename: string;
  content_type: string;
  size: number;
  local_disk_path: string;
  processing_method: string;
}) {
  return await prisma.fileMetadata.create({ data });
}

export async function getFileMetadata(fileId: string) {
  return await prisma.fileMetadata.findUnique({
    where: { id: fileId },
  });
}