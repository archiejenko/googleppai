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
            const { data: uploadData, error: uploadError } = await supabase.storage
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
        <div className="min-h-screen gradient-dark-bg">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="text-center mb-12 animate-fade-in-up">
                    <h1 className="text-4xl font-extrabold text-theme-primary mb-3">
                        Record Your Pitch
                    </h1>
                    <p className="text-theme-muted text-lg">
                        Practice your pitch and get instant AI-powered feedback
                    </p>
                </div>

                {/* Main Recording Card */}
                <div className="glass-card p-8 md:p-12 text-center animate-fade-in-up stagger-1">
                    {/* Recording Button */}
                    <div className="mb-8">
                        <div className="relative inline-block">
                            {isRecording && (
                                <>
                                    <div className="pulse-ring"></div>
                                    <div className="pulse-ring" style={{ animationDelay: '0.5s' }}></div>
                                </>
                            )}
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isUploading}
                                className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording
                                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50'
                                    : 'bg-gradient-to-br from-purple-600 to-blue-600 hover:scale-110 shadow-xl shadow-purple-500/50'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isRecording ? (
                                    <Square className="h-12 w-12 text-white" />
                                ) : (
                                    <Mic className="h-12 w-12 text-white" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Status Text */}
                    <div className="mb-8">
                        {isRecording ? (
                            <div className="animate-pulse">
                                <p className="text-2xl font-bold text-theme-primary mb-2">Recording...</p>
                                <p className="text-theme-muted">Click the button to stop</p>
                            </div>
                        ) : audioBlob ? (
                            <div>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <CheckCircle className="h-6 w-6 text-green-400" />
                                    <p className="text-2xl font-bold text-theme-primary">Recording Complete!</p>
                                </div>
                                <p className="text-theme-muted">Ready to upload for analysis</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-2xl font-bold text-theme-primary mb-2">Ready to Record</p>
                                <p className="text-theme-muted">Click the microphone to start</p>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg animate-fade-in">
                            <div className="flex items-center justify-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                <span>{error}</span>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="mb-6 bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg animate-fade-in">
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
                            className="btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div className="glass-card p-6 text-center animate-fade-in-up stagger-2">
                        <div className="bg-purple-500/20 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Mic className="h-6 w-6 text-purple-400" />
                        </div>
                        <h3 className="text-white font-semibold mb-2">Clear Audio</h3>
                        <p className="text-gray-300 text-sm">Ensure you're in a quiet environment for best results</p>
                    </div>

                    <div className="glass-card p-6 text-center animate-fade-in-up stagger-3">
                        <div className="bg-blue-500/20 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-6 w-6 text-blue-400" />
                        </div>
                        <h3 className="text-white font-semibold mb-2">Be Natural</h3>
                        <p className="text-gray-300 text-sm">Speak naturally and confidently as you would in a real pitch</p>
                    </div>

                    <div className="glass-card p-6 text-center animate-fade-in-up stagger-4">
                        <div className="bg-green-500/20 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Upload className="h-6 w-6 text-green-400" />
                        </div>
                        <h3 className="text-white font-semibold mb-2">Get Feedback</h3>
                        <p className="text-gray-300 text-sm">Receive instant AI-powered analysis and improvement tips</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
