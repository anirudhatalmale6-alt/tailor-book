'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-royal-bg text-white px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-1 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Delete Account & Data</h1>
      </div>

      <div className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
        {!submitted ? (
          <>
            <section>
              <h2 className="text-gold font-semibold text-base mb-2">Account & Data Deletion</h2>
              <p className="text-white/80 mb-4">
                We respect your right to delete your account and all associated data. Please read the information below before proceeding.
              </p>
            </section>

            <section>
              <h2 className="text-gold font-semibold text-base mb-2">What Gets Deleted</h2>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-2">
                <li><strong className="text-white/90">Server-side data:</strong> Your registration information (name, email, business name), authentication credentials, and subscription records will be permanently deleted from our servers within 30 days of your request.</li>
                <li><strong className="text-white/90">Subscription:</strong> Any active subscription will be cancelled. No further charges will be made.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-gold font-semibold text-base mb-2">Local Data (On Your Device)</h2>
              <p className="text-white/80 mb-2">
                Your client records, measurements, orders, photos, and other business data are stored locally on your device. To delete this data:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-2">
                <li><strong className="text-white/90">Android:</strong> Go to Settings &gt; Apps &gt; Stitch Manager &gt; Storage &gt; Clear Data, then uninstall the app.</li>
                <li><strong className="text-white/90">Browser:</strong> Clear your browser data for app.stitchmanager.online, or use Settings within the app to clear all data.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-gold font-semibold text-base mb-2">Google Drive Backups</h2>
              <p className="text-white/80">
                If you previously backed up data to Google Drive, those backup files remain in your personal Google Drive. You can delete them directly from your Google Drive account. We do not have access to your Google Drive files.
              </p>
            </section>

            <section className="border-t border-white/10 pt-6">
              <h2 className="text-gold font-semibold text-base mb-4">Request Account Deletion</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-white/80 text-xs mb-1">Email Address (used for registration)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-xs mb-1">Reason for deletion (optional)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Tell us why you're leaving (optional)"
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition-colors"
                >
                  Request Account Deletion
                </button>
                <p className="text-white/40 text-xs text-center">
                  Your account and server-side data will be deleted within 30 days. You will receive a confirmation email.
                </p>
              </form>
            </section>

            <section className="border-t border-white/10 pt-4">
              <p className="text-white/60 text-xs">
                You can also request deletion by emailing <a href="mailto:support@stitchmanager.online" className="text-gold underline">support@stitchmanager.online</a> with the subject line &quot;Delete My Account&quot;.
              </p>
            </section>
          </>
        ) : (
          <section className="text-center py-12">
            <div className="text-5xl mb-4">&#10003;</div>
            <h2 className="text-gold font-semibold text-lg mb-3">Deletion Request Submitted</h2>
            <p className="text-white/80 mb-2">
              Your account deletion request has been received for <strong>{email}</strong>.
            </p>
            <p className="text-white/60 text-sm mb-6">
              Your account and all associated server-side data will be permanently deleted within 30 days. You will receive a confirmation email once the process is complete.
            </p>
            <p className="text-white/60 text-sm mb-6">
              Remember to clear local app data from your device and delete any Google Drive backups if desired.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-gold/20 text-gold rounded-lg text-sm font-semibold"
            >
              Return to App
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
