interface Settings {
    databaseUrl: string;
    geminiApiKey: string;
    huggingfaceApiToken: string;
    whisperApiKey: string;
    huggingfaceWhisperEndpoint: string;
    geminiModelName: string;
    uploadDir: string;
    maxFileSize: number;
    audioDir: string;
    maxAudioSize: number;
    allowedOrigins: string;
    port: number;
}
declare function getSettings(): Settings;
declare const settings: Settings;
export declare const GEMINI_API_KEY: string | undefined;
export declare const HUGGINGFACE_API_TOKEN: string | undefined;
export declare const HUGGINGFACE_WHISPER_ENDPOINT = "https://api-inference.huggingface.co/models/openai/whisper-large-v3";
export default settings;
export { getSettings };
//# sourceMappingURL=env.d.ts.map