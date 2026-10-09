/**
 * SafeSphere Gemini AI Intelligence Service (Step 7 + Step 8)
 * Communicates with backend endpoints for text, voice, and visual safety report classification.
 */
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  AIAnalysisResponse,
  AITranscriptionResponse,
  AIAudioAnalysisResponse,
  AIImageAnalysisResponse,
} from '../types';
import { getApiBaseUrl } from './api';

const API_BASE_URL = getApiBaseUrl();

class AIService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 25000, // accommodate audio/image generation timeout
      headers: {
        Accept: 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('safesphere_auth_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * Analyze natural-language report description with Gemini AI.
   * Safe method: never throws unhandled exceptions; returns structured AIAnalysisResponse.
   */
  async analyzeReport(description: string): Promise<AIAnalysisResponse> {
    try {
      const response = await this.client.post<AIAnalysisResponse>(
        '/reports/analyze',
        { description: description.trim() },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data;
    } catch (error: any) {
      const serverData = error.response?.data;
      const serverMessage = serverData?.message || serverData?.detail;
      const code = serverData?.code || (error.code === 'ECONNABORTED' ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE');

      return {
        success: false,
        code,
        message:
          typeof serverMessage === 'string'
            ? serverMessage
            : 'AI analysis is temporarily unavailable. You can continue by selecting the category and severity manually.',
      };
    }
  }

  /**
   * Alias matching the Step 8 naming convention.
   */
  async analyzeSafetyText(description: string): Promise<AIAnalysisResponse> {
    return this.analyzeReport(description);
  }

  /**
   * Transcribe speech recording using Gemini audio transcription API.
   */
  async transcribeAudio(audioBlob: Blob, filename = 'recording.webm'): Promise<AITranscriptionResponse> {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, filename);

      const response = await this.client.post<AITranscriptionResponse>(
        '/reports/transcribe-audio',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      return response.data;
    } catch (error: any) {
      const serverData = error.response?.data;
      const serverMessage = serverData?.message || serverData?.detail;
      const code = serverData?.code || (error.code === 'ECONNABORTED' ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE');

      return {
        success: false,
        code,
        message:
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Speech transcription is temporarily unavailable. You can continue by typing the report manually.',
      };
    }
  }

  /**
   * End-to-end voice reporting safety analysis:
   * Transcribes voice and classifies safety hazard in a single call.
   */
  async analyzeSafetyAudio(audioBlob: Blob, filename = 'recording.webm'): Promise<AIAudioAnalysisResponse> {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, filename);

      const response = await this.client.post<AIAudioAnalysisResponse>(
        '/reports/analyze-audio',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      return response.data;
    } catch (error: any) {
      const serverData = error.response?.data;
      const serverMessage = serverData?.message || serverData?.detail;
      const code = serverData?.code || (error.code === 'ECONNABORTED' ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE');

      return {
        success: false,
        code,
        message:
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Voice safety analysis is temporarily unavailable. You can continue by entering details manually.',
      };
    }
  }

  /**
   * Visual safety analysis:
   * Sends photo evidence and optional observation description to Gemini AI.
   */
  async analyzeSafetyImage(imageFile: File, description?: string): Promise<AIImageAnalysisResponse> {
    try {
      const formData = new FormData();
      formData.append('file', imageFile, imageFile.name);
      if (description && description.trim()) {
        formData.append('description', description.trim());
      }

      const response = await this.client.post<AIImageAnalysisResponse>(
        '/reports/analyze-image',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      return response.data;
    } catch (error: any) {
      const serverData = error.response?.data;
      const serverMessage = serverData?.message || serverData?.detail;
      const code = serverData?.code || (error.code === 'ECONNABORTED' ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE');

      return {
        success: false,
        code,
        message:
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Image analysis is temporarily unavailable. You can continue by selecting category and severity manually.',
      };
    }
  }
}

export const aiService = new AIService();
export default aiService;
