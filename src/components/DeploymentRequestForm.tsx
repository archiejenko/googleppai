
import { useState } from 'react';
import KineticButton from './kinetic/KineticButton';
import { supabase } from '../utils/supabase';

interface FormState {
  nameCompany: string;
  email: string;
  industryOrFeedback: string;
}

const DeploymentRequestForm = () => {
    const [userType, setUserType] = useState<'new' | 'existing'>('new');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [form, setForm] = useState<FormState>({ nameCompany: '', email: '', industryOrFeedback: '' });
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        setErrorMsg('');

        const [name, ...companyParts] = form.nameCompany.split('&').map(s => s.trim());
        const company = companyParts.join('&').trim() || name;

        const { error } = await supabase.functions.invoke('deployment-request', {
            body: {
                name,
                company,
                email: form.email,
                type: userType,
                message: form.industryOrFeedback,
            },
        });

        if (error) {
            setErrorMsg('Submission failed. Please try again.');
            setStatus('error');
        } else {
            setStatus('success');
        }
    };

    if (status === 'success') {
        return (
            <div className="w-full max-w-4xl mx-auto mt-12 mb-8 bg-[#020617] border-[length:var(--border-width-primary)] border-[#F5F5F5] p-12 text-center animate-in-up">
                <h3 className="text-3xl font-black text-[#F5F5F5] uppercase mb-4">
                    {userType === 'existing' ? 'Feedback Received' : 'Waitlist Confirmed'}
                </h3>
                <p className="precision-body">
                    {userType === 'existing'
                        ? 'Thank you for helping us optimize the OAST ecosystem. Our team will review your strategic feedback.'
                        : 'Your impact analysis is being processed. An OAST infrastructure specialist will reach out shortly.'}
                </p>
                <button
                    onClick={() => { setStatus('idle'); setForm({ nameCompany: '', email: '', industryOrFeedback: '' }); }}
                    className="mt-8 text-xs font-mono uppercase tracking-widest hover:underline"
                >
                    [ Submit Another ]
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto mt-12 mb-8 bg-[#020617] border-[length:var(--border-width-primary)] border-[#F5F5F5] shadow-[8px_8px_0px_0px_#F5F5F5] transition-all duration-500">
            <div className="p-8 md:p-12">
                <div className="mb-8">
                    <h3 className="text-3xl font-black text-[#F5F5F5] uppercase mb-2">
                        {userType === 'existing' ? 'Optimize the Ecosystem' : 'Book Executive Demo'}
                    </h3>
                    <p className="text-xs font-mono opacity-50 uppercase tracking-tighter">
                        {userType === 'existing' ? 'Direct strategic performance feedback' : 'Request your Revenue Impact Analysis [REV_SYS_v1.2]'}
                    </p>
                </div>

                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setUserType('new')}
                        className={`px-4 py-2 font-mono text-xs border ${userType === 'new' ? 'bg-[#F5F5F5] text-black' : 'border-[#F5F5F5]/30 text-[#F5F5F5]/60'} transition-all`}
                    >
                        New User
                    </button>
                    <button
                        onClick={() => setUserType('existing')}
                        className={`px-4 py-2 font-mono text-xs border ${userType === 'existing' ? 'bg-[#F5F5F5] text-black' : 'border-[#F5F5F5]/30 text-[#F5F5F5]/60'} transition-all`}
                    >
                        Existing User — Feedback
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-px bg-[#F5F5F5] border-[length:var(--border-width-primary)] border-[#F5F5F5]">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#F5F5F5]">
                        <div className="bg-[#020617] p-4 group focus-within:bg-[#050b2b] transition-colors">
                            <label className="block text-[10px] font-mono opacity-40 mb-1 uppercase">Name / Company</label>
                            <input
                                type="text"
                                required
                                value={form.nameCompany}
                                onChange={e => setForm(f => ({ ...f, nameCompany: e.target.value }))}
                                className="w-full bg-transparent text-[#F5F5F5] font-bold text-lg focus:outline-none placeholder-[#F5F5F5]/20"
                                placeholder="Your name & company"
                            />
                        </div>

                        <div className="bg-[#020617] p-4 group focus-within:bg-[#050b2b] transition-colors">
                            <label className="block text-[10px] font-mono opacity-40 mb-1 uppercase">Work Email</label>
                            <input
                                type="email"
                                required
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                className="w-full bg-transparent text-[#F5F5F5] font-bold text-lg focus:outline-none placeholder-[#F5F5F5]/20"
                                placeholder="you@company.com"
                            />
                        </div>
                    </div>

                    {userType === 'new' ? (
                        <div className="bg-[#020617] p-4 group focus-within:bg-[#050b2b] transition-colors">
                            <label className="block text-[10px] font-mono opacity-40 mb-1 uppercase">Industry / Vertical</label>
                            <select
                                value={form.industryOrFeedback}
                                onChange={e => setForm(f => ({ ...f, industryOrFeedback: e.target.value }))}
                                className="w-full bg-transparent text-[#F5F5F5] font-bold text-lg focus:outline-none appearance-none cursor-pointer"
                            >
                                <option className="bg-[#020617]" value="">Select your sector</option>
                                <option className="bg-[#020617]">Technology</option>
                                <option className="bg-[#020617]">Finance</option>
                                <option className="bg-[#020617]">Healthcare</option>
                                <option className="bg-[#020617]">Recruitment</option>
                                <option className="bg-[#020617]">Telecoms</option>
                                <option className="bg-[#020617]">Energy</option>
                                <option className="bg-[#020617]">Insurance</option>
                                <option className="bg-[#020617]">Real Estate</option>
                            </select>
                        </div>
                    ) : (
                        <div className="bg-[#020617] p-4 group focus-within:bg-[#050b2b] transition-colors">
                            <label className="block text-[10px] font-mono opacity-40 mb-1 uppercase">Friction Points</label>
                            <textarea
                                required
                                value={form.industryOrFeedback}
                                onChange={e => setForm(f => ({ ...f, industryOrFeedback: e.target.value }))}
                                className="w-full bg-transparent text-[#F5F5F5] font-bold text-lg focus:outline-none placeholder-[#F5F5F5]/20 min-h-[100px] resize-none"
                                placeholder="Describe where the experience breaks down..."
                            />
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="bg-[#020617] px-4 py-2 text-xs text-red-400 font-mono">{errorMsg}</div>
                    )}

                    <div className="bg-[#020617] p-4">
                        <KineticButton
                            type="submit"
                            variant="primary"
                            disabled={status === 'submitting'}
                            className="w-full py-5 text-sm tracking-[0.2em] font-black uppercase"
                        >
                            {status === 'submitting' ? 'Processing...' : (userType === 'existing' ? 'Submit Feedback' : 'See Revenue Impact Model')}
                        </KineticButton>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default DeploymentRequestForm;
