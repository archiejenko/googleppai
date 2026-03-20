import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Mail } from 'lucide-react';
import KineticButton from '../kinetic/KineticButton';

interface ErrorMessageProps {
    error: Error | string;
    onRetry?: () => void;
    showSupport?: boolean;
    className?: string;
}

export default function ErrorMessage({ error, onRetry, showSupport = false, className = '' }: ErrorMessageProps) {
    const errorMessage = typeof error === 'string' ? error : error.message;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className={`flex flex-col items-center justify-center space-y-6 p-8 ${className}`}
            role="alert"
            aria-live="assertive"
        >
            <div className="p-4 rounded-full bg-[rgb(var(--status-danger)/0.1)]">
                <AlertCircle className="h-12 w-12 text-[rgb(var(--status-danger))]" aria-hidden="true" />
            </div>

            <div className="text-center space-y-2 max-w-md">
                <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">
                    Something went wrong
                </h3>
                <p className="text-sm text-[rgb(var(--text-secondary))]">
                    {errorMessage}
                </p>
            </div>

            <div className="flex items-center gap-3">
                {onRetry && (
                    <KineticButton
                        variant="primary"
                        onClick={onRetry}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Try Again
                    </KineticButton>
                )}

                {showSupport && (
                    <KineticButton
                        variant="outline"
                        onClick={() => window.location.href = 'mailto:support@oast.ai'}
                        className="flex items-center gap-2"
                    >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Contact Support
                    </KineticButton>
                )}
            </div>
        </motion.div>
    );
}
