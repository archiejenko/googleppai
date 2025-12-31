import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Mic, Square, Upload, Loader, CheckCircle, AlertCircle } from 'lucide-react';

export default function PitchRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setError('');
        } catch (err) {
            setError('Failed to access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const uploadPitch = async () => {
        if (!audioBlob) return;

        setIsUploading(true);
        setError('');

        try {
            const fileName = `pitch-${Date.now()}.webm`;
            const { error: uploadError } = await supabase.storage
                .from('pitch-recordings')
                .upload(`${fileName}`, audioBlob);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('pitch-recordings')
                .getPublicUrl(fileName);

            // Call Edge Function to analyze
            const { data: analysisData, error: analysisError } = await supabase.functions.invoke('pitch-api', {
                body: {
                    audioUrl: publicUrl,
                    trainingSessionId: sessionId
                }
            });

            if (analysisError) throw analysisError;

            setSuccess(true);
            setTimeout(() => {
                if (sessionId) {
                    navigate(`/training`);
                } else {
                    navigate(`/pitch/${analysisData.id}`);
                }
            }, 2000);

        } catch (err: any) {
            console.error('Upload failed', err);
            setError(err.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="layout-shell flex items-center justify-center p-4 sm:p-8">
            <div className="max-w-4xl w-full mx-auto">
                {/* Header */}
                <div className="text-center mb-12 animate-in-up">
                    <h1 className="text-4xl font-display font-bold text-[rgb(var(--text-primary))] mb-3">
                        Record Your Pitch
                    </h1>
                    <p className="text-[rgb(var(--text-secondary))] text-lg">
                        Practice your pitch and get instant AI-powered feedback
                    </p>
                </div>

                {/* Main Recording Card */}
                <div className="card-hero p-8 md:p-12 text-center animate-in-up" style={{ animationDelay: '0.1s' }}>
                    {/* Recording Button */}
                    <div className="mb-10">
                        <div className="relative inline-block">
                            {isRecording && (
                                <>
                                    <div className="absolute inset-0 rounded-full bg-status-danger/30 animate-ping"></div>
                                    <div className="absolute inset-0 rounded-full bg-status-danger/20 animate-pulse delay-75"></div>
                                </>
                            )}
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isUploading}
                                className={`
                                    relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300
                                    ${isRecording
                                        ? 'bg-status-danger hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
                                        : 'bg-[rgb(var(--accent-primary))] hover:scale-105 shadow-[0_0_30px_rgb(var(--accent-glow)/0.5)]'
                                    } 
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                            >
                                {isRecording ? (
                                    <Square className="h-12 w-12 text-white fill-current" />
                                ) : (
                                    <Mic className="h-12 w-12 text-white" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Status Text */}
                    <div className="mb-8 min-h-[5rem]">
                        {isRecording ? (
                            <div className="animate-pulse">
                                <p className="text-2xl font-display font-bold text-[rgb(var(--text-primary))] mb-2">Recording...</p>
                                <p className="text-[rgb(var(--text-secondary))]">Click the button to stop</p>
                            </div>
                        ) : audioBlob ? (
                            <div className="animate-in-up">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <CheckCircle className="h-6 w-6 text-status-success" />
                                    <p className="text-2xl font-display font-bold text-[rgb(var(--text-primary))]">Recording Complete!</p>
                                </div>
                                <p className="text-[rgb(var(--text-muted))]">Ready to upload for analysis</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-2xl font-display font-bold text-[rgb(var(--text-primary))] mb-2">Ready to Record</p>
                                <p className="text-[rgb(var(--text-secondary))]">Click the microphone to start</p>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 bg-status-danger/10 border border-status-danger/20 text-status-danger px-4 py-3 rounded-[var(--radius-md)] animate-in-up">
                            <div className="flex items-center justify-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                <span>{error}</span>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="mb-6 bg-status-success/10 border border-status-success/20 text-status-success px-4 py-3 rounded-[var(--radius-md)] animate-in-up">
                            <div className="flex items-center justify-center gap-2">
                                <CheckCircle className="h-5 w-5" />
                                <span>Upload successful! Redirecting to dashboard...</span>
                            </div>
                        </div>
                    )}

                    {/* Upload Button */}
                    {audioBlob && !success && (
                        <button
                            onClick={uploadPitch}
                            disabled={isUploading}
                            className="btn-primary w-full max-w-xs mx-auto text-lg py-3 flex items-center justify-center gap-2 animate-in-up"
                        >
                            {isUploading ? (
                                <span className="flex items-center gap-2">
                                    <Loader className="h-5 w-5 animate-spin" />
                                    Uploading...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Upload className="h-5 w-5" />
                                    Upload & Analyze
                                </span>
                            )}
                        </button>
                    )}
                </div>

                {/* Tips Section */}
                <div className="mt-12 grid md:grid-cols-3 gap-6">
                    <div className="card-os p-6 text-center animate-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="bg-[rgb(var(--accent-primary)/0.1)] w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Mic className="h-6 w-6 text-[rgb(var(--accent-primary))]" />
                        </div>
                        <h3 className="text-[rgb(var(--text-primary))] font-medium mb-2">Clear Audio</h3>
                        <p className="text-[rgb(var(--text-muted))] text-sm">Ensure you're in a quiet environment for best results</p>
                    </div>

                    <div className="card-os p-6 text-center animate-in-up" style={{ animationDelay: '0.3s' }}>
                        <div className="bg-blue-500/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-6 w-6 text-blue-400" />
                        </div>
                        <h3 className="text-[rgb(var(--text-primary))] font-medium mb-2">Be Natural</h3>
                        <p className="text-[rgb(var(--text-muted))] text-sm">Speak naturally and confidently as you would in a real pitch</p>
                    </div>

                    <div className="card-os p-6 text-center animate-in-up" style={{ animationDelay: '0.4s' }}>
                        <div className="bg-status-success/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Upload className="h-6 w-6 text-status-success" />
                        </div>
                        <h3 className="text-[rgb(var(--text-primary))] font-medium mb-2">Get Feedback</h3>
                        <p className="text-[rgb(var(--text-muted))] text-sm">Receive instant AI-powered analysis and improvement tips</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
