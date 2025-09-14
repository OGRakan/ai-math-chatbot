import axios from 'axios';
import fs from 'fs';
import { HTTPException } from '../middleware/error';
import settings from '../env';

export async function transcribeAudio(audioPath: string, contentType: string): Promise<string> {
  const whisperApiKey = settings.whisperApiKey;
  
  if (!whisperApiKey) {
    throw new HTTPException(500, 'Whisper API key not configured');
  }

  try {
    console.log(`Processing audio file for transcription: ${audioPath}`);
    
    // Read the audio data
    const audioData = fs.readFileSync(audioPath);
    
    const response = await axios.post(
      settings.huggingfaceWhisperEndpoint,
      audioData,
      {
        headers: {
          'Authorization': `Bearer ${whisperApiKey}`,
          'Content-Type': contentType,
        },
        timeout: 30000, // 30 second timeout
      }
    );

    if (response.status !== 200) {
      const errorDetail = (response.data as any)?.error || 'Unknown error';
      console.error('Whisper API error:', errorDetail);
      throw new HTTPException(500, `Whisper API error: ${errorDetail}`);
    }

    const transcription = (response.data as any)?.text || '';
    console.log(`Successfully transcribed audio (${transcription.length} characters)`);
    
    return transcription;

  } catch (error: any) {
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      console.error('Network error connecting to Whisper API:', error.message);
      throw new HTTPException(503, `Error connecting to Whisper API: ${error.message}`);
    }
    
    console.error('Error processing audio:', error.message);
    throw new HTTPException(500, `Error processing audio: ${error.message}`);
  }
}