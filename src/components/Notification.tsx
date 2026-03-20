import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface NotificationProps {
    message: string;
    type?: 'success' | 'error';
    onClose: () => void;
    duration?: number;
}

export default function Notification({ message, type = 'success', onClose, duration = 5000 }: NotificationProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            handleClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
    };

    return (
        <div className={`fixed top-24 right-6 z-[100] transition-all duration-300 transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>
            <div className={`flex items-center gap-4 p-4 pr-12 rounded-xl border backdrop-blur-xl shadow-2xl ${type === 'success'
                ? 'bg-oast-surface/90 border-oast-accent/30 text-white'
                : 'bg-red-900/20 border-red-500/30 text-red-200'
                }`}>
                {type === 'success' ? (
                    <CheckCircle className="h-6 w-6 text-oast-accent" />
                ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                )}

                <div>
                    <p className="font-display font-bold text-sm">
                        {type === 'success' ? 'Success' : 'Error'}
                    </p>
                    <p className="text-xs opacity-80">{message}</p>
                </div>

                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-oast-accent/20 rounded-full w-full overflow-hidden">
                    <div
                        className={`h-full bg-oast-accent animate-shrink-x`}
                        style={{ animationDuration: `${duration}ms` }}
                    ></div>
                </div>
            </div>

            <style>{`
                @keyframes shrink-x {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .animate-shrink-x {
                    animation-name: shrink-x;
                    animation-timing-function: linear;
                    animation-fill-mode: forwards;
                }
            `}</style>
        </div>
    );
}
